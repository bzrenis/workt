import { useState, useEffect, useCallback, useMemo } from 'react';
import DatabaseService from '../services/DatabaseService';
import DatabaseHealthService from '../services/DatabaseHealthService';
import { useCalculationService } from './useCalculationService';
import { useVacationAutoCompile } from './useVacationAutoCompile';
import { DEFAULT_SETTINGS } from '../constants';

export { useCalculationService, useVacationAutoCompile };

export const useDatabase = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      await DatabaseService.ensureInitialized();
      
      // Initialize default settings if not exists OR migrate old structure
      const existingSettings = await DatabaseService.getSetting('appSettings');
      if (!existingSettings) {
        console.log('🆕 Primo avvio - impostazioni default');
        await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
      } else {
        // Verifica integrità del contratto
        const contractValid = existingSettings.contract && 
                             typeof existingSettings.contract === 'object' &&
                             existingSettings.contract.monthlySalary &&
                             existingSettings.contract.overtimeRates;
        
        if (!contractValid) {
          console.log('🚨 Contratto corrotto - reset completo');
          await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
        } else {
          // Migrazione: aggiungi netCalculation se non esiste o ha struttura vecchia
          let needsUpdate = false;
          const updatedSettings = { ...existingSettings };
        
        if (!existingSettings.netCalculation) {
          updatedSettings.netCalculation = {
            method: existingSettings.netCalculationMethod || 'irpef',
            customDeductionRate: existingSettings.customNetPercentage || 32,
            useActualAmount: false // Default: usa stima annuale
          };
          needsUpdate = true;
        } else if (existingSettings.netCalculation.useActualAmount === undefined) {
          // Migrazione: aggiungi useActualAmount se manca
          updatedSettings.netCalculation = {
            ...existingSettings.netCalculation,
            useActualAmount: false
          };
          needsUpdate = true;
        }
        
        // Pulisci le vecchie proprietà se esistono
        if (existingSettings.netCalculationMethod !== undefined) {
          delete updatedSettings.netCalculationMethod;
          needsUpdate = true;
        }
        if (existingSettings.customNetPercentage !== undefined) {
          delete updatedSettings.customNetPercentage;
          needsUpdate = true;
        }
        
          if (needsUpdate) {
            console.log('🔄 Migrazione impostazioni...');
            await DatabaseService.setSetting('appSettings', updatedSettings);
          }
        }
      }
      
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Database initialization failed:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isInitialized,
    isLoading,
    error,
    retryInit: initializeDatabase
  };
};

export const useWorkEntries = (year, month, showAllEntries = false) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const minRetryInterval = 2000; // 2 secondi

  const loadEntries = async (forceLoad = false) => {
    // Prevenzione spam di chiamate
    const now = Date.now();
    if (!forceLoad && now - lastLoadTime < minRetryInterval) {
      console.log('LoadEntries: Troppo presto per ricaricare, saltando...');
      return;
    }

    // Limite retry per prevenire loop infinito
    if (retryCount >= maxRetries) {
      console.log('LoadEntries: Limite retry raggiunto, fermando...');
      setError(new Error('Troppi tentativi di ricaricamento falliti'));
      return;
    }

    try {
      console.log(`Loading work entries${showAllEntries ? ' (all history)' : ` for ${year}-${month}`}... (attempt ${retryCount + 1})`);
      setIsLoading(true);
      setLastLoadTime(now);
      
      let workEntries;
      if (showAllEntries) {
        // Carica tutti gli inserimenti senza filtro per mese/anno
        workEntries = await DatabaseService.getAllWorkEntries();
        console.log(`Loaded ${workEntries.length} work entries (all history)`);
      } else {
        workEntries = await DatabaseService.getWorkEntries(year, month);
        console.log(`Loaded ${workEntries.length} work entries for ${year}-${month}`);
      }
      
      setEntries(workEntries);
      setError(null);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error loading work entries:', err);
      setRetryCount(prev => prev + 1);
      
      // Log dell'errore nel servizio di salute
      await DatabaseHealthService.logDatabaseError('loadEntries', err);
      
      if (retryCount + 1 >= maxRetries) {
        setError(new Error(`Caricamento fallito dopo ${maxRetries} tentativi: ${err.message}`));
        setEntries([]);
      } else {
        // Retry con backoff esponenziale
        setTimeout(() => {
          loadEntries(true);
        }, 1000 * Math.pow(2, retryCount));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (year && month) {
      setRetryCount(0); // Reset retry count on new params
      loadEntries(true);
    }
  }, [year, month]);
  const calculationService = useCalculationService();

  const addEntry = async (workEntry) => {
    try {
      const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      const earnings = calculationService.calculateDailyEarnings(workEntry, settings);
      
      const entryWithEarnings = {
        ...workEntry,
        totalEarnings: earnings.total
      };
      
      const id = await DatabaseService.insertWorkEntry(entryWithEarnings);
      await loadEntries(true); // Force reload entries
      return id;
    } catch (err) {
      console.error('Error adding work entry:', err);
      throw err;
    }
  };

  const updateEntry = async (id, workEntry) => {
    try {
      const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      const earnings = calculationService.calculateDailyEarnings(workEntry, settings);
      
      const entryWithEarnings = {
        ...workEntry,
        totalEarnings: earnings.total
      };
      
      await DatabaseService.updateWorkEntry(id, entryWithEarnings);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error updating work entry:', err);
      throw err;
    }
  };

  const deleteEntry = async (id) => {
    try {
      await DatabaseService.deleteWorkEntry(id);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error deleting work entry:', err);
      throw err;
    }
  };

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: () => loadEntries(true),
    canRetry: retryCount < maxRetries,
    retryCount
  };
};

