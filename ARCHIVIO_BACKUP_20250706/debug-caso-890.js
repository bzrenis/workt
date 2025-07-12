/**
 * 🐞 DEBUG CASO SPECIFICO - €890.05 lordi
 * 
 * Test del caso reale mostrato nello screenshot della dashboard
 */

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

// Importo esatto dalla dashboard
const grossAmount = 890.05;

console.log('🔍 DEBUG CASO SPECIFICO - €890.05\n');
console.log(`💰 Importo lordo dalla dashboard: €${grossAmount.toFixed(2)}\n`);

// Test con le stesse impostazioni della dashboard
const payslipSettings = {
  method: 'irpef',
  customDeductionRate: 25
};

console.log('📊 CALCOLO CON METODO IRPEF');
console.log('━'.repeat(50));

try {
  const result = RealPayslipCalculator.calculateNetFromGross(grossAmount, payslipSettings);
  
  console.log('✅ RISULTATO CORRETTO:');
  console.log(`- Lordo: €${result.gross.toFixed(2)}`);
  console.log(`- Netto: €${result.net.toFixed(2)}`);
  console.log(`- Trattenute: €${result.totalDeductions.toFixed(2)}`);
  console.log(`- Percentuale: ${(result.deductionRate * 100).toFixed(1)}%`);
  
  console.log('\n🔍 BREAKDOWN DETTAGLIATO:');
  console.log(`- IRPEF: €${result.breakdown.irpef.toFixed(2)}`);
  console.log(`- INPS: €${result.breakdown.socialContributions.toFixed(2)}`);
  console.log(`- Addizionali: €${result.breakdown.additionalTaxes.toFixed(2)}`);
  
  console.log('\n📱 CONFRONTO CON DASHBOARD:');
  console.log(`- Dashboard mostra netto: €779,68`);
  console.log(`- Calcolo corretto netto: €${result.net.toFixed(2)}`);
  console.log(`- Dashboard mostra trattenute: €110,37 (12.4%)`);
  console.log(`- Calcolo corretto trattenute: €${result.totalDeductions.toFixed(2)} (${(result.deductionRate * 100).toFixed(1)}%)`);
  
  if (Math.abs(result.net - 779.68) > 1) {
    console.log('\n❌ ERRORE CONFERMATO: Dashboard calcola male!');
  } else {
    console.log('\n✅ Dashboard calcola correttamente');
  }
  
} catch (error) {
  console.log(`❌ Errore nel calcolo: ${error.message}`);
}

console.log('\n\n🔬 ANALISI MANUALE IRPEF PER €890.05');
console.log('━'.repeat(50));

const annualGross = grossAmount * 12; // €10,680.60
console.log(`Reddito annuo: €${annualGross.toFixed(2)}`);

// Con questo reddito molto basso, IRPEF dovrebbe essere quasi zero
const irpefAnnual = annualGross * 0.23; // Prima fascia 23%
const workDeduction = 1880;
const personalDeduction = 1955; // Si applica perché < €15.000

const totalDeductions = workDeduction + personalDeduction; // €3.835
const netIRPEF = Math.max(0, irpefAnnual - totalDeductions);
const monthlyIRPEF = netIRPEF / 12;

console.log(`IRPEF lorda annua: €${irpefAnnual.toFixed(2)}`);
console.log(`Detrazioni annue: €${totalDeductions.toFixed(2)}`);
console.log(`IRPEF netta annua: €${netIRPEF.toFixed(2)}`);
console.log(`IRPEF netta mensile: €${monthlyIRPEF.toFixed(2)}`);

const socialContribs = grossAmount * 0.0987;
const additionalTaxes = grossAmount * 0.0253;
const totalMonthlyDeductions = monthlyIRPEF + socialContribs + additionalTaxes;

console.log(`\nContributi mensili:`);
console.log(`- IRPEF: €${monthlyIRPEF.toFixed(2)}`);
console.log(`- INPS: €${socialContribs.toFixed(2)}`);
console.log(`- Addizionali: €${additionalTaxes.toFixed(2)}`);
console.log(`- TOTALE: €${totalMonthlyDeductions.toFixed(2)}`);
console.log(`- PERCENTUALE: ${((totalMonthlyDeductions / grossAmount) * 100).toFixed(1)}%`);

console.log('\n🎯 CONCLUSIONE FINALE:');
console.log('━'.repeat(50));
const expectedNet = grossAmount - totalMonthlyDeductions;
if (Math.abs(expectedNet - 779.68) < 1) {
  console.log('✅ La dashboard calcola correttamente');
} else {
  console.log('❌ BUG CONFERMATO: Dashboard usa calcolo sbagliato');
  console.log(`   Dovrebbe mostrare: €${expectedNet.toFixed(2)} netto`);
  console.log(`   Invece mostra: €779,68 netto`);
}
