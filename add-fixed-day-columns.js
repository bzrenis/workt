const sqlite = require('expo-sqlite');

// Script per aggiungere le nuove colonne per i giorni fissi alla tabella work_entries
async function addFixedDayColumns() {
  try {
    const db = await sqlite.openDatabaseAsync('WorkTimeDB.db');
    
    console.log('🔧 Aggiunta colonne per giorni fissi (ferie/malattia/riposo)...');
    
    // Verifica se le colonne esistono già
    const checkColumn = async (columnName) => {
      try {
        const columns = await db.getAllAsync(`PRAGMA table_info(work_entries)`);
        return columns.some(col => col.name === columnName);
      } catch (error) {
        console.error(`Errore verifica colonna ${columnName}:`, error);
        return false;
      }
    };
    
    // Aggiungi colonna is_fixed_day se non esiste
    const hasIsFixedDay = await checkColumn('is_fixed_day');
    if (!hasIsFixedDay) {
      await db.runAsync(`
        ALTER TABLE work_entries 
        ADD COLUMN is_fixed_day INTEGER DEFAULT 0
      `);
      console.log('✅ Colonna is_fixed_day aggiunta con successo');
    } else {
      console.log('ℹ️ Colonna is_fixed_day già esistente');
    }
    
    // Aggiungi colonna fixed_earnings se non esiste
    const hasFixedEarnings = await checkColumn('fixed_earnings');
    if (!hasFixedEarnings) {
      await db.runAsync(`
        ALTER TABLE work_entries 
        ADD COLUMN fixed_earnings REAL DEFAULT 0
      `);
      console.log('✅ Colonna fixed_earnings aggiunta con successo');
    } else {
      console.log('ℹ️ Colonna fixed_earnings già esistente');
    }
    
    // Verifica il risultato
    const columns = await db.getAllAsync(`PRAGMA table_info(work_entries)`);
    console.log('\n📋 Struttura tabella work_entries aggiornata:');
    columns.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.name} (${col.type})`);
    });
    
    await db.closeAsync();
    console.log('\n🎉 Aggiornamento database completato!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento del database:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  addFixedDayColumns();
}

module.exports = { addFixedDayColumns };
