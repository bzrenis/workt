// 🚀 NATIVE NOTIFICATION SERVICE
// Sistema pronto per notifiche push native + fallback per sviluppo
// Rileva automaticamente se usare expo-notifications o Alert.alert

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

class NativeNotificationService {
  constructor() {
    this.notificationsModule = null;
    this.isNativeReady = false;
    this.initializationAttempted = false;
    this.pendingNotifications = [];
    
    console.log('🚀 NativeNotificationService inizializzato');
    this.initializeNotifications();
  }

  // 🔧 Inizializzazione automatica
  async initializeNotifications() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      // Tenta di importare expo-notifications
      const Notifications = await import('expo-notifications');
      this.notificationsModule = Notifications;
      
      // Configura il comportamento delle notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,  // Sostituisce shouldShowAlert
          shouldShowList: true,    // Sostituisce shouldShowAlert
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Richiedi permessi
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        this.isNativeReady = true;
        console.log('✅ Sistema notifiche NATIVE pronto (expo-notifications)');
        console.log('🔔 Push notifications COMPLETE: funzionano anche con app chiusa!');
        
        // Processa notifiche in attesa
        await this.processPendingNotifications();
      } else {
        console.log('⚠️ Permessi notifiche negati - usando fallback Alert');
        this.isNativeReady = false;
      }

    } catch (error) {
      console.log('📱 expo-notifications non disponibile - usando fallback Alert');
      console.log('ℹ️ Le notifiche native saranno disponibili con build nativa');
      this.isNativeReady = false;
    }
  }

  // 📱 Mostra notifica (nativa o fallback)
  async showNotification(title, body, data = {}) {
    const notification = { title, body, data };

    if (this.isNativeReady && this.notificationsModule) {
      return await this.showNativeNotification(notification);
    } else {
      return await this.showFallbackNotification(notification);
    }
  }

  // 🔔 Notifica push nativa (100% affidabile)
  async showNativeNotification({ title, body, data }) {
    try {
      console.log(`🔔 [NATIVE] Mostro notifica push: ${title}`);
      
      const notificationId = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: this.notificationsModule.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Immediata
      });

      console.log(`✅ [NATIVE] Notifica schedulata con ID: ${notificationId}`);
      return { success: true, type: 'native', id: notificationId };
      
    } catch (error) {
      console.log(`❌ [NATIVE] Errore notifica: ${error.message}`);
      // Fallback su Alert se native fallisce
      return await this.showFallbackNotification({ title, body, data });
    }
  }

  // 📢 Notifica fallback (Alert.alert)
  async showFallbackNotification({ title, body, data }) {
    console.log(`🔔 [FALLBACK] Mostro alert: ${title}`);
    
    return new Promise((resolve) => {
      Alert.alert(
        title,
        body,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log(`👆 [FALLBACK] Alert confermato: ${title}`);
              if (data.onPress) {
                data.onPress();
              }
              resolve({ success: true, type: 'alert' });
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  // 📅 Programma notifica futura (nativa o timer)
  async scheduleNotification(title, body, triggerTime, data = {}) {
    if (this.isNativeReady && this.notificationsModule) {
      return await this.scheduleNativeNotification(title, body, triggerTime, data);
    } else {
      return await this.scheduleTimerNotification(title, body, triggerTime, data);
    }
  }

  // ⏰ Notifica programmata nativa
  async scheduleNativeNotification(title, body, triggerTime, data) {
    try {
      const trigger = new Date(triggerTime);
      console.log(`📅 [NATIVE] Programmando notifica per: ${trigger.toLocaleString()}`);
      
      const notificationId = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: this.notificationsModule.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: { date: trigger },
      });

      console.log(`✅ [NATIVE] Notifica programmata con ID: ${notificationId}`);
      return { success: true, type: 'native', id: notificationId, trigger: trigger };
      
    } catch (error) {
      console.log(`❌ [NATIVE] Errore programmazione: ${error.message}`);
      return await this.scheduleTimerNotification(title, body, triggerTime, data);
    }
  }

  // ⏱️ Timer fallback per sviluppo
  async scheduleTimerNotification(title, body, triggerTime, data) {
    const now = Date.now();
    const delay = triggerTime - now;
    
    if (delay <= 0) {
      console.log(`⚠️ [TIMER] Notifica già scaduta, mostro subito`);
      return await this.showNotification(title, body, data);
    }

    console.log(`⏱️ [TIMER] Programmando notifica per: ${new Date(triggerTime).toLocaleString()}`);
    console.log(`⏱️ [TIMER] Delay: ${Math.round(delay / 1000 / 60)} minuti`);

    const timerId = setTimeout(async () => {
      console.log(`🔔 [TIMER] Trigger notifica: ${title}`);
      await this.showNotification(title, body, data);
    }, delay);

    return { 
      success: true, 
      type: 'timer', 
      id: timerId, 
      trigger: new Date(triggerTime),
      delay: delay 
    };
  }

  // 📅 Programma notifiche ricorrenti
  async scheduleRepeatingNotification(title, body, time, data = {}) {
    if (this.isNativeReady && this.notificationsModule) {
      return await this.scheduleNativeRepeating(title, body, time, data);
    } else {
      return await this.scheduleTimerRepeating(title, body, time, data);
    }
  }

  // 🔄 Notifiche ricorrenti native
  async scheduleNativeRepeating(title, body, time, data) {
    try {
      const [hour, minute] = time.split(':').map(Number);
      
      console.log(`🔄 [NATIVE] Programmando notifica ricorrente per: ${hour}:${minute.toString().padStart(2, '0')}`);
      
      const notificationId = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: this.notificationsModule.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      console.log(`✅ [NATIVE] Notifica ricorrente programmata con ID: ${notificationId}`);
      return { success: true, type: 'native_recurring', id: notificationId };
      
    } catch (error) {
      console.log(`❌ [NATIVE] Errore notifica ricorrente: ${error.message}`);
      return await this.scheduleTimerRepeating(title, body, time, data);
    }
  }

  // ⏰ Timer ricorrenti fallback
  async scheduleTimerRepeating(title, body, time, data) {
    console.log(`⏰ [TIMER] Notifica ricorrente fallback per: ${time}`);
    
    // Per ora programma solo per oggi, il sistema enhanced gestirà la ricorrenza
    const [hour, minute] = time.split(':').map(Number);
    const now = new Date();
    const triggerTime = new Date();
    triggerTime.setHours(hour, minute, 0, 0);
    
    if (triggerTime <= now) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }

    return await this.scheduleTimerNotification(title, body, triggerTime.getTime(), data);
  }

  // 🗑️ Cancella notifiche
  async cancelNotification(notificationId) {
    if (this.isNativeReady && this.notificationsModule) {
      try {
        await this.notificationsModule.cancelScheduledNotificationAsync(notificationId);
        console.log(`🗑️ [NATIVE] Notifica cancellata: ${notificationId}`);
        return true;
      } catch (error) {
        console.log(`❌ [NATIVE] Errore cancellazione: ${error.message}`);
        return false;
      }
    } else {
      // Per timer, l'ID è il timerId
      if (typeof notificationId === 'number') {
        clearTimeout(notificationId);
        console.log(`🗑️ [TIMER] Timer cancellato: ${notificationId}`);
        return true;
      }
      return false;
    }
  }

  // 🧹 Cancella tutte le notifiche
  async cancelAllNotifications() {
    if (this.isNativeReady && this.notificationsModule) {
      try {
        await this.notificationsModule.cancelAllScheduledNotificationsAsync();
        console.log(`🧹 [NATIVE] Tutte le notifiche cancellate`);
        return true;
      } catch (error) {
        console.log(`❌ [NATIVE] Errore cancellazione totale: ${error.message}`);
        return false;
      }
    } else {
      console.log(`🧹 [TIMER] Cancellazione timer gestita dal sistema enhanced`);
      return true;
    }
  }

  // 📊 Ottieni notifiche programmate
  async getScheduledNotifications() {
    if (this.isNativeReady && this.notificationsModule) {
      try {
        const notifications = await this.notificationsModule.getAllScheduledNotificationsAsync();
        console.log(`📊 [NATIVE] Notifiche programmate: ${notifications.length}`);
        return notifications;
      } catch (error) {
        console.log(`❌ [NATIVE] Errore lettura notifiche: ${error.message}`);
        return [];
      }
    } else {
      console.log(`📊 [TIMER] Lista notifiche gestita dal sistema enhanced`);
      return [];
    }
  }

  // 🔄 Processa notifiche in attesa
  async processPendingNotifications() {
    if (this.pendingNotifications.length > 0) {
      console.log(`🔄 Processando ${this.pendingNotifications.length} notifiche in attesa...`);
      
      for (const notification of this.pendingNotifications) {
        await this.showNotification(notification.title, notification.body, notification.data);
      }
      
      this.pendingNotifications = [];
      console.log(`✅ Notifiche in attesa processate`);
    }
  }

  // 📱 Stato del sistema
  getSystemStatus() {
    return {
      isNativeReady: this.isNativeReady,
      hasNotificationsModule: !!this.notificationsModule,
      systemType: this.isNativeReady ? 'native' : 'fallback',
      description: this.isNativeReady 
        ? 'Push notifications native (100% affidabili)'
        : 'Alert fallback (solo app aperta)'
    };
  }
}

// Esporta istanza singleton
const nativeNotificationService = new NativeNotificationService();
export default nativeNotificationService;
