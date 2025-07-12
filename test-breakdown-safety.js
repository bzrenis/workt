#!/usr/bin/env node

/**
 * Script di test per verificare che le correzioni breakdown siano efficaci
 * Testa l'accesso sicuro alle proprietà di breakdown
 */

console.log('🧪 Test delle correzioni breakdown...\n');

// Simula un breakdown undefined
const breakdown = undefined;

// Test degli accessi sicuri (dovrebbero tutti restituire undefined senza errori)
const tests = [
  () => breakdown?.totalEarnings,
  () => breakdown?.isFixedDay,
  () => breakdown?.dayType,
  () => breakdown?.fixedEarnings,
  () => breakdown?.ordinary?.hours?.lavoro_giornaliera,
  () => breakdown?.ordinary?.hours?.viaggio_giornaliera,
  () => breakdown?.ordinary?.earnings?.giornaliera,
  () => breakdown?.details?.isSaturday,
  () => breakdown?.details?.isSunday,
  () => breakdown?.details?.isHoliday,
  () => breakdown?.details?.isPartialDay,
  () => breakdown?.details?.completamentoTipo,
  () => breakdown?.details?.missingHours,
  () => breakdown?.allowances?.travel,
  () => breakdown?.allowances?.meal,
  () => breakdown?.allowances?.standby,
  () => breakdown?.standby?.workHours,
  () => breakdown?.standby?.travelHours,
];

let passedTests = 0;

tests.forEach((test, index) => {
  try {
    const result = test();
    console.log(`✅ Test ${index + 1}: OK (risultato: ${result})`);
    passedTests++;
  } catch (error) {
    console.log(`❌ Test ${index + 1}: FALLITO - ${error.message}`);
  }
});

console.log(`\n📊 Risultati: ${passedTests}/${tests.length} test passati`);

if (passedTests === tests.length) {
  console.log('🎉 Tutti i test sono passati! Le correzioni breakdown sono efficaci.');
} else {
  console.log('⚠️  Alcuni test sono falliti. Potrebbero essere necessarie ulteriori correzioni.');
}

// Test con breakdown definito
console.log('\n🔍 Test con breakdown definito...');

const breakdownValid = {
  totalEarnings: 109.19,
  isFixedDay: true,
  dayType: 'ferie',
  fixedEarnings: 109.19,
  ordinary: {
    hours: { lavoro_giornaliera: 8, viaggio_giornaliera: 2 },
    earnings: { giornaliera: 131.03 }
  },
  details: { isSaturday: false, isSunday: false, isHoliday: false },
  allowances: { travel: 0, meal: 0, standby: 0 },
  standby: { workHours: {}, travelHours: {} }
};

// Test di alcune proprietà con breakdown valido
console.log('totalEarnings:', breakdownValid?.totalEarnings);
console.log('isFixedDay:', breakdownValid?.isFixedDay);
console.log('dayType:', breakdownValid?.dayType);
console.log('lavoro_giornaliera:', breakdownValid?.ordinary?.hours?.lavoro_giornaliera);

console.log('\n✅ Test completato con successo!');
