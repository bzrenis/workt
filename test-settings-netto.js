/**
 * 🧪 TEST IMPOSTAZIONI NETTO - Verifica salvataggio e caricamento
 */

const DatabaseService = require('./src/services/DatabaseService');
const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

async function testNetCalculationSettings() {
  console.log('🧪 TEST IMPOSTAZIONI CALCOLO NETTO\n');
  
  try {
    // Initialize database
    await DatabaseService.ensureInitialized();
    
    // Test 1: Leggi impostazioni attuali
    console.log('📖 TEST 1: Lettura impostazioni attuali');
    console.log('━'.repeat(50));
    
    const currentSettings = await DatabaseService.getSetting('appSettings');
    console.log('Impostazioni correnti:');
    console.log(`- Metodo: ${currentSettings?.netCalculation?.method || 'NON IMPOSTATO'}`);
    console.log(`- Percentuale custom: ${currentSettings?.netCalculation?.customDeductionRate || 'NON IMPOSTATO'}%`);
    
    // Test 2: Simula salvataggio impostazioni personalizzate
    console.log('\n💾 TEST 2: Salvataggio impostazioni personalizzate');
    console.log('━'.repeat(50));
    
    const newSettings = {
      ...currentSettings,
      netCalculation: {
        method: 'custom',
        customDeductionRate: 32 // La tua percentuale preferita
      }
    };
    
    await DatabaseService.setSetting('appSettings', newSettings);
    console.log('✅ Impostazioni salvate: 32% personalizzato');
    
    // Test 3: Verifica caricamento
    console.log('\n🔄 TEST 3: Verifica caricamento impostazioni');
    console.log('━'.repeat(50));
    
    const reloadedSettings = await DatabaseService.getSetting('appSettings');
    console.log('Impostazioni ricaricate:');
    console.log(`- Metodo: ${reloadedSettings.netCalculation.method}`);
    console.log(`- Percentuale: ${reloadedSettings.netCalculation.customDeductionRate}%`);
    
    if (reloadedSettings.netCalculation.method === 'custom' && 
        reloadedSettings.netCalculation.customDeductionRate === 32) {
      console.log('✅ Salvataggio funziona correttamente!');
    } else {
      console.log('❌ Problema nel salvataggio');
    }
    
    // Test 4: Calcolo con le nuove impostazioni
    console.log('\n🧮 TEST 4: Calcolo con impostazioni salvate');
    console.log('━'.repeat(50));
    
    const testAmount = 2839.07;
    const calculationSettings = {
      method: reloadedSettings.netCalculation.method,
      customDeductionRate: reloadedSettings.netCalculation.customDeductionRate
    };
    
    const result = RealPayslipCalculator.calculateNetFromGross(testAmount, calculationSettings);
    
    console.log(`Calcolo con ${calculationSettings.method} (${calculationSettings.customDeductionRate}%):`);
    console.log(`- Lordo: €${result.gross.toFixed(2)}`);
    console.log(`- Netto: €${result.net.toFixed(2)}`);
    console.log(`- Trattenute: €${result.totalDeductions.toFixed(2)}`);
    console.log(`- Percentuale: ${(result.deductionRate * 100).toFixed(1)}%`);
    
    // Test 5: Ripristina IRPEF per confronto
    console.log('\n🔄 TEST 5: Confronto con IRPEF');
    console.log('━'.repeat(50));
    
    const irpefSettings = {
      method: 'irpef',
      customDeductionRate: 25
    };
    
    const irpefResult = RealPayslipCalculator.calculateNetFromGross(testAmount, irpefSettings);
    
    console.log(`Calcolo con IRPEF:`);
    console.log(`- Lordo: €${irpefResult.gross.toFixed(2)}`);
    console.log(`- Netto: €${irpefResult.net.toFixed(2)}`);
    console.log(`- Trattenute: €${irpefResult.totalDeductions.toFixed(2)}`);
    console.log(`- Percentuale: ${(irpefResult.deductionRate * 100).toFixed(1)}%`);
    
    console.log('\n🎯 CONCLUSIONI:');
    console.log('━'.repeat(50));
    console.log(`- Custom 32%: €${result.net.toFixed(2)} netto`);
    console.log(`- IRPEF reale: €${irpefResult.net.toFixed(2)} netto`);
    console.log(`- Differenza: €${Math.abs(result.net - irpefResult.net).toFixed(2)}`);
    
    if (Math.abs(result.deductionRate - 0.32) < 0.01) {
      console.log('✅ Il sistema di impostazioni funziona perfettamente!');
    } else {
      console.log('❌ Problema nelle impostazioni personalizzate');
    }
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

testNetCalculationSettings();
