// 🚀 NOTIFICATION SERVICE SEMPLIFICATO
// Utilizza expo-notifications per Expo e fallback JavaScript per casi edge
// Progettato per funzionare sia in ambiente Expo che nativo

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import DatabaseService from './DatabaseService';

// Nome del task in background per il controllo delle notifiche
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Definizione del task in background (deve essere a livello di modulo)
if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    try {
      // Recupera notifiche da verificare
      const pendingNotifications = await AsyncStorage.getItem('pendingNotifications');
      if (pendingNotifications) {
        const notifications = JSON.parse(pendingNotifications);
        const now = Date.now();
        
        // Verifica notifiche da mostrare
        let triggered = false;
        for (const notification of notifications) {
          if (notification.scheduledTime <= now && !notification.shown) {
            // Mostra notifica utilizzando expo-notifications
            await Notifications.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.body,
                data: notification.data || {},
              },
              trigger: null, // Immediata
            });
            
            triggered = true;
            notification.shown = true;
          }
        }
        
        // Salva stato aggiornato
        await AsyncStorage.setItem('pendingNotifications', JSON.stringify(notifications));
        
        return triggered ? BackgroundFetch.BackgroundFetchResult.NewData
                         : BackgroundFetch.BackgroundFetchResult.NoData;
      }
      return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
      console.error('Errore in background task:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

class FixedNotificationService {
  constructor() {
    this.appState = AppState.currentState;
    this.initialized = false;
    this.hasPermission = false;
    this.scheduledNotifications = new Map();
    this.pendingNotificationsForStorage = [];
    
    // Verifica disponibilità API
    this.isNotificationsAvailable = this.checkNotificationsAvailability();
    if (!this.isNotificationsAvailable) {
      console.warn('⚠️ API Notifications non disponibili. Verranno utilizzati solo Alert.');
    }
    
    // Configura listener per cambio stato app
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Pulisci le notifiche gestite vecchie ogni giorno
    this.startNotificationCleanup();
    
    console.log('🚀 FixedNotificationService inizializzato');
  }
  
  // Verifica disponibilità API Notifications
  checkNotificationsAvailability() {
    try {
      return typeof Notifications !== 'undefined' && 
             Notifications !== null && 
             typeof Notifications.setNotificationHandler === 'function';
    } catch (error) {
      console.error('❌ Errore verifica disponibilità Notifications:', error);
      return false;
    }
  }
  
  // Avvia pulizia periodica delle notifiche gestite
  startNotificationCleanup() {
    setInterval(async () => {
      try {
        await this.cleanupHandledNotifications();
      } catch (error) {
        console.error('❌ Errore pulizia notifiche gestite:', error);
      }
    }, 24 * 60 * 60 * 1000); // Pulisci ogni 24 ore
  }
  
  // Pulisci le notifiche gestite vecchie (mantieni solo ultime 7 giorni)
  async cleanupHandledNotifications() {
    try {
      const handledNotifications = await this.getHandledNotifications();
      if (handledNotifications.length > 50) {
        // Mantieni solo le ultime 50 notifiche gestite
        const trimmedNotifications = handledNotifications.slice(-50);
        await AsyncStorage.setItem('handledNotifications', JSON.stringify(trimmedNotifications));
        console.log(`🧹 Pulite ${handledNotifications.length - trimmedNotifications.length} notifiche gestite vecchie`);
      }
    } catch (error) {
      console.error('❌ Errore pulizia notifiche gestite:', error);
    }
  }
  
  // Pulisci completamente lo storage delle notifiche gestite
  async clearHandledNotifications() {
    try {
      await AsyncStorage.setItem('handledNotifications', JSON.stringify([]));
      console.log('🧹 Storage notifiche gestite pulito');
      return true;
    } catch (error) {
      console.error('❌ Errore pulizia storage notifiche gestite:', error);
      return false;
    }
  }
  
  // Gestisce cambio stato app
  handleAppStateChange(nextAppState) {
    console.log(`🔄 App state: ${this.appState} → ${nextAppState}`);
    
    if (this.appState === 'background' && nextAppState === 'active') {
      // L'app è tornata in primo piano, verifica notifiche perse
      this.checkMissedNotifications();
      
      // Cancella notifiche visibili che potrebbero essere già state gestite
      if (this.isNotificationsAvailable) {
        Notifications.dismissAllNotificationsAsync().catch(err => {
          console.error('Errore cancellazione notifiche visibili:', err);
        });
      }
    } else if (this.appState === 'active' && nextAppState === 'background') {
      // L'app sta andando in background, salva qualsiasi modifica
      this.savePendingNotifications().catch(err => {
        console.error('Errore salvataggio notifiche pendenti:', err);
      });
    }
    
    this.appState = nextAppState;
  }
  
  // Inizializza il servizio di notifiche
  async initialize() {
    if (this.initialized) return true;
    
    try {
      console.log('🔄 Inizializzazione sistema notifiche - pulizia iniziale...');
      
      // Verifica disponibilità API
      if (!this.isNotificationsAvailable) {
        console.warn('⚠️ API Notifications non disponibili. Inizializzazione in modalità fallback.');
        this.initialized = true;
        return true;
      }
      
      // Pulisci tutte le notifiche di sistema all'avvio
      await Notifications.dismissAllNotificationsAsync();
      // Cancella tutte le notifiche programmate all'avvio
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Configura handler notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true, // Mostra banner
          shouldShowList: true,   // Mostra nella lista notifiche
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      // Richiedi permessi
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      this.hasPermission = existingStatus === 'granted';
      
      if (!this.hasPermission) {
        const { status } = await Notifications.requestPermissionsAsync();
        this.hasPermission = status === 'granted';
      }
      
      // Configura task in background per controllo notifiche
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minuti è il minimo consentito
        stopOnTerminate: false,
        startOnBoot: true,
      });
      
      // Carica notifiche pendenti
      await this.loadPendingNotifications();
      
      this.initialized = true;
      console.log(`✅ Sistema notifiche inizializzato: ${this.hasPermission ? 'Permessi concessi' : 'Permessi negati'}`);
      return true;
    } catch (error) {
      console.error('❌ Errore inizializzazione notifiche:', error);
      return false;
    }
  }
  
  // Richiedi permessi per notifiche
  async requestPermissions() {
    if (!this.initialized) await this.initialize();
    
    if (!this.hasPermission) {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      console.log(`📱 Permessi notifiche: ${this.hasPermission ? 'CONCESSI' : 'NEGATI'}`);
    }
    
    return this.hasPermission;
  }
  
  // Verifica se ci sono permessi per le notifiche
  async hasPermissions() {
    if (!this.initialized) await this.initialize();
    return this.hasPermission;
  }
  
  // Carica notifiche pendenti dal storage
  async loadPendingNotifications() {
    try {
      const pendingNotifications = await AsyncStorage.getItem('pendingNotifications');
      if (pendingNotifications) {
        this.pendingNotificationsForStorage = JSON.parse(pendingNotifications);
      }
    } catch (error) {
      console.error('Errore caricamento notifiche pendenti:', error);
    }
  }
  
  // Salva notifiche pendenti nel storage
  async savePendingNotifications() {
    try {
      // Prima di salvare, rimuovi notifiche già gestite
      const handledNotifications = await this.getHandledNotifications();
      if (handledNotifications.length > 0) {
        // Filtra notifiche non gestite
        this.pendingNotificationsForStorage = this.pendingNotificationsForStorage.filter(
          notification => !notification.data?.id || !handledNotifications.includes(notification.data.id)
        );
        console.log(`🧹 Rimosse ${handledNotifications.length} notifiche già gestite da pendingNotificationsForStorage`);
      }
      
      await AsyncStorage.setItem('pendingNotifications', JSON.stringify(this.pendingNotificationsForStorage));
      console.log(`💾 Salvate ${this.pendingNotificationsForStorage.length} notifiche pendenti`);
    } catch (error) {
      console.error('❌ Errore salvataggio notifiche pendenti:', error);
    }
  }
  
  // Controlla notifiche mancate quando l'app torna in primo piano
  async checkMissedNotifications() {
    console.log('🔍 Verifica notifiche perse...');
    
    try {
      // Ottieni notifiche già gestite
      const handledNotifications = await this.getHandledNotifications();
      
      // Filtra notifiche non mostrate, scadute e non già gestite
      const now = Date.now();
      const missedNotifications = this.pendingNotificationsForStorage.filter(
        notification => !notification.shown && 
                       notification.scheduledTime <= now &&
                       (!notification.data?.id || !handledNotifications.includes(notification.data.id))
      );
      
      if (missedNotifications.length > 0) {
        console.log(`📱 Trovate ${missedNotifications.length} notifiche perse`);
        
        // Mostra notifiche perse
        for (const notification of missedNotifications) {
          // Aggiungi ID se mancante
          if (!notification.data) {
            notification.data = {};
          }
          if (!notification.data.id) {
            notification.data.id = `missed_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          }
          
          try {
            // Usa Alert per mostrare notifiche perse nell'app
            Alert.alert(
              notification.title,
              notification.body,
              [{ text: 'OK', onPress: () => this.handleNotificationAction(notification.data) }],
              { cancelable: true }
            );
          } catch (alertError) {
            console.error('❌ Errore mostrando Alert per notifica persa:', alertError);
          }
          
          // Segna come mostrata
          notification.shown = true;
          
          // Segna come gestita
          await this.markNotificationAsHandled(notification.data.id);
        }
        
        // Aggiorna storage
        await this.savePendingNotifications();
      } else {
        console.log('✅ Nessuna notifica persa trovata');
      }
    } catch (error) {
      console.error('Errore controllo notifiche perse:', error);
    }
  }
  
  // Gestisce azione su notifica
  async handleNotificationAction(data) {
    if (!data) return;
    
    console.log('🔄 Gestione azione notifica:', data);
    
    // Verifica se questa notifica ha un ID e se è già stata gestita
    if (data.id) {
      // Verifica se questa notifica è già stata gestita
      const handledNotifications = await this.getHandledNotifications();
      if (handledNotifications.includes(data.id)) {
        console.log(`🛑 Notifica ${data.id} già gestita, ignoro`);
        return;
      }
      
      // Segna questa notifica come gestita
      await this.markNotificationAsHandled(data.id);
    }
    
    switch (data.type) {
      case 'work_reminder':
        console.log('🔄 Azione: Naviga a inserimento orari');
        // Qui la navigazione effettiva
        break;
      case 'time_entry_reminder':
        console.log('🔄 Azione: Naviga a form orari');
        // Qui la navigazione effettiva
        break;
      case 'standby_reminder':
        console.log('🔄 Azione: Naviga a reperibilità');
        // Qui la navigazione effettiva
        break;
      case 'daily_summary':
        console.log('🔄 Azione: Naviga a dashboard');
        // Qui la navigazione effettiva
        break;
      default:
        console.log('🔄 Azione: Nessuna azione specifica');
    }
  }
  
  // Programma una notifica
  async scheduleNotification(title, body, scheduledTime, data = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Aggiungi l'ID alla notifica per tracciamento
      data.id = notificationId;
      
      // Se abbiamo i permessi, usa expo-notifications
      if (this.hasPermission) {
        // Calcola millisecondi fino all'orario programmato
        const delay = scheduledTime - Date.now();
        
        // Se il tempo è già passato, mostra subito
        if (delay <= 0) {
          console.log('⏰ Notifica programmata per il passato, mostro subito');
          
          Alert.alert(
            title,
            body,
            [{ text: 'OK', onPress: () => this.handleNotificationAction(data) }],
            { cancelable: true }
          );
          
          return { id: notificationId, immediate: true };
        }
        
        // Altrimenti programma con Expo
        const expoNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
          },
          trigger: {
            seconds: Math.floor(delay / 1000),
          },
        });
        
        console.log(`✅ Notifica programmata con Expo ID: ${expoNotificationId}`);
        
        // Mantieni traccia della notifica
        this.scheduledNotifications.set(notificationId, {
          id: expoNotificationId,
          title,
          body,
          data,
          scheduledTime,
        });
        
        // Salva anche nella lista persistente
        this.pendingNotificationsForStorage.push({
          id: notificationId,
          title,
          body,
          data,
          scheduledTime,
          shown: false,
        });
        
        await this.savePendingNotifications();
        
        return { id: notificationId, expoId: expoNotificationId };
      } else {
        // Fallback: usa JavaScript timer con Alert
        console.log('⚠️ Permessi notifiche negati, uso JavaScript timer con Alert');
        
        const delay = scheduledTime - Date.now();
        
        // Se la notifica è per il passato, mostra subito
        if (delay <= 0) {
          Alert.alert(
            title,
            body,
            [{ text: 'OK', onPress: () => this.handleNotificationAction(data) }],
            { cancelable: true }
          );
          
          return { id: notificationId, immediate: true };
        }
        
        // Aggiungi alla lista persistente
        this.pendingNotificationsForStorage.push({
          id: notificationId,
          title,
          body,
          data,
          scheduledTime,
          shown: false,
        });
        
        await this.savePendingNotifications();
        
        // In JS timer funziona solo con app aperta
        const timer = setTimeout(() => {
          if (AppState.currentState === 'active') {
            Alert.alert(
              title,
              body,
              [{ text: 'OK', onPress: () => this.handleNotificationAction(data) }],
              { cancelable: true }
            );
            
            // Aggiorna lo stato della notifica
            this.markNotificationAsShown(notificationId);
          }
        }, delay);
        
        this.scheduledNotifications.set(notificationId, {
          timer,
          title,
          body,
          data,
          scheduledTime,
        });
        
        return { id: notificationId, jsTimer: true };
      }
    } catch (error) {
      console.error('❌ Errore programmazione notifica:', error);
      
      // Fallback estremo: salva solo nel persistente
      const notificationId = `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      this.pendingNotificationsForStorage.push({
        id: notificationId,
        title,
        body,
        data,
        scheduledTime,
        shown: false,
      });
      
      await this.savePendingNotifications();
      
      return { id: notificationId, persistentOnly: true };
    }
  }
  
  // Segna una notifica come mostrata
  async markNotificationAsShown(notificationId) {
    const notification = this.pendingNotificationsForStorage.find(n => n.id === notificationId);
    if (notification) {
      notification.shown = true;
      await this.savePendingNotifications();
      
      // Se la notifica ha un ID nei dati, segnala anche come gestita
      if (notification.data && notification.data.id) {
        await this.markNotificationAsHandled(notification.data.id);
      }
    }
  }
  
  // Cancella una notifica
  async cancelNotification(notificationId) {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      
      if (notification) {
        // Se è una notifica Expo
        if (notification.id) {
          await Notifications.cancelScheduledNotificationAsync(notification.id);
        }
        
        // Se è un timer JavaScript
        if (notification.timer) {
          clearTimeout(notification.timer);
        }
        
        this.scheduledNotifications.delete(notificationId);
        
        // Rimuovi anche dalla lista persistente
        this.pendingNotificationsForStorage = this.pendingNotificationsForStorage.filter(
          n => n.id !== notificationId
        );
        
        await this.savePendingNotifications();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Errore cancellazione notifica:', error);
      return false;
    }
  }
  
  // Ottiene la lista delle notifiche già gestite
  async getHandledNotifications() {
    try {
      const handledNotifications = await AsyncStorage.getItem('handledNotifications');
      return handledNotifications ? JSON.parse(handledNotifications) : [];
    } catch (error) {
      console.error('❌ Errore lettura notifiche gestite:', error);
      return [];
    }
  }
  
  // Segna una notifica come già gestita
  async markNotificationAsHandled(notificationId) {
    try {
      const handledNotifications = await this.getHandledNotifications();
      if (!handledNotifications.includes(notificationId)) {
        handledNotifications.push(notificationId);
        await AsyncStorage.setItem('handledNotifications', JSON.stringify(handledNotifications));
        console.log(`✅ Notifica ${notificationId} segnata come gestita`);
      }
    } catch (error) {
      console.error('❌ Errore nel segnare notifica come gestita:', error);
    }
  }
  
  // Cancella tutte le notifiche
  async cancelAllNotifications() {
    try {
      // Cancella notifiche Expo
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Cancella anche le notifiche visibili
      await Notifications.dismissAllNotificationsAsync();
      
      // Cancella timer JavaScript
      for (const notification of this.scheduledNotifications.values()) {
        if (notification.timer) {
          clearTimeout(notification.timer);
        }
      }
      
      this.scheduledNotifications.clear();
      
      // Pulisci lista persistente
      this.pendingNotificationsForStorage = [];
      await this.savePendingNotifications();
      
      return true;
    } catch (error) {
      console.error('❌ Errore cancellazione tutte le notifiche:', error);
      return false;
    }
  }
  
  // Riprogramma le notifiche quando l'app torna in primo piano
  async rescheduleOnForeground() {
    console.log('🔄 Riprogrammazione notifiche dopo ritorno in primo piano...');
    
    try {
      // Verifica notifiche perse
      await this.checkMissedNotifications();
      
      // Se le API Notifications non sono disponibili, esci
      if (!this.isNotificationsAvailable) {
        console.warn('⚠️ API Notifications non disponibili. Riprogrammazione saltata.');
        return false;
      }
      
      // Ottieni notifiche già gestite
      const handledNotifications = await this.getHandledNotifications();
      
      // Cancella tutte le notifiche correnti (visibili e programmate)
      // per evitare notifiche duplicate
      try {
        await Notifications.dismissAllNotificationsAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
      } catch (notifError) {
        console.error('❌ Errore cancellazione notifiche:', notifError);
        // Continua comunque con il resto della funzione
      }
      
      // Pulisci la lista di notifiche pendenti rimuovendo quelle già gestite
      await this.cleanPendingNotifications();
      
      // Filtra notifiche future non mostrate e non già gestite
      const now = Date.now();
      const pendingFutureNotifications = this.pendingNotificationsForStorage.filter(
        notification => !notification.shown && 
                      notification.scheduledTime > now && 
                      (!notification.data?.id || !handledNotifications.includes(notification.data.id))
      );
      
      if (pendingFutureNotifications.length > 0) {
        console.log(`📱 Trovate ${pendingFutureNotifications.length} notifiche future da riprogrammare`);
        
        // Riprogramma notifiche future
        for (const notification of pendingFutureNotifications) {
          // Usa Expo se possibile
          if (this.hasPermission) {
            // Assicurati che la notifica abbia un ID nei dati
            if (!notification.data) {
              notification.data = {};
            }
            if (!notification.data.id) {
              notification.data.id = `notification_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            }
            
            const expoNotificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.body,
                data: notification.data,
              },
              trigger: {
                seconds: Math.max(1, Math.floor((notification.scheduledTime - now) / 1000)),
              },
            });
            
            console.log(`✅ Notifica riprogrammata con Expo ID: ${expoNotificationId}`);
          }
        }
      } else {
        console.log('✅ Nessuna notifica futura da riprogrammare');
      }
      
      return pendingFutureNotifications.length > 0;
    } catch (error) {
      console.error('❌ Errore riprogrammazione notifiche:', error);
      return false;
    }
  }
  
  // Pulisce la lista di notifiche pendenti
  async cleanPendingNotifications() {
    try {
      // Ottieni notifiche già gestite
      const handledNotifications = await this.getHandledNotifications();
      
      // Memorizza il conteggio prima della pulizia
      const beforeCount = this.pendingNotificationsForStorage.length;
      
      // Filtra notifiche non gestite o senza ID
      this.pendingNotificationsForStorage = this.pendingNotificationsForStorage.filter(
        notification => !notification.data?.id || !handledNotifications.includes(notification.data.id)
      );
      
      // Salva la lista aggiornata
      await this.savePendingNotifications();
      
      const removedCount = beforeCount - this.pendingNotificationsForStorage.length;
      if (removedCount > 0) {
        console.log(`🧹 Rimosse ${removedCount} notifiche già gestite dalla lista pendenti`);
      }
      
      return removedCount;
    } catch (error) {
      console.error('❌ Errore pulizia notifiche pendenti:', error);
      return 0;
    }
  }
  
  // Mostra immediatamente una notifica
  async showImmediateNotification(title, body, data = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      if (this.hasPermission) {
        // Usa Expo se possibile
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
          },
          trigger: null, // Notifica immediata
        });
        
        return { id, success: true };
      } else {
        // Fallback con Alert
        Alert.alert(
          title,
          body,
          [{ text: 'OK', onPress: () => this.handleNotificationAction(data) }],
          { cancelable: true }
        );
        
        return { success: true, alert: true };
      }
    } catch (error) {
      console.error('❌ Errore notifica immediata:', error);
      
      // Fallback estremo con Alert
      Alert.alert(
        title,
        body,
        [{ text: 'OK', onPress: () => this.handleNotificationAction(data) }],
        { cancelable: true }
      );
      
      return { success: true, fallback: true };
    }
  }
  
  // Restituisce le impostazioni predefinite per le notifiche
  getDefaultSettings() {
    return {
      enabled: true,
      workReminder: {
        enabled: true,
        morningTime: '07:30',
        weekendsEnabled: false
      },
      timeEntryReminder: {
        enabled: true,
        eveningTime: '18:30',
        weekendsEnabled: false
      },
      standbyReminder: {
        enabled: true
      },
      dailySummary: {
        enabled: false,
        time: '21:00'
      }
    };
  }
  
  // Ottiene le impostazioni delle notifiche
  async getSettings() {
    try {
      const storedSettings = await AsyncStorage.getItem('notificationSettings');
      if (storedSettings) {
        return JSON.parse(storedSettings);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('❌ Errore lettura impostazioni notifiche:', error);
      return this.getDefaultSettings();
    }
  }
  
  // Salva le impostazioni delle notifiche
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni notifiche:', error);
      return false;
    }
  }
  
  // Configura il listener per le notifiche
  setupNotificationListener() {
    // In questo servizio, utilizza l'API di expo-notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notifica ricevuta:', notification);
      
      // Verifica se la notifica ha un ID
      const notificationData = notification.request.content.data;
      if (notificationData && notificationData.id) {
        console.log(`📝 Notifica ricevuta con ID: ${notificationData.id}`);
      }
    });
    
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      console.log('👆 Utente ha toccato la notifica:', response);
      
      // Estrai i dati dalla notifica
      const notificationData = response.notification.request.content.data;
      
      // Gestisci l'azione solo se non è già stata gestita
      await this.handleNotificationAction(notificationData);
      
      // Rimuovi la notifica dal centro notifiche
      if (Platform.OS === 'ios') {
        await Notifications.dismissNotificationAsync(response.notification.request.identifier);
      } else {
        await Notifications.dismissAllNotificationsAsync();
      }
    });
    
    // Salva i riferimenti per pulizia
    this.notificationSubscription = subscription;
    this.notificationResponseSubscription = responseSubscription;
    
    return true;
  }
  
  // Rimuove i listener delle notifiche
  removeNotificationListeners() {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
    
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
    }
  }
  
  // WRAPPER PER COMPATIBILITÀ CON IL VECCHIO SISTEMA
  
  // Programma notifiche basate sulle impostazioni
  async scheduleNotifications(settings = null, forceReschedule = false) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Se non sono fornite impostazioni, carica quelle salvate
      let notificationSettings = settings;
      
      if (!notificationSettings) {
        try {
          notificationSettings = await this.getSettings();
        } catch (settingsError) {
          console.error('❌ Errore caricamento impostazioni notifiche:', settingsError);
          notificationSettings = this.getDefaultSettings();
        }
      }
      
      // Verifica che notificationSettings sia un oggetto valido
      if (!notificationSettings || typeof notificationSettings !== 'object') {
        console.warn('⚠️ Impostazioni notifiche non valide, uso predefinite');
        notificationSettings = this.getDefaultSettings();
      }
      
      // Se le notifiche sono disabilitate e non è richiesta riprogrammazione forzata, esci
      if (notificationSettings.enabled === false && !forceReschedule) {
        console.log('❌ Notifiche disabilitate nelle impostazioni');
        return 0;
      }
      
      // Cancella tutte le notifiche precedenti
      await this.cancelAllNotifications();
      
      // Pulisci anche le notifiche di sistema in sospeso
      if (this.isNotificationsAvailable) {
        try {
          await Notifications.dismissAllNotificationsAsync();
        } catch (notifError) {
          console.warn('⚠️ Errore pulizia notifiche di sistema:', notifError);
        }
      }
      
      // Ottieni elenco notifiche già gestite
      const handledNotifications = await this.getHandledNotifications();
      console.log(`ℹ️ Trovate ${handledNotifications.length} notifiche già gestite in archivio`);
      
      let totalScheduled = 0;
      
      // Programma promemoria lavoro se abilitato
      if (notificationSettings.workReminder && notificationSettings.workReminder.enabled === true) {
        try {
          const workCount = await this.scheduleWorkReminders(notificationSettings.workReminder);
          totalScheduled += workCount;
          console.log(`✅ Programmate ${workCount} notifiche promemoria lavoro`);
        } catch (workError) {
          console.error('❌ Errore programmazione promemoria lavoro:', workError);
        }
      }
      
      // Programma promemoria inserimento orari se abilitato
      if (notificationSettings.timeEntryReminder && notificationSettings.timeEntryReminder.enabled === true) {
        try {
          const timeEntryCount = await this.scheduleTimeEntryReminders(notificationSettings.timeEntryReminder);
          totalScheduled += timeEntryCount;
          console.log(`✅ Programmate ${timeEntryCount} notifiche promemoria inserimento orari`);
        } catch (timeEntryError) {
          console.error('❌ Errore programmazione promemoria inserimento orari:', timeEntryError);
        }
      }
      
      // Programma notifiche di reperibilità (se ci sono impostazioni e dati di reperibilità)
      if (notificationSettings.standbyReminder && notificationSettings.standbyReminder.enabled === true) {
        try {
          // Verifica che le funzioni necessarie siano disponibili
          const hasRequiredFunctions = 
            typeof DatabaseService.getStandbyScheduleForNext7Days === 'function' && 
            typeof DatabaseService.getStandbySettings === 'function';
          
          if (!hasRequiredFunctions) {
            console.warn('⚠️ Funzioni necessarie per la reperibilità non disponibili nel DatabaseService');
          } else {
            // Recupera i dati della reperibilità dal database
            const standbyData = await DatabaseService.getStandbyScheduleForNext7Days();
            
            if (standbyData && standbyData.length > 0) {
              // Ottieni le impostazioni di reperibilità
              const standbySettings = await DatabaseService.getStandbySettings();
              
              // Assicurati che le notifiche siano abilitate per le reperibilità
              standbySettings.enabled = notificationSettings.standbyReminder.enabled;
              
              const standbyCount = await this.scheduleStandbyReminders(standbySettings, standbyData);
              totalScheduled += standbyCount;
              console.log(`✅ Programmate ${standbyCount} notifiche promemoria reperibilità`);
            } else {
              console.log('ℹ️ Nessun dato di reperibilità trovato per i prossimi 7 giorni');
              // Se si desidera testare le notifiche di reperibilità, utilizzare il metodo testStandbyNotifications()
            }
          }
        } catch (standbyError) {
          console.error('❌ Errore programmazione promemoria reperibilità:', standbyError);
        }
      }
      
      // Programma riepilogo giornaliero se abilitato
      if (notificationSettings.dailySummary && notificationSettings.dailySummary.enabled === true) {
        // Qui implementazione per riepilogo giornaliero
        // (non implementato nel sistema attuale)
      }
      
      console.log(`✅ Totale notifiche programmate: ${totalScheduled}`);
      return totalScheduled;
    } catch (error) {
      console.error('❌ Errore programmazione notifiche:', error);
      return 0;
    }
  }
  
  // Programma promemoria lavoro
  async scheduleWorkReminders(settings) {
    if (!settings || settings.enabled !== true) {
      console.log('ℹ️ Promemoria lavoro disabilitati, non programmati');
      return 0;
    }
    
    try {
      // Controlla che morningTime sia definito e valido
      if (!settings.morningTime || typeof settings.morningTime !== 'string') {
        console.error('❌ Impostazione orario mattina non valida per promemoria lavoro');
        return 0;
      }
      
      const timeParts = settings.morningTime.split(':');
      if (timeParts.length !== 2) {
        console.error('❌ Formato orario non valido:', settings.morningTime);
        return 0;
      }
      
      const [hours, minutes] = timeParts;
      let scheduledCount = 0;
      
      // Programma solo per i prossimi 7 giorni
      const daysToSchedule = settings.weekendsEnabled === true ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      const now = new Date();
      
      for (let day = 1; day <= 7; day++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + day);
        
        // Controlla se è il giorno giusto della settimana
        if (!daysToSchedule.includes(targetDate.getDay())) continue;
        
        targetDate.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
        
        // Solo se nel futuro
        if (targetDate <= now) continue;
        
        await this.scheduleNotification(
          '� Promemoria Lavoro',
          'Ricordati di registrare gli orari di lavoro di oggi.',
          targetDate.getTime(),
          { type: 'work_reminder', date: targetDate.toISOString().split('T')[0] }
        );
        
        scheduledCount++;
      }
      
      return scheduledCount;
    } catch (error) {
      console.error('❌ Errore programmazione promemoria lavoro:', error);
      return 0;
    }
  }
  
  // Programma promemoria inserimento orari
  async scheduleTimeEntryReminders(settings) {
    if (!settings || settings.enabled !== true) {
      console.log('ℹ️ Promemoria inserimento orari disabilitati, non programmati');
      return 0;
    }
    
    try {
      // Controlla che eveningTime sia definito e valido
      if (!settings.eveningTime || typeof settings.eveningTime !== 'string') {
        console.error('❌ Impostazione orario sera non valida per promemoria inserimento orari');
        return 0;
      }
      
      const timeParts = settings.eveningTime.split(':');
      if (timeParts.length !== 2) {
        console.error('❌ Formato orario non valido:', settings.eveningTime);
        return 0;
      }
      
      const [hours, minutes] = timeParts;
      let scheduledCount = 0;
      
      // Programma solo per i prossimi 7 giorni
      const daysToSchedule = settings.weekendsEnabled === true ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      const now = new Date();
      
      for (let day = 0; day <= 7; day++) {
        try {
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() + day);
          
          // Controlla se è il giorno giusto della settimana
          if (!daysToSchedule.includes(targetDate.getDay())) continue;
          
          targetDate.setHours(parseInt(hours) || 18, parseInt(minutes) || 0, 0, 0);
          
          // Solo se nel futuro
          if (targetDate <= now) continue;
          
          await this.scheduleNotification(
            '⏰ Promemoria Inserimento Orari',
            'Ricordati di inserire le ore di lavoro di oggi prima di andare a casa.',
            targetDate.getTime(),
            { type: 'time_entry_reminder', date: targetDate.toISOString().split('T')[0] }
          );
          
          scheduledCount++;
        } catch (dayError) {
          console.error(`❌ Errore programmazione promemoria inserimento orari per giorno ${day}:`, dayError);
          // Continua con gli altri giorni anche se uno fallisce
        }
      }
      
      return scheduledCount;
    } catch (error) {
      console.error('❌ Errore generale in scheduleTimeEntryReminders:', error);
      return 0;
    }
  }
  
  // Programma notifiche per reperibilità
  async scheduleStandbyReminders(standbyConfig, scheduleData) {
    // Per retrocompatibilità con le vecchie impostazioni
    const notificationsEnabled = 
      standbyConfig?.notificationsEnabled === true || 
      standbyConfig?.enabled === true;
    
    if (!standbyConfig || !notificationsEnabled) {
      console.log('ℹ️ Notifiche reperibilità disabilitate, non programmate');
      return 0;
    }
    
    try {
      // Verifica che i dati di programmazione siano validi
      if (!scheduleData || !Array.isArray(scheduleData) || scheduleData.length === 0) {
        console.log('ℹ️ Nessun dato di reperibilità da programmare');
        return 0;
      }
      
      console.log(`ℹ️ Programmazione notifiche per ${scheduleData.length} giorni di reperibilità`);
      console.log('🔍 Primi dati:', scheduleData[0]);
      
      let scheduledCount = 0;
      const now = new Date();
      
      // Per ogni turno di reperibilità
      for (const standby of scheduleData) {
        try {
          // Verifica date valide
          if (!standby.startDate || !standby.endDate) {
            console.error('❌ Date di reperibilità mancanti:', standby);
            continue;
          }
          
          const startDate = new Date(standby.startDate);
          const endDate = new Date(standby.endDate);
          
          // Verifica che le date siano valide
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('❌ Date di reperibilità non valide:', standby);
            continue;
          }
          
          // Calcola l'orario di notifica (1 ora prima dell'inizio)
          const notificationTime = new Date(startDate);
          notificationTime.setHours(notificationTime.getHours() - 1);
          
          // Salta se già passato
          if (notificationTime <= now) continue;
          
          // Programma notifica
          await this.scheduleNotification(
            '🔄 Promemoria Reperibilità',
            `La tua reperibilità inizia tra un'ora (${startDate.toLocaleTimeString('it-IT')})`,
            notificationTime.getTime(),
            { 
              type: 'standby_reminder',
              startDate: standby.startDate,
              endDate: standby.endDate,
              standbyId: standby.id || 'unknown'
            }
          );
          
          scheduledCount++;
        } catch (standbyError) {
          console.error('❌ Errore programmazione singola reperibilità:', standbyError);
          // Continua con le altre anche se una fallisce
        }
      }
      
      return scheduledCount;
    } catch (error) {
      console.error('❌ Errore programmazione promemoria reperibilità:', error);
      return 0;
    }
  }
  
  // Test del sistema (SILENZIOSO - non invia notifiche immediate automaticamente)
  async testNotificationSystem() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🧪 === TEST SISTEMA NOTIFICHE FIXED ===');
      
      // Verifica permessi
      const hasPermissions = await this.hasPermissions();
      console.log(`📱 Permessi notifiche: ${hasPermissions ? 'CONCESSI ✅' : 'NEGATI ❌'}`);
      
      // ⚠️ RIMOSSO TEST IMMEDIATO - Causava notifiche indesiderate all'avvio
      console.log('⚡ Test notifica immediata... SALTATO (evita spam)');
      const immediateResult = { success: true, id: 'skipped', note: 'Test immediato disabilitato' };
      
      // Test notifica ritardata (30 secondi) - SOLO SE RICHIESTO MANUALMENTE
      console.log('⏰ Test notifica ritardata (30 secondi)...');
      const delayedTime = Date.now() + 30 * 1000;
      
      const delayedResult = await this.scheduleNotification(
        '🧪 Test Notifica Programmata',
        'Test di verifica programmazione notifiche (30 sec).',
        delayedTime,
        { type: 'test_delayed' }
      );
      
      console.log(`✅ Notifica ritardata: ${JSON.stringify(delayedResult)}`);
      console.log(`⏱️ Programmata per: ${new Date(delayedTime).toLocaleTimeString('it-IT')}`);
      console.log('⏳ Attendi 30 secondi per la notifica ritardata...');
      
      console.log('✅ Test sistema notifiche completato');
      
      return {
        success: true,
        hasPermissions,
        immediateTest: immediateResult,
        delayedTest: delayedResult,
        system: 'FixedNotificationService',
        time: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Errore test sistema notifiche:', error);
      
      return {
        success: false,
        error: error.message,
        system: 'FixedNotificationService',
        time: new Date().toISOString()
      };
    }
  }
  
  /**
   * Cancella tutte le notifiche di reperibilità programmate
   */
  async cancelStandbyNotifications() {
    try {
      console.log('🗑️ Cancellazione notifiche reperibilità...');
      
      // Recupera tutte le notifiche programmate
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Filtra quelle di reperibilità (identificate dal tipo o contenuto)
      const standbyNotifications = scheduledNotifications.filter(notification => {
        const data = notification.content?.data || {};
        return data.type === 'standby' || 
               data.category === 'standby' ||
               notification.content?.title?.includes('Reperibilità') ||
               notification.content?.title?.includes('reperibilità');
      });
      
      // Cancella le notifiche di reperibilità
      for (const notification of standbyNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log(`✅ Cancellate ${standbyNotifications.length} notifiche di reperibilità`);
      return standbyNotifications.length;
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche reperibilità:', error);
      return 0;
    }
  }

  /**
   * Aggiorna le notifiche di reperibilità
   * Compatibilità con StandbySettingsScreen
   */
  async updateStandbyNotifications() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('📞 updateStandbyNotifications: riprogrammazione notifiche reperibilità');
      
      // Ottieni impostazioni e dati reperibilità
      const hasRequiredFunctions = 
        typeof DatabaseService.getStandbyScheduleForNext7Days === 'function' && 
        typeof DatabaseService.getStandbySettings === 'function';
      
      if (!hasRequiredFunctions) {
        console.log('⚠️ Funzioni database per reperibilità non disponibili');
        return;
      }
      
      const standbyData = await DatabaseService.getStandbyScheduleForNext7Days();
      const standbySettings = await DatabaseService.getStandbySettings();
      
      // Cancella notifiche esistenti di reperibilità
      await this.cancelStandbyNotifications();
      
      // Riprogramma se ci sono dati e le notifiche sono abilitate
      if (standbyData.length > 0 && standbySettings.notificationsEnabled) {
        const standbyCount = await this.scheduleStandbyReminders(standbySettings, standbyData);
        console.log(`✅ Riprogrammate ${standbyCount} notifiche di reperibilità`);
      } else {
        console.log('ℹ️ Nessuna notifica di reperibilità da programmare');
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento notifiche reperibilità:', error);
      throw error;
    }
  }

  /**
   * Test delle notifiche di reperibilità
   * Genera dati di esempio e programma le notifiche
   */
  async testStandbyNotifications() {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🧪 === TEST NOTIFICHE REPERIBILITÀ ===');
      
      // Verifica permessi
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        console.log('❌ Permessi notifiche mancanti - test annullato');
        return { error: 'Permessi mancanti' };
      }
      
      // Verifica che le funzioni necessarie siano disponibili
      const hasRequiredFunctions = 
        typeof DatabaseService.getStandbyScheduleForNext7Days === 'function' && 
        typeof DatabaseService.getStandbySettings === 'function' &&
        typeof DatabaseService.generateSampleStandbyData === 'function';
      
      if (!hasRequiredFunctions) {
        console.log('❌ Funzioni necessarie mancanti - test annullato');
        return { error: 'Funzioni database mancanti' };
      }
      
      // Genera dati di esempio
      console.log('📝 Generazione dati di reperibilità di esempio...');
      const createdDays = await DatabaseService.generateSampleStandbyData();
      
      // Verifica che i dati siano stati creati
      if (!createdDays || createdDays.length === 0) {
        console.log('❌ Nessun dato di reperibilità creato - test annullato');
        return { error: 'Creazione dati fallita' };
      }
      
      // Recupera i dati della reperibilità
      const standbyData = await DatabaseService.getStandbyScheduleForNext7Days();
      console.log(`ℹ️ Trovati ${standbyData.length} giorni di reperibilità per i prossimi 7 giorni`);
      
      if (standbyData.length === 0) {
        console.log('⚠️ Nessun dato di reperibilità trovato, verifica la funzione getStandbyScheduleForNext7Days');
        return { error: 'Nessun dato trovato' };
      }
      
      // Ottieni le impostazioni di reperibilità
      const standbySettings = await DatabaseService.getStandbySettings();
      
      // Programma le notifiche
      console.log('🔔 Programmazione notifiche di reperibilità...');
      const standbyCount = await this.scheduleStandbyReminders(standbySettings, standbyData);
      
      console.log(`✅ Programmate ${standbyCount} notifiche di reperibilità`);
      return {
        createdDays,
        scheduledCount: standbyCount,
        standbyData
      };
    } catch (error) {
      console.error('❌ Errore test notifiche reperibilità:', error);
      return { error: error.message };
    }
  }
}

export default new FixedNotificationService();
