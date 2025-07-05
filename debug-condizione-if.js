console.log('🔍 DEBUG LOGICA DASHBOARD IN APP');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Simula esattamente quello che succede nell'app secondo i log
const settings = {
  netCalculation: {
    method: 'irpef',
    customDeductionRate: 28,
    useActualAmount: false
  },
  contract: {
    monthlyGrossSalary: 2839.07
  }
};

const grossAmount = 755.72;

console.log('\n📊 Condizioni della dashboard:');
console.log(`- grossAmount: €${grossAmount}`);
console.log(`- settings?.netCalculation?.useActualAmount: ${settings?.netCalculation?.useActualAmount}`);
console.log(`- !useActualAmount: ${!(settings?.netCalculation?.useActualAmount ?? false)}`);
console.log(`- settings?.contract?.monthlyGrossSalary: ${settings?.contract?.monthlyGrossSalary}`);
console.log(`- monthlyGrossSalary disponibile: ${!!settings?.contract?.monthlyGrossSalary}`);

const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;

console.log('\n🧪 Test condizione IF:');
console.log(`- !useActualAmount: ${!useActualAmount}`);
console.log(`- settings?.contract?.monthlyGrossSalary: ${!!settings?.contract?.monthlyGrossSalary}`);
console.log(`- Condizione completa: ${!useActualAmount && settings?.contract?.monthlyGrossSalary}`);

if (!useActualAmount && settings?.contract?.monthlyGrossSalary) {
  console.log('\n✅ DOVREBBE ENTRARE NEL RAMO STIMA ANNUALE');
  console.log(`- Base calcolo: €${settings.contract.monthlyGrossSalary}`);
  console.log('- Metodo: stima annuale');
} else {
  console.log('\n❌ ENTRA NEL RAMO CIFRA PRESENTE');
  console.log('- Questo è sbagliato se useActualAmount = false');
  
  console.log('\n🔍 Debug dettagliato:');
  console.log(`- useActualAmount valore: ${useActualAmount}`);
  console.log(`- !useActualAmount: ${!useActualAmount}`);
  console.log(`- settings?.contract: ${!!settings?.contract}`);
  console.log(`- settings?.contract?.monthlyGrossSalary: ${settings?.contract?.monthlyGrossSalary}`);
  console.log(`- typeof monthlyGrossSalary: ${typeof settings?.contract?.monthlyGrossSalary}`);
}

console.log('\n🔧 POSSIBILI CAUSE:');
console.log('1. settings è null o undefined');
console.log('2. settings.contract è null o undefined'); 
console.log('3. settings.contract.monthlyGrossSalary è 0, null o undefined');
console.log('4. Codice non sincronizzato con quello nell\'app');

console.log('\n💡 VERIFICA NELL\'APP:');
console.log('Controlla se settings.contract.monthlyGrossSalary è disponibile nel log');
