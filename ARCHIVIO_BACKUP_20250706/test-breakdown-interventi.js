// Script di debug completo per interventi reperibilità

const testBreakdownCalculation = () => {
  console.log('\n=== TEST BREAKDOWN CALCOLO INTERVENTI ===\n');

  // Mock del CalculationService per testare standalone
  class MockCalculationService {
    parseTime(timeString) {
      if (!timeString) return null;
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    }

    calculateTimeDifference(startTime, endTime) {
      const start = this.parseTime(startTime);
      const end = this.parseTime(endTime);
      
      if (start === null || end === null) return 0;
      
      if (end < start) {
        return (24 * 60 - start) + end;
      }
      
      return end - start;
    }

    minutesToHours(minutes) {
      return minutes / 60;
    }

    // Funzione semplificata del calculateStandbyBreakdown
    calculateStandbyBreakdown(workEntry, settings) {
      const baseRate = 16.41081;
      const travelCompensationRate = 1.0;
      
      console.log(`\n🔧 Calcolo breakdown per ${workEntry.date}`);
      console.log(`📊 Interventi presenti:`, workEntry.interventi);

      // Segmenti di intervento reperibilità
      const segments = [];
      if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
        workEntry.interventi.forEach(iv => {
          // Viaggio di partenza (azienda -> luogo intervento)
          if (iv.departure_company && iv.arrival_site) {
            segments.push({ start: iv.departure_company, end: iv.arrival_site, type: 'standby_travel' });
          }
          // Primo turno lavoro
          if (iv.work_start_1 && iv.work_end_1) {
            segments.push({ start: iv.work_start_1, end: iv.work_end_1, type: 'standby_work' });
          }
          // Secondo turno lavoro
          if (iv.work_start_2 && iv.work_end_2) {
            segments.push({ start: iv.work_start_2, end: iv.work_end_2, type: 'standby_work' });
          }
          // Viaggio di ritorno (luogo intervento -> azienda)
          if (iv.departure_return && iv.arrival_company) {
            segments.push({ start: iv.departure_return, end: iv.arrival_company, type: 'standby_travel' });
          }
        });
      }

      console.log(`📋 Segmenti identificati (${segments.length}):`, segments);

      // Suddivisione minuti per fascia oraria
      const minuteDetails = {
        work: { ordinary: 0, night: 0, saturday: 0, saturday_night: 0, holiday: 0, night_holiday: 0 },
        travel: { ordinary: 0, night: 0, saturday: 0, saturday_night: 0, holiday: 0, night_holiday: 0 }
      };

      for (const segment of segments) {
        const startMinutes = this.parseTime(segment.start);
        const duration = this.calculateTimeDifference(segment.start, segment.end);
        
        console.log(`⏰ Segmento ${segment.type}: ${segment.start} → ${segment.end} = ${duration} minuti`);
        
        for (let i = 0; i < duration; i++) {
          const currentMinute = (startMinutes + i) % 1440;
          const hour = Math.floor(currentMinute / 60);
          
          // Logica semplificata (solo ordinary per il test)
          let key = 'ordinary';
          
          // Somma minuti
          if (segment.type === 'standby_work') minuteDetails.work[key]++;
          if (segment.type === 'standby_travel') minuteDetails.travel[key]++;
        }
      }

      console.log(`📊 Minuti aggregati:`, minuteDetails);

      // Conversione minuti in ore
      const hours = {
        work: {},
        travel: {}
      };
      Object.keys(minuteDetails.work).forEach(k => {
        hours.work[k] = this.minutesToHours(minuteDetails.work[k]);
        hours.travel[k] = this.minutesToHours(minuteDetails.travel[k]);
      });

      console.log(`⏰ Ore aggregate:`, hours);

      // Calcolo guadagni per fascia oraria
      const earnings = {
        work: {},
        travel: {}
      };

      Object.keys(hours.work).forEach(k => {
        earnings.work[k] = hours.work[k] * baseRate;
        earnings.travel[k] = hours.travel[k] * baseRate * travelCompensationRate;
      });

      console.log(`💰 Earnings calcolati:`, earnings);

      const totalEarnings = Object.values(earnings.work).reduce((a, b) => a + b, 0)
        + Object.values(earnings.travel).reduce((a, b) => a + b, 0);

      console.log(`💰 Totale earnings interventi: ${totalEarnings.toFixed(2)}€`);

      return {
        dailyIndemnity: 0, // Per semplicità non calcoliamo l'indennità
        workHours: hours.work,
        travelHours: hours.travel,
        workEarnings: earnings.work,
        travelEarnings: earnings.travel,
        totalEarnings
      };
    }
  }

  // Test case 1: Entry con interventi validi
  const testEntry1 = {
    date: '2025-01-15',
    interventi: [
      {
        departure_company: '08:00',
        arrival_site: '09:00',
        work_start_1: '09:15',
        work_end_1: '11:45',
        work_start_2: '13:00',
        work_end_2: '15:30',
        departure_return: '15:45',
        arrival_company: '16:45'
      }
    ],
    isStandbyDay: true
  };

  const mockService = new MockCalculationService();
  
  console.log('TEST 1: Entry con interventi validi');
  console.log('=====================================');
  
  const breakdown1 = mockService.calculateStandbyBreakdown(testEntry1, {});
  
  console.log('\n📊 RISULTATO FINALE BREAKDOWN:');
  console.log(`- Work Hours:`, breakdown1.workHours);
  console.log(`- Travel Hours:`, breakdown1.travelHours);
  console.log(`- Work Earnings:`, breakdown1.workEarnings);
  console.log(`- Travel Earnings:`, breakdown1.travelEarnings);
  console.log(`- Total Earnings: ${breakdown1.totalEarnings.toFixed(2)}€`);

  // Simula aggregazione come fa la dashboard
  console.log('\n📈 SIMULAZIONE AGGREGAZIONE DASHBOARD:');
  const standbyWorkHoursTotal = Object.values(breakdown1.workHours || {}).reduce((a, b) => a + b, 0);
  const standbyTravelHoursTotal = Object.values(breakdown1.travelHours || {}).reduce((a, b) => a + b, 0);
  const standbyWorkEarningsTotal = Object.values(breakdown1.workEarnings || {}).reduce((a, b) => a + b, 0);
  const standbyTravelEarningsTotal = Object.values(breakdown1.travelEarnings || {}).reduce((a, b) => a + b, 0);

  console.log(`- Ore lavoro reperibilità: ${standbyWorkHoursTotal.toFixed(2)} ore`);
  console.log(`- Ore viaggio reperibilità: ${standbyTravelHoursTotal.toFixed(2)} ore`);
  console.log(`- Earnings lavoro reperibilità: ${standbyWorkEarningsTotal.toFixed(2)}€`);
  console.log(`- Earnings viaggio reperibilità: ${standbyTravelEarningsTotal.toFixed(2)}€`);
  console.log(`- Totale: ${(standbyWorkEarningsTotal + standbyTravelEarningsTotal).toFixed(2)}€`);

  // Test case 2: Entry con interventi vuoti
  console.log('\n\nTEST 2: Entry con interventi vuoti');
  console.log('===================================');

  const testEntry2 = {
    date: '2025-01-16',
    interventi: [],
    isStandbyDay: true
  };

  const breakdown2 = mockService.calculateStandbyBreakdown(testEntry2, {});
  console.log(`- Total Earnings: ${breakdown2.totalEarnings.toFixed(2)}€`);

  console.log('\n✅ Test breakdown completato\n');
};

// Esegui il test
testBreakdownCalculation();
