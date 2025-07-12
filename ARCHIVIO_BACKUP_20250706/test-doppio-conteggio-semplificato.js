// Test semplificato per verificare il doppio conteggio dell'indennità di reperibilità
console.log('\n=== TEST DOPPIO CONTEGGIO INDENNITÀ REPERIBILITÀ ===');

// Simula il comportamento dei metodi di CalculationService per verificare il problema

// 1. Simulazione calculateStandbyBreakdown - restituisce totalEarnings che INCLUDE l'indennità
function simulateStandbyBreakdown() {
  const earnings = {
    work: { ordinary: 16.41 }, // 1h intervento a tariffa base
    travel: {}
  };
  const dailyIndemnity = 7.03; // Indennità feriale 24h
  
  const totalEarnings = Object.values(earnings.work).reduce((a, b) => a + b, 0) + 
                       Object.values(earnings.travel).reduce((a, b) => a + b, 0) + 
                       dailyIndemnity; // <-- INDENNITÀ INCLUSA QUI
  
  return {
    dailyIndemnity: dailyIndemnity,
    workEarnings: earnings.work,
    travelEarnings: earnings.travel,
    totalEarnings: totalEarnings // Include già l'indennità
  };
}

// 2. Simulazione calculateEarningsBreakdown - somma tutto incluso standby.totalEarnings
function simulateEarningsBreakdown() {
  const ordinaryTotal = 114.87; // 7h lavoro normale
  const standbyBreakdown = simulateStandbyBreakdown();
  
  const allowances = {
    travel: 0,
    standby: 7.03, // <-- INDENNITÀ CONTATA QUI (PRIMA VOLTA)
    meal: 0
  };
  
  // Il calcolo problematico
  const totalEarnings = ordinaryTotal + 
                       (allowances.travel || 0) + 
                       (allowances.standby || 0) +  // <-- PRIMA VOLTA: 7.03€
                       (standbyBreakdown ? standbyBreakdown.totalEarnings : 0); // <-- SECONDA VOLTA: include altri 7.03€
  
  return {
    ordinary: { total: ordinaryTotal },
    standby: standbyBreakdown,
    allowances: allowances,
    totalEarnings: totalEarnings
  };
}

// 3. Simulazione calculateDailyEarnings - calcolo corretto (una sola volta)
function simulateDailyEarnings() {
  const regularPay = 114.87; // 7h lavoro normale
  const standbyWorkPay = 16.41; // 1h intervento reperibilità
  const standbyAllowance = 7.03; // Indennità giornaliera
  
  const total = regularPay + standbyWorkPay + standbyAllowance; // <-- INDENNITÀ CONTATA UNA SOLA VOLTA
  
  return {
    regularPay,
    standbyWorkPay,
    standbyAllowance,
    total
  };
}

// Esecuzione test
console.log('\n--- ANALISI DEL PROBLEMA ---');

const standbyBreakdown = simulateStandbyBreakdown();
console.log('1. standbyBreakdown.totalEarnings:', standbyBreakdown.totalEarnings.toFixed(2), '€');
console.log('   - Guadagni interventi:', Object.values(standbyBreakdown.workEarnings).reduce((a, b) => a + b, 0).toFixed(2), '€');
console.log('   - Indennità giornaliera:', standbyBreakdown.dailyIndemnity.toFixed(2), '€');

const earningsBreakdown = simulateEarningsBreakdown();
console.log('\n2. earningsBreakdown (PROBLEMATICO):');
console.log('   - Lavoro ordinario:', earningsBreakdown.ordinary.total.toFixed(2), '€');
console.log('   - allowances.standby:', earningsBreakdown.allowances.standby.toFixed(2), '€', '<-- PRIMA volta indennità');
console.log('   - standby.totalEarnings:', earningsBreakdown.standby.totalEarnings.toFixed(2), '€', '<-- Include GIÀ l\'indennità');
console.log('   - TOTALE:', earningsBreakdown.totalEarnings.toFixed(2), '€');

const dailyEarnings = simulateDailyEarnings();
console.log('\n3. dailyEarnings (CORRETTO):');
console.log('   - Lavoro ordinario:', dailyEarnings.regularPay.toFixed(2), '€');
console.log('   - Lavoro reperibilità:', dailyEarnings.standbyWorkPay.toFixed(2), '€');
console.log('   - Indennità reperibilità:', dailyEarnings.standbyAllowance.toFixed(2), '€', '<-- UNA sola volta');
console.log('   - TOTALE:', dailyEarnings.total.toFixed(2), '€');

console.log('\n--- RISULTATI ---');
console.log('- earningsBreakdown.totalEarnings:', earningsBreakdown.totalEarnings.toFixed(2), '€');
console.log('- dailyEarnings.total:', dailyEarnings.total.toFixed(2), '€');
console.log('- Differenza (doppio conteggio):', (earningsBreakdown.totalEarnings - dailyEarnings.total).toFixed(2), '€');

if (Math.abs(earningsBreakdown.totalEarnings - dailyEarnings.total) > 0.01) {
  console.log('\n🚨 PROBLEMA CONFERMATO: Doppio conteggio dell\'indennità di reperibilità!');
  console.log('   L\'indennità di', earningsBreakdown.allowances.standby.toFixed(2), '€ viene contata due volte:');
  console.log('   1. In allowances.standby');
  console.log('   2. In standby.totalEarnings (che già la include)');
  
  console.log('\n--- SOLUZIONE ---');
  console.log('Modificare il calcolo in calculateEarningsBreakdown:');
  console.log('PRIMA (problematico):');
  console.log('  result.totalEarnings = result.ordinary.total +');
  console.log('                        (result.allowances.travel || 0) +');
  console.log('                        (result.allowances.standby || 0) +  // <-- RIMUOVERE');
  console.log('                        (result.standby ? result.standby.totalEarnings : 0);');
  console.log('');
  console.log('DOPO (corretto):');
  console.log('  result.totalEarnings = result.ordinary.total +');
  console.log('                        (result.allowances.travel || 0) +');
  console.log('                        (result.standby ? result.standby.totalEarnings : 0);');
  
  // Calcolo corretto
  const correctTotal = earningsBreakdown.ordinary.total + 
                      (earningsBreakdown.allowances.travel || 0) + 
                      (earningsBreakdown.standby ? earningsBreakdown.standby.totalEarnings : 0);
  console.log('\n   Totale corretto:', correctTotal.toFixed(2), '€');
  console.log('   Conferma coerenza con dailyEarnings:', correctTotal.toFixed(2) === dailyEarnings.total.toFixed(2) ? '✓' : '✗');
} else {
  console.log('\n✓ Nessun doppio conteggio rilevato');
}
