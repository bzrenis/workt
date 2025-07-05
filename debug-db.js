/**
 * Script di debug per controllare lo stato del database
 */

import DatabaseService from './src/services/DatabaseService.js';

async function debugDatabase() {
  try {
    console.log('🔍 Debug database...');
    await DatabaseService.ensureInitialized();
    
    console.log('📋 Impostazioni attuali:');
    const settings = await DatabaseService.getSetting('appSettings');
    console.log('Settings:', JSON.stringify(settings, null, 2));
    
    console.log('\n📊 Contratto:');
    if (settings?.contract) {
      console.log('Contract exists:', !!settings.contract);
      console.log('Contract type:', typeof settings.contract);
      console.log('Monthly salary:', settings.contract.monthlySalary, typeof settings.contract.monthlySalary);
      console.log('Overtime rates:', !!settings.contract.overtimeRates);
    } else {
      console.log('❌ NO CONTRACT FOUND!');
    }
    
    console.log('\n🔧 NetCalculation:');
    console.log('NetCalculation:', settings?.netCalculation);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
}

debugDatabase();
