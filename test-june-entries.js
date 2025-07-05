/**
 * Test per verificare TUTTE le entries di Giugno 2025 nel database
 * Per capire se abbiamo davvero 3 entries o solo 2
 */

// Non possiamo eseguire questo con Node.js, ma simulo la query SQL che dovrebbe essere eseguita

function simulateJuneDatabaseQuery() {
  console.log('🔍 === VERIFICA ENTRIES GIUGNO 2025 ===');
  
  // Questo è quello che il DatabaseService dovrebbe fare per Giugno 2025
  const year = 2025;
  const month = 6; // Giugno (1-based per DatabaseService)
  
  // Calcolo range come nel DatabaseService
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]; // 2025-06-01
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 2025-06-30
  
  console.log(`📅 Range calcolato per Giugno 2025:`);
  console.log(`   startDate: ${startDate}`);
  console.log(`   endDate: ${endDate}`);
  
  // Query SQL che viene eseguita
  const query = `SELECT * FROM work_entries WHERE date >= '${startDate}' AND date <= '${endDate}' ORDER BY date DESC`;
  console.log(`🔍 Query SQL: ${query}`);
  
  // Dalle tue evidenze, il database contiene:
  const allKnownEntries = [
    { id: 36, date: '2025-07-04' }, // Luglio
    { id: 29, date: '2025-07-03' }, // Luglio  
    { id: 26, date: '2025-07-02' }, // Luglio
    { id: 24, date: '2025-07-01' }, // Luglio
    { id: 21, date: '2025-06-30' }, // Giugno! ⭐ QUESTA DOVREBBE ESSERE NEL RANGE
    { id: 20, date: '2025-06-23' }, // Giugno
    { id: 22, date: '2025-06-21' }  // Giugno
  ];
  
  console.log(`\n📊 Analisi entries conosciute:`);
  allKnownEntries.forEach(entry => {
    const isInJuneRange = entry.date >= startDate && entry.date <= endDate;
    const monthFromDate = new Date(entry.date).getMonth() + 1; // 1-based
    console.log(`   ${entry.date} (ID: ${entry.id}) - Range: ${isInJuneRange ? '✅' : '❌'} - Mese: ${monthFromDate}`);
  });
  
  const juneEntries = allKnownEntries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  
  console.log(`\n🎯 RISULTATO:`);
  console.log(`   Entries che DOVREBBERO essere trovate per Giugno 2025: ${juneEntries.length}`);
  console.log(`   Entries che il DatabaseService HA TROVATO: 2`);
  
  if (juneEntries.length > 2) {
    console.log(`\n❌ PROBLEMA IDENTIFICATO:`);
    console.log(`   Il DatabaseService non trova tutte le entries di Giugno!`);
    console.log(`   Entries mancanti:`);
    juneEntries.forEach((entry, idx) => {
      if (idx >= 2) { // Oltre le 2 trovate
        console.log(`     - ${entry.date} (ID: ${entry.id})`);
      }
    });
    
    console.log(`\n🔍 POSSIBILI CAUSE:`);
    console.log(`   1. Entry non committata nel database`);
    console.log(`   2. Problema di trasformazione date`);
    console.log(`   3. Query SQL con problema di indici`);
    console.log(`   4. Cache del database non aggiornata`);
  } else {
    console.log(`\n✅ TUTTO OK:`);
    console.log(`   Il DatabaseService trova correttamente tutte le entries di Giugno`);
    console.log(`   Il problema potrebbe essere che non hai davvero 3 entries ma solo 2`);
  }
  
  return juneEntries;
}

// Simula la verifica
const result = simulateJuneDatabaseQuery();
console.log(`\n📋 Entries Giugno trovate: ${result.length}`);
result.forEach(entry => {
  console.log(`   ${entry.date} (ID: ${entry.id})`);
});
