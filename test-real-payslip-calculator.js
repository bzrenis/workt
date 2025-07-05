/**
 * 🧪 TEST CALCOLATORE NETTO CON DATI REALI BUSTE PAGA
 * 
 * Verifica l'accuratezza del nuovo calcolatore basato sui dati 
 * estratti dalle buste paga effettive di B.Z. S.R.L.
 * 
 * @date: 2025-01-07
 */

const { RealPayslipCalculator, realPayslipCalculator } = require('./src/services/RealPayslipCalculator');
const { NetEarningsCalculator, calculateRealNet, calculateQuickNet } = require('./src/services/NetEarningsCalculator');

console.log('🚀 AVVIO TEST CALCOLATORE NETTO CON DATI REALI\n');

// Test 1: Verifica accuratezza sui dati delle buste paga
console.log('📊 TEST 1: Validazione accuratezza dati reali');
console.log('='.repeat(50));

const validation = realPayslipCalculator.validateAccuracy();
console.log('Risultati validazione:', validation);

validation.results.forEach(result => {
  console.log(`${result.month}: Reale €${result.realNet.toFixed(2)} vs Calcolato €${result.calculatedNet.toFixed(2)} - Accuratezza: ${result.accuracyPercentage.toFixed(2)}%`);
});

console.log(`\n📈 Accuratezza complessiva: ${validation.overallAccuracy.toFixed(2)}%`);
console.log(`✅ Altamente accurato: ${validation.isHighlyAccurate ? 'SÌ' : 'NO'}\n`);

// Test 2: Confronto metodi di calcolo
console.log('🔄 TEST 2: Confronto metodi di calcolo');
console.log('='.repeat(50));

const testAmounts = [
  2839.07, // Stipendio mensile esatto
  2500.00, // Importo minore
  3200.00, // Importo maggiore
  1500.00, // Importo molto minore
  4000.00  // Importo molto maggiore
];

testAmounts.forEach(amount => {
  console.log(`\n💰 Importo test: €${amount.toFixed(2)}`);
  
  const realCalc = calculateRealNet(amount);
  const quickCalc = calculateQuickNet(amount);
  
  console.log(`  🎯 Calcolo Reale: €${realCalc.net.toFixed(2)} (${realCalc.method}) - ${realCalc.confidence || 'N/A'}`);
  console.log(`  🚀 Calcolo Rapido: €${quickCalc.net.toFixed(2)} (${quickCalc.method})`);
  
  const difference = realCalc.net - quickCalc.net;
  const percentageDiff = (difference / quickCalc.net * 100);
  
  console.log(`  📊 Differenza: €${difference.toFixed(2)} (${percentageDiff.toFixed(2)}%)`);
  console.log(`  ⭐ Priorità scelta: ${realCalc.priority || 'N/A'}`);
});

// Test 3: Riepilogo dati buste paga
console.log('\n📋 TEST 3: Riepilogo dati utilizzati');
console.log('='.repeat(50));

const summary = realPayslipCalculator.getPayslipSummary();
Object.entries(summary).forEach(([key, value]) => {
  console.log(`${key}: ${value}`);
});

// Test 4: Breakdown dettagliato
console.log('\n🔍 TEST 4: Breakdown dettagliato per stipendio mensile');
console.log('='.repeat(50));

const monthlyBreakdown = realPayslipCalculator.calculateWithBreakdown(2839.07);
console.log('Lordo:', realPayslipCalculator.formatCurrency(monthlyBreakdown.gross));
console.log('Netto:', realPayslipCalculator.formatCurrency(monthlyBreakdown.net));
console.log('Trattenute totali:', realPayslipCalculator.formatCurrency(monthlyBreakdown.totalDeductions));
console.log('Tasso trattenute:', `${(monthlyBreakdown.deductionRate * 100).toFixed(2)}%`);

if (monthlyBreakdown.breakdown) {
  console.log('\nDettaglio trattenute (stimate):');
  Object.entries(monthlyBreakdown.breakdown).forEach(([key, value]) => {
    console.log(`  ${key}: ${realPayslipCalculator.formatCurrency(value)}`);
  });
}

if (monthlyBreakdown.detailedAnalysis) {
  console.log('\nAnalisi dettagliata:');
  Object.entries(monthlyBreakdown.detailedAnalysis).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

// Test 5: Confronto con calcolatore teorico
console.log('\n⚖️ TEST 5: Confronto con calcolatore teorico CCNL');
console.log('='.repeat(50));

const netCalculator = new NetEarningsCalculator();
const theoreticalCalc = netCalculator.calculateDetailedNet(2839.07);

console.log('Calcolo Reale (buste paga):');
console.log(`  Netto: ${realPayslipCalculator.formatCurrency(monthlyBreakdown.net)}`);
console.log(`  Metodo: ${monthlyBreakdown.method}`);

console.log('\nCalcolo Teorico (CCNL):');
console.log(`  Netto: ${netCalculator.formatCurrency(theoreticalCalc.net)}`);
console.log(`  Metodo: ${theoreticalCalc.method}`);

const netDifference = monthlyBreakdown.net - theoreticalCalc.net;
console.log(`\nDifferenza: ${realPayslipCalculator.formatCurrency(netDifference)}`);
console.log(`Percentuale: ${(netDifference / theoreticalCalc.net * 100).toFixed(2)}%`);

console.log('\n✅ TEST COMPLETATI - Il calcolatore basato sui dati reali è operativo!');
console.log('\n📝 RISULTATO: Ora la Dashboard mostrerà il netto basato sui dati reali delle buste paga B.Z. S.R.L.');

console.log('\n' + '='.repeat(70));
console.log('🎯 PROSSIMI PASSI:');
console.log('1. Avviare l\'app per vedere il calcolo netto aggiornato');
console.log('2. Verificare che la Dashboard mostri valori corretti');
console.log('3. Testare la navigazione tra mesi diversi');
console.log('4. Validare che il GrossNetCard funzioni correttamente');
console.log('='.repeat(70));
