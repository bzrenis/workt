const { execSync } = require('child_process');
const path = require('path');
const DatabaseService = require('./src/services/DatabaseService');

async function debugDashboardMonthlyGross() {
  console.log('🔍 DEBUG: Verifica monthlyGrossSalary nella Dashboard');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Inizializza database
    await DatabaseService.ensureInitialized();
    
    // Carica settings esattamente come fa la dashboard
    const settings = await DatabaseService.getSetting('appSettings');
    
    console.log('\n📊 SETTINGS CARICATI:');
    console.log('- Settings disponibili:', !!settings);
    console.log('- Contract disponibile:', !!settings?.contract);
    
    if (settings?.contract) {
      console.log('- monthlyGrossSalary:', settings.contract.monthlyGrossSalary);
      console.log('- monthlySalary:', settings.contract.monthlySalary);
      console.log('- hourlyRate:', settings.contract.hourlyRate);
      console.log('- Tipo monthlyGrossSalary:', typeof settings.contract.monthlyGrossSalary);
      console.log('- Truthy monthlyGrossSalary:', !!settings.contract.monthlyGrossSalary);
    } else {
      console.log('❌ Contract non trovato nei settings');
    }
    
    console.log('\n🔧 NET CALCULATION SETTINGS:');
    if (settings?.netCalculation) {
      console.log('- Method:', settings.netCalculation.method);
      console.log('- useActualAmount:', settings.netCalculation.useActualAmount);
      console.log('- customDeductionRate:', settings.netCalculation.customDeductionRate);
    } else {
      console.log('❌ NetCalculation non trovato nei settings');
    }
    
    // Simulazione logica dashboard
    console.log('\n🎯 SIMULAZIONE LOGICA DASHBOARD:');
    const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
    const monthlyGrossSalary = settings?.contract?.monthlyGrossSalary;
    const monthlySalary = settings?.contract?.monthlySalary;
    
    console.log('- useActualAmount:', useActualAmount);
    console.log('- !useActualAmount:', !useActualAmount);
    console.log('- monthlyGrossSalary:', monthlyGrossSalary);
    console.log('- monthlySalary:', monthlySalary);
    console.log('- monthlyGrossSalary truthy:', !!monthlyGrossSalary);
    console.log('- monthlySalary truthy:', !!monthlySalary);
    
    const condition1 = !useActualAmount && monthlyGrossSalary;
    const condition2 = !useActualAmount && monthlySalary;
    
    console.log('\n🔍 CONDIZIONI:');
    console.log(`- Condizione 1 (!useActualAmount && monthlyGrossSalary): ${condition1}`);
    console.log(`- Condizione 2 (!useActualAmount && monthlySalary): ${condition2}`);
    
    if (condition1) {
      console.log('✅ Dovrebbe usare stima annuale con monthlyGrossSalary:', monthlyGrossSalary);
    } else if (condition2) {
      console.log('✅ Dovrebbe usare stima annuale con monthlySalary:', monthlySalary);
    } else {
      console.log('❌ Userà cifra presente - problematico!');
      
      console.log('\n🔧 ANALISI PROBLEMA:');
      if (useActualAmount) {
        console.log('- useActualAmount è true, quindi usa cifra presente');
      } else {
        console.log('- useActualAmount è false, ma...');
        if (!monthlyGrossSalary && !monthlySalary) {
          console.log('- Né monthlyGrossSalary né monthlySalary sono disponibili');
        }
      }
    }
    
    console.log('\n🎯 STRUTTURA COMPLETA CONTRACT:');
    console.log(JSON.stringify(settings?.contract, null, 2));
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

debugDashboardMonthlyGross().catch(console.error);
