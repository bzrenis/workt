// Test più preciso del calcolo date

console.log('=== ANALISI DETTAGLIATA CALCOLO DATE ===');

const year = 2025;
const month = 6; // Giugno

console.log(`Input: year=${year}, month=${month}`);

// Test step by step
console.log('\n--- CALCOLO STARTDATE ---');
console.log(`month - 1 = ${month - 1} (JavaScript month 0-based)`);
const startDateObj = new Date(year, month - 1, 1);
console.log(`new Date(${year}, ${month - 1}, 1) =`, startDateObj);
console.log('Start date ISO:', startDateObj.toISOString());
const startDate = startDateObj.toISOString().split('T')[0];
console.log('Start date final:', startDate);

console.log('\n--- CALCOLO ENDDATE ---');  
console.log(`month = ${month} (per ottenere ultimo giorno del mese precedente)`);
const endDateObj = new Date(year, month, 0);
console.log(`new Date(${year}, ${month}, 0) =`, endDateObj);
console.log('End date ISO:', endDateObj.toISOString());
const endDate = endDateObj.toISOString().split('T')[0];
console.log('End date final:', endDate);

console.log('\n--- VERIFICA ---');
console.log(`Startdate: ${startDate} (dovrebbe essere 2025-06-01)`);
console.log(`Enddate: ${endDate} (dovrebbe essere 2025-06-30)`);

// Il trucco di new Date(year, month, 0) dovrebbe dare l'ultimo giorno del mese PRECEDENTE
// Quindi new Date(2025, 6, 0) dovrebbe dare l'ultimo giorno del mese 5 (Maggio) = 2025-05-31
// Ma noi vogliamo l'ultimo giorno del mese 6 (Giugno) = 2025-06-30

console.log('\n--- CORREZIONE ---');
console.log('Per ottenere ultimo giorno di Giugno (mese 6):');
const correctEndDateObj = new Date(year, month, 0); // month+1 per prossimo mese, 0 per ultimo giorno precedente
console.log(`new Date(${year}, ${month}, 0) =`, correctEndDateObj); // Dovrebbe essere ultimo giorno di Giugno

const correctEndDateObj2 = new Date(year, month + 1, 0); 
console.log(`new Date(${year}, ${month + 1}, 0) =`, correctEndDateObj2); // Dovrebbe essere ultimo giorno di Giugno

// Soluzione alternativa
const daysInMonth = new Date(year, month, 0).getDate();
console.log(`Giorni in mese ${month}: ${daysInMonth}`);
const alternativeEnd = new Date(year, month - 1, daysInMonth);
console.log(`new Date(${year}, ${month - 1}, ${daysInMonth}) =`, alternativeEnd);
