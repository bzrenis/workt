// Debug per verificare il parsing degli interventi nel calculateStandbyBreakdown
console.log('🔍 DEBUG PARSING INTERVENTI 04/07/2025');
console.log('═'.repeat(60));

// Simula l'entry come arriva dal database
const mockWorkEntry = {
  date: '2025-07-04',
  is_standby_day: 1,
  // OPZIONE 1: interventi come stringa JSON (più probabile)
  interventi: JSON.stringify([
    {
      departure_company: "18:00",
      arrival_site: "19:00", 
      work_start_1: "19:00",
      work_end_1: "23:00",
      work_start_2: "",
      work_end_2: "",
      departure_return: "23:00",
      arrival_company: "00:00"
    }
  ])
};

// Simula anche l'alternativa (array già parsato)
const mockWorkEntryArray = {
  date: '2025-07-04',
  is_standby_day: 1,
  // OPZIONE 2: interventi come array già parsato
  interventi: [
    {
      departure_company: "18:00",
      arrival_site: "19:00", 
      work_start_1: "19:00",
      work_end_1: "23:00",
      work_start_2: "",
      work_end_2: "",
      departure_return: "23:00",
      arrival_company: "00:00"
    }
  ]
};

function simulateSegmentParsing(workEntry, label) {
  console.log(`\n📋 ${label}:`);
  console.log('━'.repeat(50));
  
  console.log('🔧 workEntry.interventi tipo:', typeof workEntry.interventi);
  console.log('🔧 workEntry.interventi valore:', workEntry.interventi);
  
  const segments = [];
  let interventi = workEntry.interventi;
  
  // Gestisci sia stringa JSON che array
  if (typeof interventi === 'string') {
    try {
      interventi = JSON.parse(interventi);
      console.log('✅ JSON.parse riuscito');
    } catch (e) {
      console.log('❌ Errore JSON.parse:', e.message);
      return segments;
    }
  }
  
  if (interventi && Array.isArray(interventi)) {
    console.log(`✅ Array valido con ${interventi.length} interventi`);
    
    interventi.forEach((iv, index) => {
      console.log(`\n🔧 Intervento ${index + 1}:`);
      console.log('   Raw:', iv);
      
      // Viaggio di partenza
      if (iv.departure_company && iv.arrival_site) {
        const segment = { start: iv.departure_company, end: iv.arrival_site, type: 'standby_travel' };
        segments.push(segment);
        console.log(`   ✅ Viaggio andata: ${segment.start} → ${segment.end}`);
      } else {
        console.log(`   ❌ Viaggio andata mancante: departure=${iv.departure_company}, arrival=${iv.arrival_site}`);
      }
      
      // Primo turno lavoro
      if (iv.work_start_1 && iv.work_end_1) {
        const segment = { start: iv.work_start_1, end: iv.work_end_1, type: 'standby_work' };
        segments.push(segment);
        console.log(`   ✅ Lavoro 1: ${segment.start} → ${segment.end}`);
      } else {
        console.log(`   ❌ Lavoro 1 mancante: start=${iv.work_start_1}, end=${iv.work_end_1}`);
      }
      
      // Secondo turno lavoro
      if (iv.work_start_2 && iv.work_end_2) {
        const segment = { start: iv.work_start_2, end: iv.work_end_2, type: 'standby_work' };
        segments.push(segment);
        console.log(`   ✅ Lavoro 2: ${segment.start} → ${segment.end}`);
      } else {
        console.log(`   ⏭️  Lavoro 2 vuoto (normale): start="${iv.work_start_2}", end="${iv.work_end_2}"`);
      }
      
      // Viaggio di ritorno
      if (iv.departure_return && iv.arrival_company) {
        const segment = { start: iv.departure_return, end: iv.arrival_company, type: 'standby_travel' };
        segments.push(segment);
        console.log(`   ✅ Viaggio ritorno: ${segment.start} → ${segment.end}`);
      } else {
        console.log(`   ❌ Viaggio ritorno mancante: departure=${iv.departure_return}, arrival=${iv.arrival_company}`);
      }
    });
  } else {
    console.log('❌ interventi non è un array valido');
    console.log('   Tipo:', typeof interventi);
    console.log('   Valore:', interventi);
  }
  
  console.log(`\n📊 Segmenti totali estratti: ${segments.length}`);
  segments.forEach((seg, i) => {
    console.log(`   ${i+1}. ${seg.type}: ${seg.start} → ${seg.end}`);
  });
  
  return segments;
}

