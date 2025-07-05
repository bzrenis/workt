/**
 * utilities/earningsHelper.js
 * Funzioni helper per la gestione unificata dei calcoli dei guadagni
 */
import CalculationService from '../services/CalculationService';

// Cache per memorizzare i risultati dei calcoli e migliorare le performance
const breakdownCache = new Map();

// Funzione per generare una chiave di cache basata su entry e settings
const generateCacheKey = (item, settings) => {
  const itemKey = item.id ? `${item.id}-${item.date}` : JSON.stringify(item);
  const settingsKey = JSON.stringify({
    hourlyRate: settings?.contract?.hourlyRate,
    dailyRate: settings?.contract?.dailyRate,
    travelRate: settings?.travelCompensationRate,
    standbyRate: settings?.standbySettings?.dailyAllowance,
  });
  return `${itemKey}-${settingsKey}`;
};

/**
 * Crea un oggetto work entry dal modello di dati nell'archivio
 * @param {Object} item - Entry dal database
 * @returns {Object} - Work entry nel formato atteso dal CalculationService
 */
export const createWorkEntryFromData = (item) => {
  return {
    date: item.date,
    siteName: item.site_name || '',
    vehicleDriven: item.veicolo || '',
    departureCompany: item.viaggi?.[0]?.departure_company || '',
    arrivalSite: item.viaggi?.[0]?.arrival_site || '',
    workStart1: item.viaggi?.[0]?.work_start_1 || '',
    workEnd1: item.viaggi?.[0]?.work_end_1 || '',
    workStart2: item.viaggi?.[0]?.work_start_2 || '',
    workEnd2: item.viaggi?.[0]?.work_end_2 || '',
    departureReturn: item.viaggi?.[0]?.departure_return || '',
    arrivalCompany: item.viaggi?.[0]?.arrival_company || '',
    interventi: item.interventi || [],
    mealLunchVoucher: item.pasti?.pranzo === 1 ? 1 : 0,
    mealLunchCash: parseFloat(item.mealLunchCash) || 0,
    mealDinnerVoucher: item.pasti?.cena === 1 ? 1 : 0,
    mealDinnerCash: parseFloat(item.mealDinnerCash) || 0,
    travelAllowance: item.trasferta === 1 ? 1 : 0,
    travelAllowancePercent: item.trasfertaPercent || 1.0,
    isStandbyDay: item.reperibilita === 1 ? 1 : 0,
    standbyAllowance: item.reperibilita === 1 ? 1 : 0,
    completamentoGiornata: item.completamentoGiornata || 'nessuno',
    isHoliday: item.is_holiday === 1
  };
};

/**
 * Garantisce che le impostazioni abbiano tutti i valori di default necessari
 * @param {Object} settings - Impostazioni originali 
 * @returns {Object} - Impostazioni con valori di default
 */
export const getSafeSettings = (settings) => {
  const defaultSettings = {
    contract: { 
      dailyRate: 109.19,
      hourlyRate: 16.41,
      overtimeRates: {
        day: 1.2,
        nightUntil22: 1.25,
        nightAfter22: 1.35,
        holiday: 1.3,
        nightHoliday: 1.5
      }
    },
    travelCompensationRate: 1.0,
    standbySettings: {
      dailyAllowance: 7.5,
      dailyIndemnity: 7.5
    },
    mealAllowances: {
      lunch: { voucherAmount: 5.29 },
      dinner: { voucherAmount: 5.29 }
    }
  };
  
  // Merge settings 
  return {
    ...defaultSettings,
    ...(settings || {}),
    contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
    standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
    mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
  };
};

/**
 * Calcola il breakdown degli earnings utilizzando lo stesso servizio usato nel form
 * Implementa caching per migliorare le performance e gestione degli errori
 * @param {Object} item - Elemento dal database
 * @param {Object} settings - Impostazioni dell'applicazione
 * @returns {Object} - Breakdown calcolato
 */
export const calculateItemBreakdown = (item, settings) => {
  try {
    // Genera una chiave di cache unica per questa combinazione item+settings
    const cacheKey = generateCacheKey(item, settings);
    
    // Verifica se il risultato è già in cache
    if (breakdownCache.has(cacheKey)) {
      return breakdownCache.get(cacheKey);
    }
    
    // Se non in cache, calcola normalmente
    const workEntry = createWorkEntryFromData(item);
    const safeSettings = getSafeSettings(settings);
    
    // Calcola con gestione degli errori
    let result;
    try {
      result = CalculationService.calculateEarningsBreakdown(workEntry, safeSettings);
    } catch (calcError) {
      console.warn('Errore nel calcolo del breakdown:', calcError);
      // Restituisci un breakdown vuoto ma valido in caso di errore di calcolo
      result = {
        ordinary: { hours: {}, earnings: {}, total: 0 },
        standby: { workHours: {}, workEarnings: { total: 0 }, travelHours: {}, travelEarnings: { total: 0 } },
        allowances: { travel: 0, meal: 0, standby: 0 },
        total: 0
      };
    }
    
    // Salva in cache il risultato
    breakdownCache.set(cacheKey, result);
    
    // Limita la dimensione della cache (max 100 entries)
    if (breakdownCache.size > 100) {
      const firstKey = breakdownCache.keys().next().value;
      breakdownCache.delete(firstKey);
    }
    
    return result;
  } catch (error) {
    console.error('Errore critico nel calcolo del breakdown:', error);
    // Restituisci un breakdown di fallback
    return {
      ordinary: { hours: {}, earnings: {}, total: 0 },
      standby: { workHours: {}, workEarnings: { total: 0 }, travelHours: {}, travelEarnings: { total: 0 } },
      allowances: { travel: 0, meal: 0, standby: 0 },
      total: 0
    };
  }
};

/**
 * Formatta le ore in un formato leggibile
 * @param {Number} hours - Ore da formattare
 * @returns {String} - Stringa formattata "ore:minuti"
 */
export const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Formatta valori monetari secondo standard italiano
 * @param {Number} value - Valore da formattare
 * @param {Boolean} includeCurrency - Se includere il simbolo €
 * @returns {String} - Stringa formattata (es. "123,45")
 */
export const formatEuroValue = (value, includeCurrency = false) => {
  if (value === undefined || value === null) return '0,00';
  
  const formatted = value.toFixed(2).replace('.', ',');
  return includeCurrency ? `${formatted} €` : formatted;
};

/**
 * Pulisce la cache dei calcoli (da usare quando cambiano le impostazioni)
 */
export const clearBreakdownCache = () => {
  breakdownCache.clear();
};
