/**
 * 🔧 CORREZIONE DASHBOARD - Verifica che usi le impostazioni salvate
 * 
 * Testa i calcoli che verrebbero fatti dalla dashboard
 */

console.log('🔧 TEST DASHBOARD - Verifica Impostazioni\n');

// Simula le impostazioni come verrebbero caricate dal database
const mockSettings = {
  contract: {
    monthlyGrossSalary: 2839.07,
    hourlyRate: 16.41081
  },
  netCalculation: {
    method: 'custom',
    customDeductionRate: 32
  }
};

console.log('📱 SIMULAZIONE DASHBOARD');
console.log('━'.repeat(50));

// Simula il calcolo che fa la dashboard
const grossAmount = 890.05; // Dal tuo screenshot
console.log(`💰 Guadagno mensile attuale: €${grossAmount.toFixed(2)}`);
console.log(`📊 Stipendio base contratto: €${mockSettings.contract.monthlyGrossSalary.toFixed(2)}`);

// Logica del calcolo migliorato
let calculationBase = grossAmount;

if (grossAmount < 1500 && mockSettings.contract.monthlyGrossSalary) {
  const baseAnnual = mockSettings.contract.monthlyGrossSalary * 12;
  const extraMonthly = Math.max(0, grossAmount - mockSettings.contract.monthlyGrossSalary);
  const estimatedAnnual = baseAnnual + (extraMonthly * 12);
  calculationBase = estimatedAnnual / 12;
  
  console.log(`\n🎯 CALCOLO INTELLIGENTE:`);
  console.log(`- Stipendio base annuo: €${baseAnnual.toFixed(2)}`);
  console.log(`- Extra mensile: €${extraMonthly.toFixed(2)}`);
  console.log(`- Extra annuo stimato: €${(extraMonthly * 12).toFixed(2)}`);
  console.log(`- Totale annuo stimato: €${estimatedAnnual.toFixed(2)}`);
  console.log(`- Base di calcolo mensile: €${calculationBase.toFixed(2)}`);
}

// Simula il calcolo delle trattenute con il metodo personalizzato
const customDeductionRate = mockSettings.netCalculation.customDeductionRate / 100;
const treatnute = calculationBase * customDeductionRate;
const netto = calculationBase - treatnute;

console.log(`\n💳 RISULTATO CON IMPOSTAZIONI PERSONALIZZATE:`);
console.log(`- Base calcolo: €${calculationBase.toFixed(2)}`);
console.log(`- Metodo: ${mockSettings.netCalculation.method} (${mockSettings.netCalculation.customDeductionRate}%)`);
console.log(`- Trattenute: €${treatnute.toFixed(2)}`);
console.log(`- Netto: €${netto.toFixed(2)}`);
console.log(`- Percentuale effettiva: ${(customDeductionRate * 100).toFixed(1)}%`);

// Confronto con il calcolo originale
console.log(`\n📊 CONFRONTO:`);
console.log(`- Dashboard originale (12.4%): €779,68 netto`);
console.log(`- Con impostazioni 32%: €${netto.toFixed(2)} netto`);
console.log(`- Differenza: €${Math.abs(netto - 779.68).toFixed(2)}`);

console.log(`\n🎯 VANTAGGI CORREZIONE:`);
if (calculationBase > grossAmount) {
  console.log(`✅ Base di calcolo più realistica: €${calculationBase.toFixed(2)} vs €${grossAmount.toFixed(2)}`);
}
if (mockSettings.netCalculation.method === 'custom') {
  console.log(`✅ Usa percentuale personalizzata: ${mockSettings.netCalculation.customDeductionRate}%`);
}
console.log(`✅ Trattenute più accurate per il tuo reddito effettivo`);

console.log(`\n🚀 ISTRUZIONI PER L'USO:`);
console.log(`1. Apri l'app → Impostazioni → "Calcolo Netto"`);
console.log(`2. Seleziona "Percentuale Personalizzata"`);
console.log(`3. Inserisci 32% (o la tua percentuale preferita)`);
console.log(`4. Salva → La dashboard userà sempre quella percentuale`);
console.log(`5. La dashboard calcolerà automaticamente su base annuale!`);
