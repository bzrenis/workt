/**
 * Debug query standby per verificare dati nel database
 */

console.log('🔍 Debug query standby database...\n');

// Simula una query di test per verificare la struttura della tabella standby
const testQuery = `
// Query per verificare se esistono giorni standby
SELECT COUNT(*) as total_standby 
FROM standby_calendar 
WHERE is_standby = 1;

// Query per vedere tutti i giorni standby di luglio 2025
SELECT date, is_standby, allowance, day_type, interventions 
FROM standby_calendar 
WHERE strftime('%Y-%m', date) = '2025-07' 
ORDER BY date;

// Query per vedere structure della tabella
PRAGMA table_info(standby_calendar);
`;

console.log('📋 Query suggerite per debug in Expo app:');
console.log('');
console.log('1. Verifica giorni standby esistenti:');
console.log('   SELECT COUNT(*) FROM standby_calendar WHERE is_standby = 1;');
console.log('');
console.log('2. Mostra giorni standby luglio 2025:');
console.log("   SELECT * FROM standby_calendar WHERE strftime('%Y-%m', date) = '2025-07';");
console.log('');
console.log('3. Verifica struttura tabella:');
console.log('   PRAGMA table_info(standby_calendar);');
console.log('');

// Verifica che la query sia corretta nel MonthlyPrintService
const fs = require('fs');
const dbContent = fs.readFileSync('./src/services/DatabaseService.js', 'utf8');

// Trova la query getStandbyDays
const standbyQueryMatch = dbContent.match(/getStandbyDays.*?SELECT.*?is_standby = 1/s);
if (standbyQueryMatch) {
  console.log('✅ Query getStandbyDays trovata nel DatabaseService');
  console.log('Query:', standbyQueryMatch[0].replace(/\s+/g, ' '));
} else {
  console.log('❌ Query getStandbyDays non trovata o malformata');
}

console.log('\n💡 POSSIBILI CAUSE DEL PROBLEMA:\n');
console.log('1. ❓ Non ci sono giorni standby nel database per luglio 2025');
console.log('2. ❓ La tabella standby_calendar non esiste o è vuota');  
console.log('3. ❓ I giorni stanby hanno is_standby = 0 invece di 1');
console.log('4. ❓ Il formato data nella query non corrisponde');
console.log('5. ❓ La query getStandbyDays ha un bug');

console.log('\n🔧 SOLUZIONI SUGGERITE:\n');
console.log('1. 📱 Apri l\'app e vai in Impostazioni → Reperibilità');
console.log('2. 📅 Aggiungi alcuni giorni di reperibilità per luglio 2025');
console.log('3. 📄 Prova a generare il PDF e controlla i logs Expo');
console.log('4. 🔍 Verifica che i giorni siano salvati con is_standby = 1');

console.log('\n✅ Debug logs aggiunti al MonthlyPrintService - prova ora!');
