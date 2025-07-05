console.log('🔍 DEBUG LOGICA DASHBOARD - Test logica calcolo base');

// Simula le impostazioni e la logica della dashboard
const settings = {
  netCalculation: {
    method: 'irpef',
    customDeductionRate: 32,
    useActualAmount: false // Utente ha scelto "stima annuale"
  },
  contract: {
    monthlyGrossSalary: 2839.07
  }
};

console.log('\n📊 Test diversi importi lordi:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const testAmounts = [
  500,   // Importo basso
  1200,  // Importo medio-basso
  1800,  // Importo medio-alto  
  2500,  // Importo alto
  3200,  // Importo molto alto
  0      // Importo zero
];

testAmounts.forEach(grossAmount => {
  console.log(`\n💰 Importo lordo: €${grossAmount}`);
  
  // Replica la logica attuale della dashboard
  let calculationBase = grossAmount;
  let isEstimated = false;
  
  const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
  console.log(`- useActualAmount: ${useActualAmount}`);
  console.log(`- grossAmount < 1500: ${grossAmount < 1500}`);
  console.log(`- monthlyGrossSalary disponibile: ${!!settings?.contract?.monthlyGrossSalary}`);
  
  if (!useActualAmount && grossAmount < 1500 && settings?.contract?.monthlyGrossSalary) {
    // Stima annuale: stipendio base * 12 + extra del mese * 12
    const baseAnnual = settings.contract.monthlyGrossSalary * 12;
    const extraMonthly = Math.max(0, grossAmount - settings.contract.monthlyGrossSalary);
    const estimatedAnnual = baseAnnual + (extraMonthly * 12);
    calculationBase = estimatedAnnual / 12;
    isEstimated = true;
    
    console.log(`- baseAnnual: €${baseAnnual}`);
    console.log(`- extraMonthly: €${extraMonthly}`);
    console.log(`- estimatedAnnual: €${estimatedAnnual}`);
  }
  
  console.log(`→ Base calcolo: €${calculationBase.toFixed(2)}`);
  console.log(`→ È stima: ${isEstimated}`);
  console.log(`→ Usa cifra presente: ${!isEstimated && calculationBase === grossAmount}`);
});

console.log('\n🚨 PROBLEMA IDENTIFICATO:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('La logica attuale usa la stima annuale SOLO se:');
console.log('1. useActualAmount = false (✓ corretto)');
console.log('2. grossAmount < 1500 (❌ SBAGLIATO!)');
console.log('3. monthlyGrossSalary disponibile (✓ corretto)');
console.log('');
console.log('❌ Se l\'importo lordo è > €1500, usa SEMPRE la cifra presente');
console.log('   anche se l\'utente ha scelto "stima annuale"!');
console.log('');
console.log('✅ CORREZIONE NECESSARIA:');
console.log('   Se useActualAmount = false, usa SEMPRE la stima annuale');
console.log('   indipendentemente dall\'importo.');

console.log('\n🔧 LOGICA CORRETTA:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

testAmounts.slice(1, 4).forEach(grossAmount => {
  console.log(`\n💰 Importo lordo: €${grossAmount}`);
  
  // Logica CORRETTA
  let calculationBase = grossAmount;
  let isEstimated = false;
  
  const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
  
  if (!useActualAmount && settings?.contract?.monthlyGrossSalary) {
    // Usa SEMPRE la stima annuale se l'utente l'ha richiesta
    const baseAnnual = settings.contract.monthlyGrossSalary * 12;
    const extraMonthly = Math.max(0, grossAmount - settings.contract.monthlyGrossSalary);
    const estimatedAnnual = baseAnnual + (extraMonthly * 12);
    calculationBase = estimatedAnnual / 12;
    isEstimated = true;
  }
  
  console.log(`→ Base calcolo (CORRETTA): €${calculationBase.toFixed(2)}`);
  console.log(`→ È stima (CORRETTA): ${isEstimated}`);
});
