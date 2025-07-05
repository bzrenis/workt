/**
 * 🔧 TEST DASHBOARD - Verifica calcolo netto con dati realistici
 */

const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

console.log('🔍 TEST DASHBOARD - Calcolo Netto\n');

// Simula totale mensile realistico (stipendio base + qualche straordinario)
const scenarios = [
  { name: 'Solo stipendio base', amount: 2839.07 },
  { name: 'Con straordinari (€3200)', amount: 3200.00 },
  { name: 'Mese intenso (€3800)', amount: 3800.00 },
  { name: 'Importo basso (€2000)', amount: 2000.00 }
];

scenarios.forEach(scenario => {
  console.log(`📊 SCENARIO: ${scenario.name}`);
  console.log('━'.repeat(50));
  
  const payslipSettings = {
    method: 'irpef',
    customDeductionRate: 25
  };
  
  try {
    const result = RealPayslipCalculator.calculateNetFromGross(scenario.amount, payslipSettings);
    
    console.log(`💰 Lordo: €${result.gross.toFixed(2)}`);
    console.log(`💳 Netto: €${result.net.toFixed(2)}`);
    console.log(`📉 Trattenute: €${result.totalDeductions.toFixed(2)}`);
    console.log(`📊 Percentuale: ${(result.deductionRate * 100).toFixed(1)}%`);
    
    // Verifica se la percentuale è ragionevole
    const percentage = result.deductionRate * 100;
    if (percentage < 15) {
      console.log('⚠️  ATTENZIONE: Percentuale molto bassa per il reddito');
    } else if (percentage > 35) {
      console.log('⚠️  ATTENZIONE: Percentuale molto alta per il reddito');
    } else {
      console.log('✅ Percentuale nella norma');
    }
    
  } catch (error) {
    console.log(`❌ Errore nel calcolo: ${error.message}`);
  }
  
  console.log('');
});

// Test del metodo statico
console.log('🔧 TEST METODO STATICO (usato dalla dashboard)');
console.log('━'.repeat(50));

const testAmount = 3200; // Importo tipico con straordinari
const staticResult = RealPayslipCalculator.calculateNetFromGross(testAmount, {
  method: 'irpef',
  customDeductionRate: 25
});

console.log('Risultato metodo statico:');
console.log(`- Lordo: €${staticResult.gross.toFixed(2)}`);
console.log(`- Netto: €${staticResult.net.toFixed(2)}`);
console.log(`- Trattenute: €${staticResult.totalDeductions.toFixed(2)}`);
console.log(`- Percentuale: ${(staticResult.deductionRate * 100).toFixed(1)}%`);

console.log('\n🎯 CONCLUSIONE:');
if (staticResult.deductionRate * 100 > 25) {
  console.log('✅ Il calcolo è corretto - le trattenute reali sono superiori al 25%');
  console.log('📊 Include IRPEF + INPS (9.87%) + Addizionali (2.53%)');
} else {
  console.log('❌ Potrebbe esserci un problema nel calcolo');
}
