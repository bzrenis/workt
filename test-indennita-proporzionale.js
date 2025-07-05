/**
 * Test per verificare il calcolo proporzionale dell'indennità trasferta
 * secondo CCNL Metalmeccanico PMI
 */

// Simulazione della logica attuale
function simulateCurrentLogic(totalHours, dailyAmount, option) {
  const isFullDay = totalHours >= 8;
  const isHalfDay = totalHours > 0 && totalHours < 8;
  
  if (option === 'HALF_ALLOWANCE_HALF_DAY' && isHalfDay) {
    return dailyAmount / 2; // 50% per mezza giornata
  }
  
  return dailyAmount; // 100% per giornata completa
}

// Logica proporzionale CCNL
function calculateProportionalAllowance(totalHours, dailyAmount) {
  return (totalHours / 8) * dailyAmount;
}

// Simulazione settings
const mockSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07
  },
  travelAllowance: {
    enabled: true,
    dailyAmount: 30.00, // Esempio: 30€ giornalieri
    option: 'HALF_ALLOWANCE_HALF_DAY', // Regola attuale
    applyOnSpecialDays: false
  },
  travelCompensationRate: 1.0
};

console.log('=== TEST INDENNITÀ TRASFERTA PROPORZIONALE ===\n');

// Test casi diversi di ore lavorate
const testCases = [
  { ore: 4, descrizione: '4 ore (50% della giornata)' },
  { ore: 5, descrizione: '5 ore (62.5% della giornata)' },
  { ore: 6, descrizione: '6 ore (75% della giornata)' },
  { ore: 7, descrizione: '7 ore (87.5% della giornata)' },
  { ore: 8, descrizione: '8 ore (100% della giornata)' }
];

testCases.forEach(testCase => {
  console.log(`\n--- ${testCase.descrizione} ---`);
  
  const totalHours = testCase.ore + 2; // lavoro + 2h viaggio
  
  // Calcolo attuale
  const currentResult = simulateCurrentLogic(totalHours, 30.00, 'HALF_ALLOWANCE_HALF_DAY');
  
  // Calcolo proporzionale CCNL
  const proportionalResult = calculateProportionalAllowance(totalHours, 30.00);
  
  console.log(`Ore totali: ${totalHours}h (${testCase.ore}h lavoro + 2h viaggio)`);
  console.log(`Percentuale rispetto a 8h: ${(totalHours / 8 * 100).toFixed(1)}%`);
  console.log(`Indennità attuale (50%/100%): ${currentResult.toFixed(2)}€`);
  console.log(`Indennità proporzionale CCNL: ${proportionalResult.toFixed(2)}€`);
  console.log(`Differenza: ${(proportionalResult - currentResult).toFixed(2)}€`);
  
  if (totalHours < 8) {
    console.log(`❌ Logica attuale: dimezza a ${currentResult.toFixed(2)}€`);
    console.log(`✅ CCNL corretto: proporzionale a ${proportionalResult.toFixed(2)}€`);
  } else {
    console.log(`✅ Entrambe danno ${currentResult.toFixed(2)}€ per giornata completa`);
  }
});

console.log('\n=== ANALISI LOGICA ATTUALE ===');
console.log('La logica attuale usa HALF_ALLOWANCE_HALF_DAY che:');
console.log('- Se < 8 ore totali: 50% dell\'indennità (15€)');
console.log('- Se >= 8 ore totali: 100% dell\'indennità (30€)');
console.log('\nSecondo CCNL dovrebbe essere:');
console.log('- Proporzionale alle ore: (ore_totali / 8) * indennità_giornaliera');
console.log('- Es: 7 ore = (7/8) * 30€ = 26.25€');
console.log('- Es: 6 ore = (6/8) * 30€ = 22.50€');
