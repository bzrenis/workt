import { useState, useEffect, useCallback } from 'react';
import DatabaseService from '../services/DatabaseService';
import DatabaseHealthService from '../services/DatabaseHealthService';
import CalculationService from '../services/CalculationService';
import { DEFAULT_SETTINGS } from '../constants';

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
      
      // Initialize default settings if not exists
      const existingSettings = await DatabaseService.getSetting('appSettings');
      if (!existingSettings) {
        await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
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
  const addEntry = async (workEntry) => {
    try {
      const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      const earnings = CalculationService.calculateDailyEarnings(workEntry, settings);
      
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
      const earnings = CalculationService.calculateDailyEarnings(workEntry, settings);
      
      const entryWithEarnings = {
        ...workEntry,
        totalEarnings: earnings.total
      };
      
      await DatabaseService.updateWorkEntry(id, entryWithEarnings);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error updating work entry:', err);
      throw err;
    }  };

  return {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: () => loadEntries(true),    canRetry: retryCount < maxRetries,
    retryCount
  };
  const deleteEntry = async (id) => {
    try {
      await DatabaseService.deleteWorkEntry(id);
      await loadEntries(true); // Force reload entries
    } catch (err) {
      console.error('Error deleting work entry:', err);
      throw err;
    }
  };  return {
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
      const appSettings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      setSettings(appSettings);
      setError(null);
      setRetryCount(0);    } catch (err) {
      console.error('Error loading settings:', err);
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
      await DatabaseService.setSetting('appSettings', newSettings);
      setSettings(newSettings);
      setRetryCount(0);
    } catch (err) {
      console.error('Error updating settings:', err);
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
    refreshSettings: () => loadSettings(true),
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const { entries, refreshEntries, canRetry: entriesCanRetry } = useWorkEntries(year, month);
  const { settings, canRetry: settingsCanRetry } = useSettings();
  const minRefreshInterval = 1000; // 1 secondo

  useEffect(() => {
    if (entries.length > 0 && settings) {
      calculateSummary();
    } else {
      setSummary(null);
    }
  }, [entries, settings]);

  const calculateSummary = async () => {
    try {
      setIsLoading(true);
      const monthlySummary = CalculationService.calculateMonthlySummary(entries, settings);
      setSummary(monthlySummary);
      setError(null);
    } catch (err) {
      console.error('Error calculating monthly summary:', err);
      setError(err);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSummary = async (forceRefresh = false) => {
    // Prevenzione spam di refresh
    const now = Date.now();
    if (!forceRefresh && now - lastRefreshTime < minRefreshInterval) {
      console.log('Dashboard: Refresh troppo frequente, saltando...');
      return;
    }

    // Non tentare refresh se non ci sono retry disponibili
    if (!entriesCanRetry && !settingsCanRetry && !forceRefresh) {
      console.log('Dashboard: Nessun retry disponibile, saltando refresh...');
      return;
    }

    try {
      console.log('Dashboard: Refreshing summary and entries...');
      setLastRefreshTime(now);
      
      // Prima ricarica gli entries dal database
      await refreshEntries();
      // Il summary viene ricalcolato automaticamente tramite useEffect
      
      console.log('Dashboard: Refresh completed successfully');
    } catch (err) {
      console.error('Error refreshing summary:', err);
      setError(err);
    }
  };

  return {
    summary,
    isLoading,
    error,
    refreshSummary,
    canRefresh: entriesCanRetry || settingsCanRetry
  };
};
