// 🚨 SCRIPT DI EMERGENZA: Ferma loop backup
// Eseguire questo script se ci sono troppi backup e notifiche

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

console.log('🚨 === STOP EMERGENZA BACKUP LOOP ===');

async function emergencyStopBackupLoop() {
  try {
    console.log('1. 🗑️ Cancellando TUTTE le notifiche programmate...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    console.log('2. 🛑 Disabilitando backup automatico...');
    await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(false));
    
    console.log('3. 🔄 Resettando timestamp per anti-spam...');
    await AsyncStorage.setItem('last_backup_schedule_time', Date.now().toString());
    await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
    
    console.log('4. 🧹 Verificando notifiche rimanenti...');
    const remaining = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Notifiche rimanenti: ${remaining.length}`);
    
    if (remaining.length > 0) {
      console.log('⚠️ Alcune notifiche ancora presenti:');
      remaining.forEach((n, i) => {
        console.log(`  ${i + 1}. ${n.content.title} - Tipo: ${n.content.data?.type}`);
      });
    }
    
    console.log('✅ === EMERGENZA BACKUP COMPLETATA ===');
    console.log('📱 Riavvia l\'app per confermare che il loop è fermato');
    console.log('🔧 Puoi riattivare il backup automatico dalle impostazioni');
    
    return true;
  } catch (error) {
    console.error('❌ Errore stop emergenza:', error);
    return false;
  }
}

// Esegui immediatamente se importato
emergencyStopBackupLoop();

export default emergencyStopBackupLoop;
