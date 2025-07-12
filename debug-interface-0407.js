// Script per verificare cosa mostra esattamente l'interfaccia per il 04/07/2025

// Test della funzione calculateTimeDifference con i dati reali
function testCalculateTimeDifference() {
  console.log('=== TEST FUNZIONE calculateTimeDifference ===\n');
  
  // Simula la funzione parseTime
  function parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Simula la funzione calculateTimeDifference
  function calculateTimeDifference(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    // Handle overnight work (end time next day)
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  }

  function minutesToHours(minutes) {
    return minutes / 60;
  }

  // Test con i dati reali del 04/07/2025
  const realData = {
    departure_company: "18:00",
    arrival_site: "19:00", 
    work_start_1: "19:00",
    work_end_1: "23:00",
    work_start_2: "",
    work_end_2: "",
    departure_return: "23:00",
    arrival_company: "00:00"
  };

  console.log('🔧 DATI REALI:');
  console.log(`Partenza azienda: ${realData.departure_company}`);
  console.log(`Arrivo cantiere: ${realData.arrival_site}`);
  console.log(`Inizio lavoro: ${realData.work_start_1}`);
  console.log(`Fine lavoro: ${realData.work_end_1}`);
  console.log(`Partenza ritorno: ${realData.departure_return}`);
  console.log(`Arrivo azienda: ${realData.arrival_company}`);

  console.log('\n🧮 CALCOLI DETTAGLIATI:');
  
  // Viaggio andata
  const viaggioAndataMin = calculateTimeDifference(realData.departure_company, realData.arrival_site);
  const viaggioAndataHours = minutesToHours(viaggioAndataMin);
  console.log(`🚗 Viaggio andata: ${realData.departure_company} → ${realData.arrival_site}`);
  console.log(`   Minuti: ${viaggioAndataMin}, Ore: ${viaggioAndataHours}`);

  // Lavoro 1
  const lavoro1Min = calculateTimeDifference(realData.work_start_1, realData.work_end_1);
  const lavoro1Hours = minutesToHours(lavoro1Min);
  console.log(`💼 Lavoro 1: ${realData.work_start_1} → ${realData.work_end_1}`);
  console.log(`   Minuti: ${lavoro1Min}, Ore: ${lavoro1Hours}`);

  // Lavoro 2 (vuoto)
  console.log(`💼 Lavoro 2: vuoto`);

  // Viaggio ritorno
  const viaggioRitornoMin = calculateTimeDifference(realData.departure_return, realData.arrival_company);
  const viaggioRitornoHours = minutesToHours(viaggioRitornoMin);
  console.log(`🏠 Viaggio ritorno: ${realData.departure_return} → ${realData.arrival_company}`);
  console.log(`   Minuti: ${viaggioRitornoMin}, Ore: ${viaggioRitornoHours}`);

  // Totale
  const totalMinutes = viaggioAndataMin + lavoro1Min + viaggioRitornoMin;
  const totalHours = minutesToHours(totalMinutes);

  console.log('\n📊 TOTALI:');
  console.log(`Totale minuti: ${totalMinutes}`);
  console.log(`Totale ore: ${totalHours}`);

  console.log('\n🎯 CONFRONTO:');
  console.log(`Calcolato: ${totalHours} ore`);
  console.log(`Atteso: 6 ore`);
  console.log(`Sistema mostra: 5 ore`);

  if (Math.abs(totalHours - 6) < 0.01) {
    console.log('✅ Il calcolo è CORRETTO!');
    console.log('❓ Il problema potrebbe essere:');
    console.log('   1. Cache dell\'interfaccia');
    console.log('   2. Problema nel formato display');
    console.log('   3. Diversa logica nell\'interfaccia');
    console.log('   4. Bug nel componente formatSafeHours');
  } else {
    console.log('❌ Il calcolo è ERRATO!');
    console.log(`   Differenza: ${totalHours - 6} ore`);
  }

  return totalHours;
}

// Test della funzione formatSafeHours
function testFormatSafeHours() {
  console.log('\n\n=== TEST FUNZIONE formatSafeHours ===\n');
  
  // Simula la funzione formatSafeHours
  function formatSafeHours(hours) {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  }

  const testValues = [6, 5, 5.5, 5.999, 6.001, 5.95, 5.05];

  testValues.forEach(value => {
    const formatted = formatSafeHours(value);
    console.log(`${value} ore → "${formatted}"`);
  });

  return formatSafeHours(6);
}

// Test della conversione da minutes to hours
function testMinutesToHours() {
  console.log('\n\n=== TEST CONVERSIONE MINUTI → ORE ===\n');
  
  const testCases = [
    { minutes: 60, expected: 1 },
    { minutes: 240, expected: 4 },
    { minutes: 360, expected: 6 },
    { minutes: 300, expected: 5 },
    { minutes: 357, expected: 5.95 }, // 5h 57min
    { minutes: 359, expected: 5.9833 } // 5h 59min
  ];

  testCases.forEach(testCase => {
    const result = testCase.minutes / 60;
    console.log(`${testCase.minutes} min → ${result} ore (atteso: ${testCase.expected})`);
    if (Math.abs(result - testCase.expected) < 0.01) {
      console.log('   ✅ Corretto');
    } else {
      console.log('   ❌ Errore');
    }
  });
}

// Esegui tutti i test
console.log('🔍 DEBUG INTERFACCIA 04/07/2025 - ANALISI COMPLETA');
console.log('='.repeat(60));

const totalCalcolato = testCalculateTimeDifference();
const formatted = testFormatSafeHours();
testMinutesToHours();

console.log('\n\n🎯 RISULTATO FINALE:');
console.log('━'.repeat(50));
console.log(`Ore calcolate: ${totalCalcolato}`);
console.log(`Ore formattate: ${formatted}`);
console.log(`Discrepanza: ${Math.abs(totalCalcolato - 5)} ore dalla visualizzazione`);

if (totalCalcolato === 6 && Math.abs(totalCalcolato - 5) > 0.9) {
  console.log('\n🔥 PROBLEMA CONFERMATO:');
  console.log('✅ La logica di calcolo è CORRETTA (6 ore)');
  console.log('❌ L\'interfaccia mostra 5 ore');
  console.log('\n💡 POSSIBILI CAUSE:');
  console.log('1. Viene usata una logica di calcolo diversa nell\'interfaccia');
  console.log('2. Cache dell\'interfaccia non aggiornata');
  console.log('3. Problema nel componente che mostra il totale');
  console.log('4. Vengono escluse alcune ore dal conteggio');
  console.log('\n🔧 PROSSIMI PASSI:');
  console.log('1. Verificare il codice della TimeEntryScreen');
  console.log('2. Controllare se ci sono filtri o esclusioni');
  console.log('3. Aggiungere log dettagliati nell\'interfaccia');
  console.log('4. Verificare la cache dei dati');
}
