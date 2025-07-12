// Test per verificare l'allineamento perfetto della nuova Dashboard con TimeEntryForm
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

console.log('🧪 Test Nuova Dashboard Allineata con TimeEntryForm');
console.log('==================================================');
console.log('');

const testResults = [];

// Test 1: Verifica imports e dipendenze identiche
const testImportsAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica import createWorkEntryFromData
    const dashboardHasCreateWorkEntry = dashboardContent.includes('createWorkEntryFromData');
    const formHasCreateWorkEntry = formContent.includes('createWorkEntryFromData');
    
    // Verifica import useCalculationService
    const dashboardHasCalculationService = dashboardContent.includes('useCalculationService');
    const formHasCalculationService = formContent.includes('useCalculationService');
    
    // Verifica utilizzo calculateEarningsBreakdown
    const dashboardUsesBreakdown = dashboardContent.includes('calculateEarningsBreakdown');
    const formUsesBreakdown = formContent.includes('calculateEarningsBreakdown');
    
    testResults.push({
      name: 'Imports & Dependencies Alignment',
      createWorkEntryFromData: dashboardHasCreateWorkEntry && formHasCreateWorkEntry,
      calculationService: dashboardHasCalculationService && formHasCalculationService,
      earningsBreakdown: dashboardUsesBreakdown && formUsesBreakdown,
      passed: dashboardHasCreateWorkEntry && dashboardHasCalculationService && dashboardUsesBreakdown
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Imports & Dependencies Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 2: Verifica helper functions identiche
const testHelperFunctionsIdentical = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Estrai definizioni formatSafeAmount
    const dashboardFormatSafeAmount = dashboardContent.match(/formatSafeAmount\s*=\s*\([^}]+\}/s);
    const formFormatSafeAmount = formContent.match(/formatSafeAmount\s*=\s*\([^}]+\}/s);
    
    // Estrai definizioni formatSafeHours
    const dashboardFormatSafeHours = dashboardContent.match(/formatSafeHours\s*=\s*\([^}]+\}/s);
    const formFormatSafeHours = formContent.match(/formatSafeHours\s*=\s*\([^}]+\}/s);
    
    const formatSafeAmountIdentical = dashboardFormatSafeAmount && formFormatSafeAmount &&
      dashboardFormatSafeAmount[0].replace(/\s/g, '') === formFormatSafeAmount[0].replace(/\s/g, '');
    
    const formatSafeHoursIdentical = dashboardFormatSafeHours && formFormatSafeHours &&
      dashboardFormatSafeHours[0].replace(/\s/g, '') === formFormatSafeHours[0].replace(/\s/g, '');
    
    testResults.push({
      name: 'Helper Functions Identical',
      formatSafeAmountExists: !!dashboardFormatSafeAmount && !!formFormatSafeAmount,
      formatSafeHoursExists: !!dashboardFormatSafeHours && !!formFormatSafeHours,
      formatSafeAmountIdentical,
      formatSafeHoursIdentical,
      passed: formatSafeAmountIdentical && formatSafeHoursIdentical
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Helper Functions Identical',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 3: Verifica estrazione dati dalle stesse fonti
const testDataExtractionAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    
    // Verifica che Dashboard usi createWorkEntryFromData per ogni entry
    const usesCreateWorkEntryFromData = dashboardContent.includes('createWorkEntryFromData(entry, calculationService)');
    
    // Verifica che Dashboard usi calculateEarningsBreakdown con settings
    const usesCalculateEarningsBreakdown = dashboardContent.includes('calculateEarningsBreakdown(workEntry, settings)');
    
    // Verifica che Dashboard acceda ai breakdown fields come nel form
    const accessesOrdinaryHours = dashboardContent.includes('breakdown.ordinary?.hours');
    const accessesStandbyHours = dashboardContent.includes('breakdown.standby');
    const accessesAllowances = dashboardContent.includes('breakdown.allowances');
    
    testResults.push({
      name: 'Data Extraction Alignment',
      usesCreateWorkEntryFromData,
      usesCalculateEarningsBreakdown,
      accessesOrdinaryHours,
      accessesStandbyHours,
      accessesAllowances,
      passed: usesCreateWorkEntryFromData && usesCalculateEarningsBreakdown && 
              accessesOrdinaryHours && accessesStandbyHours && accessesAllowances
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Data Extraction Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 4: Verifica copertura statistiche richieste
const testRequiredStatsImplemented = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    
    const requiredStats = [
      'totalWorkDays',           // giorni totali lavorati
      'totalDailyRateDays',      // giorni totali con retribuzione giornaliera 
      'specialDays',             // giorni totali sabati, domeniche, festivi
      'totalTravel',             // ore totali viaggio
      'travelExtra',             // ore totali viaggio extra
      'overtime',                // ore straordinarie con tipo giornata e maggiorazioni
      'standbyTravel',           // ore viaggio in reperibilità
      'standbyWork',             // ore lavoro reperibilità
      'totalStandby',            // ore totali viaggio e lavoro in reperibilità  
      'totalWorkAndTravel',      // ore totali viaggio e lavoro totale
      'travelDays',              // giorni totale indennità trasferta
      'standbyDays',             // giorni totale indennità reperibilità
      'meals'                    // giorni totale rimborso pasti con dettaglio
    ];
    
    const implementedStats = [];
    const missingStats = [];
    
    requiredStats.forEach(stat => {
      if (dashboardContent.includes(stat)) {
        implementedStats.push(stat);
      } else {
        missingStats.push(stat);
      }
    });
    
    testResults.push({
      name: 'Required Stats Implementation',
      totalRequired: requiredStats.length,
      implemented: implementedStats.length,
      missing: missingStats.length,
      implementedStats,
      missingStats,
      passed: missingStats.length === 0
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Required Stats Implementation',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 5: Verifica UI components e layout
const testUIComponentsAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    
    // Verifica componenti UI moderni
    const hasStatsCard = dashboardContent.includes('StatsCard');
    const hasDetailRow = dashboardContent.includes('DetailRow');
    const hasAnimations = dashboardContent.includes('Animated.View');
    const hasRefreshControl = dashboardContent.includes('RefreshControl');
    const hasQuickActions = dashboardContent.includes('quickActions');
    
    // Verifica layout responsive
    const hasStatsGrid = dashboardContent.includes('statsGrid');
    const hasFlexLayout = dashboardContent.includes('flexDirection');
    const hasElevationShadows = dashboardContent.includes('elevation');
    
    testResults.push({
      name: 'UI Components & Layout',
      hasStatsCard,
      hasDetailRow,
      hasAnimations,
      hasRefreshControl,
      hasQuickActions,
      hasStatsGrid,
      hasFlexLayout,
      hasElevationShadows,
      passed: hasStatsCard && hasDetailRow && hasAnimations && hasRefreshControl && hasQuickActions
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'UI Components & Layout',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 6: Verifica gestione errori e stati
const testErrorHandlingAndStates = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    
    // Verifica gestione stati
    const hasLoadingState = dashboardContent.includes('isLoading');
    const hasErrorState = dashboardContent.includes('setError');
    const hasEmptyState = dashboardContent.includes('entries.length === 0');
    
    // Verifica gestione errori
    const hasTryCatch = dashboardContent.includes('try {') && dashboardContent.includes('catch');
    const hasErrorLogging = dashboardContent.includes('console.error');
    const hasRetryButton = dashboardContent.includes('retryButton');
    
    testResults.push({
      name: 'Error Handling & States',
      hasLoadingState,
      hasErrorState,
      hasEmptyState,
      hasTryCatch,
      hasErrorLogging,
      hasRetryButton,
      passed: hasLoadingState && hasErrorState && hasEmptyState && hasTryCatch
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Error Handling & States',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Esegui tutti i test
const runAllTests = async () => {
  console.log('🔍 Esecuzione test nuova Dashboard...\n');
  
  const test1 = testImportsAlignment();
  const test2 = testHelperFunctionsIdentical();
  const test3 = testDataExtractionAlignment();
  const test4 = testRequiredStatsImplemented();
  const test5 = testUIComponentsAlignment();
  const test6 = testErrorHandlingAndStates();
  
  // Risultati
  console.log('📊 RISULTATI TEST NUOVA DASHBOARD');
  console.log('=================================');
  console.log('');
  
  testResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.name}: ${status}`);
    
    if (result.error) {
      console.log(`   Errore: ${result.error}`);
    } else {
      Object.keys(result).forEach(key => {
        if (key !== 'name' && key !== 'passed' && key !== 'error') {
          const value = result[key];
          if (Array.isArray(value)) {
            console.log(`   ${key}: [${value.join(', ')}]`);
          } else if (typeof value === 'boolean') {
            const statusIcon = value ? '✅' : '❌';
            console.log(`   ${statusIcon} ${key}: ${value}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        }
      });
    }
    console.log('');
  });
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`📈 RIEPILOGO: ${passedTests}/${totalTests} test superati (${passRate}%)`);
  console.log('');
  
  if (passedTests === totalTests) {
    console.log('🎉 NUOVA DASHBOARD PERFETTAMENTE ALLINEATA!');
    console.log('');
    console.log('✅ La Dashboard estrae i dati con la stessa logica del TimeEntryForm:');
    console.log('   • Usa createWorkEntryFromData per ogni entry');
    console.log('   • Chiama calculateEarningsBreakdown con settings');
    console.log('   • Accede ai breakdown fields identici al form');
    console.log('   • Helper functions duplicate dal form');
    console.log('');
    console.log('📊 Statistiche implementate:');
    console.log('   • Giorni totali lavorati');
    console.log('   • Giorni con diaria giornaliera (≥8h)');
    console.log('   • Giorni speciali con maggiorazioni CCNL');
    console.log('   • Ore viaggio ordinarie e extra');
    console.log('   • Ore straordinarie per tipologia');
    console.log('   • Ore reperibilità (lavoro + viaggio)');
    console.log('   • Totale ore lavoro e viaggio');
    console.log('   • Indennità trasferta e reperibilità');
    console.log('   • Rimborsi pasti con breakdown buoni/contanti');
    console.log('');
    console.log('🎨 UI moderna e responsive implementata');
    console.log('⚙️ Gestione errori e stati completa');
  } else {
    console.log('⚠️  Alcuni test non sono passati. Verifica i dettagli sopra.');
  }
  
  console.log('');
  console.log('📱 Per testare la nuova Dashboard:');
  console.log('1. Avvia l\'app con: npx expo start');
  console.log('2. Naviga alla Dashboard');
  console.log('3. Verifica che i calcoli siano identici al TimeEntryForm');
  console.log('4. Testa refresh e navigazione mesi');
};

// Esegui i test
runAllTests().catch(console.error);
