// Script di debug semplificato per analizzare gli interventi di reperibilità
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const debugInterventiReperibilita = () => {
  console.log('\n=== DEBUG INTERVENTI REPERIBILITÀ ===\n');
  
  // Trova il file del database
  const dbPath = path.join(process.cwd(), 'workhours.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database non trovato: ${dbPath}`);
    console.log('\n🔍 Cerco il database in altre posizioni...');
    
    // Cerca in subdirectorie comuni di Expo
    const possiblePaths = [
      path.join(process.cwd(), '.expo', 'workhours.db'),
      path.join(process.cwd(), 'node_modules', '.cache', 'workhours.db'),
      path.join(process.cwd(), 'android', 'workhours.db'),
      path.join(process.cwd(), 'ios', 'workhours.db')
    ];
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        console.log(`✅ Database trovato: ${testPath}`);
        break;
      }
    }
    
    console.log('\n⚠️  Se il database non viene trovato, esegui l\'app per crearlo.');
    return;
  }
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Errore apertura database:', err.message);
      return;
    }
    console.log('✅ Connesso al database SQLite.');
  });
  
  // Query per ottenere entry con interventi
  const query = `
    SELECT date, interventi, is_standby_day, notes 
    FROM work_entries 
    WHERE interventi IS NOT NULL 
    AND interventi != '[]' 
    AND interventi != ''
    ORDER BY date DESC 
    LIMIT 10
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Errore query:', err.message);
      return;
    }
    
    console.log(`\n🔍 Trovate ${rows.length} entry con interventi:`);
    
    if (rows.length === 0) {
      console.log('\n⚠️  Nessuna entry con interventi trovata nel database.');
      console.log('Verifica che ci siano dati di reperibilità salvati.');
    }
    
    rows.forEach((row, index) => {
      console.log(`\n📅 Entry ${index + 1} - Data: ${row.date}`);
      console.log(`📋 Is Standby Day: ${row.is_standby_day}`);
      console.log(`📝 Note: ${row.notes || 'Nessuna'}`);
      console.log(`🔧 Interventi raw: ${row.interventi}`);
      
      // Parse interventi
      try {
        const interventi = JSON.parse(row.interventi);
        console.log(`✅ Interventi parsed (${interventi.length}):`, JSON.stringify(interventi, null, 2));
        
        // Analisi dettagliata di ogni intervento
        interventi.forEach((intervento, i) => {
          console.log(`\n  🔧 Intervento ${i + 1}:`);
          console.log(`    📍 Viaggio: ${intervento.departure_company || 'N/A'} → ${intervento.arrival_site || 'N/A'}`);
          console.log(`    ⏰ Lavoro 1: ${intervento.work_start_1 || 'N/A'} - ${intervento.work_end_1 || 'N/A'}`);
          console.log(`    ⏰ Lavoro 2: ${intervento.work_start_2 || 'N/A'} - ${intervento.work_end_2 || 'N/A'}`);
          console.log(`    📍 Ritorno: ${intervento.departure_return || 'N/A'} → ${intervento.arrival_company || 'N/A'}`);
          
          // Calcola durata manualmente per debug
          const calcTimeDiff = (start, end) => {
            if (!start || !end) return 0;
            const [startH, startM] = start.split(':').map(Number);
            const [endH, endM] = end.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            return endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;
          };
          
          const workMinutes1 = calcTimeDiff(intervento.work_start_1, intervento.work_end_1);
          const workMinutes2 = calcTimeDiff(intervento.work_start_2, intervento.work_end_2);
          const travelMinutes1 = calcTimeDiff(intervento.departure_company, intervento.arrival_site);
          const travelMinutes2 = calcTimeDiff(intervento.departure_return, intervento.arrival_company);
          
          console.log(`    📊 Durate calcolate:`);
          console.log(`      - Lavoro 1: ${(workMinutes1 / 60).toFixed(2)} ore`);
          console.log(`      - Lavoro 2: ${(workMinutes2 / 60).toFixed(2)} ore`);
          console.log(`      - Viaggio andata: ${(travelMinutes1 / 60).toFixed(2)} ore`);
          console.log(`      - Viaggio ritorno: ${(travelMinutes2 / 60).toFixed(2)} ore`);
          console.log(`      - Totale lavoro: ${((workMinutes1 + workMinutes2) / 60).toFixed(2)} ore`);
          console.log(`      - Totale viaggio: ${((travelMinutes1 + travelMinutes2) / 60).toFixed(2)} ore`);
        });
        
      } catch (e) {
        console.log(`❌ Errore parsing interventi:`, e.message);
      }
      
      console.log(`\n${'='.repeat(60)}\n`);
    });
    
    console.log('\n✅ Debug interventi reperibilità completato\n');
    
    // Chiudi connessione
    db.close((err) => {
      if (err) {
        console.error('❌ Errore chiusura database:', err.message);
      } else {
        console.log('✅ Database chiuso.');
      }
    });
  });
};

// Esegui il debug
debugInterventiReperibilita();
