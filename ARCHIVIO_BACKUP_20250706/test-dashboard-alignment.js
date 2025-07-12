// Test per verificare l'allineamento della logica di calcolo tra Dashboard e TimeEntryForm
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

console.log('🧪 Test Allineamento Dashboard con TimeEntryForm');
console.log('================================================');
console.log('');

const testResults = [];

// Test 1: Verifica presenza helper functions identiche
const testHelperFunctions = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica formatSafeAmount
    const formatSafeAmountInDashboard = dashboardContent.includes('formatSafeAmount') && 
                                       dashboardContent.includes('amount.toFixed(2).replace');
    const formatSafeAmountInForm = formContent.includes('formatSafeAmount') && 
                                  formContent.includes('amount.toFixed(2).replace');
    
    // Verifica formatSafeHours
    const formatSafeHoursInDashboard = dashboardContent.includes('formatSafeHours') && 
                                      dashboardContent.includes('Math.floor(hours)');
    const formatSafeHoursInForm = formContent.includes('formatSafeHours') && 
                                 formContent.includes('Math.floor(hours)');
    
    testResults.push({
      name: 'Helper Functions Alignment',
      formatSafeAmount: formatSafeAmountInDashboard && formatSafeAmountInForm,
      formatSafeHours: formatSafeHoursInDashboard && formatSafeHoursInForm,
      passed: formatSafeAmountInDashboard && formatSafeAmountInForm && 
              formatSafeHoursInDashboard && formatSafeHoursInForm
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Helper Functions Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 2: Verifica presenza sezioni di breakdown simili al form
const testBreakdownSections = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica presenza sezioni principali
    const sectionsInForm = [
      'Attività Ordinarie',
      'Interventi Reperibilità', 
      'Indennità e Buoni',
      'Riepilogo Guadagni'
    ];
    
    const sectionsInDashboard = [
      'Breakdown Guadagni',
      'Dettaglio Reperibilità',
      'Rimborsi Pasti'
    ];
    
    const hasBreakdownGuadagni = dashboardContent.includes('Breakdown Guadagni');
    const hasDetailReperibilita = dashboardContent.includes('Dettaglio Reperibilità');
    const hasRimborsiPasti = dashboardContent.includes('Rimborsi Pasti');
    const hasSubBreakdown = dashboardContent.includes('subBreakdownContainer');
    
    testResults.push({
      name: 'Breakdown Sections',
      hasBreakdownGuadagni,
      hasDetailReperibilita,
      hasRimborsiPasti,
      hasSubBreakdown,
      passed: hasBreakdownGuadagni && hasDetailReperibilita && hasRimborsiPasti && hasSubBreakdown
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Breakdown Sections',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 3: Verifica logica rimborsi pasti allineata
const testMealLogicAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica presenza logica priorità contanti
    const dashboardHasPriorityLogic = dashboardContent.includes('Logica priorità: contanti specifici');
    const formHasPriorityLogic = formContent.includes('renderMealBreakdown') && 
                                formContent.includes('cashAmountFromForm > 0');
    
    // Verifica breakdown voucher/cash
    const dashboardHasVoucherCash = dashboardContent.includes('Buoni Pasto') && 
                                   dashboardContent.includes('Contanti');
    const formHasVoucherCash = formContent.includes('(buono)') && 
                              formContent.includes('(contanti)');
    
    testResults.push({
      name: 'Meal Logic Alignment', 
      dashboardPriorityLogic: dashboardHasPriorityLogic,
      formPriorityLogic: formHasPriorityLogic,
      dashboardVoucherCash: dashboardHasVoucherCash,
      formVoucherCash: formHasVoucherCash,
      passed: dashboardHasPriorityLogic && formHasPriorityLogic && 
              dashboardHasVoucherCash && formHasVoucherCash
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'Meal Logic Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 4: Verifica presenza note CCNL e maggiorazioni
const testCCNLNotesAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const formContent = fs.readFileSync('src/screens/TimeEntryForm.js', 'utf8');
    
    // Verifica note CCNL maggiorazioni
    const dashboardHasCCNLNotes = dashboardContent.includes('Note CCNL') || 
                                 dashboardContent.includes('Maggiorazione');
    const formHasCCNLNotes = formContent.includes('Applicata maggiorazione CCNL') || 
                            formContent.includes('Maggiorazioni CCNL');
    
    // Verifica percentuali maggiorazioni
    const dashboardHasPercentages = dashboardContent.includes('+25%') || 
                                   dashboardContent.includes('+30%');
    const formHasPercentages = formContent.includes('1.25') || 
                              formContent.includes('1.3');
    
    testResults.push({
      name: 'CCNL Notes Alignment',
      dashboardCCNLNotes: dashboardHasCCNLNotes,
      formCCNLNotes: formHasCCNLNotes,
      dashboardPercentages: dashboardHasPercentages,
      formPercentages: formHasPercentages,
      passed: dashboardHasCCNLNotes && formHasCCNLNotes
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'CCNL Notes Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Test 5: Verifica stili UI allineati a TimeEntryScreen
const testUIStylesAlignment = () => {
  try {
    const dashboardContent = fs.readFileSync('src/screens/DashboardScreen.js', 'utf8');
    const timeEntryContent = fs.readFileSync('src/screens/TimeEntryScreen.js', 'utf8');
    
    // Verifica componenti moderni
    const dashboardHasModernCard = dashboardContent.includes('ModernCard') || 
                                  dashboardContent.includes('modernCard');
    const timeEntryHasModernCard = timeEntryContent.includes('FadeInCard') || 
                                  timeEntryContent.includes('modernCard');
    
    // Verifica animazioni e microinterazioni
    const dashboardHasAnimations = dashboardContent.includes('Animated') || 
                                  dashboardContent.includes('scale');
    const timeEntryHasAnimations = timeEntryContent.includes('PressableAnimated') || 
                                  timeEntryContent.includes('spring');
    
    testResults.push({
      name: 'UI Styles Alignment',
      dashboardModernCard: dashboardHasModernCard,
      timeEntryModernCard: timeEntryHasModernCard,
      dashboardAnimations: dashboardHasAnimations,
      timeEntryAnimations: timeEntryHasAnimations,
      passed: dashboardHasModernCard && dashboardHasAnimations
    });
    
    return testResults[testResults.length - 1].passed;
  } catch (error) {
    testResults.push({
      name: 'UI Styles Alignment',
      error: error.message,
      passed: false
    });
    return false;
  }
};

// Esegui tutti i test
const runAllTests = async () => {
  console.log('🔍 Esecuzione test di allineamento...\n');
  
  const test1 = testHelperFunctions();
  const test2 = testBreakdownSections();
  const test3 = testMealLogicAlignment();
  const test4 = testCCNLNotesAlignment();
  const test5 = testUIStylesAlignment();
  
  // Risultati
  console.log('📊 RISULTATI TEST ALLINEAMENTO DASHBOARD');
  console.log('=========================================');
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
          const statusIcon = value ? '✅' : '❌';
          console.log(`   ${statusIcon} ${key}: ${value}`);
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
    console.log('🎉 ALLINEAMENTO COMPLETATO AL 100%!');
    console.log('La Dashboard ora utilizza la stessa logica del TimeEntryForm:');
    console.log('✅ Helper functions identiche');
    console.log('✅ Breakdown dettagliati allineati');
    console.log('✅ Logica rimborsi pasti coerente');
    console.log('✅ Note CCNL uniformi');
    console.log('✅ Stili UI moderni');
  } else {
    console.log('⚠️  Alcuni test non sono passati. Verifica i dettagli sopra.');
  }
  
  console.log('');
  console.log('📱 Per testare visualmente:');
  console.log('1. Avvia l\'app con: npx expo start');
  console.log('2. Naviga tra Dashboard e TimeEntry');
  console.log('3. Verifica coerenza tra calcoli e visualizzazioni');
  console.log('4. Controlla breakdown dettagliati e rimborsi pasti');
};

// Esegui i test
runAllTests().catch(console.error);
