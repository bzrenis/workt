const fs = require('fs');
const path = require('path');

console.log('🔍 TEST: Verifica allineamento rimborsi pasti con logica del form...\n');

const timeEntryScreenPath = path.join(__dirname, 'src', 'screens', 'TimeEntryScreen.js');
const timeEntryFormPath = path.join(__dirname, 'src', 'screens', 'TimeEntryForm.js');

try {
  const screenContent = fs.readFileSync(timeEntryScreenPath, 'utf8');
  const formContent = fs.readFileSync(timeEntryFormPath, 'utf8');
  
  let testsPerformed = 0;
  let testsPassed = 0;

  // Test 1: Verifica logica priorità cash specifico nel TimeEntryScreen
  testsPerformed++;
  const hasCashPriorityScreen = screenContent.includes('if (workEntry.mealLunchCash > 0) {') &&
                               screenContent.includes('return `${formatCurrency(workEntry.mealLunchCash)} (contanti - valore specifico)`;');
  
  if (hasCashPriorityScreen) {
    console.log('✅ Test 1 SUPERATO: TimeEntryScreen ha priorità cash specifico');
    testsPassed++;
  } else {
    console.log('❌ Test 1 FALLITO: TimeEntryScreen non ha priorità cash specifico');
  }

  // Test 2: Verifica logica priorità cash specifico nel TimeEntryForm (riferimento)
  testsPerformed++;
  const hasCashPriorityForm = formContent.includes('if (cashAmountFromForm > 0) {') &&
                             formContent.includes('return `${formatSafeAmount(cashAmountFromForm)} (contanti - valore specifico)`;');
  
  if (hasCashPriorityForm) {
    console.log('✅ Test 2 SUPERATO: TimeEntryForm ha priorità cash specifico (riferimento)');
    testsPassed++;
  } else {
    console.log('❌ Test 2 FALLITO: TimeEntryForm non ha priorità cash specifico');
  }

  // Test 3: Verifica logica fallback valori dalle impostazioni nel TimeEntryScreen
  testsPerformed++;
  const hasFallbackLogicScreen = screenContent.includes('const voucher = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;') &&
                                screenContent.includes('const cash = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;');
  
  if (hasFallbackLogicScreen) {
    console.log('✅ Test 3 SUPERATO: TimeEntryScreen ha logica fallback dalle impostazioni');
    testsPassed++;
  } else {
    console.log('❌ Test 3 FALLITO: TimeEntryScreen non ha logica fallback dalle impostazioni');
  }

  // Test 4: Verifica logica combinata voucher + cash nel TimeEntryScreen
  testsPerformed++;
  const hasCombinedLogicScreen = screenContent.includes('if (voucher > 0 && cash > 0) {') &&
                                screenContent.includes('return `${formatCurrency(voucher)} (buono) + ${formatCurrency(cash)} (contanti)`;');
  
  if (hasCombinedLogicScreen) {
    console.log('✅ Test 4 SUPERATO: TimeEntryScreen ha logica combinata voucher + cash');
    testsPassed++;
  } else {
    console.log('❌ Test 4 FALLITO: TimeEntryScreen non ha logica combinata voucher + cash');
  }

  // Test 5: Verifica gestione caso solo voucher nel TimeEntryScreen
  testsPerformed++;
  const hasVoucherOnlyScreen = screenContent.includes('} else if (voucher > 0) {') &&
                              screenContent.includes('return `${formatCurrency(voucher)} (buono)`;');
  
  if (hasVoucherOnlyScreen) {
    console.log('✅ Test 5 SUPERATO: TimeEntryScreen gestisce caso solo voucher');
    testsPassed++;
  } else {
    console.log('❌ Test 5 FALLITO: TimeEntryScreen non gestisce caso solo voucher');
  }

  // Test 6: Verifica gestione caso solo cash dalle impostazioni nel TimeEntryScreen
  testsPerformed++;
  const hasCashOnlyScreen = screenContent.includes('} else if (cash > 0) {') &&
                           screenContent.includes('return `${formatCurrency(cash)} (contanti)`;');
  
  if (hasCashOnlyScreen) {
    console.log('✅ Test 6 SUPERATO: TimeEntryScreen gestisce caso solo cash dalle impostazioni');
    testsPassed++;
  } else {
    console.log('❌ Test 6 FALLITO: TimeEntryScreen non gestisce caso solo cash dalle impostazioni');
  }

  // Test 7: Verifica stessa logica per pranzo e cena nel TimeEntryScreen
  testsPerformed++;
  const hasSameLogicBothMeals = screenContent.includes('if (workEntry.mealDinnerCash > 0) {') &&
                               screenContent.includes('return `${formatCurrency(workEntry.mealDinnerCash)} (contanti - valore specifico)`;');
  
  if (hasSameLogicBothMeals) {
    console.log('✅ Test 7 SUPERATO: TimeEntryScreen ha stessa logica per pranzo e cena');
    testsPassed++;
  } else {
    console.log('❌ Test 7 FALLITO: TimeEntryScreen non ha stessa logica per pranzo e cena');
  }

  // Test 8: Verifica messaggio di fallback nel TimeEntryScreen
  testsPerformed++;
  const hasFallbackMessage = screenContent.includes('return "Valore non impostato";');
  
  if (hasFallbackMessage) {
    console.log('✅ Test 8 SUPERATO: TimeEntryScreen ha messaggio fallback');
    testsPassed++;
  } else {
    console.log('❌ Test 8 FALLITO: TimeEntryScreen non ha messaggio fallback');
  }

  console.log(`\n📊 RISULTATI FINALI:`);
  console.log(`   Tests eseguiti: ${testsPerformed}`);
  console.log(`   Tests superati: ${testsPassed}`);
  console.log(`   Percentuale successo: ${((testsPassed/testsPerformed)*100).toFixed(1)}%`);

  if (testsPassed === testsPerformed) {
    console.log('\n🎉 PERFETTO! Logica rimborsi pasti TimeEntryScreen ora allineata con TimeEntryForm!');
    console.log('\n✅ Logica implementata:');
    console.log('   1. Se cash specifico > 0: mostra solo quello (contanti - valore specifico)');
    console.log('   2. Altrimenti: usa valori dalle impostazioni');
    console.log('   3. Combina voucher + cash se entrambi > 0');
    console.log('   4. Mostra solo voucher se solo quello > 0');
    console.log('   5. Mostra solo cash se solo quello > 0');
    console.log('   6. Messaggio fallback se nessun valore');
    console.log('   7. Stessa logica per pranzo e cena');
  } else {
    console.log('\n⚠️ Alcuni test non sono stati superati. Verificare l\'implementazione.');
  }

} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
