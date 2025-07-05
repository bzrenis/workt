// Test per verificare che gli interventi vengano salvati e caricati correttamente
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const testInterventDatabase = () => {
  console.log('\n=== TEST DATABASE INTERVENTI ===\n');
  
  // Trova il file del database
  const dbPath = path.join(process.cwd(), 'workhours.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database non trovato: ${dbPath}`);
    console.log('📱 Avvia l\'app per creare il database.');
    return;
  }
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Errore apertura database:', err.message);
      return;
    }
    console.log('✅ Connesso al database SQLite.');
  });

  // Data di test (oggi)
  const today = new Date();
  const testDate = today.toISOString().split('T')[0];
  
  console.log(`📅 Data di test: ${testDate}`);
  
  // Test interventi da inserire
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

  console.log(`🔧 Interventi da testare:`, JSON.stringify(testInterventi, null, 2));

  // Step 1: Elimina entry esistente per la data di test
  db.run('DELETE FROM work_entries WHERE date = ?', [testDate], function(err) {
    if (err) {
      console.error('❌ Errore eliminazione entry esistente:', err.message);
      return;
    }
    console.log(`🗑️  Entry esistenti per ${testDate} eliminate.`);

    // Step 2: Inserisci nuova entry con interventi
    const insertSQL = `
      INSERT INTO work_entries (
        date, site_name, vehicle_driven,
        departure_company, arrival_site, work_start_1, work_end_1,
        work_start_2, work_end_2, departure_return, arrival_company,
        meal_lunch_voucher, meal_lunch_cash, meal_dinner_voucher, meal_dinner_cash,
        travel_allowance, travel_allowance_percent, standby_allowance,
        is_standby_day, total_earnings, day_type, notes, interventi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertParams = [
      testDate,                           // date
      'Sede Test Interventi DB',          // site_name
      'Auto Aziendale',                   // vehicle_driven
      null, null, null, null,             // work ordinario (vuoto)
      null, null, null, null,             // work ordinario (vuoto)
      0, 0, 0, 0,                        // pasti (vuoti)
      1, 1.0, 1,                         // travel_allowance, travel_allowance_percent, standby_allowance
      1,                                 // is_standby_day (true)
      0,                                 // total_earnings (calcolato dopo)
      'workday',                         // day_type
      'Test entry con interventi multipli per verifica database', // notes
      JSON.stringify(testInterventi)      // interventi (serializzato)
    ];

    db.run(insertSQL, insertParams, function(err) {
      if (err) {
        console.error('❌ Errore inserimento entry:', err.message);
        return;
      }
      
      const insertedId = this.lastID;
      console.log(`✅ Entry inserita con ID: ${insertedId}`);

      // Step 3: Rileggi l'entry dal database per verificare
      db.get('SELECT * FROM work_entries WHERE id = ?', [insertedId], (err, row) => {
        if (err) {
          console.error('❌ Errore lettura entry:', err.message);
          return;
        }

        console.log(`\n🔍 VERIFICA ENTRY INSERITA:`);
        console.log(`- ID: ${row.id}`);
        console.log(`- Data: ${row.date}`);
        console.log(`- Site: ${row.site_name}`);
        console.log(`- Is Standby Day: ${row.is_standby_day}`);
        console.log(`- Interventi Raw: ${row.interventi}`);

        // Verifica parsing JSON
        try {
          const parsedInterventi = JSON.parse(row.interventi || '[]');
          console.log(`- Interventi Parsed (${parsedInterventi.length}):`, JSON.stringify(parsedInterventi, null, 2));

          // Test calcolo ore manuale
          let totalLavoro = 0;
          let totalViaggio = 0;

          parsedInterventi.forEach((intervento, index) => {
            console.log(`\n  🔧 Intervento ${index + 1}:`);
            
            const calcTime = (start, end) => {
              if (!start || !end) return 0;
              const [startH, startM] = start.split(':').map(Number);
              const [endH, endM] = end.split(':').map(Number);
              const startMinutes = startH * 60 + startM;
              const endMinutes = endH * 60 + endM;
              return endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;
            };

            const lavoro1 = calcTime(intervento.work_start_1, intervento.work_end_1);
            const lavoro2 = calcTime(intervento.work_start_2, intervento.work_end_2);
            const viaggio1 = calcTime(intervento.departure_company, intervento.arrival_site);
            const viaggio2 = calcTime(intervento.departure_return, intervento.arrival_company);

            totalLavoro += lavoro1 + lavoro2;
            totalViaggio += viaggio1 + viaggio2;

            console.log(`    - Lavoro: ${(lavoro1 + lavoro2) / 60} ore`);
            console.log(`    - Viaggio: ${(viaggio1 + viaggio2) / 60} ore`);
          });

          console.log(`\n📊 TOTALI CALCOLATI:`);
          console.log(`- Ore lavoro totali: ${(totalLavoro / 60).toFixed(2)} ore`);
          console.log(`- Ore viaggio totali: ${(totalViaggio / 60).toFixed(2)} ore`);
          console.log(`- Ore complessive: ${((totalLavoro + totalViaggio) / 60).toFixed(2)} ore`);

          // Calcolo earnings stimato
          const hourlyRate = 16.41081;
          const earningsLavoro = (totalLavoro / 60) * hourlyRate;
          const earningsViaggio = (totalViaggio / 60) * hourlyRate;
          const totalEarningsInterventi = earningsLavoro + earningsViaggio;
          const indennita = 7.03; // CCNL 24h feriale

          console.log(`\n💰 EARNINGS STIMATI:`);
          console.log(`- Lavoro: €${earningsLavoro.toFixed(2)}`);
          console.log(`- Viaggio: €${earningsViaggio.toFixed(2)}`);
          console.log(`- Totale interventi: €${totalEarningsInterventi.toFixed(2)}`);
          console.log(`- Indennità reperibilità: €${indennita.toFixed(2)}`);
          console.log(`- TOTALE ATTESO: €${(totalEarningsInterventi + indennita).toFixed(2)}`);

          console.log(`\n✅ Test database completato. Ora controlla l'app per vedere se i valori corrispondono.`);

        } catch (parseError) {
          console.error('❌ Errore parsing JSON interventi:', parseError.message);
        }

        // Chiudi connessione
        db.close((err) => {
          if (err) {
            console.error('❌ Errore chiusura database:', err.message);
          } else {
            console.log('\n✅ Database chiuso.');
          }
        });
      });
    });
  });
};

// Esegui il test
testInterventDatabase();
