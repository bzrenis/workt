/**
 * 🔍 DEBUG IMPOSTAZIONI PERSISTENTI
 * 
 * Test per verificare il problema del caricamento delle impostazioni
 * che non vengono applicate correttamente nella dashboard
 */

const DatabaseService = require('./src/services/DatabaseService');

async function debugImpostazioniPersistenti() {
  console.log('🔍 DEBUG IMPOSTAZIONI PERSISTENTI\n');
  
  try {
    // 1. Verificare le impostazioni correnti nel database
    console.log('📊 STEP 1: Verifica impostazioni attuali nel database');
    console.log('━'.repeat(60));
    
    const currentSettings = await DatabaseService.getSettings();
    console.log('Impostazioni caricate dal database:');
    console.log(JSON.stringify(currentSettings, null, 2));
    
    if (!currentSettings) {
      console.log('❌ PROBLEMA: Le impostazioni sono null o undefined');
      return;
    }
    
    // 2. Verificare specificamente le impostazioni netCalculation
    console.log('\n📊 STEP 2: Verifica impostazioni netCalculation');
    console.log('━'.repeat(60));
    
    const netCalc = currentSettings.netCalculation;
    if (netCalc) {
      console.log('Impostazioni netCalculation trovate:');
      console.log(`- Metodo: ${netCalc.method}`);
      console.log(`- Percentuale personalizzata: ${netCalc.customDeductionRate}`);
      console.log(`- Usa cifra presente: ${netCalc.useActualAmount}`);
    } else {
      console.log('❌ PROBLEMA: netCalculation non trovato nelle impostazioni');
    }
    
    // 3. Test di salvataggio di nuove impostazioni
    console.log('\n📊 STEP 3: Test salvataggio impostazioni personalizzate');
    console.log('━'.repeat(60));
    
    const testSettings = {
      method: 'custom',
      customDeductionRate: 28,
      useActualAmount: true
    };
    
    console.log('Salvataggio impostazioni test:');
    console.log(JSON.stringify(testSettings, null, 2));
    
    await DatabaseService.updateSettings('netCalculation', testSettings);
    console.log('✅ Impostazioni salvate nel database');
    
    // 4. Verifica immediata del caricamento
    console.log('\n📊 STEP 4: Verifica caricamento immediato');
    console.log('━'.repeat(60));
    
    const reloadedSettings = await DatabaseService.getSettings();
    const reloadedNetCalc = reloadedSettings?.netCalculation;
    
    if (reloadedNetCalc) {
      console.log('Impostazioni ricaricate:');
      console.log(`- Metodo: ${reloadedNetCalc.method}`);
      console.log(`- Percentuale: ${reloadedNetCalc.customDeductionRate}`);
      console.log(`- Usa cifra presente: ${reloadedNetCalc.useActualAmount}`);
      
      // Verifica se le impostazioni sono state effettivamente salvate
      if (reloadedNetCalc.method === testSettings.method && 
          reloadedNetCalc.customDeductionRate === testSettings.customDeductionRate) {
        console.log('✅ SUCCESSO: Le impostazioni sono state salvate correttamente');
      } else {
        console.log('❌ PROBLEMA: Le impostazioni non sono state salvate correttamente');
      }
    } else {
      console.log('❌ PROBLEMA: netCalculation non trovato dopo il salvataggio');
    }
    
    // 5. Simulare il flusso della dashboard
    console.log('\n📊 STEP 5: Simulazione flusso dashboard');
    console.log('━'.repeat(60));
    
    // Simuliamo il caricamento come fa la dashboard
    const dashboardSettings = await DatabaseService.getSettings();
    const netCalcForDashboard = dashboardSettings?.netCalculation || {
      method: 'irpef',
      customDeductionRate: 32,
      useActualAmount: false
    };
    
    console.log('Impostazioni che la dashboard vedrebbe:');
    console.log(`- Metodo: ${netCalcForDashboard.method}`);
    console.log(`- Percentuale: ${netCalcForDashboard.customDeductionRate}`);
    console.log(`- Usa cifra presente: ${netCalcForDashboard.useActualAmount}`);
    
    // 6. Verifica il problema dei fallback
    console.log('\n📊 STEP 6: Verifica logica fallback');
    console.log('━'.repeat(60));
    
    // Simuliamo la logica di fallback che potrebbe essere presente
    const safeNetCalc = dashboardSettings?.netCalculation || {};
    const finalMethod = safeNetCalc.method || 'irpef';
    const finalPercentage = safeNetCalc.customDeductionRate || 32;
    const finalUseActual = safeNetCalc.useActualAmount || false;
    
    console.log('Impostazioni dopo applicazione fallback:');
    console.log(`- Metodo finale: ${finalMethod}`);
    console.log(`- Percentuale finale: ${finalPercentage}`);
    console.log(`- Usa cifra presente finale: ${finalUseActual}`);
    
    if (finalMethod !== testSettings.method || finalPercentage !== testSettings.customDeductionRate) {
      console.log('❌ PROBLEMA IDENTIFICATO: I fallback stanno sovrascrivendo le impostazioni salvate');
    } else {
      console.log('✅ La logica di fallback funziona correttamente');
    }
    
    // 7. Ripristinare le impostazioni originali
    console.log('\n📊 STEP 7: Ripristino impostazioni originali');
    console.log('━'.repeat(60));
    
    if (netCalc) {
      await DatabaseService.updateSettings('netCalculation', netCalc);
      console.log('✅ Impostazioni originali ripristinate');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

// Esegui il debug
debugImpostazioniPersistenti().then(() => {
  console.log('\n🎯 DEBUG COMPLETATO');
  process.exit(0);
}).catch(console.error);
