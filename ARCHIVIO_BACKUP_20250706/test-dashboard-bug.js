/**
 * Test per verificare il bug della Dashboard sui giorni lavorati
 * Controlla se i dati vengono filtrati correttamente per mese/anno
 */

const DatabaseService = require('./src/services/DatabaseService.js');

console.log('🔍 Test Debug Dashboard - Giorni Lavorati\n');

async function testDashboardData() {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript usa 0-based, DB usa 1-based
    const currentYear = currentDate.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    console.log(`📅 Data attuale: ${currentDate.toDateString()}`);
    console.log(`📅 Mese corrente: ${currentMonth}/${currentYear}`);
    console.log(`📅 Mese precedente: ${previousMonth}/${previousYear}\n`);
    
    // Test mese corrente
    console.log('🔍 MESE CORRENTE:');
    console.log(`   Chiamata: getWorkEntries(${currentYear}, ${currentMonth})`);
    const currentEntries = await DatabaseService.getWorkEntries(currentYear, currentMonth);
    console.log(`   ✅ Risultato: ${currentEntries.length} entries trovate`);
    
    if (currentEntries.length > 0) {
      console.log('   📋 Entries del mese corrente:');
      currentEntries.forEach((entry, index) => {
        const date = new Date(entry.date);
        console.log(`      ${index + 1}. ${date.toDateString()} (ID: ${entry.id})`);
      });
    }
    
    console.log('');
    
    // Test mese precedente
    console.log('🔍 MESE PRECEDENTE:');
    console.log(`   Chiamata: getWorkEntries(${previousYear}, ${previousMonth})`);
    const previousEntries = await DatabaseService.getWorkEntries(previousYear, previousMonth);
    console.log(`   ✅ Risultato: ${previousEntries.length} entries trovate`);
    
    if (previousEntries.length > 0) {
      console.log('   📋 Entries del mese precedente:');
      previousEntries.forEach((entry, index) => {
        const date = new Date(entry.date);
        console.log(`      ${index + 1}. ${date.toDateString()} (ID: ${entry.id})`);
      });
    }
    
    console.log('');
    
    // Test generale per vedere tutti i dati
    console.log('🔍 TUTTE LE ENTRIES NEL DB:');
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`   ✅ Totale entries nel database: ${allEntries.length}`);
    
    if (allEntries.length > 0) {
      console.log('   📋 Tutte le entries (per verifica):');
      allEntries.forEach((entry, index) => {
        const date = new Date(entry.date);
        const entryMonth = date.getMonth() + 1;
        const entryYear = date.getFullYear();
        console.log(`      ${index + 1}. ${date.toDateString()} - Mese: ${entryMonth}/${entryYear} (ID: ${entry.id})`);
      });
    }
    
    console.log('\n🎯 ANALISI:');
    console.log('===========');
    console.log(`📊 User report - Mese corrente: dovrebbe essere 4, Dashboard mostra 5`);
    console.log(`📊 User report - Mese precedente: dovrebbe essere 3, Dashboard mostra 2`);
    console.log(`📊 Database reality - Mese corrente: ${currentEntries.length} entries`);
    console.log(`📊 Database reality - Mese precedente: ${previousEntries.length} entries`);
    
    if (currentEntries.length !== 4) {
      console.log(`⚠️  PROBLEMA TROVATO nel mese corrente: database ha ${currentEntries.length} entries invece di 4`);
    }
    if (previousEntries.length !== 3) {
      console.log(`⚠️  PROBLEMA TROVATO nel mese precedente: database ha ${previousEntries.length} entries invece di 3`);
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

// Esegui il test
testDashboardData();
