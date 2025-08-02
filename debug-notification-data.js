// Debug per verificare i dati delle notifiche
import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugNotificationData = async () => {
  try {
    console.log('🔍 === DEBUG NOTIFICATION DATA ===');
    
    // Leggi i dati delle notifiche
    const notificationData = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
    if (notificationData) {
      const parsed = JSON.parse(notificationData);
      console.log('📱 Dati notifiche completi:', JSON.stringify(parsed, null, 2));
      
      // Controlla specificamente standby
      if (parsed.standbyReminder) {
        console.log('🔍 standbyReminder:', JSON.stringify(parsed.standbyReminder, null, 2));
      }
      if (parsed.standbyReminders) {
        console.log('🔍 standbyReminders:', JSON.stringify(parsed.standbyReminders, null, 2));
      }
      
      // Controlla se ci sono dati corrotti
      const standbyData = parsed.standbyReminder || parsed.standbyReminders;
      if (standbyData && standbyData.notifications && Array.isArray(standbyData.notifications)) {
        console.log('📋 Notifiche standby:');
        standbyData.notifications.forEach((notif, index) => {
          console.log(`  [${index}]:`, JSON.stringify(notif, null, 2));
          
          // Controlla errori comuni
          if (notif.messsage) {
            console.warn(`⚠️ Typo trovato: "messsage" invece di "message" in notifica ${index}`);
          }
          if (!notif.time || typeof notif.time !== 'string') {
            console.warn(`⚠️ Tempo non valido in notifica ${index}:`, notif.time);
          }
        });
      }
    } else {
      console.log('❌ Nessun dato di notifica trovato');
    }
    
    // Verifica anche altri storage keys correlati
    const allKeys = await AsyncStorage.getAllKeys();
    const relevantKeys = allKeys.filter(key => 
      key.includes('NOTIFICATION') || 
      key.includes('STANDBY') || 
      key.includes('REMINDER')
    );
    
    console.log('🔑 Chiavi storage correlate:', relevantKeys);
    
    for (const key of relevantKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`📦 ${key}:`, value ? JSON.parse(value) : null);
    }
    
  } catch (error) {
    console.error('❌ Errore nel debug:', error);
  }
};

// Funzione per pulire dati corrotti
export const cleanCorruptedNotificationData = async () => {
  try {
    console.log('🧹 === PULIZIA DATI CORROTTI ===');
    
    const notificationData = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
    if (notificationData) {
      const parsed = JSON.parse(notificationData);
      let needsUpdate = false;
      
      // Pulisce i dati di standby
      if (parsed.standbyReminder || parsed.standbyReminders) {
        const standbyData = parsed.standbyReminder || parsed.standbyReminders;
        
        if (standbyData.notifications && Array.isArray(standbyData.notifications)) {
          standbyData.notifications = standbyData.notifications.map(notif => {
            let cleanedNotif = { ...notif };
            
            // Correggi il typo messsage -> message
            if (cleanedNotif.messsage && !cleanedNotif.message) {
              cleanedNotif.message = cleanedNotif.messsage;
              delete cleanedNotif.messsage;
              needsUpdate = true;
              console.log('✅ Corretto typo "messsage" -> "message"');
            }
            
            // Assicurati che il tempo sia una stringa valida
            if (!cleanedNotif.time || typeof cleanedNotif.time !== 'string') {
              cleanedNotif.time = '08:00';
              needsUpdate = true;
              console.log('✅ Corretto tempo non valido -> "08:00"');
            }
            
            // Assicurati che enabled sia boolean
            if (typeof cleanedNotif.enabled !== 'boolean') {
              cleanedNotif.enabled = true;
              needsUpdate = true;
              console.log('✅ Corretto enabled non valido -> true');
            }
            
            // Assicurati che daysInAdvance sia numero
            if (typeof cleanedNotif.daysInAdvance !== 'number') {
              cleanedNotif.daysInAdvance = 0;
              needsUpdate = true;
              console.log('✅ Corretto daysInAdvance non valido -> 0');
            }
            
            return cleanedNotif;
          });
          
          // Aggiorna i dati puliti
          if (parsed.standbyReminder) {
            parsed.standbyReminder.notifications = standbyData.notifications;
          }
          if (parsed.standbyReminders) {
            parsed.standbyReminders.notifications = standbyData.notifications;
          }
        }
      }
      
      if (needsUpdate) {
        await AsyncStorage.setItem('NOTIFICATION_SETTINGS', JSON.stringify(parsed));
        console.log('✅ Dati delle notifiche puliti e salvati');
        return true;
      } else {
        console.log('ℹ️ Nessun dato corrotto trovato');
        return false;
      }
    } else {
      console.log('❌ Nessun dato di notifica da pulire');
      return false;
    }
  } catch (error) {
    console.error('❌ Errore nella pulizia:', error);
    return false;
  }
};
