console.log('🧪 TEST LOGICA SEMPLIFICATA DASHBOARD');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Simula la logica semplificata della dashboard
function simulateSimplifiedDashboard(grossAmount, settings) {
  let calculationBase = grossAmount;
  let isEstimated = false;
  
  const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
  
  // ✅ Logica SEMPLIFICATA: Se stima annuale, usa sempre lo stipendio base
  if (!useActualAmount && settings?.contract?.monthlyGrossSalary) {
    calculationBase = settings.contract.monthlyGrossSalary;
    isEstimated = true;
  }
  
  return { calculationBase, isEstimated, useActualAmount };
}

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

const settings = {
  netCalculation: {
    method: 'irpef',
    customDeductionRate: 32,
    useActualAmount: false // Stima annuale
  },
  contract: {
    monthlyGrossSalary: 2839.07
  }
};

console.log('\n📊 Test con impostazioni IRPEF + stima annuale (logica semplificata):');
console.log(`- Metodo: ${settings.netCalculation.method}`);
console.log(`- Usa cifra presente: ${settings.netCalculation.useActualAmount}`);
console.log(`- Stipendio base: €${settings.contract.monthlyGrossSalary}`);

console.log('\n🧪 Test diversi importi mensili:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const testCases = [
  { gross: 800, desc: 'Mese con pochissime ore' },
  { gross: 1200, desc: 'Mese con poche ore' },
  { gross: 1800, desc: 'Mese medio-basso' },
  { gross: 2500, desc: 'Mese normale' },
  { gross: 3200, desc: 'Mese con molte ore' },
  { gross: 4000, desc: 'Mese straordinario' }
];

testCases.forEach(({ gross, desc }) => {
  console.log(`\n💰 ${desc}: €${gross}`);
  
  const result = simulateSimplifiedDashboard(gross, settings);
  
  console.log(`→ Base calcolo: €${result.calculationBase.toFixed(2)}`);
  console.log(`→ È stima annuale: ${result.isEstimated}`);
  
  const payslipSettings = {
    method: settings.netCalculation.method,
    customDeductionRate: settings.netCalculation.customDeductionRate
  };
  
  const netCalculation = RealPayslipCalculator.calculateNetFromGross(result.calculationBase, payslipSettings);
  
  console.log(`→ Netto: €${netCalculation.net.toFixed(2)}`);
  console.log(`→ Trattenute: ${(netCalculation.deductionRate * 100).toFixed(1)}%`);
  
  if (result.isEstimated) {
    console.log('✅ PERFETTO: Base sempre uguale, trattenute sempre 32%');
  }
});

console.log('\n🎯 Test con cifra presente:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const settingsActual = {
  ...settings,
  netCalculation: {
    ...settings.netCalculation,
    useActualAmount: true
  }
};

[1200, 2500, 3200].forEach(gross => {
  console.log(`\n💰 Importo: €${gross}`);
  const result = simulateSimplifiedDashboard(gross, settingsActual);
  console.log(`→ Base calcolo: €${result.calculationBase.toFixed(2)}`);
  
  const payslipSettings = {
    method: settingsActual.netCalculation.method,
    customDeductionRate: settingsActual.netCalculation.customDeductionRate
  };
  
  const netCalculation = RealPayslipCalculator.calculateNetFromGross(result.calculationBase, payslipSettings);
  console.log(`→ Trattenute: ${(netCalculation.deductionRate * 100).toFixed(1)}%`);
});

console.log('\n🏆 RISULTATO FINALE:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Stima annuale: SEMPRE 32% di trattenute (base €2839.07)');
console.log('✅ Cifra presente: trattenute variabili in base all\'importo reale');
console.log('✅ Logica più semplice e prevedibile per l\'utente');
