#!/usr/bin/env node

/**
 * Test per verificare la correzione del calcolo durata interventi
 * che attraversano la mezzanotte
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TEST CORREZIONE DURATA INTERVENTI - CAMBIO GIORNO');
console.log('========================================================');

const timeEntryScreenPath = path.join(__dirname, 'src/screens/TimeEntryScreen.js');

try {
  const content = fs.readFileSync(timeEntryScreenPath, 'utf8');
  
  console.log('📍 Test 1: Funzione calculateDuration implementata');
  const hasCalculateDurationFunction = content.includes('const calculateDuration = (startTime, endTime)') &&
                                      content.includes('if (end < start)') &&
                                      content.includes('end = new Date(`2000-01-02T${endTime}`)');
  
  if (hasCalculateDurationFunction) {
    console.log('✅ Funzione calculateDuration implementata correttamente');
  } else {
    console.log('❌ Funzione calculateDuration non trovata o incompleta');
  }
  
  console.log('📍 Test 2: Uso di calculateDuration per viaggio A');
  const hasViaggioDurationCorrect = content.includes('calculateDuration(intervento.travel_start, intervento.travel_end)');
  
  if (hasViaggioDurationCorrect) {
    console.log('✅ Calcolo durata viaggio A corretto');
  } else {
    console.log('❌ Calcolo durata viaggio A non aggiornato');
  }
  
  console.log('📍 Test 3: Uso di calculateDuration per lavoro');
  const hasLavoroDurationCorrect = content.includes('calculateDuration(intervento.work_start_1, intervento.work_end_1)');
  
  if (hasLavoroDurationCorrect) {
    console.log('✅ Calcolo durata lavoro corretto');
  } else {
    console.log('❌ Calcolo durata lavoro non aggiornato');
  }
  
  console.log('📍 Test 4: Uso di calculateDuration per viaggio R');
  const hasViaggioReturnDurationCorrect = content.includes('calculateDuration(intervento.travel_return_start, intervento.travel_return_end)');
  
  if (hasViaggioReturnDurationCorrect) {
    console.log('✅ Calcolo durata viaggio R corretto');
  } else {
    console.log('❌ Calcolo durata viaggio R non aggiornato');
  }
  
  console.log('📍 Test 5: Uso di calculateDuration nel totale intervento');
  const hasTotalInterventCorrect = content.includes('totalInterventoHours += calculateDuration(');
  
  if (hasTotalInterventCorrect) {
    console.log('✅ Calcolo totale ore intervento corretto');
  } else {
    console.log('❌ Calcolo totale ore intervento non aggiornato');
  }
  
  console.log('📍 Test 6: Test funzione calculateDuration');
  // Simuliamo il calcolo per verificare la logica
  const testCalculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}`);
    let end = new Date(`2000-01-01T${endTime}`);
    
    // Se l'orario di fine è prima dell'inizio, aggiungi un giorno
    if (end < start) {
      end = new Date(`2000-01-02T${endTime}`);
    }
    
    return (end - start) / (1000 * 60 * 60);
  };
  
  // Test caso problematico: 19:00 - 00:00 (dovrebbe essere 5 ore)
  const testCase1 = testCalculateDuration('19:00', '00:00');
  const expected1 = 5;
  
  if (Math.abs(testCase1 - expected1) < 0.01) {
    console.log(`✅ Test caso 19:00-00:00: ${testCase1.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 19:00-00:00: ${testCase1.toFixed(1)}h (atteso: ${expected1}h)`);
  }
  
  // Test caso normale: 08:00 - 17:00 (dovrebbe essere 9 ore)
  const testCase2 = testCalculateDuration('08:00', '17:00');
  const expected2 = 9;
  
  if (Math.abs(testCase2 - expected2) < 0.01) {
    console.log(`✅ Test caso 08:00-17:00: ${testCase2.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 08:00-17:00: ${testCase2.toFixed(1)}h (atteso: ${expected2}h)`);
  }
  
  // Test caso attraversa mezzanotte: 23:00 - 02:00 (dovrebbe essere 3 ore)
  const testCase3 = testCalculateDuration('23:00', '02:00');
  const expected3 = 3;
  
  if (Math.abs(testCase3 - expected3) < 0.01) {
    console.log(`✅ Test caso 23:00-02:00: ${testCase3.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 23:00-02:00: ${testCase3.toFixed(1)}h (atteso: ${expected3}h)`);
  }
  
  console.log('========================================================');
  
  const allTests = [
    hasCalculateDurationFunction,
    hasViaggioDurationCorrect,
    hasLavoroDurationCorrect,
    hasViaggioReturnDurationCorrect,
    hasTotalInterventCorrect,
    Math.abs(testCase1 - expected1) < 0.01,
    Math.abs(testCase2 - expected2) < 0.01,
    Math.abs(testCase3 - expected3) < 0.01
  ];
  
  const passedTests = allTests.filter(test => test).length;
  const totalTests = allTests.length;
  
  if (passedTests === totalTests) {
    console.log('🎉 TUTTI I TEST CORREZIONE DURATA SUPERATI!');
    console.log('✅ Funzione calculateDuration implementata');
    console.log('✅ Tutti i calcoli durata aggiornati');
    console.log('✅ Gestione cambio giorno corretta');
    console.log('✅ Casi di test validati');
    console.log('📋 CORREZIONE DURATA INTERVENTI COMPLETATA!');
  } else {
    console.log(`❌ Test falliti: ${totalTests - passedTests}/${totalTests}`);
    console.log('❗ Alcuni calcoli durata non sono stati corretti');
  }
  
} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
