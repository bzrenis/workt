/**
 * 🐞 DEBUG INTERVENTI SEMPLICE
 * 
 * Test per verificare se gli interventi vengono salvati e recuperati correttamente
 */

const path = require('path');
const fs = require('fs');

// Leggi direttamente il DatabaseService per verificare i dati
console.log('🔍 DEBUG INTERVENTI - Verifica Database\n');

// Test 1: Controlla file di debug esistenti 
console.log('📊 TEST 1: Controllo File Debug');
console.log('━'.repeat(50));

try {
  // Invece di accedere al database, verifichiamo i file di debug esistenti
  const debugFiles = fs.readdirSync(__dirname).filter(file => file.startsWith('debug-') && file.endsWith('.js'));
  console.log('📁 File di debug trovati:', debugFiles.length);
  
  // Cerchiamo anche file markdown di report
  const reportFiles = fs.readdirSync(__dirname).filter(file => file.includes('REPERIBILITA') && file.endsWith('.md'));
  console.log('� File report reperibilità trovati:', reportFiles.length);
  
} catch (error) {
  console.error('❌ Errore accesso file:', error.message);
}

// Test 2: Analizza un caso specifico
console.log('\n📊 TEST 2: Analisi Caso Specifico');
console.log('━'.repeat(50));

// Simula i dati come vengono dal database
const mockDatabaseEntry = {
  id: 1,
  date: '2025-07-05',
  work_start_1: '08:00',
  work_end_1: '17:00',
  work_start_2: null,
  work_end_2: null,
  departure_company: null,
  arrival_site: null,
  departure_return: null,
  arrival_company: null,
  is_standby_day: 1,
  standby_allowance: 1,
  // Gli interventi come vengono salvati nel database
  interventi: JSON.stringify([
    {
      work_start_1: '20:00',
      work_end_1: '22:00',
      work_start_2: null,
      work_end_2: null,
      departure_company: '19:30',
      arrival_site: '19:45',
      departure_return: '22:15',
      arrival_company: '22:30'
    }
  ])
};

console.log('Entry dal database simulato:');
console.log(`- ID: ${mockDatabaseEntry.id}`);
console.log(`- Data: ${mockDatabaseEntry.date}`);
console.log(`- Reperibilità: ${mockDatabaseEntry.is_standby_day ? 'Sì' : 'No'}`);
console.log(`- Interventi raw: ${mockDatabaseEntry.interventi}`);

// Test 3: Parsing degli interventi
console.log('\n📊 TEST 3: Parsing Interventi');
console.log('━'.repeat(50));

let parsedInterventi = [];
try {
  if (mockDatabaseEntry.interventi) {
    parsedInterventi = JSON.parse(mockDatabaseEntry.interventi);
    console.log('✅ Interventi parsati correttamente:');
    console.log(JSON.stringify(parsedInterventi, null, 2));
  } else {
    console.log('❌ Nessun intervento trovato');
  }
} catch (error) {
  console.log('❌ Errore parsing interventi:', error.message);
}

// Test 4: Trasformazione in WorkEntry (simulata)
console.log('\n📊 TEST 4: Trasformazione in WorkEntry');
console.log('━'.repeat(50));

const workEntry = {
  date: mockDatabaseEntry.date,
  workStart1: mockDatabaseEntry.work_start_1,
  workEnd1: mockDatabaseEntry.work_end_1,
  workStart2: mockDatabaseEntry.work_start_2,
  workEnd2: mockDatabaseEntry.work_end_2,
  departureCompany: mockDatabaseEntry.departure_company,
  arrivalSite: mockDatabaseEntry.arrival_site,
  departureReturn: mockDatabaseEntry.departure_return,
  arrivalCompany: mockDatabaseEntry.arrival_company,
  isStandbyDay: mockDatabaseEntry.is_standby_day === 1,
  standbyAllowance: mockDatabaseEntry.standby_allowance === 1,
  interventi: parsedInterventi
};

console.log('WorkEntry trasformato:');
console.log(`- Data: ${workEntry.date}`);
console.log(`- Reperibilità: ${workEntry.isStandbyDay}`);
console.log(`- Numero interventi: ${workEntry.interventi.length}`);
console.log('- Primo intervento:', JSON.stringify(workEntry.interventi[0], null, 2));

// Test 5: Calcolo manuale ore e guadagni interventi
console.log('\n📊 TEST 5: Calcolo Manuale Interventi');
console.log('━'.repeat(50));

const HOURLY_RATE = 16.41;

// Calcola le ore di lavoro degli interventi
let totalInterventionWorkHours = 0;
let totalInterventionTravelHours = 0;

