/**
 * 🐞 DEBUG SETTINGS DASHBOARD
 * 
 * Test per capire che impostazioni vengono caricate nella dashboard
 */

const DatabaseService = require('./src/services/DatabaseService');
const { DEFAULT_SETTINGS } = require('./src/constants');
const { RealPayslipCalculator } = require('./src/services/RealPayslipCalculator');

async function debugDashboardSettings() {
  try {
    console.log('🔍 DEBUG SETTINGS DASHBOARD\n');
    
    // 1. Inizializza il database
    console.log('📚 Inizializzazione database...');
    await DatabaseService.ensureInitialized();
    
    // 2. Carica le impostazioni dal database
    console.log('⚙️ Caricamento impostazioni...');
    const settings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
    
    console.log('\n📋 IMPOSTAZIONI CARICATE:');
    console.log('━'.repeat(50));
    console.log('Impostazioni complete:', JSON.stringify(settings, null, 2));
    
    // 3. Controlla specificamente netCalculation
    console.log('\n💰 IMPOSTAZIONI CALCOLO NETTO:');
    console.log('━'.repeat(50));
    console.log('netCalculation:', settings.netCalculation);
    
    if (settings.netCalculation) {
      console.log(`- Metodo: ${settings.netCalculation.method}`);
      console.log(`- Percentuale personalizzata: ${settings.netCalculation.customDeductionRate}%`);
    } else {
      console.log('❌ netCalculation non trovato!');
    }
    
    // 4. Test calcolo con le impostazioni reali
    console.log('\n🧮 TEST CALCOLO CON SETTINGS REALI:');
    console.log('━'.repeat(50));
    
    const testAmount = 2839.07;
    console.log(`Importo test: €${testAmount}`);
    
    // Simula la chiamata della dashboard
    const dashboardResult = RealPayslipCalculator.calculateNetFromGross(testAmount, settings);
    
    console.log('\nRisultato calcolo dashboard:');
    console.log(`- Lordo: €${dashboardResult.gross.toFixed(2)}`);
    console.log(`- Netto: €${dashboardResult.net.toFixed(2)}`);
    console.log(`- Trattenute: €${dashboardResult.totalDeductions.toFixed(2)}`);
    console.log(`- Percentuale: ${(dashboardResult.deductionRate * 100).toFixed(1)}%`);
    
    // 5. Test con settings null (default)
    console.log('\n🧮 TEST CALCOLO CON SETTINGS NULL:');
    console.log('━'.repeat(50));
    
    const nullResult = RealPayslipCalculator.calculateNetFromGross(testAmount, null);
    
    console.log('\nRisultato calcolo con settings null:');
    console.log(`- Lordo: €${nullResult.gross.toFixed(2)}`);
    console.log(`- Netto: €${nullResult.net.toFixed(2)}`);
    console.log(`- Trattenute: €${nullResult.totalDeductions.toFixed(2)}`);
    console.log(`- Percentuale: ${(nullResult.deductionRate * 100).toFixed(1)}%`);
    
    // 6. Test calcolo differenza
    console.log('\n📊 CONFRONTO RISULTATI:');
    console.log('━'.repeat(50));
    
    const percentageDiff = (dashboardResult.deductionRate * 100) - (nullResult.deductionRate * 100);
    
    console.log(`Differenza percentuale: ${percentageDiff.toFixed(1)}%`);
    
    if (Math.abs(percentageDiff) > 0.1) {
      console.log('✅ Le impostazioni stanno influenzando il calcolo');
    } else {
      console.log('❌ Le impostazioni non stanno influenzando il calcolo');
    }
    
    // 7. Controlla se ci sono impostazioni legacy
    console.log('\n🔍 VERIFICA IMPOSTAZIONI LEGACY:');
    console.log('━'.repeat(50));
    
    const hasLegacy = settings.netCalculationMethod !== undefined || settings.customNetPercentage !== undefined;
    
    if (hasLegacy) {
      console.log('⚠️ Trovate impostazioni legacy:');
      if (settings.netCalculationMethod) {
        console.log(`- netCalculationMethod: ${settings.netCalculationMethod}`);
      }
      if (settings.customNetPercentage) {
        console.log(`- customNetPercentage: ${settings.customNetPercentage}`);
      }
    } else {
      console.log('✅ Nessuna impostazione legacy trovata');
    }
    
    // 8. Verifica compatibilità
    console.log('\n🔧 VERIFICA COMPATIBILITÀ:');
    console.log('━'.repeat(50));
    
    if (settings.netCalculation && settings.netCalculation.method === 'custom') {
      const customRate = settings.netCalculation.customDeductionRate;
      if (customRate && customRate < 20) {
        console.log(`🎯 TROVATO IL PROBLEMA! Percentuale personalizzata troppo bassa: ${customRate}%`);
        console.log('Questo spiega perché le trattenute sono al 12.4% invece del 25-30% atteso');
      } else {
        console.log(`Percentuale personalizzata normale: ${customRate}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

debugDashboardSettings();
