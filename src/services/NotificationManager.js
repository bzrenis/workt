import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Task per controllo notifiche in background
const NOTIFICATION_CHECK_TASK = 'notification-check-task';

// Registra il task per il background
TaskManager.defineTask(NOTIFICATION_CHECK_TASK, async () => {
  try {
    console.log('🔄 Background task: Controllo notifiche...');
    
    // Verifica se ci sono notifiche programmate
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📱 Background: ${scheduled.length} notifiche programmate`);
    
    // Se non ci sono notifiche ma dovrebbero esserci, ricarica
    if (scheduled.length === 0) {
      const settings = await getStoredSettings();
      if (settings && settings.enabled) {
        console.log('📱 Background: Ricaricando notifiche mancanti...');
        // Qui potresti richiamare il servizio per riprogrammare
      }
    }
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Funzione helper per ottenere settings
async function getStoredSettings() {
  try {
    const stored = await AsyncStorage.getItem('notification_settings');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Errore lettura settings:', error);
    return null;
  }
}

export class NotificationManager {
  static async initialize() {
    try {
      // Configura il gestore di notifiche per garantire che vengano mostrate
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('📱 Handling notification:', notification.request.identifier);
          
          // Per Android, assicurati che le notifiche siano sempre visibili
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            priority: Platform.OS === 'android' ? 'high' : 'normal',
          };
        },
      });

      // Registra il background task per controllo periodico
      if (Platform.OS === 'android') {
        try {
          await BackgroundFetch.registerTaskAsync(NOTIFICATION_CHECK_TASK, {
            minimumInterval: 30 * 60 * 1000, // 30 minuti
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('✅ Background task registrato per Android');
        } catch (error) {
          console.warn('⚠️ Impossibile registrare background task:', error);
        }
      }

      console.log('✅ NotificationManager inizializzato');
    } catch (error) {
      console.error('❌ Errore inizializzazione NotificationManager:', error);
    }
  }

  // Programma una notifica con retry automatico
  static async scheduleNotificationWithRetry(identifier, content, trigger, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            ...content,
            data: {
              ...content.data,
              attempt,
              persistent: true,
            }
          },
          trigger
        });

        console.log(`📱 ✅ Notifica programmata (tentativo ${attempt}): ${identifier}`);
        return id;
      } catch (error) {
        console.error(`❌ Tentativo ${attempt} fallito per ${identifier}:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Impossibile programmare notifica dopo ${maxRetries} tentativi`);
        }
        
        // Attesa prima del prossimo tentativo
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // Verifica stato notifiche programmate
  static async checkScheduledNotifications() {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📱 Notifiche programmate: ${scheduled.length}`);
      
      // Log dettagliato per debug
      scheduled.forEach(notification => {
        const trigger = notification.trigger;
        const date = trigger.type === 'date' ? new Date(trigger.value) : 'N/A';
        console.log(`- ${notification.identifier}: ${date}`);
      });
      
      return scheduled;
    } catch (error) {
      console.error('❌ Errore controllo notifiche:', error);
      return [];
    }
  }

  // Forza riavvio delle notifiche
  static async restartNotifications() {
    try {
      console.log('🔄 Riavvio notifiche...');
      
      // Cancella tutte le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Ricarica le impostazioni e riprogramma
      const settings = await getStoredSettings();
      if (settings && settings.enabled) {
        // Qui dovresti richiamare il tuo servizio di notifiche
        console.log('📱 Riprogrammando notifiche...');
        // NotificationService.scheduleNotifications(settings);
      }
      
      console.log('✅ Notifiche riavviate');
    } catch (error) {
      console.error('❌ Errore riavvio notifiche:', error);
    }
  }
}

export default NotificationManager;
