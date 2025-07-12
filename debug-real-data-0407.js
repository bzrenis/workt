// Script per verificare i dati reali dell'intervento del 04/07/2025
// Da eseguire con l'app Expo avviata

import * as SQLite from 'expo-sqlite';

async function debugRealData0407() {
  console.log('=== VERIFICA DATI REALI 04/07/2025 ===\n');
  
  try {
    // Apri il database
    const db = await SQLite.openDatabaseAsync('workhours.db');
    
    // Cerca l'entry per il 04/07/2025
    const entries = await db.getAllAsync(`
      SELECT * FROM work_entries 
      WHERE date = '2025-07-04'
    `);
    
    console.log(`🔍 Trovate ${entries.length} entries per il 04/07/2025`);
    
    if (entries.length === 0) {
      console.log('❌ Nessuna entry trovata per il 04/07/2025!');
      console.log('💡 Possibili cause:');
      console.log('   - Data inserita diversa (formato diverso)');
      console.log('   - Entry non salvata');
      console.log('   - Database diverso');
      
      // Cerca entries vicine
      const nearEntries = await db.getAllAsync(`
        SELECT date, id FROM work_entries 
        WHERE date LIKE '2025-07%'
        ORDER BY date DESC
      `);
      
      console.log(`\n📅 Entries di Luglio 2025 trovate (${nearEntries.length}):`);
      nearEntries.forEach(entry => {
        console.log(`   - ${entry.date} (ID: ${entry.id})`);
      });
      
      return;
    }
    
    const entry = entries[0];
    
    console.log('📊 DATI ENTRY TROVATA:');
    console.log('━'.repeat(50));
    console.log(`🆔 ID: ${entry.id}`);
    console.log(`📅 Data: ${entry.date}`);
    console.log(`🔧 Is Standby Day: ${entry.is_standby_day}`);
    console.log(`💼 Work Start 1: ${entry.work_start_1 || 'N/A'}`);
    console.log(`💼 Work End 1: ${entry.work_end_1 || 'N/A'}`);
    console.log(`💼 Work Start 2: ${entry.work_start_2 || 'N/A'}`);
    console.log(`💼 Work End 2: ${entry.work_end_2 || 'N/A'}`);
    console.log(`🚗 Departure Company: ${entry.departure_company || 'N/A'}`);
    console.log(`🚗 Arrival Site: ${entry.arrival_site || 'N/A'}`);
    console.log(`🏠 Departure Return: ${entry.departure_return || 'N/A'}`);
    console.log(`🏠 Arrival Company: ${entry.arrival_company || 'N/A'}`);
    console.log(`🔧 Interventi (raw): ${entry.interventi || 'N/A'}`);
    console.log(`📝 Notes: ${entry.notes || 'N/A'}`);
    
    // Parse interventi se esistono
    if (entry.interventi && entry.interventi !== '[]' && entry.interventi !== '') {
      console.log('\n🔧 ANALISI INTERVENTI:');
      console.log('━'.repeat(50));
      
      try {
        const interventi = JSON.parse(entry.interventi);
        console.log(`✅ Parsing riuscito - ${interventi.length} interventi trovati`);
        
        interventi.forEach((intervento, index) => {
          console.log(`\n📋 Intervento ${index + 1}:`);
          console.log(`   💼 Work Start 1: ${intervento.work_start_1 || 'N/A'}`);
          console.log(`   💼 Work End 1: ${intervento.work_end_1 || 'N/A'}`);
          console.log(`   💼 Work Start 2: ${intervento.work_start_2 || 'N/A'}`);
          console.log(`   💼 Work End 2: ${intervento.work_end_2 || 'N/A'}`);
          console.log(`   🚗 Departure Company: ${intervento.departure_company || 'N/A'}`);
          console.log(`   🚗 Arrival Site: ${intervento.arrival_site || 'N/A'}`);
          console.log(`   🏠 Departure Return: ${intervento.departure_return || 'N/A'}`);
          console.log(`   🏠 Arrival Company: ${intervento.arrival_company || 'N/A'}`);
          
          // Calcola le ore per questo intervento
          let oreIntervento = 0;
          
          // Lavoro 1
          if (intervento.work_start_1 && intervento.work_end_1) {
            const start = new Date(`2000-01-01T${intervento.work_start_1}`);
            const end = new Date(`2000-01-01T${intervento.work_end_1}`);
            if (end < start) end.setDate(end.getDate() + 1); // Passa mezzanotte
            const ore = (end - start) / (1000 * 60 * 60);
            oreIntervento += ore;
            console.log(`   📊 Ore lavoro 1: ${ore} ore`);
          }
          
          // Lavoro 2
          if (intervento.work_start_2 && intervento.work_end_2) {
            const start = new Date(`2000-01-01T${intervento.work_start_2}`);
            const end = new Date(`2000-01-01T${intervento.work_end_2}`);
            if (end < start) end.setDate(end.getDate() + 1);
            const ore = (end - start) / (1000 * 60 * 60);
            oreIntervento += ore;
            console.log(`   📊 Ore lavoro 2: ${ore} ore`);
          }
          
          // Viaggio andata
          if (intervento.departure_company && intervento.arrival_site) {
            const start = new Date(`2000-01-01T${intervento.departure_company}`);
            const end = new Date(`2000-01-01T${intervento.arrival_site}`);
            if (end < start) end.setDate(end.getDate() + 1);
            const ore = (end - start) / (1000 * 60 * 60);
            oreIntervento += ore;
            console.log(`   📊 Ore viaggio andata: ${ore} ore`);
          }
          
          // Viaggio ritorno
          if (intervento.departure_return && intervento.arrival_company) {
            const start = new Date(`2000-01-01T${intervento.departure_return}`);
            const end = new Date(`2000-01-01T${intervento.arrival_company}`);
            if (end < start) end.setDate(end.getDate() + 1);
            const ore = (end - start) / (1000 * 60 * 60);
            oreIntervento += ore;
            console.log(`   📊 Ore viaggio ritorno: ${ore} ore`);
          }
          
          console.log(`   🎯 Totale intervento ${index + 1}: ${oreIntervento} ore`);
        });
        
        // Calcola totale complessivo
        let totaleTuttiInterventi = 0;
        interventi.forEach(intervento => {
          // Usa la stessa logica del CalculationService
          
          // Lavoro 1
          if (intervento.work_start_1 && intervento.work_end_1) {
            const start = new Date(`2000-01-01T${intervento.work_start_1}`);
            const end = new Date(`2000-01-01T${intervento.work_end_1}`);
            if (end < start) end.setDate(end.getDate() + 1);
            totaleTuttiInterventi += (end - start) / (1000 * 60 * 60);
          }
          
          // Lavoro 2
          if (intervento.work_start_2 && intervento.work_end_2) {
            const start = new Date(`2000-01-01T${intervento.work_start_2}`);
            const end = new Date(`2000-01-01T${intervento.work_end_2}`);
            if (end < start) end.setDate(end.getDate() + 1);
            totaleTuttiInterventi += (end - start) / (1000 * 60 * 60);
          }
          
          // Viaggio andata
          if (intervento.departure_company && intervento.arrival_site) {
            const start = new Date(`2000-01-01T${intervento.departure_company}`);
            const end = new Date(`2000-01-01T${intervento.arrival_site}`);
            if (end < start) end.setDate(end.getDate() + 1);
            totaleTuttiInterventi += (end - start) / (1000 * 60 * 60);
          }
          
          // Viaggio ritorno
          if (intervento.departure_return && intervento.arrival_company) {
            const start = new Date(`2000-01-01T${intervento.departure_return}`);
            const end = new Date(`2000-01-01T${intervento.arrival_company}`);
            if (end < start) end.setDate(end.getDate() + 1);
            totaleTuttiInterventi += (end - start) / (1000 * 60 * 60);
          }
        });
        
        console.log('\n🎯 RIEPILOGO FINALE:');
        console.log('━'.repeat(50));
        console.log(`📊 Totale ore calcolate: ${totaleTuttiInterventi} ore`);
        console.log(`🔍 Sistema mostra: 5 ore`);
        console.log(`✅ Dovrebbe essere: 6 ore`);
        
        if (Math.abs(totaleTuttiInterventi - 5) < 0.1) {
          console.log('✅ TROVATO IL PROBLEMA! Il calcolo dà effettivamente 5 ore.');
          console.log('🔧 Per correggere a 6 ore, verifica:');
          console.log('   1. Gli orari inseriti sono corretti?');
          console.log('   2. Manca qualche periodo di lavoro o viaggio?');
          console.log('   3. Ci sono errori negli orari di input?');
        } else if (Math.abs(totaleTuttiInterventi - 6) < 0.1) {
          console.log('❓ STRANNO: Il calcolo dà 6 ore ma l\'app mostra 5.');
          console.log('🔧 Possibile bug nell\'interfaccia o cache.');
        } else {
          console.log(`❓ Risultato inaspettato: ${totaleTuttiInterventi} ore`);
        }
        
      } catch (parseError) {
        console.log('❌ Errore parsing interventi:', parseError.message);
        console.log('🔧 Interventi raw:', entry.interventi);
      }
    } else {
      console.log('\n❌ Nessun intervento trovato nell\'entry');
      console.log('💡 Possibili cause:');
      console.log('   - Interventi non salvati correttamente');
      console.log('   - Entry per giorno normale invece di reperibilità');
      console.log('   - Bug nel salvataggio');
    }
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error.message);
    console.log('💡 Assicurati che:');
    console.log('   1. L\'app Expo sia avviata');
    console.log('   2. Il database sia accessibile');
    console.log('   3. Lo script sia eseguito nel contesto corretto');
  }
}

// Per usare questo script:
console.log('📝 ISTRUZIONI PER L\'USO:');
console.log('1. Avvia l\'app con: npx expo start');
console.log('2. Apri la console del browser/simulatore');
console.log('3. Copia e incolla questa funzione nella console');
console.log('4. Esegui: debugRealData0407()');
console.log('\n' + '='.repeat(60));

// Esporta la funzione per l'uso nella console
if (typeof window !== 'undefined') {
  window.debugRealData0407 = debugRealData0407;
}

export { debugRealData0407 };
