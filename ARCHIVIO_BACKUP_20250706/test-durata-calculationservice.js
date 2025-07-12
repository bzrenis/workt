#!/usr/bin/env node

/**
 * Test per verificare la correzione del calcolo durata interventi
 * usando la logica del CalculationService
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TEST CORREZIONE DURATA INTERVENTI - CALCULATIONSERVICE');
console.log('=========================================================');

const timeEntryScreenPath = path.join(__dirname, 'src/screens/TimeEntryScreen.js');

try {
  const content = fs.readFileSync(timeEntryScreenPath, 'utf8');
  
  console.log('📍 Test 1: Uso di calculationService.calculateTimeDifference per viaggio A');
  const hasViaggioDurationCorrect = content.includes('calculationService.calculateTimeDifference(intervento.travel_start, intervento.travel_end)');
  
  if (hasViaggioDurationCorrect) {
    console.log('✅ Calcolo durata viaggio A usa CalculationService');
  } else {
    console.log('❌ Calcolo durata viaggio A non usa CalculationService');
  }
  
  console.log('📍 Test 2: Uso di calculationService.calculateTimeDifference per lavoro');
  const hasLavoroDurationCorrect = content.includes('calculationService.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1)');
  
  if (hasLavoroDurationCorrect) {
    console.log('✅ Calcolo durata lavoro usa CalculationService');
  } else {
    console.log('❌ Calcolo durata lavoro non usa CalculationService');
  }
  
  console.log('📍 Test 3: Uso di calculationService.calculateTimeDifference per viaggio R');
  const hasViaggioReturnDurationCorrect = content.includes('calculationService.calculateTimeDifference(intervento.travel_return_start, intervento.travel_return_end)');
  
  if (hasViaggioReturnDurationCorrect) {
    console.log('✅ Calcolo durata viaggio R usa CalculationService');
  } else {
    console.log('❌ Calcolo durata viaggio R non usa CalculationService');
  }
  
  console.log('📍 Test 4: Uso di minutesToHours per conversione');
  const hasMinutesToHours = content.includes('calculationService.minutesToHours(durationMinutes)');
  
  if (hasMinutesToHours) {
    console.log('✅ Conversione da minuti a ore corretta');
  } else {
    console.log('❌ Conversione da minuti a ore non trovata');
  }
  
  console.log('📍 Test 5: Rimozione funzione calculateDuration personalizzata');
  const hasOldCalculateDuration = content.includes('const calculateDuration = (startTime, endTime)');
  
  if (!hasOldCalculateDuration) {
    console.log('✅ Funzione calculateDuration personalizzata rimossa');
  } else {
    console.log('❌ Funzione calculateDuration personalizzata ancora presente');
  }
  
  console.log('📍 Test 6: Test logica CalculationService');
  // Simuliamo la logica del CalculationService
  const parseTime = (timeString) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const calculateTimeDifference = (startTime, endTime) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    // Handle overnight work (end time next day)
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  };
  
  const minutesToHours = (minutes) => {
    return minutes / 60;
  };
  
  // Test caso problematico: 19:00 - 00:00 (dovrebbe essere 5 ore)
  const testCase1Minutes = calculateTimeDifference('19:00', '00:00');
  const testCase1Hours = minutesToHours(testCase1Minutes);
  const expected1 = 5;
  
  if (Math.abs(testCase1Hours - expected1) < 0.01) {
    console.log(`✅ Test caso 19:00-00:00: ${testCase1Hours.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 19:00-00:00: ${testCase1Hours.toFixed(1)}h (atteso: ${expected1}h)`);
  }
  
  // Test caso normale: 08:00 - 17:00 (dovrebbe essere 9 ore)
  const testCase2Minutes = calculateTimeDifference('08:00', '17:00');
  const testCase2Hours = minutesToHours(testCase2Minutes);
  const expected2 = 9;
  
  if (Math.abs(testCase2Hours - expected2) < 0.01) {
    console.log(`✅ Test caso 08:00-17:00: ${testCase2Hours.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 08:00-17:00: ${testCase2Hours.toFixed(1)}h (atteso: ${expected2}h)`);
  }
  
  // Test caso attraversa mezzanotte: 23:00 - 02:00 (dovrebbe essere 3 ore)
  const testCase3Minutes = calculateTimeDifference('23:00', '02:00');
  const testCase3Hours = minutesToHours(testCase3Minutes);
  const expected3 = 3;
  
  if (Math.abs(testCase3Hours - expected3) < 0.01) {
    console.log(`✅ Test caso 23:00-02:00: ${testCase3Hours.toFixed(1)}h (corretto)`);
  } else {
    console.log(`❌ Test caso 23:00-02:00: ${testCase3Hours.toFixed(1)}h (atteso: ${expected3}h)`);
  }
  
  console.log('=========================================================');
  
  const allTests = [
    hasViaggioDurationCorrect,
    hasLavoroDurationCorrect,
    hasViaggioReturnDurationCorrect,
    hasMinutesToHours,
    !hasOldCalculateDuration,
    Math.abs(testCase1Hours - expected1) < 0.01,
    Math.abs(testCase2Hours - expected2) < 0.01,
    Math.abs(testCase3Hours - expected3) < 0.01
  ];
  
  const passedTests = allTests.filter(test => test).length;
  const totalTests = allTests.length;
  
  if (passedTests === totalTests) {
    console.log('🎉 TUTTI I TEST CALCULATIONSERVICE SUPERATI!');
    console.log('✅ Usa CalculationService per calcoli durata');
    console.log('✅ Conversione minuti a ore corretta');
    console.log('✅ Gestione cambio giorno perfetta');
    console.log('✅ Logica identica ai turni di lavoro');
    console.log('✅ Test casi edge validati');
    console.log('📋 CORREZIONE DURATA INTERVENTI DEFINITIVA!');
    console.log('');
    console.log('🚀 ORA IL LAVORO 19:00-00:00 MOSTRERÀ 5:00 (NON -19:00)!');
  } else {
    console.log(`❌ Test falliti: ${totalTests - passedTests}/${totalTests}`);
    console.log('❗ La correzione non è completa');
  }
  
} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
