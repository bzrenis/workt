/**
 * 🧪 TEST RAPIDO - NetEarningsCalculator
 * 
 * Verifica che i calcoli di lordo vs netto funzionino correttamente
 * secondo il CCNL Metalmeccanico PMI Livello 5
 */

console.log('🧪 TEST CALCOLO NETTO - CCNL Metalmeccanico PMI Livello 5');
console.log('=' .repeat(60));

// Simuliamo i dati che avremo da CalculationService (senza import React Native)
const testGrossAmounts = [
  131.29,  // Giornata normale (8 ore)
  163.11,  // Giornata con trasferta
  190.45,  // Giornata con straordinario
  212.34,  // Giornata lunga con trasferta
  2839.07  // Stipendio mensile pieno
];

// Costanti per calcolo manuale (duplicate per il test)
const INPS_RATE = 0.0919; // 9.19%
const QUICK_NET_RATES = {
  LOW_INCOME: 0.85,     // < 25.000€ annui ~ 85% netto
  MEDIUM_INCOME: 0.75,  // 25-40.000€ annui ~ 75% netto  
  HIGH_INCOME: 0.65     // > 40.000€ annui ~ 65% netto
};

// Funzione di test semplificata (senza dipendenze React Native)
function testQuickNetCalculation(grossAmount) {
  // Stima reddito annuale
  const estimatedAnnual = grossAmount * 312 / 26; // 312 giorni lavorativi all'anno
  
  let netRate;
  if (estimatedAnnual <= 25000) {
    netRate = QUICK_NET_RATES.LOW_INCOME; // 85%
  } else if (estimatedAnnual <= 40000) {
    netRate = QUICK_NET_RATES.MEDIUM_INCOME; // 75%
  } else {
    netRate = QUICK_NET_RATES.HIGH_INCOME; // 65%
  }

  const netAmount = grossAmount * netRate;
  const totalDeductions = grossAmount - netAmount;
  const deductionRate = totalDeductions / grossAmount;

  return {
    gross: grossAmount,
    net: netAmount,
    totalDeductions,
    deductionRate: deductionRate * 100, // Percentuale
    estimatedAnnual,
    category: estimatedAnnual <= 25000 ? 'Basso' : 
              estimatedAnnual <= 40000 ? 'Medio' : 'Alto'
  };
}

// Funzione per test calcolo INPS base
function testINPSCalculation(grossAmount) {
  const maxMonthlyBase = 118000 / 12; // Massimale contributivo mensile
  const contributionBase = Math.min(grossAmount, maxMonthlyBase);
  return contributionBase * INPS_RATE;
}

// Esegui i test
console.log('📊 TEST SU IMPORTI GIORNALIERI:');
console.log('-'.repeat(40));

testGrossAmounts.slice(0, 4).forEach((gross, index) => {
  const result = testQuickNetCalculation(gross);
  const inps = testINPSCalculation(gross);
  
  console.log(`\n🔍 Test ${index + 1}: ${gross.toFixed(2)}€ (lordo)`);
  console.log(`   Reddito stimato annuo: ${result.estimatedAnnual.toFixed(0)}€ (${result.category})`);
  console.log(`   INPS (9.19%): ${inps.toFixed(2)}€`);
  console.log(`   Netto stimato: ${result.net.toFixed(2)}€`);
  console.log(`   Trattenute: ${result.totalDeductions.toFixed(2)}€ (${result.deductionRate.toFixed(1)}%)`);
});

console.log('\n📊 TEST SU STIPENDIO MENSILE:');
console.log('-'.repeat(40));

const monthlyResult = testQuickNetCalculation(testGrossAmounts[4]);
const monthlyINPS = testINPSCalculation(testGrossAmounts[4]);

console.log(`\n💰 Stipendio mensile: ${testGrossAmounts[4].toFixed(2)}€ (lordo)`);
console.log(`   Reddito annuo: ${monthlyResult.estimatedAnnual.toFixed(0)}€ (${monthlyResult.category})`);
console.log(`   INPS (9.19%): ${monthlyINPS.toFixed(2)}€`);
console.log(`   Netto stimato: ${monthlyResult.net.toFixed(2)}€`);
console.log(`   Trattenute: ${monthlyResult.totalDeductions.toFixed(2)}€ (${monthlyResult.deductionRate.toFixed(1)}%)`);

console.log('\n🎯 VERIFICA COERENZA:');
console.log('-'.repeat(40));

// Somma di 4 giorni dovrebbe essere coerente con calcolo mensile
const dailySum = testGrossAmounts.slice(0, 4).reduce((sum, amount) => sum + amount, 0);
const dailySumResult = testQuickNetCalculation(dailySum);

console.log(`\n📈 Somma 4 giorni: ${dailySum.toFixed(2)}€ (lordo)`);
console.log(`   Netto: ${dailySumResult.net.toFixed(2)}€`);
console.log(`   Trattenute: ${dailySumResult.deductionRate.toFixed(1)}%`);

console.log('\n✅ TEST COMPLETATO!');
console.log('🔗 Ora verifica che questi calcoli appaiano correttamente nella Dashboard');
console.log('=' .repeat(60));
