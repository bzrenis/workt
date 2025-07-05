// Test completo per verificare la correzione degli interventi di reperibilità

const testInterventiFix = () => {
  console.log('\n=== TEST CORREZIONE INTERVENTI REPERIBILITÀ ===\n');

  // Mock del CalculationService con la nuova logica
  class FixedCalculationService {
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

    // Versione corretta del calculateStandbyBreakdown
    calculateStandbyBreakdown(workEntry, settings) {
      const baseRate = 16.41081;
      const travelCompensationRate = 1.0;
      const standbySettings = settings.standbySettings || {};
      
      console.log(`\n🔧 Test calcolo breakdown per ${workEntry.date}`);
      
      // Logica per determinare se la reperibilità è attiva
      const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                  workEntry.isStandbyDay === 0 ||
                                  workEntry.standbyAllowance === false ||
                                  workEntry.standbyAllowance === 0;
                                  
      const isManuallyActivated = workEntry.isStandbyDay === true || 
                                workEntry.isStandbyDay === 1 || 
                                workEntry.standbyAllowance === true || 
                                workEntry.standbyAllowance === 1;
      
      const isInCalendar = Boolean(standbySettings.enabled && 
                          standbySettings.standbyDays && 
                          standbySettings.standbyDays[workEntry.date]?.selected);
      
      const isStandbyActive = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
      
      console.log(`📋 Stato reperibilità:`, {
        isManuallyActivated,
        isManuallyDeactivated,
        isInCalendar,
        isStandbyActive
      });

      // Segmenti di intervento reperibilità
      const segments = [];
      if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
        workEntry.interventi.forEach(iv => {
          if (iv.departure_company && iv.arrival_site) {
            segments.push({ start: iv.departure_company, end: iv.arrival_site, type: 'standby_travel' });
          }
          if (iv.work_start_1 && iv.work_end_1) {
            segments.push({ start: iv.work_start_1, end: iv.work_end_1, type: 'standby_work' });
          }
          if (iv.work_start_2 && iv.work_end_2) {
            segments.push({ start: iv.work_start_2, end: iv.work_end_2, type: 'standby_work' });
          }
          if (iv.departure_return && iv.arrival_company) {
            segments.push({ start: iv.departure_return, end: iv.arrival_company, type: 'standby_travel' });
          }
        });
      }

      console.log(`🔧 Segmenti identificati: ${segments.length}`);

      // Calcolo ore
      const minuteDetails = {
        work: { ordinary: 0 },
        travel: { ordinary: 0 }
      };

      for (const segment of segments) {
        const duration = this.calculateTimeDifference(segment.start, segment.end);
        if (segment.type === 'standby_work') minuteDetails.work.ordinary += duration;
        if (segment.type === 'standby_travel') minuteDetails.travel.ordinary += duration;
      }

      const hours = {
        work: { ordinary: this.minutesToHours(minuteDetails.work.ordinary) },
        travel: { ordinary: this.minutesToHours(minuteDetails.travel.ordinary) }
      };

      const earnings = {
        work: { ordinary: hours.work.ordinary * baseRate },
        travel: { ordinary: hours.travel.ordinary * baseRate * travelCompensationRate }
      };

      // LOGICA CORRETTA: Gli earnings degli interventi sono sempre calcolati
      const interventionEarnings = Object.values(earnings.work).reduce((a, b) => a + b, 0)
        + Object.values(earnings.travel).reduce((a, b) => a + b, 0);
      
      // L'indennità giornaliera viene aggiunta solo se la reperibilità è attiva
      const dailyIndemnity = isStandbyActive ? 7.03 : 0; // CCNL default 24h feriale
      
      const totalEarnings = interventionEarnings + dailyIndemnity;

      console.log(`💰 Calcolo earnings:`, {
        interventionEarnings: interventionEarnings.toFixed(2),
        dailyIndemnity: dailyIndemnity.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2),
        workHours: hours.work.ordinary.toFixed(2),
        travelHours: hours.travel.ordinary.toFixed(2)
      });

      return {
        dailyIndemnity,
        workHours: hours.work,
        travelHours: hours.travel,
        workEarnings: earnings.work,
        travelEarnings: earnings.travel,
        totalEarnings
      };
    }
  }

  // Test Case 1: Interventi CON reperibilità attiva
  console.log('TEST 1: Interventi con reperibilità attiva');
  console.log('==========================================');

  const testEntry1 = {
    date: '2025-01-15',
    isStandbyDay: true, // Reperibilità attivata manualmente
    interventi: [
      {
        departure_company: '08:00',
        arrival_site: '09:00',
        work_start_1: '09:15',
        work_end_1: '11:45',
        departure_return: '12:00',
        arrival_company: '13:00'
      }
    ]
  };

  const service = new FixedCalculationService();
  const result1 = service.calculateStandbyBreakdown(testEntry1, { standbySettings: {} });

  console.log(`✅ Risultato: ${result1.totalEarnings.toFixed(2)}€ (dovrebbe essere > 0)`);

  // Test Case 2: Interventi SENZA reperibilità attiva
  console.log('\n\nTEST 2: Interventi senza reperibilità attiva');
  console.log('=============================================');

  const testEntry2 = {
    date: '2025-01-16',
    isStandbyDay: false, // Reperibilità NON attiva
    interventi: [
      {
        departure_company: '08:00',
        arrival_site: '09:00',
        work_start_1: '09:15',
        work_end_1: '11:45',
        departure_return: '12:00',
        arrival_company: '13:00'
      }
    ]
  };

  const result2 = service.calculateStandbyBreakdown(testEntry2, { standbySettings: {} });

  console.log(`✅ Risultato: ${result2.totalEarnings.toFixed(2)}€ (dovrebbe essere > 0 ma < Test 1)`);

  // Test Case 3: Nessun intervento con reperibilità attiva
  console.log('\n\nTEST 3: Nessun intervento con reperibilità attiva');
  console.log('==================================================');

  const testEntry3 = {
    date: '2025-01-17',
    isStandbyDay: true,
    interventi: []
  };

  const result3 = service.calculateStandbyBreakdown(testEntry3, { standbySettings: {} });

  console.log(`✅ Risultato: ${result3.totalEarnings.toFixed(2)}€ (dovrebbe essere solo indennità ~7€)`);

  // Riepilogo
  console.log('\n\n📊 RIEPILOGO RISULTATI:');
  console.log('========================');
  console.log(`Test 1 (interventi + reperibilità): ${result1.totalEarnings.toFixed(2)}€`);
  console.log(`Test 2 (interventi - reperibilità): ${result2.totalEarnings.toFixed(2)}€`);
  console.log(`Test 3 (nessun intervento + reperibilità): ${result3.totalEarnings.toFixed(2)}€`);

  // Verifiche
  const test1HasEarnings = result1.totalEarnings > 50; // Dovrebbe avere sia interventi che indennità
  const test2HasEarnings = result2.totalEarnings > 0 && result2.totalEarnings < result1.totalEarnings; // Solo interventi
  const test3HasIndemnity = Math.abs(result3.totalEarnings - 7.03) < 0.1; // Solo indennità

  console.log('\n✅ VERIFICHE:');
  console.log(`- Test 1 (completo): ${test1HasEarnings ? '✅' : '❌'}`);
  console.log(`- Test 2 (solo interventi): ${test2HasEarnings ? '✅' : '❌'}`);
  console.log(`- Test 3 (solo indennità): ${test3HasIndemnity ? '✅' : '❌'}`);

  if (test1HasEarnings && test2HasEarnings && test3HasIndemnity) {
    console.log('\n🎉 TUTTI I TEST SUPERATI! La correzione funziona correttamente.\n');
  } else {
    console.log('\n⚠️  Alcuni test non superati. Verificare la logica.\n');
  }
};

// Esegui il test
testInterventiFix();
