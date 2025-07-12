const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso del database SQLite
const dbPath = path.join(__dirname, 'worktracker.db');

// Apri una connessione al database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore nell\'apertura del database:', err.message);
    process.exit(1);
  }
  console.log('Connesso al database SQLite.');
});

// Query per controllare gli interventi di reperibilità
db.all("SELECT date, interventi FROM work_entries WHERE interventi IS NOT NULL AND interventi != '[]'", [], (err, rows) => {
  if (err) {
    console.error('Errore nella query:', err.message);
    return;
  }

  console.log('\n=== ANALISI INTERVENTI DI REPERIBILITÀ ===\n');
  
  let totalInterventions = 0;
  let daysWithInterventions = 0;
  
  rows.forEach((row, index) => {
    try {
      const interventi = JSON.parse(row.interventi);
      if (Array.isArray(interventi) && interventi.length > 0) {
        daysWithInterventions++;
        totalInterventions += interventi.length;
        
        console.log(`${row.date}: ${interventi.length} interventi`);
        
        // Mostra dettagli di ogni intervento
        interventi.forEach((intervento, i) => {
          console.log(`  Intervento ${i + 1}:`);
          if (intervento.work_start_1 && intervento.work_end_1) {
            console.log(`    - Lavoro: ${intervento.work_start_1} → ${intervento.work_end_1}`);
          }
          if (intervento.departure_company && intervento.arrival_site) {
            console.log(`    - Viaggio A: ${intervento.departure_company} → ${intervento.arrival_site}`);
          }
          if (intervento.departure_return && intervento.arrival_company) {
            console.log(`    - Viaggio R: ${intervento.departure_return} → ${intervento.arrival_company}`);
          }
        });
        console.log('');
      }
    } catch (e) {
      console.log(`${row.date}: Errore nel parsing JSON degli interventi`);
    }
  });
  
  console.log(`=== RIEPILOGO ===`);
  console.log(`Giorni con interventi: ${daysWithInterventions}`);
  console.log(`Totale interventi: ${totalInterventions}`);
  console.log(`Media interventi per giorno: ${daysWithInterventions > 0 ? (totalInterventions / daysWithInterventions).toFixed(2) : 0}`);
  
  db.close((err) => {
    if (err) {
      console.error('Errore nella chiusura del database:', err.message);
    } else {
      console.log('Connessione al database chiusa.');
    }
  });
});
