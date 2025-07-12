// Test per verificare i dettagli viaggi interventi e rimborsi cash
// Correzioni richieste dall'utente

const fs = require('fs');
const path = require('path');

// Colori console per output leggibile
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function testDettagliViaggiECash() {
  log('\n🔍 TEST DETTAGLI VIAGGI INTERVENTI E CASH RIMBORSI', 'blue');
  log('='.repeat(60), 'blue');

  const timeEntryScreenPath = path.join(__dirname, 'src', 'screens', 'TimeEntryScreen.js');
  
  if (!fs.existsSync(timeEntryScreenPath)) {
    log('❌ File TimeEntryScreen.js non trovato!', 'red');
    return false;
  }

  const content = fs.readFileSync(timeEntryScreenPath, 'utf8');
  let allTestsPassed = true;

  // Test 1: Durate viaggi interventi
  log('\n📍 Test 1: Durate viaggi negli interventi', 'yellow');
  const viaggiInterventoDurata = [
    /intervento\.travel_start.*intervento\.travel_end/.test(content),
    /intervento\.travel_return_start.*intervento\.travel_return_end/.test(content),
    /Durata:\s*\$\{formatSafeHours\(duration\)\}/.test(content),
    /label="Viaggio A"/.test(content),
    /label="Viaggio R"/.test(content)
  ];

  let viaggiOk = viaggiInterventoDurata.every(Boolean);

  if (viaggiOk) {
    log('✅ Durate viaggi negli interventi implementate', 'green');
  } else {
    allTestsPassed = false;
  }

  // Test 2: Totale per singolo intervento
  log('\n📍 Test 2: Totale ore per singolo intervento', 'yellow');
  const totaleIntervento = [
    /totalInterventoHours/.test(content),
    /Totale Intervento \$\{index \+ 1\}/.test(content),
    /formatSafeHours\(totalInterventoHours\)/.test(content),
    /Ore lavoro/.test(content) && /Ore viaggio/.test(content)
  ];

  let totaleOk = totaleIntervento.every(Boolean);

  if (totaleOk) {
    log('✅ Totale ore per singolo intervento implementato', 'green');
  } else {
    allTestsPassed = false;
  }

  // Test 3: Breakdown cash rimborsi pasti migliorato
  log('\n📍 Test 3: Breakdown cash rimborsi pasti dettagliato', 'yellow');
  const breakdownCash = [
    /let parts = \[\]/.test(content),
    /workEntry\.mealLunchCash > 0/.test(content) && /\(cash\)/.test(content),
    /workEntry\.mealLunchVoucher/.test(content) && /\(buono\)/.test(content),
    /parts\.join/.test(content),
    /workEntry\.mealDinnerCash > 0/.test(content),
    /workEntry\.mealDinnerVoucher/.test(content)
  ];

  let cashOk = breakdownCash.every(Boolean);

  if (cashOk) {
    log('✅ Breakdown cash rimborsi pasti migliorato', 'green');
  } else {
    allTestsPassed = false;
  }

  // Test 4: Gestione corretta dei dati interventi
  log('\n📍 Test 4: Gestione dati interventi completa', 'yellow');
  const datiInterventi = [
    /intervento\.departure_company.*intervento\.arrival_site/.test(content),
    /intervento\.work_start_1.*intervento\.work_end_1/.test(content),
    /intervento\.departure_return.*intervento\.arrival_company/.test(content),
    /workEntry\.interventi\.map/.test(content),
    /Intervento \{index \+ 1\}/.test(content)
  ];

  let datiOk = datiInterventi.every(Boolean);

  if (datiOk) {
    log('✅ Gestione dati interventi completa', 'green');
  } else {
    allTestsPassed = false;
  }

  // Test 5: Calcoli orari corretti
  log('\n📍 Test 5: Calcoli orari interventi corretti', 'yellow');
  const calcoliOrari = [
    /new Date\(`2000-01-01T\$\{/.test(content),
    /\(end - start\) \/ \(1000 \* 60 \* 60\)/.test(content),
    /totalInterventoHours \+=/.test(content),
    /if \(totalInterventoHours > 0\)/.test(content)
  ];

  let calcoliOk = calcoliOrari.every(Boolean);

  if (calcoliOk) {
    log('✅ Calcoli orari interventi corretti', 'green');
  } else {
    allTestsPassed = false;
  }

  // Test 6: Visualizzazione migliorata rimborsi
  log('\n📍 Test 6: Visualizzazione migliorata rimborsi pasti', 'yellow');
  const test1 = /workEntry\.mealLunchVoucher.*workEntry\.mealLunchCash/.test(content);
  const test2 = /workEntry\.mealDinnerVoucher.*workEntry\.mealDinnerCash/.test(content);
  const test3 = /voucherAmount/.test(content);
  const test4 = /isSubitem=\{true\}/.test(content);
  
  log(`  - Test meal lunch: ${test1 ? '✅' : '❌'}`, test1 ? 'green' : 'red');
  log(`  - Test meal dinner: ${test2 ? '✅' : '❌'}`, test2 ? 'green' : 'red');
  log(`  - Test voucher amount: ${test3 ? '✅' : '❌'}`, test3 ? 'green' : 'red');
  log(`  - Test isSubitem: ${test4 ? '✅' : '❌'}`, test4 ? 'green' : 'red');
  
  const visualizzazioneOk = test1 && test2 && test3 && test4;

  if (visualizzazioneOk) {
    log('✅ Visualizzazione migliorata rimborsi pasti', 'green');
  } else {
    log('❌ Visualizzazione rimborsi pasti problematica', 'red');
    allTestsPassed = false;
  }

  // Riepilogo finale
  log('\n' + '='.repeat(60), 'blue');
  if (allTestsPassed) {
    log('🎉 TUTTI I TEST CORREZIONI SUPERATI!', 'green');
    log('✅ Durate viaggi interventi implementate', 'green');
    log('✅ Totale ore per singolo intervento', 'green');
    log('✅ Breakdown cash rimborsi pasti migliorato', 'green');
    log('✅ Gestione completa dati interventi', 'green');
    log('✅ Calcoli orari corretti', 'green');
    log('✅ Visualizzazione rimborsi ottimizzata', 'green');
    log('\n📋 CORREZIONI VIAGGI E CASH COMPLETATE!', 'blue');
  } else {
    log('❌ ALCUNI TEST FALLITI - Verificare le implementazioni', 'red');
  }

  return allTestsPassed;
}

// Esegui il test
if (require.main === module) {
  testDettagliViaggiECash();
}

module.exports = { testDettagliViaggiECash };
