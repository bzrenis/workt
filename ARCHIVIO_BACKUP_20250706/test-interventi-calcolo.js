// Test specifico per calcolo interventi reperibilità
const fs = require('fs');

// Mock delle funzioni necessarie dal CalculationService
class CalculationServiceTest {
  
  parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
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

  minutesToHours(minutes) {
    return minutes / 60;
  }

  calculateStandbyWorkHours(workEntry) {
    let totalStandbyMinutes = 0;
    if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
      workEntry.interventi.forEach(intervento => {
        if (intervento.work_start_1 && intervento.work_end_1) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
        }
        if (intervento.work_start_2 && intervento.work_end_2) {
          totalStandbyMinutes += this.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
        }
      });
    }
    return this.minutesToHours(totalStandbyMinutes);
  }

  testInterventiCalculation() {
    console.log('\n=== TEST CALCOLO INTERVENTI REPERIBILITÀ ===\n');

    // Test 1: Entry con interventi
    const testWorkEntry = {
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

    console.log('📋 Test Entry:', JSON.stringify(testWorkEntry, null, 2));

    // Test calcolo ore standby
    const standbyWorkHours = this.calculateStandbyWorkHours(testWorkEntry);
    console.log(`\n⏰ Ore lavoro standby calcolate: ${standbyWorkHours}`);

    // Test calcolo manuale dei segmenti
    console.log('\n🔧 ANALISI DETTAGLIATA SEGMENTI:\n');

    const intervento = testWorkEntry.interventi[0];
    
    // Viaggio andata
    const viaggioAndata = this.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
    console.log(`📍 Viaggio andata (${intervento.departure_company} → ${intervento.arrival_site}): ${viaggioAndata} minuti (${this.minutesToHours(viaggioAndata).toFixed(2)} ore)`);

    // Lavoro 1
    const lavoro1 = this.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
    console.log(`⚙️  Lavoro 1 (${intervento.work_start_1} → ${intervento.work_end_1}): ${lavoro1} minuti (${this.minutesToHours(lavoro1).toFixed(2)} ore)`);

    // Lavoro 2
    const lavoro2 = this.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
    console.log(`⚙️  Lavoro 2 (${intervento.work_start_2} → ${intervento.work_end_2}): ${lavoro2} minuti (${this.minutesToHours(lavoro2).toFixed(2)} ore)`);

    // Viaggio ritorno
    const viaggioRitorno = this.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
    console.log(`📍 Viaggio ritorno (${intervento.departure_return} → ${intervento.arrival_company}): ${viaggioRitorno} minuti (${this.minutesToHours(viaggioRitorno).toFixed(2)} ore)`);

    // Totali
    const totaleLavoro = lavoro1 + lavoro2;
    const totaleViaggio = viaggioAndata + viaggioRitorno;
    const totaleIntervento = totaleLavoro + totaleViaggio;

    console.log(`\n📊 RIEPILOGO:`);
    console.log(`- Totale ore lavoro: ${this.minutesToHours(totaleLavoro).toFixed(2)} ore`);
    console.log(`- Totale ore viaggio: ${this.minutesToHours(totaleViaggio).toFixed(2)} ore`);
    console.log(`- Totale ore intervento: ${this.minutesToHours(totaleIntervento).toFixed(2)} ore`);

    // Verifica con metodo originale
    console.log(`\n✅ Confronto con metodo calculateStandbyWorkHours:`);
    console.log(`- Calcolato manualmente: ${this.minutesToHours(totaleLavoro).toFixed(2)} ore`);
    console.log(`- Metodo CalculationService: ${standbyWorkHours.toFixed(2)} ore`);
    console.log(`- Match: ${Math.abs(this.minutesToHours(totaleLavoro) - standbyWorkHours) < 0.01 ? '✅' : '❌'}`);

    // Test 2: Entry senza interventi
    console.log('\n\n📋 Test Entry vuota:');
    const emptyEntry = {
      date: '2025-01-16',
      interventi: [],
      isStandbyDay: true
    };

    const emptyStandbyHours = this.calculateStandbyWorkHours(emptyEntry);
    console.log(`⏰ Ore lavoro standby (entry vuota): ${emptyStandbyHours}`);

    // Test 3: Entry con interventi ma array null/undefined
    console.log('\n📋 Test Entry con interventi null:');
    const nullEntry = {
      date: '2025-01-17',
      interventi: null,
      isStandbyDay: true
    };

    const nullStandbyHours = this.calculateStandbyWorkHours(nullEntry);
    console.log(`⏰ Ore lavoro standby (interventi null): ${nullStandbyHours}`);

    console.log('\n✅ Test completato\n');
  }
}

// Esegui il test
const testService = new CalculationServiceTest();
testService.testInterventiCalculation();
