import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SISTEMA NOTIFICHE SEMPLIFICATO E FUNZIONANTE
class NotificationService {
  constructor() {
    this.setupBasicHandler();
    this.setupBasicListeners();
  }

  // Handler SEMPLICE - senza filtri complessi
  setupBasicHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        console.log('📱 Notifica ricevuta:', notification.request.identifier, data?.type);
        
        // Mostra SEMPRE le notifiche (senza filtri che possono causare problemi)
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });
  }

  // Listener BASICI
  setupBasicListeners() {
    // Listener per notifiche ricevute
    Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      console.log('📬 Notifica mostrata:', notification.request.identifier);
      console.log(`   Tipo: ${data?.type || 'N/A'}`);
      
      // Log timing semplice
      if (data?.programmedAt) {
        const programmedTime = new Date(data.programmedAt);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - programmedTime.getTime()) / (1000 * 60));
        console.log(`   ⏰ Ritardo: ${diffMinutes} minuti dalla programmazione`);
        
        if (data?.expectedDelay) {
          const expectedMinutes = Math.floor(data.expectedDelay / 60);
          if (Math.abs(diffMinutes - expectedMinutes) <= 1) {
            console.log(`   ✅ TIMING CORRETTO: atteso ${expectedMinutes}min, ricevuto dopo ${diffMinutes}min`);
          } else {
            console.log(`   ❌ TIMING ERRATO: atteso ${expectedMinutes}min, ricevuto dopo ${diffMinutes}min`);
          }
        }
      }
    });

    // Listener per click
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Notifica cliccata:', data?.type || 'N/A');
    });
  }

  // Richiesta permessi SEMPLICE
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      console.log(`📱 Permessi notifiche: ${status}`);
      return status === 'granted';
    } catch (error) {
      console.error('❌ Errore richiesta permessi:', error);
      return false;
    }
  }

  // Controlla permessi
  async hasPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Programmazione SEMPLICE di una notifica
  async scheduleSimpleNotification(title, body, delaySeconds, data = {}) {
    try {
      if (delaySeconds < 1) {
        console.warn('⚠️ Delay troppo piccolo, minimo 1 secondo');
        delaySeconds = 1;
      }

      const programmedAt = new Date();
      const notificationRequest = {
        content: {
          title,
          body,
          sound: 'default',
          data: {
            ...data,
            programmedAt: programmedAt.toISOString(),
            expectedDelay: delaySeconds,
            simpleScheduling: true
          }
        },
        trigger: {
          seconds: delaySeconds
        }
      };

      console.log(`📅 Programmando notifica semplice:`);
      console.log(`   Titolo: ${title}`);
      console.log(`   Delay: ${delaySeconds} secondi`);
      console.log(`   Trigger: ${JSON.stringify(notificationRequest.trigger)}`);

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      console.log(`✅ Notifica programmata con ID: ${notificationId}`);
      
      return {
        success: true,
        notificationId,
        scheduledFor: new Date(Date.now() + delaySeconds * 1000).toISOString()
      };

    } catch (error) {
      console.error('❌ Errore programmazione notifica semplice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test BASE del sistema
  async testBasicSystem() {
    try {
      console.log('🧪 === TEST SISTEMA BASE ===');
      
      // 1. Verifica permessi
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return { success: false, reason: 'Permessi non concessi' };
        }
      }

      // 2. Cancella notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Notifiche esistenti cancellate');

      // 3. Programma test semplice
      const result = await this.scheduleSimpleNotification(
        '🧪 Test Sistema Base',
        'Se vedi questa notifica tra 30 secondi, il sistema funziona!',
        30,
        { type: 'system_test' }
      );

      if (result.success) {
        console.log('✅ Test programmato con successo');
        
        // 4. Verifica programmazione
        setTimeout(async () => {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          console.log(`🔍 Verifica: ${scheduled.length} notifiche programmate`);
        }, 2000);
        
        return { success: true, message: 'Test programmato' };
      } else {
        return { success: false, reason: result.error };
      }

    } catch (error) {
      console.error('❌ Errore test sistema base:', error);
      return { success: false, reason: error.message };
    }
  }

  // Ottieni notifiche programmate
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📅 Notifiche programmate: ${notifications.length}`);
      return notifications;
    } catch (error) {
      console.error('❌ Errore ottenimento notifiche:', error);
      return [];
    }
  }

  // Cancella tutte le notifiche
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Tutte le notifiche cancellate');
      return true;
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
      return false;
    }
  }

  // Test di più trigger per trovare quello funzionante
  async testMultipleTriggers() {
    try {
      console.log('🧪 === TEST TRIGGER MULTIPLI ===');
      
      await this.cancelAllNotifications();
      
      const tests = [
        { name: 'seconds_10', trigger: { seconds: 10 }, expected: '10 secondi' },
        { name: 'seconds_30', trigger: { seconds: 30 }, expected: '30 secondi' },
        { name: 'seconds_60', trigger: { seconds: 60 }, expected: '1 minuto' }
      ];

      const results = [];

      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        try {
          console.log(`🧪 Test ${i + 1}: ${test.name} (${test.expected})`);
          
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🧪 Test ${i + 1}: ${test.name}`,
              body: `Dovrebbe arrivare tra ${test.expected}`,
              data: {
                type: 'trigger_test',
                testName: test.name,
                programmedAt: new Date().toISOString(),
                expectedDelay: test.trigger.seconds
              }
            },
            trigger: test.trigger
          });

          results.push({
            testName: test.name,
            success: true,
            notificationId,
            expected: test.expected
          });

          console.log(`   ✅ Programmato: ${notificationId}`);

        } catch (error) {
          console.log(`   ❌ Errore: ${error.message}`);
          results.push({
            testName: test.name,
            success: false,
            error: error.message
          });
        }

        // Pausa tra i test
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verifica finale
      setTimeout(async () => {
        const scheduled = await this.getScheduledNotifications();
        console.log(`🔍 Verifica finale: ${scheduled.length} notifiche programmate`);
      }, 3000);

      return results;

    } catch (error) {
      console.error('❌ Errore test trigger multipli:', error);
      return [];
    }
  }
}

export default NotificationService;
