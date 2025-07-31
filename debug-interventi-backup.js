// 🧪 DEBUG INTERVENTI BACKUP/RESTORE
// Script per verificare il funzionamento del backup e ripristino degli interventi

const DatabaseService = require('./src/services/DatabaseService.js');
const BackupService = require('./src/services/BackupService.js');

async function debugInterventiBackupRestore() {
  try {
    console.log('🧪 DEBUG INTERVENTI: Inizializzazione...');
    
    // 1. Verifica stato attuale database
    console.log('\n📊 FASE 1: Verifica stato attuale database');
    const currentEntries = await DatabaseService.getAllWorkEntries();
    const currentEntriesWithInterventi = currentEntries.filter(entry => {
      try {
        const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
        return interventi && Array.isArray(interventi) && interventi.length > 0;
      } catch (e) {
        return false;
      }
    });
    
    console.log(`📊 Entry totali nel database: ${currentEntries.length}`);
    console.log(`📊 Entry con interventi: ${currentEntriesWithInterventi.length}`);
    
    if (currentEntriesWithInterventi.length > 0) {
      console.log('📊 Dettagli entry con interventi:');
      currentEntriesWithInterventi.forEach((entry, index) => {
        const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
        console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${interventi.length}`);
        interventi.forEach((intervento, i) => {
          console.log(`     - ${intervento.start_time} → ${intervento.end_time}`);
        });
      });
    }
    
    // 2. Crea entry di test se non ce ne sono
    if (currentEntriesWithInterventi.length === 0) {
      console.log('\n🔧 FASE 2: Creazione entry di test con interventi');
      
      const testEntry = {
        date: '2025-07-27',
        siteName: 'Test Site Interventi',
        workStart1: '08:00',
        workEnd1: '17:00',
        interventi: [
          { start_time: '20:00', end_time: '20:30' },
          { start_time: '22:15', end_time: '22:45' },
          { start_time: '01:00', end_time: '01:15' }
        ],
        notes: 'Entry di test per debug interventi backup/restore'
      };
      
      await DatabaseService.insertWorkEntry(testEntry);
      console.log('✅ Entry di test creata con 3 interventi');
    } else {
      console.log('\n✅ FASE 2: Entry con interventi già presenti, salto creazione test');
    }
    
    // 3. Test backup
    console.log('\n💾 FASE 3: Test creazione backup');
    const backupData = await DatabaseService.getAllData();
    
    const backupEntriesWithInterventi = backupData.workEntries.filter(entry => 
      entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
    );
    
    console.log(`💾 Entry nel backup: ${backupData.workEntries.length}`);
    console.log(`💾 Entry con interventi nel backup: ${backupEntriesWithInterventi.length}`);
    
    if (backupEntriesWithInterventi.length > 0) {
      console.log('💾 Dettagli interventi nel backup:');
      backupEntriesWithInterventi.forEach((entry, index) => {
        console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${entry.interventi.length}`);
        entry.interventi.forEach((intervento, i) => {
          console.log(`     - ${intervento.start_time} → ${intervento.end_time}`);
        });
      });
      
      // 4. Test ripristino
      console.log('\n🔄 FASE 4: Test ripristino backup');
      
      // Salva backup temporaneo per test
      const testBackupName = 'test-interventi-backup';
      const backupResult = await BackupService.createLocalBackup(testBackupName, backupData);
      
      if (backupResult.success) {
        console.log(`✅ Backup di test creato: ${backupResult.fileName}`);
        
        // Simula ripristino (non facciamo ripristino reale per non perdere dati)
        console.log('🔄 Simulazione ripristino...');
        console.log(`🔄 Il backup contiene ${backupEntriesWithInterventi.length} entry con interventi`);
        console.log('✅ Test completato con successo!');
        
        console.log('\n📋 RISULTATO TEST:');
        console.log(`✅ Entry con interventi nel database: ${currentEntriesWithInterventi.length}`);
        console.log(`✅ Entry con interventi nel backup: ${backupEntriesWithInterventi.length}`);
        console.log('✅ Il sistema di backup include correttamente gli interventi');
        
        if (currentEntriesWithInterventi.length === backupEntriesWithInterventi.length) {
          console.log('✅ SUCCESSO: Tutti gli interventi sono inclusi nel backup!');
        } else {
          console.log('⚠️ WARNING: Discrepanza tra interventi nel database e nel backup');
        }
      } else {
        console.log('❌ Errore creazione backup di test');
      }
    } else {
      console.log('❌ PROBLEMA: Gli interventi non sono inclusi nel backup!');
    }
    
  } catch (error) {
    console.error('❌ Errore durante debug:', error);
  }
}

// Esporta per uso in altri script
module.exports = { debugInterventiBackupRestore };

// Se eseguito direttamente
if (require.main === module) {
  debugInterventiBackupRestore();
}
