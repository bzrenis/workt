// Test rapido per verificare il database e le entries
const DatabaseService = require('./src/services/DatabaseService');

async function debugDatabaseEntries() {
  console.log('🔍 DEBUG: Verifica entries nel database\n');

  try {
    // Test 1: Verifica tutte le entries nel database
    console.log('📊 Test 1: Tutte le entries nel database');
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`   Total entries in DB: ${allEntries.length}`);
    
    if (allEntries.length > 0) {
      console.log('   Sample entries:');
      allEntries.slice(0, 5).forEach(entry => {
        console.log(`     - ID: ${entry.id}, Date: ${entry.date}, Work: ${entry.workHours}h`);
      });
    }

    // Test 2: Entries per Luglio 2025 (mese corrente)
    console.log('\n📅 Test 2: Entries per Luglio 2025');
    const julyEntries = await DatabaseService.getWorkEntries(2025, 7);
    console.log(`   July 2025 entries: ${julyEntries.length}`);
    
    if (julyEntries.length > 0) {
      julyEntries.forEach(entry => {
        console.log(`     - ${entry.date}: ${entry.workHours}h lavoro, ${entry.travelHours}h viaggio`);
      });
    } else {
      console.log('   ❌ Nessuna entry trovata per Luglio 2025!');
      console.log('   💡 Possibili cause:');
      console.log('     - Database vuoto');
      console.log('     - Problema nel metodo getWorkEntries');
      console.log('     - Date range incorrette');
    }

    // Test 3: Verifica struttura tabella
    console.log('\n🗃️ Test 3: Verifica struttura tabella');
    // Se hai un metodo per verificare la struttura, usalo qui
    
    console.log('\n✅ Debug completato!');

  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

debugDatabaseEntries();
