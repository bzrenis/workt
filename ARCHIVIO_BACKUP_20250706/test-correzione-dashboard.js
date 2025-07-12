console.log('🧪 TEST CORREZIONE LOGICA DASHBOARD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Simula la logica corretta della dashboard
function simulateDashboardCalculation(grossAmount, settings) {
  let calculationBase = grossAmount;
  let isEstimated = false;
  
  const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
  
  // ✅ Logica CORRETTA: Se l'utente ha scelto "stima annuale", usa SEMPRE la stima
  if (!useActualAmount && settings?.contract?.monthlyGrossSalary) {
    const baseAnnual = settings.contract.monthlyGrossSalary * 12;
    const extraMonthly = Math.max(0, grossAmount - settings.contract.monthlyGrossSalary);
    const estimatedAnnual = baseAnnual + (extraMonthly * 12);
    calculationBase = estimatedAnnual / 12;
    isEstimated = true;
  }
  
  return { calculationBase, isEstimated, useActualAmount };
}

// Importa il calculator per test realistici
const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

// Test con impostazioni realistiche
const settings = {
  netCalculation: {
    method: 'irpef',
    customDeductionRate: 32,
    useActualAmount: false // Utente vuole "stima annuale"
  },
  contract: {
    monthlyGrossSalary: 2839.07
  }
};

console.log('\n📊 Test con impostazioni IRPEF + stima annuale:');
console.log(`- Metodo: ${settings.netCalculation.method}`);
console.log(`- Usa cifra presente: ${settings.netCalculation.useActualAmount}`);
console.log(`- Stipendio base: €${settings.contract.monthlyGrossSalary}`);

console.log('\n🧪 Test diversi importi mensili:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const testCases = [
  { gross: 1200, desc: 'Mese con poche ore' },
  { gross: 1800, desc: 'Mese medio-basso' },
  { gross: 2500, desc: 'Mese normale' },
  { gross: 3200, desc: 'Mese con molte ore' },
  { gross: 4000, desc: 'Mese straordinario' }
];

testCases.forEach(({ gross, desc }) => {
  console.log(`\n💰 ${desc}: €${gross}`);
  
  const result = simulateDashboardCalculation(gross, settings);
  
  console.log(`→ Base calcolo: €${result.calculationBase.toFixed(2)}`);
  console.log(`→ È stima annuale: ${result.isEstimated}`);
  
  if (result.isEstimated) {
    console.log('✅ Corretto: usando stima annuale');
  } else {
    console.log('❌ Errore: dovrebbe usare stima annuale');
  }
  
  // Calcolo netto reale
  const payslipSettings = {
    method: settings.netCalculation.method,
    customDeductionRate: settings.netCalculation.customDeductionRate
  };
  
  const netCalculation = RealPayslipCalculator.calculateNetFromGross(result.calculationBase, payslipSettings);
  
  console.log(`→ Lordo base: €${result.calculationBase.toFixed(2)}`);
  console.log(`→ Netto: €${netCalculation.net.toFixed(2)}`);
  console.log(`→ Trattenute: ${(netCalculation.deductionRate * 100).toFixed(1)}%`);
});

console.log('\n🎯 Test con cifra presente attivata:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const settingsActual = {
  ...settings,
  netCalculation: {
    ...settings.netCalculation,
    useActualAmount: true // Utente vuole "cifra presente"
  }
};

const testGross = 1800;
const resultActual = simulateDashboardCalculation(testGross, settingsActual);

console.log(`💰 Importo: €${testGross}`);
console.log(`→ Base calcolo: €${resultActual.calculationBase.toFixed(2)}`);
console.log(`→ È stima annuale: ${resultActual.isEstimated}`);

if (!resultActual.isEstimated && resultActual.calculationBase === testGross) {
  console.log('✅ Corretto: usando cifra presente');
} else {
  console.log('❌ Errore: dovrebbe usare cifra presente');
}

const payslipSettingsActual = {
  method: settingsActual.netCalculation.method,
  customDeductionRate: settingsActual.netCalculation.customDeductionRate
};

const netCalculationActual = RealPayslipCalculator.calculateNetFromGross(resultActual.calculationBase, payslipSettingsActual);

console.log(`→ Netto: €${netCalculationActual.net.toFixed(2)}`);
console.log(`→ Trattenute: ${(netCalculationActual.deductionRate * 100).toFixed(1)}%`);

console.log('\n🏆 RISULTATO ATTESO:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Con stima annuale: SEMPRE 32% di trattenute');
console.log('✅ Con cifra presente: trattenute variabili in base all\'importo');
console.log('✅ Dashboard ora dovrebbe mostrare 32% per tutti gli importi quando è attiva la stima annuale');
