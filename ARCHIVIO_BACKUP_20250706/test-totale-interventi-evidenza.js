const fs = require('fs');
const path = require('path');

console.log('🔍 TEST: Verifica Totale Interventi sempre in evidenza...\n');

const timeEntryScreenPath = path.join(__dirname, 'src', 'screens', 'TimeEntryScreen.js');

try {
  const content = fs.readFileSync(timeEntryScreenPath, 'utf8');
  
  let testsPerformed = 0;
  let testsPassed = 0;

  // Test 1: Verifica che il totale interventi sia sempre mostrato (rimozione condizione numInterventi <= 1)
  testsPerformed++;
  const hasTotaleComplessivo = content.includes('Totale complessivo interventi - sempre visibile e in evidenza');
  const noConditionSkip = !content.includes('if (numInterventi <= 1) return null;');
  
  if (hasTotaleComplessivo && noConditionSkip) {
    console.log('✅ Test 1 SUPERATO: Totale interventi sempre visibile');
    testsPassed++;
  } else {
    console.log('❌ Test 1 FALLITO: Totale interventi non sempre visibile');
    console.log('   - Ha commento corretto:', hasTotaleComplessivo);
    console.log('   - Non ha condizione skip:', noConditionSkip);
  }

  // Test 2: Verifica highlight={true} per il totale interventi
  testsPerformed++;
  const totalInterventoMatch = content.match(/label={label}[\s\S]*?value={formatSafeHours\(totalAllInterventiHours\)}[\s\S]*?highlight={true}/);
  
  if (totalInterventoMatch) {
    console.log('✅ Test 2 SUPERATO: Totale interventi ha highlight={true}');
    testsPassed++;
  } else {
    console.log('❌ Test 2 FALLITO: Totale interventi non ha highlight={true}');
  }

  // Test 3: Verifica labels dinamiche per singolo/multipli interventi
  testsPerformed++;
  const dynamicLabelMatch = content.match(/const label = numInterventi > 1 \? "Totale Tutti Interventi \(lavoro\+viaggi\)" : "Totale Intervento \(lavoro\+viaggi\)";/);
  
  if (dynamicLabelMatch) {
    console.log('✅ Test 3 SUPERATO: Labels dinamiche per singolo/multipli interventi');
    testsPassed++;
  } else {
    console.log('❌ Test 3 FALLITO: Labels non dinamiche');
  }

  // Test 4: Verifica rimozione del totale per singolo intervento duplicato
  testsPerformed++;
  const noSingleInterventoTotal = !content.includes('Totale ore per singolo intervento');
  
  if (noSingleInterventoTotal) {
    console.log('✅ Test 4 SUPERATO: Rimosso totale singolo intervento duplicato');
    testsPassed++;
  } else {
    console.log('❌ Test 4 FALLITO: Totale singolo intervento ancora presente');
  }

  // Test 5: Verifica calcolo completo (lavoro + viaggi)
  testsPerformed++;
  const hasCompleteCalculation = content.includes('work_start_1') && 
                                 content.includes('work_start_2') && 
                                 content.includes('departure_company') && 
                                 content.includes('departure_return');
  
  if (hasCompleteCalculation) {
    console.log('✅ Test 5 SUPERATO: Calcolo completo lavoro + viaggi');
    testsPassed++;
  } else {
    console.log('❌ Test 5 FALLITO: Calcolo incompleto');
  }

  // Test 6: Verifica uso di calculateTimeDifference e minutesToHours
  testsPerformed++;
  const usesCorrectMethods = content.includes('calculationService.calculateTimeDifference') && 
                            content.includes('calculationService.minutesToHours');
  
  if (usesCorrectMethods) {
    console.log('✅ Test 6 SUPERATO: Usa metodi corretti di calcolo');
    testsPassed++;
  } else {
    console.log('❌ Test 6 FALLITO: Non usa metodi corretti di calcolo');
  }

  console.log(`\n📊 RISULTATI FINALI:`);
  console.log(`   Tests eseguiti: ${testsPerformed}`);
  console.log(`   Tests superati: ${testsPassed}`);
  console.log(`   Percentuale successo: ${((testsPassed/testsPerformed)*100).toFixed(1)}%`);

  if (testsPassed === testsPerformed) {
    console.log('\n🎉 TUTTI I TEST SUPERATI! Il totale interventi è ora sempre visibile e in evidenza.');
  } else {
    console.log('\n⚠️ Alcuni test non sono stati superati. Controllare le modifiche.');
  }

} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
