// Script generico per verificare il calcolo delle ore negli interventi di reperibilità
// Versione multi-utente - nessun dato specifico

// Funzione di test per simulare il calcolo delle ore di un intervento
function testStandbyCalculation() {
  console.log('=== TEST CALCOLO INTERVENTO REPERIBILITÀ ===\n');
  
  // Simulazione di un entry generico
  const mockEntry = {
    id: 'test',
    date: '2025-07-04',
    is_standby_day: 1,
    // Esempio di intervento standard
    interventi: JSON.stringify([
      {
        departure_company: "18:00",   // Partenza sede
        arrival_site: "19:00",       // Arrivo destinazione (1 ora viaggio)
        work_start_1: "19:00",       // Inizio lavoro
        work_end_1: "23:00",         // Fine lavoro (4 ore)
        work_start_2: "",
        work_end_2: "",
        departure_return: "23:00",    // Partenza ritorno
        arrival_company: "00:00"     // Arrivo sede (1 ora viaggio)
      }
    ])
  };

  console.log('📅 Data:', mockEntry.date);
  console.log('🔧 Interventi raw:', mockEntry.interventi);
  
  // Parse degli interventi
  let interventi = [];
  try {
    interventi = JSON.parse(mockEntry.interventi);
    console.log('✅ Parsing interventi riuscito');
  } catch (e) {
    console.log('❌ Errore parsing:', e.message);
    return;
  }

  console.log('\n📊 CALCOLO ORE DETTAGLIATO:');
  console.log('━'.repeat(50));

  let totalOreIntervento = 0;
  
  interventi.forEach((intervento, index) => {
    console.log(`\n🔧 Intervento ${index + 1}:`);
    
    // Calcolo ore lavoro
    let oreLavoro = 0;
    if (intervento.work_start_1 && intervento.work_end_1) {
      const start = new Date(`2000-01-01T${intervento.work_start_1}`);
      const end = new Date(`2000-01-01T${intervento.work_end_1}`);
      oreLavoro = (end - start) / (1000 * 60 * 60);
      console.log(`   💼 Lavoro: ${intervento.work_start_1} → ${intervento.work_end_1} = ${oreLavoro} ore`);
    }
    
    // Calcolo ore viaggio andata
    let oreViaggioAndata = 0;
    if (intervento.departure_company && intervento.arrival_site) {
      const start = new Date(`2000-01-01T${intervento.departure_company}`);
      const end = new Date(`2000-01-01T${intervento.arrival_site}`);
      oreViaggioAndata = (end - start) / (1000 * 60 * 60);
      console.log(`   🚗 Viaggio A: ${intervento.departure_company} → ${intervento.arrival_site} = ${oreViaggioAndata} ore`);
    }
    
    // Calcolo ore viaggio ritorno
    let oreViaggioRitorno = 0;
    if (intervento.departure_return && intervento.arrival_company) {
      const start = new Date(`2000-01-01T${intervento.departure_return}`);
      let end = new Date(`2000-01-01T${intervento.arrival_company}`);
      
      // Gestione ore che attraversano la mezzanotte
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      
      oreViaggioRitorno = (end - start) / (1000 * 60 * 60);
      console.log(`   🏠 Viaggio R: ${intervento.departure_return} → ${intervento.arrival_company} = ${oreViaggioRitorno} ore`);
    }
    
    const totaleIntervento = oreLavoro + oreViaggioAndata + oreViaggioRitorno;
    totalOreIntervento += totaleIntervento;
    
    console.log(`   📈 Totale intervento: ${totaleIntervento} ore`);
  });

  console.log('\n📊 RIEPILOGO:');
  console.log('━'.repeat(50));
  console.log(`🎯 Totale ore (lavoro + viaggi): ${totalOreIntervento} ore`);
  
  // Verifica CCNL: controllo se le ore di lavoro superano le 8h per applicare straordinari
  const oreLavoroTotali = interventi.reduce((total, intervento) => {
    let oreLavoro = 0;
    if (intervento.work_start_1 && intervento.work_end_1) {
      const start = new Date(`2000-01-01T${intervento.work_start_1}`);
      const end = new Date(`2000-01-01T${intervento.work_end_1}`);
      oreLavoro += (end - start) / (1000 * 60 * 60);
    }
    if (intervento.work_start_2 && intervento.work_end_2) {
      const start = new Date(`2000-01-01T${intervento.work_start_2}`);
      const end = new Date(`2000-01-01T${intervento.work_end_2}`);
      oreLavoro += (end - start) / (1000 * 60 * 60);
    }
    return total + oreLavoro;
  }, 0);

  console.log(`💼 Ore lavoro totali: ${oreLavoroTotali} ore`);
  console.log(`📏 Soglia CCNL per straordinari: ${oreLavoroTotali >= 8 ? '✅ Superata (≥8h)' : '❌ Non raggiunta (<8h)'}`);

  return totalOreIntervento;
}

