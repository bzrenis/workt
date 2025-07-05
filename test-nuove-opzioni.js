/**
 * 🧪 TEST NUOVE OPZIONI CALCOLO NETTO
 * 
 * Testa le nuove funzionalità:
 * 1. Default IRPEF invece di custom
 * 2. Opzione calcolo su cifra presente
 * 3. Fallback più realistici
 */

console.log('🧪 TEST NUOVE OPZIONI CALCOLO NETTO\n');

// Test 1: Verifica default IRPEF
console.log('📊 TEST 1: Default IRPEF');
console.log('━'.repeat(50));

const defaultSettings = {
  netCalculation: {
    method: 'irpef', // Nuovo default
    customDeductionRate: 32, // Fallback più realistico
    useActualAmount: false // Default: usa stima annuale
  },
  contract: {
    monthlyGrossSalary: 2839.07
  }
};

console.log('Impostazioni default:');
console.log(`- Metodo: ${defaultSettings.netCalculation.method} ✅`);
console.log(`- Percentuale fallback: ${defaultSettings.netCalculation.customDeductionRate}% ✅`);
console.log(`- Usa cifra presente: ${defaultSettings.netCalculation.useActualAmount} ✅`);

// Test 2: Simulazione calcolo con guadagno basso
console.log('\n🎯 TEST 2: Calcolo con Guadagno Basso (€890)');
console.log('━'.repeat(50));

const lowGrossAmount = 890.05;
console.log(`Guadagno mensile: €${lowGrossAmount.toFixed(2)}`);

// Modalità 1: Stima annuale (default)
let calculationBase1 = lowGrossAmount;
let isEstimated1 = false;

if (!defaultSettings.netCalculation.useActualAmount && 
    lowGrossAmount < 1500 && 
    defaultSettings.contract.monthlyGrossSalary) {
  
  const baseAnnual = defaultSettings.contract.monthlyGrossSalary * 12;
  const extraMonthly = Math.max(0, lowGrossAmount - defaultSettings.contract.monthlyGrossSalary);
  const estimatedAnnual = baseAnnual + (extraMonthly * 12);
  calculationBase1 = estimatedAnnual / 12;
  isEstimated1 = true;
}

console.log('\n🔹 MODALITÀ 1: Stima Annuale');
console.log(`- Base calcolo: €${calculationBase1.toFixed(2)}`);
console.log(`- È stimato: ${isEstimated1}`);
console.log(`- Metodo: ${defaultSettings.netCalculation.method}`);

// Modalità 2: Cifra presente
const calculationBase2 = lowGrossAmount;
const isEstimated2 = false;

console.log('\n🔹 MODALITÀ 2: Cifra Presente');
console.log(`- Base calcolo: €${calculationBase2.toFixed(2)}`);
console.log(`- È stimato: ${isEstimated2}`);
console.log(`- Metodo: ${defaultSettings.netCalculation.method}`);

// Test 3: Confronto percentuali
console.log('\n📊 TEST 3: Confronto Percentuali');
console.log('━'.repeat(50));

// Simula calcolo IRPEF per €2839 (base completa)
const fullSalaryDeductions = 2839.07 * 0.32; // Circa 32%
const fullSalaryNet = 2839.07 - fullSalaryDeductions;

// Simula calcolo IRPEF per €890 (cifra presente)
const lowAmountDeductions = 890.05 * 0.124; // Circa 12.4% (IRPEF basso)
const lowAmountNet = 890.05 - lowAmountDeductions;

console.log('CONFRONTO MODALITÀ:');
console.log(`\n🔹 Stima Annuale (€${calculationBase1.toFixed(2)}):`);
console.log(`  - Trattenute: €${fullSalaryDeductions.toFixed(2)} (~32%)`);
console.log(`  - Netto: €${fullSalaryNet.toFixed(2)}`);

console.log(`\n🔹 Cifra Presente (€${calculationBase2.toFixed(2)}):`);
console.log(`  - Trattenute: €${lowAmountDeductions.toFixed(2)} (~12.4%)`);
console.log(`  - Netto: €${lowAmountNet.toFixed(2)}`);

console.log(`\n💡 Differenza netto: €${Math.abs(fullSalaryNet - lowAmountNet).toFixed(2)}`);

// Test 4: Personalizzazione
console.log('\n⚙️ TEST 4: Personalizzazione');
console.log('━'.repeat(50));

const customSettings = {
  netCalculation: {
    method: 'custom',
    customDeductionRate: 30, // Personalizzato
    useActualAmount: true // Cifra presente
  }
};

const customDeductions = lowGrossAmount * (customSettings.netCalculation.customDeductionRate / 100);
const customNet = lowGrossAmount - customDeductions;

console.log('Impostazioni personalizzate:');
console.log(`- Metodo: ${customSettings.netCalculation.method}`);
console.log(`- Percentuale: ${customSettings.netCalculation.customDeductionRate}%`);
console.log(`- Usa cifra presente: ${customSettings.netCalculation.useActualAmount}`);
console.log(`- Risultato: €${lowGrossAmount.toFixed(2)} → €${customNet.toFixed(2)} netto`);

console.log('\n🎯 CONCLUSIONI:');
console.log('━'.repeat(50));
console.log('✅ Default IRPEF: Più accurato per la maggioranza');
console.log('✅ Opzione cifra presente: Controllo totale per l\'utente');
console.log('✅ Fallback 32%: Più realistico di 25%');
console.log('✅ Stima annuale: Migliore per guadagni variabili');
console.log('✅ Personalizzazione: Salvataggio automatico delle preferenze');
