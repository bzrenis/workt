/**
 * 🐞 DEBUG CALCOLO TRATTENUTE 12.4%
 * 
 * Test per capire perché la dashboard mostra trattenute al 12.4%
 * quando ci aspettiamo circa il 25%
 */

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

// Simula un calcolo tipico della dashboard
const grossAmount = 2839.07; // Stipendio base CCNL Metalmeccanico PMI L5

console.log('🔍 DEBUG CALCOLO TRATTENUTE 12.4%\n');
console.log(`💰 Importo lordo di test: €${grossAmount.toFixed(2)}\n`);

// Test 1: Calcolo con metodo IRPEF (default)
console.log('📊 TEST 1: Metodo IRPEF (aliquote reali)');
console.log('━'.repeat(50));

const irpefSettings = {
  method: 'irpef',
  customDeductionRate: 25
};

const calculator = new RealPayslipCalculator(irpefSettings);
const irpefResult = calculator.calculateNet(grossAmount);

console.log('Risultato IRPEF:');
console.log(`- Lordo: €${irpefResult.gross.toFixed(2)}`);
console.log(`- Netto: €${irpefResult.net.toFixed(2)}`);
console.log(`- Trattenute: €${irpefResult.totalDeductions.toFixed(2)}`);
console.log(`- Percentuale trattenute: ${(irpefResult.deductionRate * 100).toFixed(1)}%`);
console.log('\nBreakdown trattenute:');
console.log(`- IRPEF: €${irpefResult.breakdown.irpef.toFixed(2)}`);
console.log(`- Contributi INPS: €${irpefResult.breakdown.socialContributions.toFixed(2)}`);
console.log(`- Addizionali: €${irpefResult.breakdown.additionalTaxes.toFixed(2)}`);

// Test 2: Calcolo con percentuale personalizzata 25%
console.log('\n\n📊 TEST 2: Metodo Personalizzato (25%)');
console.log('━'.repeat(50));

const customSettings = {
  method: 'custom',
  customDeductionRate: 25
};

const calculatorCustom = new RealPayslipCalculator(customSettings);
const customResult = calculatorCustom.calculateNet(grossAmount);

console.log('Risultato Custom 25%:');
console.log(`- Lordo: €${customResult.gross.toFixed(2)}`);
console.log(`- Netto: €${customResult.net.toFixed(2)}`);
console.log(`- Trattenute: €${customResult.totalDeductions.toFixed(2)}`);
console.log(`- Percentuale trattenute: ${(customResult.deductionRate * 100).toFixed(1)}%`);

// Test 3: Confronto con il metodo statico usato dalla dashboard
console.log('\n\n📊 TEST 3: Metodo statico dashboard');
console.log('━'.repeat(50));

const dashboardResult = RealPayslipCalculator.calculateNetFromGross(grossAmount, irpefSettings);

console.log('Risultato Dashboard:');
console.log(`- Lordo: €${dashboardResult.gross.toFixed(2)}`);
console.log(`- Netto: €${dashboardResult.net.toFixed(2)}`);
console.log(`- Trattenute: €${dashboardResult.totalDeductions.toFixed(2)}`);
console.log(`- Percentuale trattenute: ${(dashboardResult.deductionRate * 100).toFixed(1)}%`);

// Test 4: Analisi dettagliata del calcolo IRPEF
console.log('\n\n🔬 ANALISI DETTAGLIATA CALCOLO IRPEF');
console.log('━'.repeat(50));

const annualGross = grossAmount * 12;
console.log(`Reddito annuo simulato: €${annualGross.toFixed(2)}`);

// Calcolo IRPEF manuale
let totalIRPEF = 0;
let remainingIncome = annualGross;

const irpefBrackets = [
  { min: 0, max: 28000, rate: 0.23 },
  { min: 28000, max: 50000, rate: 0.35 },
  { min: 50000, max: Infinity, rate: 0.43 }
];

console.log('\nCalcolo IRPEF per scaglioni:');
for (const bracket of irpefBrackets) {
  if (remainingIncome <= 0) break;
  
  const taxableInBracket = Math.min(
    remainingIncome, 
    bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min
  );
  
  const taxInBracket = taxableInBracket * bracket.rate;
  totalIRPEF += taxInBracket;
  
  console.log(`- Scaglione ${bracket.min}-${bracket.max === Infinity ? '∞' : bracket.max}: €${taxableInBracket.toFixed(2)} × ${(bracket.rate * 100)}% = €${taxInBracket.toFixed(2)}`);
  
  remainingIncome -= taxableInBracket;
}

console.log(`\nIRPEF totale annua: €${totalIRPEF.toFixed(2)}`);
console.log(`IRPEF mensile: €${(totalIRPEF / 12).toFixed(2)}`);

// Detrazioni
const workDeduction = 1880;
const personalDeduction = annualGross <= 15000 ? 1955 : 0;
const totalDeductions = workDeduction + personalDeduction;

console.log(`\nDetrazioni annue:`);
console.log(`- Lavoro dipendente: €${workDeduction}`);
console.log(`- Personale: €${personalDeduction}`);
console.log(`- Totale: €${totalDeductions}`);

const netIRPEF = Math.max(0, totalIRPEF - totalDeductions);
const monthlyNetIRPEF = netIRPEF / 12;

console.log(`\nIRPEF netta annua: €${netIRPEF.toFixed(2)}`);
console.log(`IRPEF netta mensile: €${monthlyNetIRPEF.toFixed(2)}`);

// Contributi e addizionali
const socialContribs = grossAmount * 0.0987;
const additionalTaxes = grossAmount * 0.0253;

console.log(`\nContributi mensili:`);
console.log(`- INPS (9.87%): €${socialContribs.toFixed(2)}`);
console.log(`- Addizionali (2.53%): €${additionalTaxes.toFixed(2)}`);

const totalMonthlyDeductions = monthlyNetIRPEF + socialContribs + additionalTaxes;
const actualPercentage = (totalMonthlyDeductions / grossAmount) * 100;

console.log(`\nRiepilogo mensile:`);
console.log(`- IRPEF: €${monthlyNetIRPEF.toFixed(2)}`);
console.log(`- Contributi: €${socialContribs.toFixed(2)}`);
console.log(`- Addizionali: €${additionalTaxes.toFixed(2)}`);
console.log(`- Totale trattenute: €${totalMonthlyDeductions.toFixed(2)}`);
console.log(`- Percentuale reale: ${actualPercentage.toFixed(1)}%`);

console.log('\n\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));
if (actualPercentage < 15) {
  console.log('✅ La percentuale del 12.4% è CORRETTA per il reddito CCNL Metalmeccanico PMI L5');
  console.log('📊 Per redditi intorno ai €34.000 annui, le trattenute effettive sono circa 12-13%');
  console.log('💡 Questo è dovuto alle detrazioni fiscali che riducono molto l\'IRPEF per i redditi medio-bassi');
} else {
  console.log('❌ Sembra esserci un errore nel calcolo');
}
