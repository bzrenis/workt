// Script di debug per analizzare gli interventi di reperibilità
import * as SQLite from 'expo-sqlite';
import { CalculationService } from './src/services/CalculationService.js';
import { DatabaseService } from './src/services/DatabaseService.js';

const debugInterventiReperibilita = async () => {
  console.log('\n=== DEBUG INTERVENTI REPERIBILITÀ ===\n');
  
  try {
    // Connessione database
    const db = await SQLite.openDatabaseAsync('workhours.db');
    const dbService = new DatabaseService();
    await dbService.init();
    
    const calculationService = new CalculationService();
    
    // Cerca tutte le entry con interventi non vuoti
    const entriesWithInterventi = await db.getAllAsync(`
      SELECT date, interventi, is_standby_day, notes 
      FROM work_entries 
      WHERE interventi IS NOT NULL 
      AND interventi != '[]' 
      AND interventi != ''
      ORDER BY date DESC 
      LIMIT 10
    `);
    
    console.log(`\n🔍 Trovate ${entriesWithInterventi.length} entry con interventi:`);
    
    for (const rawEntry of entriesWithInterventi) {
      console.log(`\n📅 Data: ${rawEntry.date}`);
      console.log(`📋 Is Standby Day: ${rawEntry.is_standby_day}`);
      console.log(`📝 Note: ${rawEntry.notes || 'Nessuna'}`);
      console.log(`🔧 Interventi raw: ${rawEntry.interventi}`);
      
      // Parse interventi
      let interventi = [];
      try {
        interventi = JSON.parse(rawEntry.interventi);
        console.log(`✅ Interventi parsed (${interventi.length}):`, interventi);
      } catch (e) {
        console.log(`❌ Errore parsing interventi:`, e.message);
        continue;
      }
      
      // Carica l'entry completa normalizzata
      const fullEntry = await dbService.getWorkEntryByDate(rawEntry.date);
      console.log(`📊 Entry completa caricata:`, {
        date: fullEntry.date,
        interventi: fullEntry.interventi,
        isStandbyDay: fullEntry.isStandbyDay,
        hasInterventi: Array.isArray(fullEntry.interventi) && fullEntry.interventi.length > 0
      });
      
      // Calcola le ore di lavoro standby usando il metodo del servizio
      const standbyWorkHours = calculationService.calculateStandbyWorkHours(fullEntry);
      console.log(`⏰ Ore lavoro standby calcolate: ${standbyWorkHours}`);
      
      // Simula calcolo dettagliato per reperibilità
      if (standbyWorkHours > 0) {
        console.log(`\n🧮 CALCOLO DETTAGLIATO REPERIBILITÀ:`);
        
        // Settings mock per il test
        const mockSettings = {
          standbySettings: {
            enabled: true,
            allowanceType: '24h',
            saturdayAsRest: false,
            customFeriale16: null,
            customFeriale24: null,
            customFestivo: null
          },
          travelSettings: {
            compensationRate: 1.0
          }
        };
        
        try {
          const standbyBreakdown = calculationService.calculateStandbyWorkBreakdown(
            fullEntry, 
            mockSettings.standbySettings, 
            16.41081 // hourly rate CCNL
          );
          
          console.log(`📈 Breakdown reperibilità:`, standbyBreakdown);
          
          // Calcolo earnings totale per il giorno
          const dailyCalculation = calculationService.calculateDailyEarnings(
            fullEntry,
            mockSettings
          );
          
          console.log(`💰 Calcolo giornaliero completo:`, {
            date: dailyCalculation.date,
            totalEarnings: dailyCalculation.totalEarnings,
            standbyWorkHours: dailyCalculation.standbyWorkHours,
            standbyWorkPay: dailyCalculation.standbyWorkPay,
            standbyAllowance: dailyCalculation.standbyAllowance,
            breakdown: dailyCalculation.breakdown
          });
          
        } catch (error) {
          console.log(`❌ Errore nel calcolo:`, error.message);
          console.log(error.stack);
        }
      }
      
      console.log(`\n${'='.repeat(60)}\n`);
    }
    
    console.log('\n✅ Debug interventi reperibilità completato\n');
    
  } catch (error) {
    console.error('\n❌ Errore durante il debug:', error);
    console.error(error.stack);
  }
};

// Esegui il debug
debugInterventiReperibilita();
