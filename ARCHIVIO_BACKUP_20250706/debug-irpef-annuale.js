/**
 * 🔍 DEBUG CALCOLO IRPEF ANNUALE
 * 
 * Test specifico per verificare se il calcolo IRPEF su base annuale
 * funziona correttamente nel RealPayslipCalculator
 */

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

console.log('🔍 DEBUG CALCOLO IRPEF ANNUALE\n');

// Simula i dati dello stipendio CCNL
const monthlyGross = 2839.07;
const annualGross = monthlyGross * 12; // €34,068.84

console.log('📊 DATI STIPENDIO CCNL');
console.log('━'.repeat(50));
console.log(`Stipendio mensile lordo: €${monthlyGross.toFixed(2)}`);
console.log(`Stipendio annuo lordo: €${annualGross.toFixed(2)}`);

// Test 1: Calcolo manuale IRPEF per verifica
console.log('\n📋 TEST 1: CALCOLO IRPEF MANUALE');
console.log('━'.repeat(50));

const irpefBrackets = [
  { min: 0, max: 28000, rate: 0.23 },
  { min: 28000, max: 50000, rate: 0.35 },
  { min: 50000, max: Infinity, rate: 0.43 }
];

let totalIRPEF = 0;
let remainingIncome = annualGross;

console.log('Calcolo per scaglioni:');
for (const bracket of irpefBrackets) {
  if (remainingIncome <= 0) break;
  
  const bracketSize = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min;
  const taxableInBracket = Math.min(remainingIncome, bracketSize);
  const taxInBracket = taxableInBracket * bracket.rate;
  
  totalIRPEF += taxInBracket;
  
  console.log(`- Scaglione €${bracket.min.toLocaleString()}-€${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}: €${taxableInBracket.toFixed(2)} × ${(bracket.rate * 100)}% = €${taxInBracket.toFixed(2)}`);
  
  remainingIncome -= taxableInBracket;
}

console.log(`\nIRPEF lorda annua: €${totalIRPEF.toFixed(2)}`);

// Detrazioni
const workDeduction = 1880;
const personalDeduction = annualGross <= 15000 ? 1955 : (annualGross <= 28000 ? 1955 * (1 - (annualGross - 15000) / 13000) : 0);
const totalDeductions = workDeduction + personalDeduction;

console.log(`\nDetrazioni:`);
console.log(`- Lavoro dipendente: €${workDeduction.toFixed(2)}`);
console.log(`- Personale: €${personalDeduction.toFixed(2)}`);
console.log(`- Totale detrazioni: €${totalDeductions.toFixed(2)}`);

const netIRPEF = Math.max(0, totalIRPEF - totalDeductions);
const monthlyNetIRPEF = netIRPEF / 12;

console.log(`\nIRPEF netta annua: €${netIRPEF.toFixed(2)}`);
console.log(`IRPEF netta mensile: €${monthlyNetIRPEF.toFixed(2)}`);

// Test 2: Calcolo con RealPayslipCalculator
console.log('\n📊 TEST 2: CALCOLO CON RealPayslipCalculator');
console.log('━'.repeat(50));

const calculator = new RealPayslipCalculator({
  method: 'irpef',
  customDeductionRate: 32 // Questo dovrebbe essere ignorato nel metodo IRPEF
});

const result = calculator.calculateNet(monthlyGross);

console.log('Risultato RealPayslipCalculator:');
console.log(`- Lordo mensile: €${result.gross.toFixed(2)}`);
console.log(`- Netto mensile: €${result.net.toFixed(2)}`);
console.log(`- Trattenute totali: €${result.totalDeductions.toFixed(2)}`);
console.log(`- Percentuale trattenute: ${(result.deductionRate * 100).toFixed(1)}%`);

console.log('\nBreakdown trattenute:');
console.log(`- IRPEF: €${result.breakdown.irpef.toFixed(2)}`);
console.log(`- Contributi INPS: €${result.breakdown.socialContributions.toFixed(2)}`);
console.log(`- Addizionali: €${result.breakdown.additionalTaxes.toFixed(2)}`);

// Test 3: Confronto con calcolo manuale
console.log('\n🔍 TEST 3: CONFRONTO CALCOLI');
console.log('━'.repeat(50));

const manualSocialContribs = monthlyGross * 0.0987;
const manualAdditionalTaxes = monthlyGross * 0.0253;
const manualTotalDeductions = monthlyNetIRPEF + manualSocialContribs + manualAdditionalTaxes;
const manualNet = monthlyGross - manualTotalDeductions;
const manualPercentage = (manualTotalDeductions / monthlyGross) * 100;