workEntry.interventi.forEach((intervento, index) => {
  console.log(`\nIntervento ${index + 1}:`);
  
  // Ore lavoro
  if (intervento.work_start_1 && intervento.work_end_1) {
    const workStart = intervento.work_start_1.split(':');
    const workEnd = intervento.work_end_1.split(':');
    const startMinutes = parseInt(workStart[0]) * 60 + parseInt(workStart[1]);
    const endMinutes = parseInt(workEnd[0]) * 60 + parseInt(workEnd[1]);
    const workMinutes = endMinutes - startMinutes;
    const workHours = workMinutes / 60;
    
    totalInterventionWorkHours += workHours;
    console.log(`- Lavoro: ${intervento.work_start_1} - ${intervento.work_end_1} = ${workHours}h`);
  }
  
  // Ore viaggio
  let travelHours = 0;
  if (intervento.departure_company && intervento.arrival_site) {
    const depStart = intervento.departure_company.split(':');
    const arrSite = intervento.arrival_site.split(':');
    const startMinutes = parseInt(depStart[0]) * 60 + parseInt(depStart[1]);
    const endMinutes = parseInt(arrSite[0]) * 60 + parseInt(arrSite[1]);
    const travelMinutes = endMinutes - startMinutes;
    travelHours += travelMinutes / 60;
    console.log(`- Viaggio andata: ${intervento.departure_company} - ${intervento.arrival_site} = ${travelMinutes / 60}h`);
  }
  
  if (intervento.departure_return && intervento.arrival_company) {
    const depReturn = intervento.departure_return.split(':');
    const arrCompany = intervento.arrival_company.split(':');
    const startMinutes = parseInt(depReturn[0]) * 60 + parseInt(depReturn[1]);
    const endMinutes = parseInt(arrCompany[0]) * 60 + parseInt(arrCompany[1]);
    const travelMinutes = endMinutes - startMinutes;
    travelHours += travelMinutes / 60;
    console.log(`- Viaggio ritorno: ${intervento.departure_return} - ${intervento.arrival_company} = ${travelMinutes / 60}h`);
  }
  
  totalInterventionTravelHours += travelHours;
  console.log(`- Totale viaggio: ${travelHours}h`);
});

console.log(`\nTotali interventi:`);
console.log(`- Ore lavoro: ${totalInterventionWorkHours}h`);
console.log(`- Ore viaggio: ${totalInterventionTravelHours}h`);
console.log(`- Ore totali: ${totalInterventionWorkHours + totalInterventionTravelHours}h`);

// Calcolo guadagni (semplificato, senza maggiorazioni)
const baseWorkEarnings = totalInterventionWorkHours * HOURLY_RATE;
const baseTravelEarnings = totalInterventionTravelHours * HOURLY_RATE;
const baseInterventionEarnings = baseWorkEarnings + baseTravelEarnings;

console.log(`\nGuadagni base (senza maggiorazioni):`);
console.log(`- Lavoro: ${totalInterventionWorkHours}h × ${HOURLY_RATE}€/h = ${baseWorkEarnings.toFixed(2)}€`);
console.log(`- Viaggio: ${totalInterventionTravelHours}h × ${HOURLY_RATE}€/h = ${baseTravelEarnings.toFixed(2)}€`);
console.log(`- Totale: ${baseInterventionEarnings.toFixed(2)}€`);

// Maggiorazione notturna (20:00-22:00 è notturno)
const nightWorkEarnings = totalInterventionWorkHours * HOURLY_RATE * 1.25; // +25% notturno
const nightTravelEarnings = totalInterventionTravelHours * HOURLY_RATE * 1.25;
const nightInterventionEarnings = nightWorkEarnings + nightTravelEarnings;

console.log(`\nGuadagni con maggiorazione notturna (+25%):`);
console.log(`- Lavoro notturno: ${totalInterventionWorkHours}h × ${HOURLY_RATE}€/h × 1.25 = ${nightWorkEarnings.toFixed(2)}€`);
console.log(`- Viaggio notturno: ${totalInterventionTravelHours}h × ${HOURLY_RATE}€/h × 1.25 = ${nightTravelEarnings.toFixed(2)}€`);
console.log(`- Totale notturno: ${nightInterventionEarnings.toFixed(2)}€`);

console.log('\n\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));

if (totalInterventionWorkHours > 0 || totalInterventionTravelHours > 0) {
  console.log('✅ Gli interventi sono presenti e hanno ore calcolabili');
  console.log(`📊 Dovrebbero generare guadagni di almeno ${baseInterventionEarnings.toFixed(2)}€`);
  console.log('🔧 Se la dashboard non li mostra, il problema è nel CalculationService o nell\'UI');
} else {
  console.log('❌ Nessuna ora di intervento calcolata');
  console.log('🔧 Problema nella struttura dati o nel parsing');
}

console.log('\n📝 PROSSIMI PASSI:');
console.log('1. Verificare che DatabaseService.getWorkEntries() restituisca gli interventi');
console.log('2. Verificare che createWorkEntryFromData() preservi gli interventi');
console.log('3. Verificare che calculateEarningsBreakdown() calcoli correttamente gli interventi');
console.log('4. Verificare che la dashboard aggreghi correttamente i breakdown degli interventi');
