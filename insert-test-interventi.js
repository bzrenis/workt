// Script per inserire dati di test con interventi di reperibilità
import * as SQLite from 'expo-sqlite';

const insertTestDataWithInterventi = async () => {
  console.log('\n=== INSERIMENTO DATI TEST INTERVENTI ===\n');
  
  try {
    const db = await SQLite.openDatabaseAsync('workhours.db');
    
    // Data di test (oggi)
    const today = new Date();
    const testDate = today.toISOString().split('T')[0];
    
    console.log(`📅 Inserimento dati per la data: ${testDate}`);
    
    // Elimina entry esistente per la data di test
    await db.runAsync(
      'DELETE FROM work_entries WHERE date = ?',
      [testDate]
    );
    
    // Crea interventi di test
    const testInterventi = [
      {
        departure_company: '08:00',
        arrival_site: '09:00',
        work_start_1: '09:15',
        work_end_1: '11:45',
        work_start_2: '13:00',
        work_end_2: '15:30',
        departure_return: '15:45',
        arrival_company: '16:45'
      },
      {
        departure_company: '18:00',
        arrival_site: '18:30',
        work_start_1: '18:45',
        work_end_1: '20:15',
        work_start_2: null,
        work_end_2: null,
        departure_return: '20:30',
        arrival_company: '21:00'
      }
    ];
    
    console.log(`🔧 Interventi da inserire:`, testInterventi);
    
    // Inserisci entry di test con interventi
    const result = await db.runAsync(`
      INSERT INTO work_entries (
        date, site_name, vehicle_driven,
        departure_company, arrival_site, work_start_1, work_end_1,
        work_start_2, work_end_2, departure_return, arrival_company,
        meal_lunch_voucher, meal_lunch_cash, meal_dinner_voucher, meal_dinner_cash,
        travel_allowance, travel_allowance_percent, standby_allowance,
        is_standby_day, total_earnings, day_type, notes, interventi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testDate,                           // date
      'Sede Test Interventi',             // site_name
      'Auto Aziendale',                   // vehicle_driven
      null, null, null, null,             // work ordinario (vuoto)
      null, null, null, null,             // work ordinario (vuoto)
      0, 0, 0, 0,                        // pasti (vuoti)
      1, 1.0, 1,                         // travel_allowance, travel_allowance_percent, standby_allowance
      1,                                 // is_standby_day (true)
      0,                                 // total_earnings (calcolato dopo)
      'workday',                         // day_type
      'Test entry con interventi multipli di reperibilità', // notes
      JSON.stringify(testInterventi)      // interventi (serializzato)
    ]);
    
    console.log(`✅ Entry inserita con ID: ${result.lastInsertRowId}`);
    
    // Verifica che l'entry sia stata inserita correttamente
    const insertedEntry = await db.getFirstAsync(
      'SELECT * FROM work_entries WHERE date = ?',
      [testDate]
    );
    
    console.log(`🔍 Entry verificata:`, {
      id: insertedEntry.id,
      date: insertedEntry.date,
      site_name: insertedEntry.site_name,
      is_standby_day: insertedEntry.is_standby_day,
      interventi_raw: insertedEntry.interventi,
      interventi_parsed: JSON.parse(insertedEntry.interventi || '[]')
    });
    
    console.log('\n✅ Dati di test inseriti con successo!');
    console.log('📱 Ora apri l\'app e vai alla dashboard per vedere i risultati.\n');
    
  } catch (error) {
    console.error('❌ Errore durante inserimento dati test:', error);
  }
};

// Esegui lo script
insertTestDataWithInterventi();