console.log('Calcolo manuale:');
console.log(`- IRPEF mensile: €${monthlyNetIRPEF.toFixed(2)}`);
console.log(`- Contributi: €${manualSocialContribs.toFixed(2)}`);
console.log(`- Addizionali: €${manualAdditionalTaxes.toFixed(2)}`);
console.log(`- Totale trattenute: €${manualTotalDeductions.toFixed(2)}`);
console.log(`- Netto: €${manualNet.toFixed(2)}`);
console.log(`- Percentuale: ${manualPercentage.toFixed(1)}%`);

console.log('\nRealPayslipCalculator:');
console.log(`- IRPEF mensile: €${result.breakdown.irpef.toFixed(2)}`);
console.log(`- Contributi: €${result.breakdown.socialContributions.toFixed(2)}`);
console.log(`- Addizionali: €${result.breakdown.additionalTaxes.toFixed(2)}`);
console.log(`- Totale trattenute: €${result.totalDeductions.toFixed(2)}`);
console.log(`- Netto: €${result.net.toFixed(2)}`);
console.log(`- Percentuale: ${(result.deductionRate * 100).toFixed(1)}%`);

// Test 4: Analisi differenze
console.log('\n⚖️ TEST 4: ANALISI DIFFERENZE');
console.log('━'.repeat(50));

const irpefDiff = Math.abs(result.breakdown.irpef - monthlyNetIRPEF);
const contribDiff = Math.abs(result.breakdown.socialContributions - manualSocialContribs);
const addTaxDiff = Math.abs(result.breakdown.additionalTaxes - manualAdditionalTaxes);
const totalDiff = Math.abs(result.totalDeductions - manualTotalDeductions);
const percentageDiff = Math.abs((result.deductionRate * 100) - manualPercentage);

console.log('Differenze (Calculator - Manuale):');
console.log(`- IRPEF: €${(result.breakdown.irpef - monthlyNetIRPEF).toFixed(2)} (diff: €${irpefDiff.toFixed(2)})`);
console.log(`- Contributi: €${(result.breakdown.socialContributions - manualSocialContribs).toFixed(2)} (diff: €${contribDiff.toFixed(2)})`);
console.log(`- Addizionali: €${(result.breakdown.additionalTaxes - manualAdditionalTaxes).toFixed(2)} (diff: €${addTaxDiff.toFixed(2)})`);
console.log(`- Totale: €${(result.totalDeductions - manualTotalDeductions).toFixed(2)} (diff: €${totalDiff.toFixed(2)})`);
console.log(`- Percentuale: ${((result.deductionRate * 100) - manualPercentage).toFixed(1)}% (diff: ${percentageDiff.toFixed(1)}%)`);

// Test 5: Conclusione
console.log('\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));

const tolerance = 0.10; // Tolleranza di 10 centesimi

if (totalDiff <= tolerance) {
  console.log('✅ CALCOLO CORRETTO: RealPayslipCalculator funziona come atteso');
  console.log(`📊 Percentuale finale: ${(result.deductionRate * 100).toFixed(1)}% (${result.deductionRate < 0.15 ? 'normale per questo reddito' : 'verificare se corretto'})`);
} else {
  console.log('❌ PROBLEMA TROVATO: Differenza significativa tra calcoli');
  console.log(`🔧 Differenza totale: €${totalDiff.toFixed(2)}`);
  
  if (irpefDiff > tolerance) {
    console.log('🚨 Problema principale: Calcolo IRPEF non corretto');
  }
  if (contribDiff > tolerance) {
    console.log('🚨 Problema: Contributi INPS non corretti');
  }
  if (addTaxDiff > tolerance) {
    console.log('🚨 Problema: Addizionali non corrette');
  }
}

console.log('\n📝 DETTAGLI TECNICI:');
console.log(`- Reddito annuo: €${annualGross.toFixed(2)} (fascia ${annualGross <= 28000 ? 'prima' : annualGross <= 50000 ? 'seconda' : 'terza'})`);
console.log(`- IRPEF teorica: ${(netIRPEF / annualGross * 100).toFixed(1)}% del reddito annuo`);
console.log(`- Contributi: ${(manualSocialContribs / monthlyGross * 100).toFixed(1)}% del reddito mensile`);
console.log(`- Addizionali: ${(manualAdditionalTaxes / monthlyGross * 100).toFixed(1)}% del reddito mensile`);
