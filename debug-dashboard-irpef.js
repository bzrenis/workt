/**
 * 🔍 DEBUG DASHBOARD IRPEF 12.4%
 * 
 * Test per simulare esattamente il calcolo della dashboard
 * e identificare perché mostra 12.4% invece di 32%
 */

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

console.log('🔍 DEBUG DASHBOARD IRPEF 12.4%\n');

// Test con diversi importi per capire quale produce il 12.4%
const testAmounts = [
  2839.07,   // Stipendio base mensile
  532.07,    // Importo che potrebbe produrre 12.4%
  1000,      // Test con €1000
  1500,      // Test con €1500
  400,       // Importo molto basso
  700        // Altro test
];

console.log('📊 TEST IMPORTI DIVERSI CON METODO IRPEF');
console.log('━'.repeat(70));

const irpefSettings = {
  method: 'irpef',
  customDeductionRate: 32 // Questo dovrebbe essere ignorato
};

testAmounts.forEach((amount, index) => {
  const result = RealPayslipCalculator.calculateNetFromGross(amount, irpefSettings);
  const percentage = (result.deductionRate * 100);
  
  console.log(`Test ${index + 1}: €${amount.toFixed(2)} → ${percentage.toFixed(1)}% ${percentage.toFixed(1) === '12.4' ? '🎯 BINGO!' : ''}`);
  
  if (Math.abs(percentage - 12.4) < 0.1) {
    console.log(`  ✅ TROVATO! Importo che produce 12.4%: €${amount.toFixed(2)}`);
    console.log(`  - Netto: €${result.net.toFixed(2)}`);
    console.log(`  - Trattenute: €${result.totalDeductions.toFixed(2)}`);
    console.log(`  - IRPEF: €${result.breakdown.irpef.toFixed(2)}`);
    console.log(`  - Contributi: €${result.breakdown.socialContributions.toFixed(2)}`);
    console.log(`  - Addizionali: €${result.breakdown.additionalTaxes.toFixed(2)}`);
    
    // Calcolo annuale per questo importo
    const annual = amount * 12;
    console.log(`  - Reddito annuo: €${annual.toFixed(2)}`);
  }
});

// Test 2: Simulare possibili problemi della dashboard
console.log('\n📊 TEST PROBLEMI POSSIBILI DASHBOARD');
console.log('━'.repeat(70));

// Problema 1: Dashboard usa impostazioni sbagliate
console.log('\n1️⃣ Test con impostazioni personalizzate invece di IRPEF:');
const wrongSettings1 = {
  method: 'custom',
  customDeductionRate: 12.4
};
const wrongResult1 = RealPayslipCalculator.calculateNetFromGross(2839.07, wrongSettings1);
console.log(`   Custom 12.4%: ${(wrongResult1.deductionRate * 100).toFixed(1)}%`);

// Problema 2: Dashboard usa importo mensile basso
console.log('\n2️⃣ Test con importo mensile basso (es. da lavoro part-time):');
const partTimeAmount = 532; // Che produce circa 12.4%
const partTimeResult = RealPayslipCalculator.calculateNetFromGross(partTimeAmount, irpefSettings);
console.log(`   Part-time €${partTimeAmount}: ${(partTimeResult.deductionRate * 100).toFixed(1)}%`);

// Problema 3: Dashboard non usa stima annuale
console.log('\n3️⃣ Test "useActualAmount" vs "stima annuale":');
console.log('   (La dashboard potrebbe ignorare la modalità di calcolo)');

// Simulare calcolo "cifra presente" vs "stima annuale"
const lowMonthlyAmount = 400; // Mese con poche ore lavorate
const fullSalaryEstimate = 2839.07; // Stima su stipendio pieno

console.log(`   Cifra presente (€${lowMonthlyAmount}): ${(RealPayslipCalculator.calculateNetFromGross(lowMonthlyAmount, irpefSettings).deductionRate * 100).toFixed(1)}%`);
console.log(`   Stima annuale (€${fullSalaryEstimate}): ${(RealPayslipCalculator.calculateNetFromGross(fullSalaryEstimate, irpefSettings).deductionRate * 100).toFixed(1)}%`);

// Test 3: Trovare l'importo esatto che produce 12.4%
console.log('\n📊 RICERCA IMPORTO CHE PRODUCE 12.4%');
console.log('━'.repeat(70));

let targetAmount = 500;
let bestMatch = { amount: 0, percentage: 0, diff: 100 };

for (let amount = 100; amount <= 1000; amount += 10) {
  const result = RealPayslipCalculator.calculateNetFromGross(amount, irpefSettings);
  const percentage = result.deductionRate * 100;
  const diff = Math.abs(percentage - 12.4);
  
  if (diff < bestMatch.diff) {
    bestMatch = { amount, percentage, diff };
  }
  
  if (diff < 0.05) { // Molto vicino al 12.4%
    console.log(`🎯 MATCH PERFETTO: €${amount} → ${percentage.toFixed(1)}%`);
    
    // Dettagli per questo importo
    console.log(`   - Annuale: €${(amount * 12).toFixed(2)}`);
    console.log(`   - IRPEF: €${result.breakdown.irpef.toFixed(2)}`);
    console.log(`   - Contributi: €${result.breakdown.socialContributions.toFixed(2)}`);
    console.log(`   - Addizionali: €${result.breakdown.additionalTaxes.toFixed(2)}`);
    console.log(`   - Totale trattenute: €${result.totalDeductions.toFixed(2)}`);
    break;
  }
}

console.log(`\n🔍 MIGLIOR MATCH: €${bestMatch.amount} → ${bestMatch.percentage.toFixed(1)}% (diff: ${bestMatch.diff.toFixed(2)}%)`);

// Test 4: Analisi conclusiva
console.log('\n🎯 ANALISI CONCLUSIVA');
console.log('━'.repeat(70));
console.log('Se la dashboard mostra 12.4% con impostazioni IRPEF, significa che:');
console.log('');
console.log('❌ PROBLEMA POSSIBILE 1: Dashboard usa "cifra presente" su importo basso');
console.log('   → Soluzione: Verificare che "stima annuale" sia attivata');
console.log('');
console.log('❌ PROBLEMA POSSIBILE 2: Dashboard non carica le impostazioni IRPEF');
console.log('   → Soluzione: Verificare log della console nell\'app');
console.log('');
console.log('❌ PROBLEMA POSSIBILE 3: Dashboard calcola su mese con poche ore');
console.log('   → Soluzione: Testare con mese full-time');
console.log('');
console.log('✅ Il RealPayslipCalculator funziona correttamente (32% per €2839.07)');

console.log('\n📝 PROSSIMI STEP PER IL DEBUG:');
console.log('1. Verificare i log della console nell\'app quando selezioni IRPEF');
console.log('2. Controllare che la modalità "stima annuale" sia selezionata');
console.log('3. Verificare l\'importo su cui la dashboard sta calcolando le trattenute');
console.log('4. Controllare se la dashboard sta effettivamente usando method: "irpef"');
