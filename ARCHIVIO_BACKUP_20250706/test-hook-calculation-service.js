#!/usr/bin/env node

/**
 * Test per verificare che useCalculationService esponga calculateTimeDifference e minutesToHours
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TEST HOOK useCalculationService - METODI DURATA');
console.log('=================================================');

const useCalculationServicePath = path.join(__dirname, 'src/hooks/useCalculationService.js');

try {
  const content = fs.readFileSync(useCalculationServicePath, 'utf8');
  
  console.log('📍 Test 1: calculateTimeDifference esposto nel hook');
  const hasCalculateTimeDifference = content.includes('calculateTimeDifference: (startTime, endTime) => service.calculateTimeDifference(startTime, endTime)');
  
  if (hasCalculateTimeDifference) {
    console.log('✅ calculateTimeDifference esposto correttamente');
  } else {
    console.log('❌ calculateTimeDifference non trovato nel hook');
  }
  
  console.log('📍 Test 2: minutesToHours esposto nel hook');
  const hasMinutesToHours = content.includes('minutesToHours: (minutes) => service.minutesToHours(minutes)');
  
  if (hasMinutesToHours) {
    console.log('✅ minutesToHours esposto correttamente');
  } else {
    console.log('❌ minutesToHours non trovato nel hook');
  }
  
  console.log('📍 Test 3: Altri metodi mantenuti');
  const hasOtherMethods = content.includes('calculateWorkHours') && 
                          content.includes('calculateTravelHours') && 
                          content.includes('calculateStandbyWorkHours');
  
  if (hasOtherMethods) {
    console.log('✅ Altri metodi necessari mantenuti');
  } else {
    console.log('❌ Alcuni metodi necessari mancanti');
  }
  
  console.log('=================================================');
  
  const allTests = [
    hasCalculateTimeDifference,
    hasMinutesToHours,
    hasOtherMethods
  ];
  
  const passedTests = allTests.filter(test => test).length;
  const totalTests = allTests.length;
  
  if (passedTests === totalTests) {
    console.log('🎉 TUTTI I TEST HOOK SUPERATI!');
    console.log('✅ calculateTimeDifference esposto');
    console.log('✅ minutesToHours esposto');
    console.log('✅ Altri metodi mantenuti');
    console.log('📋 HOOK useCalculationService CORRETTO!');
    console.log('');
    console.log('🚀 ORA calculationService.calculateTimeDifference FUNZIONERÀ!');
  } else {
    console.log(`❌ Test falliti: ${totalTests - passedTests}/${totalTests}`);
    console.log('❗ Il hook non espone tutti i metodi necessari');
  }
  
} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
}
