// 🚨 SCRIPT EMERGENZA FINALE: Stop completo backup automatici
// Cancella tutto e disabilita backup per fermare loop

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

console.log('🚨 === STOP EMERGENZA BACKUP FINALE ===');

async function emergencyFullStop() {
  try {
    console.log('1. 🗑️ Cancellando TUTTE le notifiche...');
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    console.log('2. 🛑 Disabilitando tutti i backup automatici...');
    await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(false));
    await AsyncStorage.setItem('super_backup_enabled', JSON.stringify(false));
    
    console.log('3. 🔄 Resettando tutti i timestamp...');
    await AsyncStorage.setItem('last_backup_schedule_time', Date.now().toString());
    await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
    await AsyncStorage.setItem('last_backup_trigger_time', '0');
    
    console.log('4. 🧹 Pulendo chiavi di stato...');
    const keysToRemove = [
      'backup_in_progress',
      'backup_recovery_check',
      'backup_notification_scheduled',
      'last_backup_check'
    ];
    
    for (const key of keysToRemove) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.log(`⚠️ Chiave ${key} non trovata, saltando...`);
      }
    }
    
    console.log('5. 📊 Verifica finale...');
    const remaining = await Notifications.getAllScheduledNotificationsAsync();
    const enabled = await AsyncStorage.getItem('auto_backup_enabled');
    
    console.log(`📊 Notifiche rimanenti: ${remaining.length}`);
    console.log(`📊 Backup automatico: ${enabled}`);
    
    if (remaining.length === 0 && enabled === 'false') {
      console.log('✅ === EMERGENZA COMPLETATA CON SUCCESSO ===');
      console.log('🔧 Tutti i backup automatici sono fermati');
      console.log('📱 Riavvia l\'app per confermare che il loop è fermato');
      console.log('⚙️ Puoi riattivare il backup dalle impostazioni quando necessario');
      return true;
    } else {
      console.log('⚠️ Potrebbero esserci ancora elementi attivi');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Errore durante stop emergenza:', error);
    return false;
  }
}

// Esegui immediatamente
emergencyFullStop();

export default emergencyFullStop;
