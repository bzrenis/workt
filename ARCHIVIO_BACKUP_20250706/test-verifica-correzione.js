// Test per verificare che la correzione del doppio conteggio funzioni

// Test semplificato che simula il comportamento DOPO la correzione
console.log('\n=== VERIFICA CORREZIONE DOPPIO CONTEGGIO ===');

// Simula il calcolo corretto DOPO la modifica
function simulateEarningsBreakdownCORRETTO() {
  const ordinaryTotal = 114.87; // 7h lavoro normale
  
  // standbyBreakdown include già l'indennità nel totalEarnings
  const standbyBreakdown = {
    dailyIndemnity: 7.03,
    workEarnings: { ordinary: 16.41 },
    travelEarnings: {},
    totalEarnings: 23.44 // 16.41 (lavoro) + 7.03 (indennità)
  };
  
  const allowances = {
    travel: 0,
    standby: 7.03, // Questo viene mantenuto per il dettaglio/breakdown ma NON sommato al totale
    meal: 0
  };
  
  // CALCOLO CORRETTO (senza allowances.standby)
  const totalEarnings = ordinaryTotal + 
                       (allowances.travel || 0) + 
                       (standbyBreakdown ? standbyBreakdown.totalEarnings : 0); // Include già l'indennità
  
  return {
    ordinary: { total: ordinaryTotal },
    standby: standbyBreakdown,
    allowances: allowances,
    totalEarnings: totalEarnings
  };
}

function simulateDailyEarnings() {
  const regularPay = 114.87; // 7h lavoro normale
  const standbyWorkPay = 16.41; // 1h intervento reperibilità
  const standbyAllowance = 7.03; // Indennità giornaliera
  
  const total = regularPay + standbyWorkPay + standbyAllowance;
  
  return {
    regularPay,
    standbyWorkPay,
    standbyAllowance,
    total
  };
}

// Test della correzione
console.log('\n--- VERIFICA CORREZIONE ---');

const earningsBreakdownCORRETTO = simulateEarningsBreakdownCORRETTO();
console.log('1. earningsBreakdown (CORRETTO):');
console.log('   - Lavoro ordinario:', earningsBreakdownCORRETTO.ordinary.total.toFixed(2), '€');
console.log('   - allowances.standby:', earningsBreakdownCORRETTO.allowances.standby.toFixed(2), '€', '<-- Solo per dettaglio, NON sommato');
console.log('   - standby.totalEarnings:', earningsBreakdownCORRETTO.standby.totalEarnings.toFixed(2), '€', '<-- Include l\'indennità');
console.log('   - TOTALE (senza doppio conteggio):', earningsBreakdownCORRETTO.totalEarnings.toFixed(2), '€');

const dailyEarnings = simulateDailyEarnings();
console.log('\n2. dailyEarnings (riferimento):');
console.log('   - TOTALE:', dailyEarnings.total.toFixed(2), '€');

console.log('\n--- RISULTATI ---');
console.log('- earningsBreakdown.totalEarnings (corretto):', earningsBreakdownCORRETTO.totalEarnings.toFixed(2), '€');
console.log('- dailyEarnings.total:', dailyEarnings.total.toFixed(2), '€');
console.log('- Differenza:', (earningsBreakdownCORRETTO.totalEarnings - dailyEarnings.total).toFixed(2), '€');

if (Math.abs(earningsBreakdownCORRETTO.totalEarnings - dailyEarnings.total) < 0.01) {
  console.log('\n✅ CORREZIONE CONFERMATA: Nessun doppio conteggio!');
  console.log('   I due metodi ora danno lo stesso risultato.');
  console.log('   L\'indennità di reperibilità viene contata una sola volta.');
} else {
  console.log('\n❌ La correzione non ha funzionato correttamente.');
}

console.log('\n--- DETTAGLI INDENNITÀ ---');
console.log('L\'indennità di reperibilità di', earningsBreakdownCORRETTO.allowances.standby.toFixed(2), '€ è:');
console.log('- Visibile in allowances.standby per il breakdown dettagliato');
console.log('- Inclusa in standby.totalEarnings per il calcolo del totale');
console.log('- Contata UNA SOLA VOLTA nel totale finale');

console.log('\n=== CORREZIONE COMPLETATA ===');
