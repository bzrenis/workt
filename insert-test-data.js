// Script per inserire dati di test se il database è vuoto
const DatabaseService = require('./src/services/DatabaseService');

async function insertTestDataIfEmpty() {
  console.log('🧪 Script inserimento dati di test\n');

  try {
    // Verifica se il database è vuoto
    const allEntries = await DatabaseService.getAllWorkEntries();
    console.log(`📊 Entries esistenti nel database: ${allEntries.length}`);

    if (allEntries.length === 0) {
      console.log('💾 Database vuoto, inserisco dati di test...\n');

      // Dati di test per Luglio 2025
      const testEntries = [
        {
          date: '2025-07-01',
          workHours: 8,
          travelHours: 2,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Primo giorno del mese - test'
        },
        {
          date: '2025-07-02',
          workHours: 8.5,
          travelHours: 1.5,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Secondo giorno - test'
        },
        {
          date: '2025-07-03',
          workHours: 9,
          travelHours: 2.5,
          standbyHours: 2,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Terzo giorno con reperibilità - test'
        },
        {
          date: '2025-07-04',
          workHours: 8,
          travelHours: 1,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: false,
          notes: 'Quarto giorno - test'
        },
        {
          date: '2025-07-05',
          workHours: 6,
          travelHours: 3,
          standbyHours: 1,
          standbyTravelHours: 1,
          isDailyRate: false,
          isWeekend: true,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Weekend con reperibilità - test'
        }
      ];

      // Dati di test per Giugno 2025 (per testare il fix del bug)
      const juneTestEntries = [
        {
          date: '2025-06-15',
          workHours: 8,
          travelHours: 2,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Giugno metà mese - test'
        },
        {
          date: '2025-06-25',
          workHours: 8.5,
          travelHours: 1.5,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Giugno fine mese - test'
        },
        {
          date: '2025-06-30',
          workHours: 9,
          travelHours: 2,
          standbyHours: 0,
          standbyTravelHours: 0,
          isDailyRate: true,
          isWeekend: false,
          isHoliday: false,
          mealAllowance: true,
          notes: 'Ultimo giorno di Giugno - test del fix'
        }
      ];

      // Inserisci entries di test
      let insertedCount = 0;
      
      for (const entry of [...testEntries, ...juneTestEntries]) {
        try {
          await DatabaseService.addWorkEntry(entry);
          insertedCount++;
          console.log(`✅ Inserita entry per ${entry.date}: ${entry.workHours}h lavoro + ${entry.travelHours}h viaggio`);
        } catch (error) {
          console.error(`❌ Errore inserimento ${entry.date}:`, error);
        }
      }

      console.log(`\n🎉 Inserite ${insertedCount} entries di test!`);
      console.log('📊 Breakdown:');
      console.log(`   - Luglio 2025: 5 giorni`);
      console.log(`   - Giugno 2025: 3 giorni (include 30/06 per test fix)`);
      console.log('');
      console.log('🔄 Ora ricarica la Dashboard per vedere i dati!');

    } else {
      console.log('✅ Database contiene già dei dati, non inserisco duplicati.');
      console.log('📅 Entries per mese:');
      
      // Raggruppa per mese
      const byMonth = {};
      allEntries.forEach(entry => {
        const monthKey = entry.date.substring(0, 7); // YYYY-MM
        if (!byMonth[monthKey]) byMonth[monthKey] = 0;
        byMonth[monthKey]++;
      });

      Object.keys(byMonth).sort().forEach(month => {
        console.log(`   ${month}: ${byMonth[month]} giorni`);
      });
    }

  } catch (error) {
    console.error('❌ Errore durante l\'inserimento dati di test:', error);
  }
}

insertTestDataIfEmpty();
