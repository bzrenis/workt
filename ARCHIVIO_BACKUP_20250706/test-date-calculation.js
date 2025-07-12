/**
 * Test per verificare il calcolo delle date nel DatabaseService
 */

function testDateCalculation() {
  console.log('🔍 === TEST CALCOLO DATE DATABASESERVICE ===');
  
  const year = 2025;
  const month = 6; // Giugno (1-based come nel DatabaseService)
  
  console.log(`📅 Input: year=${year}, month=${month} (Giugno)`);
  
  // Calcolo come nel DatabaseService
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  console.log(`\n🧮 Calcoli JavaScript Date:`);
  console.log(`   new Date(${year}, ${month - 1}, 1) = ${new Date(year, month - 1, 1).toISOString()}`);
  console.log(`   new Date(${year}, ${month}, 0) = ${new Date(year, month, 0).toISOString()}`);
  
  console.log(`\n📊 Risultati:`);
  console.log(`   startDate: ${startDate}`);
  console.log(`   endDate: ${endDate}`);
  
  console.log(`\n🎯 Verifica:`);
  console.log(`   startDate dovrebbe essere: 2025-06-01`);
  console.log(`   endDate dovrebbe essere: 2025-06-30`);
  
  const startCorrect = startDate === '2025-06-01';
  const endCorrect = endDate === '2025-06-30';
  
  console.log(`\n✅ Risultati:`);
  console.log(`   startDate: ${startCorrect ? '✅' : '❌'} ${startDate}`);
  console.log(`   endDate: ${endCorrect ? '✅' : '❌'} ${endDate}`);
  
  if (!endCorrect) {
    console.log(`\n❌ PROBLEMA TROVATO!`);
    console.log(`   endDate calcolato: ${endDate}`);
    console.log(`   endDate atteso: 2025-06-30`);
    console.log(`   La entry 2025-06-30 NON viene inclusa nel range!`);
  }
  
  // Test entry specifica
  const testEntry = '2025-06-30';
  const isInRange = testEntry >= startDate && testEntry <= endDate;
  console.log(`\n🔍 Test entry 2025-06-30:`);
  console.log(`   ${testEntry} >= ${startDate}: ${testEntry >= startDate}`);
  console.log(`   ${testEntry} <= ${endDate}: ${testEntry <= endDate}`);
  console.log(`   In range: ${isInRange ? '✅' : '❌'}`);
  
  return { startDate, endDate, startCorrect, endCorrect, entryInRange: isInRange };
}

// Esegui il test
const result = testDateCalculation();

if (!result.endCorrect || !result.entryInRange) {
  console.log(`\n🔧 SOLUZIONE:`);
  console.log(`   Il calcolo di endDate nel DatabaseService è sbagliato`);
  console.log(`   Serve fixare il metodo getWorkEntries`);
}
