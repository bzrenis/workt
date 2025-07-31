// 🚨 SCRIPT DI EMERGENZA - FERMA LOOP BACKUP
// Da eseguire IMMEDIATAMENTE nell'app per fermare il loop di backup

import NativeBackupService from './src/services/NativeBackupService';

async function emergencyStopBackupLoop() {
  console.log('🚨 === EMERGENZA: FERMANDO LOOP BACKUP ===');
  
  try {
    // 1. Ferma tutte le notifiche backup
    const stopped = await NativeBackupService.emergencyStopAllBackupNotifications();
    
    if (stopped) {
      console.log('✅ Tutte le notifiche backup sono state cancellate');
      console.log('✅ Backup automatico temporaneamente disabilitato');
      console.log('✅ Loop fermato con successo');
    } else {
      console.log('⚠️ Problema nel fermare le notifiche');
    }
    
    // 2. Verifica stato
    const backupSettings = await NativeBackupService.getBackupSettings();
    console.log('📊 Stato attuale backup:', backupSettings);
    
    // 3. Informazioni per il riavvio
    console.log('\n📋 PROSSIMI PASSI:');
    console.log('1. Il backup automatico è ora DISABILITATO');
    console.log('2. Per riattivarlo vai nelle Impostazioni > Backup');
    console.log('3. Imposta un nuovo orario e riattiva');
    console.log('4. Il sistema ora ha protezione anti-loop');
    
  } catch (error) {
    console.error('❌ ERRORE NELLO STOP DI EMERGENZA:', error);
    console.log('\n🔧 AZIONI MANUALI:');
    console.log('1. Vai nelle Impostazioni app');
    console.log('2. Disabilita manualmente le notifiche backup');
    console.log('3. Riavvia completamente l\'app');
  }
  
  console.log('\n🏁 === OPERAZIONE EMERGENZA COMPLETATA ===');
}

// Esegui immediatamente
emergencyStopBackupLoop();