// Test entrambi i formati
const segmentsFromJSON = simulateSegmentParsing(mockWorkEntry, 'FORMATO JSON STRING');
const segmentsFromArray = simulateSegmentParsing(mockWorkEntryArray, 'FORMATO ARRAY');

console.log('\n🎯 RISULTATO ATTESO:');
console.log('━'.repeat(50));
console.log('Dovremmo avere 4 segmenti:');
console.log('1. standby_travel: 18:00 → 19:00 (viaggio andata)');
console.log('2. standby_work: 19:00 → 23:00 (lavoro)'); 
console.log('3. standby_travel: 23:00 → 00:00 (viaggio ritorno)');
console.log('');
console.log('🔍 VERIFICA:');
console.log(`JSON format: ${segmentsFromJSON.length} segmenti`);
console.log(`Array format: ${segmentsFromArray.length} segmenti`);

if (segmentsFromJSON.length === 3 && segmentsFromArray.length === 3) {
  console.log('✅ Parsing corretto!');
} else {
  console.log('❌ Problema nel parsing!');
}

// Simula anche il calcolo minuti per fascia oraria
function simulateMinuteClassification(segments) {
  console.log('\n🕐 SIMULAZIONE CLASSIFICAZIONE ORARIA:');
  console.log('━'.repeat(50));
  
  function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  function calculateTimeDifference(startTime, endTime) {
    const start = parseTime(startTime);
    let end = parseTime(endTime);
    
    // Se l'ora di fine è minore dell'inizio (attraversa mezzanotte), aggiungi 24h
    if (end < start) {
      end += 24 * 60;
    }
    
    return end - start;
  }
  
  const minuteDetails = {
    work: { ordinary: 0, evening: 0, night: 0 },
    travel: { ordinary: 0, evening: 0, night: 0 }
  };
  
  for (const segment of segments) {
    console.log(`\n📍 Segmento: ${segment.type} (${segment.start} → ${segment.end})`);
    
    const startMinutes = parseTime(segment.start);
    const duration = calculateTimeDifference(segment.start, segment.end);
    
    console.log(`   Durata: ${duration} minuti`);
    
    for (let i = 0; i < duration; i++) {
      const currentMinute = (startMinutes + i) % 1440; // 1440 = 24*60
      const hour = Math.floor(currentMinute / 60);
      
      let key = 'ordinary';
      if (hour >= 22 || hour < 6) {
        key = 'night'; // 22:00-06:00
      } else if (hour >= 20 && hour < 22) {
        key = 'evening'; // 20:00-22:00
      }
      
      if (segment.type === 'standby_work') {
        minuteDetails.work[key]++;
      } else if (segment.type === 'standby_travel') {
        minuteDetails.travel[key]++;
      }
    }
  }
  
  console.log('\n🎯 CLASSIFICAZIONE FINALE:');
  console.log('━'.repeat(30));
  console.log('LAVORO:');
  Object.entries(minuteDetails.work).forEach(([key, minutes]) => {
    if (minutes > 0) {
      console.log(`   ${key}: ${(minutes/60).toFixed(1)}h`);
    }
  });
  
  console.log('VIAGGIO:');
  Object.entries(minuteDetails.travel).forEach(([key, minutes]) => {
    if (minutes > 0) {
      console.log(`   ${key}: ${(minutes/60).toFixed(1)}h`);
    }
  });
  
  return minuteDetails;
}

if (segmentsFromJSON.length > 0) {
  simulateMinuteClassification(segmentsFromJSON);
}
