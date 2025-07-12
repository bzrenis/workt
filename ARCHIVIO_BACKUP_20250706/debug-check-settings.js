/**
 * 🔍 DEBUG SETTINGS CARICATE DAL DATABASE
 * 
 * Verifica quali impostazioni sono salvate nel database
 */

const DatabaseService = require('./src/services/DatabaseService');

async function checkDatabaseSettings() {
  try {
    await DatabaseService.ensureInitialized();
    
    console.log('🔍 VERIFICA IMPOSTAZIONI DATABASE\n');
    
    // Carica le impostazioni dal database
    const settings = await DatabaseService.getSetting('appSettings');
    
    console.log('📊 Settings complete dal database:');
    console.log(JSON.stringify(settings, null, 2));
    
    console.log('\n🍽️ Meal Allowances dal database:');
    if (settings?.mealAllowances) {
      console.log('- Lunch:', JSON.stringify(settings.mealAllowances.lunch, null, 2));
      console.log('- Dinner:', JSON.stringify(settings.mealAllowances.dinner, null, 2));
    } else {
      console.log('❌ mealAllowances non trovate');
    }
    
    console.log('\n🚗 Travel Allowance dal database:');
    if (settings?.travelAllowance) {
      console.log('- Travel:', JSON.stringify(settings.travelAllowance, null, 2));
    } else {
      console.log('❌ travelAllowance non trovate');
    }
    
    console.log('\n📋 Contratto dal database:');
    if (settings?.contract) {
      console.log('- Contract:', JSON.stringify(settings.contract, null, 2));
    } else {
      console.log('❌ contract non trovate');
    }
    
    // Test merge con defaultSettings
    console.log('\n🔧 TEST MERGE CON DEFAULT SETTINGS:');
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
        dailyIndemnity: 7.5,
        travelWithBonus: false
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 }
      }
    };
    
    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
    };
    
    console.log('Risultato merge:');
    console.log('- Meal Allowances:', JSON.stringify(safeSettings.mealAllowances, null, 2));
    console.log('- Travel Allowance:', JSON.stringify(settings?.travelAllowance, null, 2));
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

checkDatabaseSettings();