export const useSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const loadSettings = async (forceLoad = false) => {
    if (retryCount >= maxRetries && !forceLoad) {
      console.log('LoadSettings: Limite retry raggiunto, saltando...');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 HOOK - loadSettings: Caricamento da database...');
      
      const appSettings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      
      console.log('🔍 HOOK - loadSettings: Dati caricati dal database');
      if (appSettings?.netCalculation) {
        console.log('- NetCalculation trovato:', JSON.stringify(appSettings.netCalculation, null, 2));
      } else {
        console.log('- NetCalculation NON trovato, usando default');
      }
      
      setSettings(appSettings);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error('❌ HOOK - Error loading settings:', err);
      await DatabaseHealthService.logDatabaseError('loadSettings', err);
      setRetryCount(prev => prev + 1);
      
      if (retryCount + 1 >= maxRetries) {
        setError(new Error(`Caricamento impostazioni fallito dopo ${maxRetries} tentativi: ${err.message}`));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(true);
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      console.log('🔧 HOOK - updateSettings chiamato');
      console.log('- Nuove impostazioni da salvare:', JSON.stringify(newSettings.netCalculation, null, 2));
      
      await DatabaseService.setSetting('appSettings', newSettings);
      setSettings(newSettings);
      setRetryCount(0);
      
      console.log('✅ HOOK - updateSettings completato');
      console.log('- Settings state aggiornato:', JSON.stringify(newSettings.netCalculation, null, 2));
    } catch (err) {
      console.error('❌ HOOK - Error updating settings:', err);
      throw err;
    }
  };

  const updatePartialSettings = async (partialSettings) => {
    try {
      const updatedSettings = { ...settings, ...partialSettings };
      await updateSettings(updatedSettings);
    } catch (err) {
      console.error('Error updating partial settings:', err);
      throw err;
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updatePartialSettings,
    refreshSettings: () => {
      console.log('🔄 HOOK - refreshSettings chiamato, ricaricando da database...');
      return loadSettings(true);
    },
    canRetry: retryCount < maxRetries
  };
};

export const useStandbyCalendar = (year, month) => {
  const [standbyDays, setStandbyDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadStandbyDays = async () => {
    try {
      setIsLoading(true);
      const days = await DatabaseService.getStandbyDays(year, month);
      setStandbyDays(days);
      setError(null);
    } catch (err) {
      console.error('Error loading standby days:', err);
      setError(err);
      setStandbyDays([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (year && month) {
      loadStandbyDays();
    }
  }, [year, month]);

  const toggleStandbyDay = async (date) => {
    try {
      const existingDay = standbyDays.find(day => day.date === date);
      const newStandbyStatus = !existingDay?.is_standby;
      
      await DatabaseService.setStandbyDay(date, newStandbyStatus);
      await loadStandbyDays(); // Reload standby days
    } catch (err) {
      console.error('Error toggling standby day:', err);
      throw err;
    }
  };

  const isStandbyDay = (date) => {
    return standbyDays.some(day => day.date === date && day.is_standby);
  };

  return {
    standbyDays,
    isLoading,
    error,
    toggleStandbyDay,
    isStandbyDay,
    refreshStandbyDays: loadStandbyDays
  };
};

export const useMonthlySummary = (year, month) => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { settings } = useSettings();
  const calculationService = useCalculationService();
  const [entries, setEntries] = useState([]);
  const minRefreshInterval = 1000; // 1 secondo
  
  // Carica gli inserimenti del mese
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setIsLoading(true);
        if (!year || !month) return;
        
        // Usa la funzione getWorkEntries che richiede year e month
        const data = await DatabaseService.getWorkEntries(year, month);
        setEntries(data || []);
      } catch (err) {
        console.error('Error loading month entries:', err);
        setError(err);
      }
    };
    
    loadEntries();
  }, [year, month]);
  
  // Calcola il riepilogo quando entrambi entries e settings sono pronti
  useEffect(() => {
    const calculateSummary = async () => {
      try {
        if (!entries || !settings || !Array.isArray(entries) || !year || !month) {
          console.log('Skip calculation: missing data or invalid parameters', { 
            hasEntries: Boolean(entries), 
            isArray: Array.isArray(entries), 
            entriesLength: entries ? entries.length : 0,
            hasSettings: Boolean(settings),
            year: year,
            month: month
          });
          return;
        }
        
        const monthlySummary = calculationService.calculateMonthlySummary(entries, settings, month, year);
        setSummary(monthlySummary);
        setError(null);
      } catch (err) {
        console.error('Error calculating monthly summary:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    calculateSummary();
  }, [entries, settings, calculationService]);

  const refreshSummary = async (forceRefresh = false) => {
    // Prevenzione spam di refresh
    const now = Date.now();
    if (!forceRefresh && now - lastRefreshTime < minRefreshInterval) {
      console.log('Dashboard: Refresh troppo frequente, saltando...');
      return;
    }

    try {
      console.log('Dashboard: Refreshing summary and entries...');
      setLastRefreshTime(now);
      setIsLoading(true);
      
      // Reload entries usando getWorkEntries che richiede year e month
      const data = await DatabaseService.getWorkEntries(year, month);
      setEntries(data || []);
    } catch (err) {
      console.error('Error refreshing monthly summary:', err);
      setError(err);
    }
  };

  // Può effettuare il refresh
  const canRefresh = !isLoading;

  return { summary, isLoading, error, refreshSummary, canRefresh };
};
