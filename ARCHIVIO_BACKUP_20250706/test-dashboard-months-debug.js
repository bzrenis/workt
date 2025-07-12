/**
 * Test per DEBUG del bug dei giorni lavorati nella Dashboard
 * Verifica il filtraggio per mese/anno e il conteggio dei giorni
 */

const DatabaseService = require('./src/services/DatabaseService').default;

async function testMonthFiltering() {
  console.log('🔍 === TEST FILTRAGGIO MESI DASHBOARD ===');
  
  try {
    // Test per mese attuale (Luglio 2025)
    console.log('\n📅 === MESE ATTUALE: LUGLIO 2025 (month=6, year=2025) ===');
    const currentEntries = await DatabaseService.getWorkEntries(2025, 7); // 7 = Luglio
    console.log(`✅ Entries caricate per Luglio 2025: ${currentEntries.length}`);
    
    if (currentEntries.length > 0) {
      console.log('📋 Dettaglio entries Luglio 2025:');
      currentEntries.forEach((entry, idx) => {
        const date = new Date(entry.date);
        console.log(`   ${idx + 1}. ${entry.date} (${date.toDateString()}) - ID: ${entry.id}`);
      });
    }
    
    // Test per mese precedente (Giugno 2025) 
    console.log('\n📅 === MESE PRECEDENTE: GIUGNO 2025 (month=5, year=2025) ===');
    const previousEntries = await DatabaseService.getWorkEntries(2025, 6); // 6 = Giugno
    console.log(`✅ Entries caricate per Giugno 2025: ${previousEntries.length}`);
    
    if (previousEntries.length > 0) {
      console.log('📋 Dettaglio entries Giugno 2025:');
      previousEntries.forEach((entry, idx) => {
        const date = new Date(entry.date);
        console.log(`   ${idx + 1}. ${entry.date} (${date.toDateString()}) - ID: ${entry.id}`);
      });
    }
    
    // Verifica tutte le entries per vedere se ci sono sovrapposizioni
    console.log('\n📊 === VERIFICA GENERALE DATABASE ===');
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`✅ Totale entries nel database: ${allEntries.length}`);
    
    if (allEntries.length > 0) {
      console.log('📋 Tutte le entries nel database:');
      allEntries.forEach((entry, idx) => {
        const date = new Date(entry.date);
        const month = date.getMonth() + 1; // 1-based
        const year = date.getFullYear();
        console.log(`   ${idx + 1}. ${entry.date} (${date.toDateString()}) - ${month}/${year} - ID: ${entry.id}`);
      });
      
      // Raggruppa per mese/anno per verificare la distribuzione
      const monthlyGroups = {};
      allEntries.forEach(entry => {
        const date = new Date(entry.date);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const key = `${month}/${year}`;
        
        if (!monthlyGroups[key]) {
          monthlyGroups[key] = [];
        }
        monthlyGroups[key].push(entry);
      });
      
      console.log('\n📈 === DISTRIBUZIONE PER MESE/ANNO ===');
      Object.keys(monthlyGroups).sort().forEach(key => {
        const entries = monthlyGroups[key];
        console.log(`${key}: ${entries.length} entries`);
        entries.forEach(entry => {
          console.log(`  - ${entry.date} (ID: ${entry.id})`);
        });
      });
    }
    
    // Test specifico per i calcoli della Dashboard
    console.log('\n🔍 === VERIFICA CALCOLI DASHBOARD ===');
    
    // Simula quello che fa la Dashboard per Luglio 2025
    console.log('📊 Calcolo per Luglio 2025:');
    const july2025 = await DatabaseService.getWorkEntries(2025, 7);
    console.log(`   - Entries caricate: ${july2025.length}`);
    console.log(`   - Dovrebbe mostrare giorni lavorati: ${july2025.length}`);
    
    // Simula quello che fa la Dashboard per Giugno 2025  
    console.log('📊 Calcolo per Giugno 2025:');
    const june2025 = await DatabaseService.getWorkEntries(2025, 6);
    console.log(`   - Entries caricate: ${june2025.length}`);
    console.log(`   - Dovrebbe mostrare giorni lavorati: ${june2025.length}`);
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testMonthFiltering().then(() => {
  console.log('\n✅ Test completato!');
}).catch(console.error);
