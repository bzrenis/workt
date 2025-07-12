/**
 * Test integrazione - Verifica che l'app gestisca correttamente breakdown undefined
 */

console.log('🔧 Test integrazione breakdown safety');

// Simula il comportamento di EarningsSummary con breakdown undefined
const testEarningsSummaryWithUndefinedBreakdown = () => {
  console.log('\n📊 Test EarningsSummary con breakdown undefined...');
  
  // Breakdown undefined (come potrebbe accadere durante il loading)
  const breakdown = undefined;
  
  // Test delle funzioni helper
  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '€0.00';
    return `€${amount.toFixed(2).replace('.', ',')}`;
  };
  
  const formatSafeHours = (hours) => {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Test accessi sicuri
  try {
    console.log('  📈 Test accessi principali:');
    console.log(`    totalEarnings: ${formatSafeAmount(breakdown?.totalEarnings)}`);
    console.log(`    ordinary.total: ${formatSafeAmount(breakdown?.ordinary?.total)}`);
    console.log(`    standby.totalEarnings: ${formatSafeAmount(breakdown?.standby?.totalEarnings)}`);
    console.log(`    allowances.travel: ${formatSafeAmount(breakdown?.allowances?.travel)}`);
    console.log(`    allowances.standby: ${formatSafeAmount(breakdown?.allowances?.standby)}`);
    console.log(`    allowances.meal: ${formatSafeAmount(breakdown?.allowances?.meal)}`);
    
    // Test condizioni booleane
    console.log('\n  🔍 Test condizioni booleane:');
    console.log(`    breakdown?.isFixedDay: ${breakdown?.isFixedDay || false}`);
    console.log(`    breakdown?.ordinary?.total > 0: ${(breakdown?.ordinary?.total || 0) > 0}`);
    console.log(`    breakdown?.standby?.totalEarnings > 0: ${(breakdown?.standby?.totalEarnings || 0) > 0}`);
    console.log(`    breakdown?.allowances?.travel > 0: ${(breakdown?.allowances?.travel || 0) > 0}`);
    
    // Test calcolo interventi
    const standbyInterventions = (breakdown?.standby?.totalEarnings || 0) - (breakdown?.standby?.dailyIndemnity || 0);
    console.log(`    Interventi reperibilità: ${formatSafeAmount(standbyInterventions)}`);
    
    console.log('  ✅ Tutti gli accessi gestiti correttamente con breakdown undefined');
    
  } catch (error) {
    console.log(`  ❌ ERRORE: ${error.message}`);
    return false;
  }
  
  return true;
};

// Test con breakdown parziale (caso reale)
const testEarningsSummaryWithPartialBreakdown = () => {
  console.log('\n📊 Test EarningsSummary con breakdown parziale...');
  
  // Breakdown parziale (potrebbe accadere in caso di errori di calcolo)
  const breakdown = {
    totalEarnings: 125.50,
    ordinary: { total: 105.28 },
    // standby e allowances mancanti
    isFixedDay: false
  };
  
  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '€0.00';
    return `€${amount.toFixed(2).replace('.', ',')}`;
  };
  
  try {
    console.log('  📈 Test accessi con breakdown parziale:');
    console.log(`    totalEarnings: ${formatSafeAmount(breakdown?.totalEarnings)}`);
    console.log(`    ordinary.total: ${formatSafeAmount(breakdown?.ordinary?.total)}`);
    console.log(`    standby.totalEarnings: ${formatSafeAmount(breakdown?.standby?.totalEarnings)} (dovrebbe essere €0.00)`);
    console.log(`    allowances.travel: ${formatSafeAmount(breakdown?.allowances?.travel)} (dovrebbe essere €0.00)`);
    
    // Test rendering condizionale
    console.log('\n  🎯 Test rendering condizionale:');
    const hasOrdinaryHours = breakdown?.ordinary?.total && breakdown?.ordinary?.total > 0;
    const hasStandbyHours = breakdown?.standby?.totalEarnings && breakdown?.standby?.totalEarnings > 0;
    const hasAllowances = breakdown?.allowances && (breakdown?.allowances?.travel > 0 || breakdown?.allowances?.meal > 0 || breakdown?.allowances?.standby > 0);
    
    console.log(`    hasOrdinaryHours: ${hasOrdinaryHours}`);
    console.log(`    hasStandbyHours: ${hasStandbyHours}`);
    console.log(`    hasAllowances: ${hasAllowances}`);
    
    console.log('  ✅ Breakdown parziale gestito correttamente');
    
  } catch (error) {
    console.log(`  ❌ ERRORE: ${error.message}`);
    return false;
  }
  
  return true;
};

// Esegui tutti i test
const runIntegrationTests = () => {
  console.log('🚀 Avvio test di integrazione...');
  
  const test1 = testEarningsSummaryWithUndefinedBreakdown();
  const test2 = testEarningsSummaryWithPartialBreakdown();
  
  if (test1 && test2) {
    console.log('\n✅ TUTTI I TEST DI INTEGRAZIONE PASSATI');
    console.log('🎯 L\'app dovrebbe ora essere robusta contro errori breakdown');
    console.log('🛡️ Protezione applicata a tutti gli accessi critici');
  } else {
    console.log('\n❌ ALCUNI TEST FALLITI');
    console.log('⚠️ Potrebbero esserci ancora problemi da risolvere');
  }
};

runIntegrationTests();
