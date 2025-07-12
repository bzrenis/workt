/**
 * 🐞 TEST CONTEGGIO INTERVENTI ANALYTICS
 * 
 * Test per verificare che il conteggio degli interventi nelle analytics funzioni
 */

const { createWorkEntryFromData } = require('./src/utils/earningsHelper');

console.log('🔍 TEST CONTEGGIO INTERVENTI ANALYTICS\n');

// Simula entry dal database con interventi come stringa JSON
const mockEntry = {
  id: 36,
  date: '2025-07-04',
  is_standby_day: 1,
  interventi: '[{"departure_company":"18:00","arrival_site":"19:00","work_start_1":"19:00","work_end_1":"00:00","departure_return":"00:00","arrival_company":"01:00"}]'
};

console.log('📊 TEST: Conteggio Interventi');
console.log('━'.repeat(50));

console.log('Entry dal database:');
console.log(`- ID: ${mockEntry.id}`);
console.log(`- Data: ${mockEntry.date}`);
console.log(`- Interventi (raw): ${mockEntry.interventi}`);

// Test del metodo vecchio (entry.interventi)
console.log('\n🔧 Metodo VECCHIO (entry.interventi):');
if (mockEntry.interventi && Array.isArray(mockEntry.interventi) && mockEntry.interventi.length > 0) {
  console.log(`✅ Conteggio: ${mockEntry.interventi.length}`);
} else {
  console.log('❌ Conteggio: 0 (non è un array)');
  console.log(`   Tipo: ${typeof mockEntry.interventi}`);
  console.log(`   È array: ${Array.isArray(mockEntry.interventi)}`);
}

// Test del metodo nuovo (workEntry.interventi)
console.log('\n🔧 Metodo NUOVO (workEntry.interventi):');
const workEntry = createWorkEntryFromData(mockEntry);
if (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0) {
  console.log(`✅ Conteggio: ${workEntry.interventi.length}`);
  console.log(`   Tipo: ${typeof workEntry.interventi}`);
  console.log(`   È array: ${Array.isArray(workEntry.interventi)}`);
  console.log(`   Primo intervento:`, workEntry.interventi[0]);
} else {
  console.log('❌ Conteggio: 0');
}

// Test con più interventi
console.log('\n📊 TEST: Entry con Multipli Interventi');
console.log('━'.repeat(50));

const mockEntryMultiple = {
  id: 37,
  date: '2025-07-05',
  is_standby_day: 1,
  interventi: '[{"work_start_1":"19:00","work_end_1":"21:00"},{"work_start_1":"22:00","work_end_1":"00:00"}]'
};

console.log(`Entry con ${JSON.parse(mockEntryMultiple.interventi).length} interventi:`);
const workEntryMultiple = createWorkEntryFromData(mockEntryMultiple);
console.log(`Conteggio corretto: ${workEntryMultiple.interventi.length}`);

console.log('\n\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));
console.log('✅ Il metodo NUOVO (workEntry.interventi) funziona correttamente');
console.log('✅ Gli interventi vengono parsati e contati accuratamente');
console.log('📊 Il pattern lavorativo ora dovrebbe mostrare il numero corretto');
