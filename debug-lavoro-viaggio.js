// Test per analizzare confusione tra lavoro e viaggio

// TimeCalculator semplificato per test
class TimeCalculator {
  parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToHours(minutes) {
    return minutes / 60;
  }

  calculateTimeDifference(startTime, endTime) {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    // Handle overnight work (end time next day)
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  }

  calculateWorkHours(workEntry) {
    let totalWorkMinutes = 0;
    
    // First work shift
    if (workEntry.workStart1 && workEntry.workEnd1) {
      const minutes = this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
      totalWorkMinutes += minutes;
      console.log(`[TimeCalculator] Main shift 1: ${workEntry.workStart1}-${workEntry.workEnd1} = ${minutes/60}h`);
    }
    
    // Second work shift
    if (workEntry.workStart2 && workEntry.workEnd2) {
      const minutes = this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
      totalWorkMinutes += minutes;
      console.log(`[TimeCalculator] Main shift 2: ${workEntry.workStart2}-${workEntry.workEnd2} = ${minutes/60}h`);
    }

    // Additional work shifts from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      console.log(`[TimeCalculator] 🔥 PROCESSING ${workEntry.viaggi.length} VIAGGI:`, workEntry.viaggi);
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.work_start_1 && viaggio.work_end_1) {
          const minutes = this.calculateTimeDifference(viaggio.work_start_1, viaggio.work_end_1);
          totalWorkMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} shift 1: ${viaggio.work_start_1}-${viaggio.work_end_1} = ${minutes/60}h`);
        }
        if (viaggio.work_start_2 && viaggio.work_end_2) {
          const minutes = this.calculateTimeDifference(viaggio.work_start_2, viaggio.work_end_2);
          totalWorkMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} shift 2: ${viaggio.work_start_2}-${viaggio.work_end_2} = ${minutes/60}h`);
        }
      });
    } else {
      console.log(`[TimeCalculator] ❌ No viaggi found or empty array:`, workEntry.viaggi);
    }
    
    const totalHours = this.minutesToHours(totalWorkMinutes);
    console.log(`[TimeCalculator] 📊 TOTAL WORK HOURS: ${totalHours}h (${totalWorkMinutes} minutes)`);
    return totalHours;
  }

  calculateTravelHours(workEntry) {
    let totalTravelMinutes = 0;
    
    // Main entry travel
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      const minutes = this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
      totalTravelMinutes += minutes;
      console.log(`[TimeCalculator] Main travel outbound: ${workEntry.departureCompany}-${workEntry.arrivalSite} = ${minutes/60}h`);
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      const minutes = this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
      totalTravelMinutes += minutes;
      console.log(`[TimeCalculator] Main travel return: ${workEntry.departureReturn}-${workEntry.arrivalCompany} = ${minutes/60}h`);
    }

    // Additional travel from viaggi array
    if (workEntry.viaggi && Array.isArray(workEntry.viaggi)) {
      console.log(`[TimeCalculator] 🔥 PROCESSING TRAVEL FOR ${workEntry.viaggi.length} VIAGGI:`);
      workEntry.viaggi.forEach((viaggio, index) => {
        if (viaggio.departure_company && viaggio.arrival_site) {
          const minutes = this.calculateTimeDifference(viaggio.departure_company, viaggio.arrival_site);
          totalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} outbound: ${viaggio.departure_company}-${viaggio.arrival_site} = ${minutes/60}h`);
        }
        if (viaggio.departure_return && viaggio.arrival_company) {
          const minutes = this.calculateTimeDifference(viaggio.departure_return, viaggio.arrival_company);
          totalTravelMinutes += minutes;
          console.log(`[TimeCalculator] 🚀 Viaggio ${index+1} return: ${viaggio.departure_return}-${viaggio.arrival_company} = ${minutes/60}h`);
        }
      });
    }
    
    const totalHours = this.minutesToHours(totalTravelMinutes);
    console.log(`[TimeCalculator] 📊 TOTAL TRAVEL HOURS: ${totalHours}h (${totalTravelMinutes} minutes)`);
    return totalHours;
  }
}

// Test workEntry con turno principale + turno aggiuntivo
const testWorkEntry = {
  date: '2025-07-27',
  siteName: 'Test Cantiere',
  
  // TURNO PRINCIPALE
  departureCompany: '08:00',  // VIAGGIO: Partenza azienda
  arrivalSite: '09:00',       // VIAGGIO: Arrivo cantiere (1h viaggio)
  workStart1: '09:00',        // LAVORO: Inizio lavoro
  workEnd1: '12:00',          // LAVORO: Fine lavoro (3h lavoro)
  departureReturn: '12:00',   // VIAGGIO: Partenza ritorno
  arrivalCompany: '13:00',    // VIAGGIO: Arrivo azienda (1h viaggio)
  
  // TURNO AGGIUNTIVO nell'array viaggi
  viaggi: [
    {
      departure_company: '14:00',  // VIAGGIO: Partenza azienda
      arrival_site: '15:00',       // VIAGGIO: Arrivo cantiere (1h viaggio)
      work_start_1: '15:00',       // LAVORO: Inizio lavoro
      work_end_1: '18:00',         // LAVORO: Fine lavoro (3h lavoro)
      departure_return: '18:00',   // VIAGGIO: Partenza ritorno
      arrival_company: '19:00'     // VIAGGIO: Arrivo azienda (1h viaggio)
    }
  ],
  
  vehicleDriven: 'andata_ritorno',
  interventi: [],
  mealLunchVoucher: 0,
  mealDinnerVoucher: 0,
  travelAllowance: 1,
  isStandbyDay: 0
};

console.log('🎯 TEST DISTINZIONE LAVORO/VIAGGIO\n');

// Inizializza TimeCalculator
const timeCalculator = new TimeCalculator();

console.log('📊 ANALISI ORE DI LAVORO:');
const workHours = timeCalculator.calculateWorkHours(testWorkEntry);
console.log(`Total Work Hours: ${workHours}h\n`);

console.log('📊 ANALISI ORE DI VIAGGIO:');
const travelHours = timeCalculator.calculateTravelHours(testWorkEntry);
console.log(`Total Travel Hours: ${travelHours}h\n`);

console.log('📊 RIEPILOGO ATTESO:');
console.log('- Lavoro turno principale: 3h (09:00-12:00)');
console.log('- Lavoro turno aggiuntivo: 3h (15:00-18:00)');
console.log('- TOTALE LAVORO ATTESO: 6h');
console.log();
console.log('- Viaggio andata principale: 1h (08:00-09:00)');
console.log('- Viaggio ritorno principale: 1h (12:00-13:00)');
console.log('- Viaggio andata aggiuntivo: 1h (14:00-15:00)');
console.log('- Viaggio ritorno aggiuntivo: 1h (18:00-19:00)');
console.log('- TOTALE VIAGGIO ATTESO: 4h');
console.log();

console.log('📊 RISULTATI OTTENUTI:');
console.log(`- Lavoro calcolato: ${workHours}h`);
console.log(`- Viaggio calcolato: ${travelHours}h`);
console.log(`- Totale ore: ${workHours + travelHours}h`);

if (workHours === 6 && travelHours === 4) {
  console.log('✅ CALCOLO CORRETTO: Lavoro e viaggio sono distinti correttamente');
} else {
  console.log('❌ PROBLEMA RILEVATO: C\'è confusione tra lavoro e viaggio');
  console.log(`Expected: Work=6h, Travel=4h`);
  console.log(`Got: Work=${workHours}h, Travel=${travelHours}h`);
}
