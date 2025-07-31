// Debug script per verificare le configurazioni di reperibilità
const DatabaseService = require('./src/services/DatabaseService');
const { DEFAULT_SETTINGS } = require('./src/constants');

async function debugStandby() {
  try {
    console.log('=== DEBUG REPERIBILITÀ ===');
    
    // Inizializza database
    await DatabaseService.ensureInitialized();
    
    // Leggi le impostazioni correnti
    const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
    
    console.log('Settings caricate:', {
      standbyEnabled: settings?.standbySettings?.enabled,
      dailyAllowance: settings?.standbySettings?.dailyAllowance,
      standbyDaysCount: Object.keys(settings?.standbySettings?.standbyDays || {}).length,
      standbyDays: settings?.standbySettings?.standbyDays
    });
    
    // Test calcolo indennità per oggi
    const today = new Date().toISOString().slice(0, 10);
    console.log('Test per data odierna:', today);
    
    // Test con impostazioni fake
    const testSettings = {
      standbySettings: {
        enabled: true,
        dailyAllowance: 7.03,
        includeWeekends: true,
        includeHolidays: true,
        standbyDays: {
          '2025-07-25': { selected: true },
          '2025-07-26': { selected: true },
          '2025-07-27': { selected: true }
        }
      }
    };
    
    const CalculationService = require('./src/services/CalculationService');
    const calcService = new CalculationService();
    
    const allowances = calcService.calculateMonthlyStandbyAllowances(2025, 7, testSettings);
    console.log('Indennità calcolate per luglio 2025:', allowances);
    
  } catch (error) {
    console.error('Errore nel debug:', error);
  }
}

debugStandby();
