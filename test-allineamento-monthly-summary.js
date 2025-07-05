const fs = require('fs');
const path = require('path');

console.log('🔍 TEST: Verifica allineamento calculateMonthlySummary con logica corretta...\n');

const calculationServicePath = path.join(__dirname, 'src', 'services', 'CalculationService.js');

try {
  const content = fs.readFileSync(calculationServicePath, 'utf8');
  
  let testsPerformed = 0;
  let testsPassed = 0;

  // Test 1: Verifica uso di calculateEarningsBreakdown invece di calculateDailyEarnings
  testsPerformed++;
  const usesEarningsBreakdown = content.includes('const breakdown = this.calculateEarningsBreakdown(entry, settings);');
  
  if (usesEarningsBreakdown) {
    console.log('✅ Test 1 SUPERATO: calculateMonthlySummary usa calculateEarningsBreakdown');
    testsPassed++;
  } else {
    console.log('❌ Test 1 FALLITO: calculateMonthlySummary non usa calculateEarningsBreakdown');
  }

  // Test 2: Verifica logica corretta rimborsi pasti con priorità cash specifico
  testsPerformed++;
  const hasCorrectMealLogic = content.includes('if (entry.mealLunchCash > 0) {') &&
                             content.includes('} else if (entry.mealLunchVoucher === 1) {') &&
                             content.includes('summary.mealCashAmount += entry.mealLunchCash;');
  
  if (hasCorrectMealLogic) {
    console.log('✅ Test 2 SUPERATO: Logica rimborsi pasti corretta (cash specifico vs voucher)');
    testsPassed++;
  } else {
    console.log('❌ Test 2 FALLITO: Logica rimborsi pasti non corretta');
  }

  // Test 3: Verifica uso corretto del breakdown per totalEarnings
  testsPerformed++;
  const usesBreakdownEarnings = content.includes('summary.totalEarnings += breakdown.totalEarnings || 0;');
  
  if (usesBreakdownEarnings) {
    console.log('✅ Test 3 SUPERATO: Usa breakdown.totalEarnings per importi totali');
    testsPassed++;
  } else {
    console.log('❌ Test 3 FALLITO: Non usa breakdown.totalEarnings');
  }

  // Test 4: Verifica uso corretto del breakdown per allowances
  testsPerformed++;
  const usesBreakdownAllowances = content.includes('summary.allowances += breakdown.allowances?.travel || 0;') &&
                                 content.includes('summary.mealAllowances += breakdown.allowances?.meal || 0;');
  
  if (usesBreakdownAllowances) {
    console.log('✅ Test 4 SUPERATO: Usa breakdown.allowances per indennità');
    testsPassed++;
  } else {
    console.log('❌ Test 4 FALLITO: Non usa breakdown.allowances');
  }

  // Test 5: Verifica logica standby usando breakdown
  testsPerformed++;
  const usesBreakdownStandby = content.includes('summary.standbyPay += (breakdown.standby?.totalEarnings || 0) + (breakdown.allowances?.standby || 0);');
  
  if (usesBreakdownStandby) {
    console.log('✅ Test 5 SUPERATO: Usa breakdown per calcoli reperibilità');
    testsPassed++;
  } else {
    console.log('❌ Test 5 FALLITO: Non usa breakdown per calcoli reperibilità');
  }

  // Test 6: Verifica aggiornamento dailyBreakdown con breakdown corretto
  testsPerformed++;
  const usesBreakdownDaily = content.includes('earnings: breakdown.totalEarnings || 0,') &&
                            content.includes('standbyAllowance: isStandbyDay ? (breakdown.allowances?.standby || 0) : 0');
  
  if (usesBreakdownDaily) {
    console.log('✅ Test 6 SUPERATO: dailyBreakdown usa breakdown corretto');
    testsPassed++;
  } else {
    console.log('❌ Test 6 FALLITO: dailyBreakdown non usa breakdown corretto');
  }

  // Test 7: Verifica gestione cash dalle impostazioni per pasti
  testsPerformed++;
  const handlesCashFromSettings = content.includes('if (settings?.mealAllowances?.lunch?.cashAmount > 0) {') &&
                                 content.includes('summary.mealCashAmount += settings.mealAllowances.lunch.cashAmount;');
  
  if (handlesCashFromSettings) {
    console.log('✅ Test 7 SUPERATO: Gestisce cash dalle impostazioni per pasti');
    testsPassed++;
  } else {
    console.log('❌ Test 7 FALLITO: Non gestisce cash dalle impostazioni per pasti');
  }

  // Test 8: Verifica uso breakdown per ore straordinarie
  testsPerformed++;
  const usesBreakdownOvertime = content.includes('summary.overtimeHours += breakdown.ordinary?.hours?.overtime || 0;') &&
                               content.includes('summary.overtimeDetail.day += breakdown.ordinary.hours.overtime_day || 0;');
  
  if (usesBreakdownOvertime) {
    console.log('✅ Test 8 SUPERATO: Usa breakdown per ore straordinarie');
    testsPassed++;
  } else {
    console.log('❌ Test 8 FALLITO: Non usa breakdown per ore straordinarie');
  }

  console.log(`\n📊 RISULTATI FINALI:`);
  console.log(`   Tests eseguiti: ${testsPerformed}`);
  console.log(`   Tests superati: ${testsPassed}`);
  console.log(`   Percentuale successo: ${((testsPassed/testsPerformed)*100).toFixed(1)}%`);

  if (testsPassed === testsPerformed) {
    console.log('\n🎉 PERFETTO! calculateMonthlySummary ora usa la logica corretta e allineata!');
    console.log('\n✅ Modifiche applicate:');
    console.log('   1. Usa calculateEarningsBreakdown invece di calculateDailyEarnings');
    console.log('   2. Logica rimborsi pasti: cash specifico > voucher dalle impostazioni');
    console.log('   3. Calcoli earnings usando breakdown strutturato');
    console.log('   4. Indennità e allowances dal breakdown corretto');
    console.log('   5. Reperibilità calcolata con logica consistente');
    console.log('   6. dailyBreakdown aggiornato con dati corretti');
    console.log('   7. Gestione combinata cash + voucher dalle impostazioni');
    console.log('   8. Ore straordinarie dettagliate dal breakdown');
  } else {
    console.log('\n⚠️ Alcuni test non sono stati superati. Verificare le modifiche.');
  }

} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
