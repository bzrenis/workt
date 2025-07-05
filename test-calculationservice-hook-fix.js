#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Test correzione useCalculationService - Metodi mancanti\n');

// Test per verificare che tutti i metodi necessari siano esposti
const hookPath = path.join(__dirname, 'src', 'hooks', 'useCalculationService.js');
const hookContent = fs.readFileSync(hookPath, 'utf8');

const tests = [
  {
    name: 'calculateWorkHours esposto',
    check: 'calculateWorkHours: (entry) => service.calculateWorkHours(entry)',
    present: hookContent.includes('calculateWorkHours: (entry) => service.calculateWorkHours(entry)')
  },
  {
    name: 'calculateTravelHours esposto',
    check: 'calculateTravelHours: (entry) => service.calculateTravelHours(entry)',
    present: hookContent.includes('calculateTravelHours: (entry) => service.calculateTravelHours(entry)')
  },
  {
    name: 'calculateStandbyWorkHours esposto',
    check: 'calculateStandbyWorkHours: (entry) => service.calculateStandbyWorkHours(entry)',
    present: hookContent.includes('calculateStandbyWorkHours: (entry) => service.calculateStandbyWorkHours(entry)')
  },
  {
    name: 'calculateEarningsBreakdown mantenuto',
    check: 'calculateEarningsBreakdown presente',
    present: hookContent.includes('calculateEarningsBreakdown: (entry, settings) =>')
  },
  {
    name: 'calculateDailyEarnings mantenuto',
    check: 'calculateDailyEarnings presente',
    present: hookContent.includes('calculateDailyEarnings: (entry, settings) =>')
  }
];

console.log('📋 Verifica metodi hook:\n');

let allPassed = true;
tests.forEach((test, index) => {
  const status = test.present ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
  if (!test.present) {
    console.log(`   ⚠️  Missing: ${test.check}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 Tutti i metodi necessari sono esposti nel hook!');
  console.log('✅ L\'errore "calculateWorkHours is not a function" dovrebbe essere risolto.');
} else {
  console.log('⚠️  Alcuni metodi mancano ancora.');
}

console.log('\n🔄 Riavviare l\'app per applicare le modifiche...');