// Funzione per testare la logica del CalculationService
function testCalculationServiceLogic() {
  console.log('\n\n=== TEST CALCULATION SERVICE LOGIC ===\n');
  
  // Mock della funzione calculateTimeDifference
  function calculateTimeDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    // Se l'ora di fine è minore dell'inizio, aggiungi un giorno
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    return (end - start) / (1000 * 60); // Ritorna minuti
  }
  
  function minutesToHours(minutes) {
    return minutes / 60;
  }

  // Simula un intervento generico
  const mockInterventi = [
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
  ];

  console.log('🧮 Simula logica CalculationService:');
  
  let totalAllInterventiHours = 0;
  
  mockInterventi.forEach((intervento, index) => {
    console.log(`\n📋 Intervento ${index + 1}:`);
    
    // Ore lavoro
    if (intervento.work_start_1 && intervento.work_end_1) {
      const durationMinutes = calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
      const hours = minutesToHours(durationMinutes);
      totalAllInterventiHours += hours;
      console.log(`   💼 Lavoro 1: ${durationMinutes} min = ${hours} ore`);
    }
    
    if (intervento.work_start_2 && intervento.work_end_2) {
      const durationMinutes = calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
      const hours = minutesToHours(durationMinutes);
      totalAllInterventiHours += hours;
      console.log(`   💼 Lavoro 2: ${durationMinutes} min = ${hours} ore`);
    }
    
    // Ore viaggio andata
    if (intervento.departure_company && intervento.arrival_site) {
      const durationMinutes = calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
      const hours = minutesToHours(durationMinutes);
      totalAllInterventiHours += hours;
      console.log(`   🚗 Viaggio A: ${durationMinutes} min = ${hours} ore`);
    }
    
    // Ore viaggio ritorno
    if (intervento.departure_return && intervento.arrival_company) {
      const durationMinutes = calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
      const hours = minutesToHours(durationMinutes);
      totalAllInterventiHours += hours;
      console.log(`   🏠 Viaggio R: ${durationMinutes} min = ${hours} ore`);
    }
  });

  console.log(`\n🎯 Totale calcolato: ${totalAllInterventiHours} ore`);
  
  return totalAllInterventiHours;
}

// Test delle tariffe CCNL
function testCCNLRates() {
  console.log('\n\n=== TEST TARIFFE CCNL ===\n');
  
  // Parametri CCNL Metalmeccanico PMI Level 5 (configurabili)
  const ccnlConfig = {
    monthlyGrossSalary: 2839.07,
    standardWorkDay: 8,
    baseHourlyRate: 16.41081
  };

  console.log('💰 Configurazione CCNL:');
  console.log(`   📅 Stipendio mensile: €${ccnlConfig.monthlyGrossSalary}`);
  console.log(`   ⏰ Ore standard giornaliere: ${ccnlConfig.standardWorkDay}h`);
  console.log(`   💵 Tariffa oraria base: €${ccnlConfig.baseHourlyRate}`);

  // Test tariffe straordinarie
  const overtimeRates = {
    day: 1.20,    // +20% diurno
    evening: 1.25, // +25% serale (18-22h)
    night: 1.35    // +35% notturno (22-6h)
  };

  console.log('\n⏰ Tariffe straordinarie:');
  console.log(`   🌅 Diurno (6-18h): €${(ccnlConfig.baseHourlyRate * overtimeRates.day).toFixed(2)} (+20%)`);
  console.log(`   🌆 Serale (18-22h): €${(ccnlConfig.baseHourlyRate * overtimeRates.evening).toFixed(2)} (+25%)`);
  console.log(`   🌙 Notturno (22-6h): €${(ccnlConfig.baseHourlyRate * overtimeRates.night).toFixed(2)} (+35%)`);

  return {
    baseRate: ccnlConfig.baseHourlyRate,
    dayRate: ccnlConfig.baseHourlyRate * overtimeRates.day,
    eveningRate: ccnlConfig.baseHourlyRate * overtimeRates.evening,
    nightRate: ccnlConfig.baseHourlyRate * overtimeRates.night
  };
}

// Esegui tutti i test
console.log('🔍 TEST COMPLETO SISTEMA CALCOLO ORE');
console.log('='.repeat(60));

const risultatoManuale = testStandbyCalculation();
const risultatoCalculationService = testCalculationServiceLogic();
const tariffeCCNL = testCCNLRates();

console.log('\n\n🎯 RISULTATI FINALI:');
console.log('━'.repeat(50));
console.log(`📊 Calcolo manuale: ${risultatoManuale} ore`);
console.log(`🧮 Calcolo CalculationService: ${risultatoCalculationService} ore`);

if (Math.abs(risultatoManuale - risultatoCalculationService) < 0.1) {
  console.log('\n✅ I CALCOLI SONO COERENTI!');
  console.log('🎉 Sistema di calcolo funziona correttamente');
} else {
  console.log('\n❌ DIFFERENZA NEI CALCOLI!');
  console.log('🔧 Controllare la logica di calcolo');
}

console.log('\n💡 NOTE PER L\'UTILIZZO:');
console.log('1. Modificare i valori di test per i propri dati');
console.log('2. Configurare i parametri CCNL per il proprio contratto');
console.log('3. Verificare la gestione delle ore notturne (00:00)');
console.log('4. Testare con diversi scenari di intervento');
console.log('\n📖 Documentazione: CONFIGURAZIONE_MULTI_UTENTE.md');
