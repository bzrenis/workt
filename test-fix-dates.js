// Test del fix delle date

function testFixedDateCalculation() {
  console.log('🔍 === TEST FIX CALCOLO DATE ===');
  
  const year = 2025;
  const month = 6; // Giugno
  
  // Nuovo calcolo (come nel fix)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  
  console.log(`📅 Input: year=${year}, month=${month} (Giugno)`);
  console.log(`🔢 Giorni in Giugno 2025: ${daysInMonth}`);
  console.log(`📊 Risultati:`);
  console.log(`   startDate: ${startDate}`);
  console.log(`   endDate: ${endDate}`);
  
  console.log(`\n🎯 Verifica:`);
  console.log(`   startDate dovrebbe essere: 2025-06-01 ${startDate === '2025-06-01' ? '✅' : '❌'}`);
  console.log(`   endDate dovrebbe essere: 2025-06-30 ${endDate === '2025-06-30' ? '✅' : '❌'}`);
  
  // Test entry problematica
  const testEntry = '2025-06-30';
  const isInRange = testEntry >= startDate && testEntry <= endDate;
  console.log(`\n🔍 Test entry problematica:`);
  console.log(`   ${testEntry} >= ${startDate}: ${testEntry >= startDate}`);
  console.log(`   ${testEntry} <= ${endDate}: ${testEntry <= endDate}`);
  console.log(`   In range: ${isInRange ? '✅' : '❌'}`);
  
  if (isInRange) {
    console.log(`\n🎉 FIX RIUSCITO!`);
    console.log(`   La entry 2025-06-30 ora SARÀ inclusa nel range di Giugno`);
    console.log(`   Giugno dovrebbe mostrare 3 giorni lavorati invece di 2`);
  }
  
  return { startDate, endDate, isInRange };
}

testFixedDateCalculation();
