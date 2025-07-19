import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert } from 'react-native';

// IMPORT del sistema alternativo che FUNZIONA
import AlternativeNotificationService from './AlternativeNotificationService';

// Definisci il task per le notifiche in background
const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, () => {
  try {
    console.log('🔄 Background task in esecuzione...');
    // Qui potresti fare controlli per notifiche programmate
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Errore nel background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class NotificationService {
  constructor() {
    this.setupNotificationHandler();
    this.setupNotificationListener(); // Inizializza i listener
    this.schedulingInProgress = false; // Throttling per evitare chiamate multiple
    this.lastScheduleTime = 0;
    this.initializeBackgroundFetch();
    
    // 🚀 NUOVO: Sistema alternativo che FUNZIONA
    this.alternativeService = new AlternativeNotificationService();
    this.useAlternativeSystem = true; // Flag per abilitare il sistema che funziona
    
    console.log('🚀 NotificationService inizializzato con sistema alternativo ATTIVO');
  }

  async initializeBackgroundFetch() {
    try {
      // Registra il background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 60 * 60 * 1000, // 1 ora
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('✅ Background fetch registrato');
    } catch (error) {
      console.warn('⚠️ Impossibile registrare background fetch:', error);
    }
  }

  setupNotificationHandler() {
    // Configura il gestore per notifiche in background e foreground
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        console.log('📱 Gestione notifica:', notification.request.identifier, data?.type);
        
        // IMPORTANTE: Solo le notifiche di test immediate vengono mostrate subito
        if (data?.type === 'test_notification' && data?.immediate === true) {
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          };
        }

        // CONTROLLO ANTISPAM: Se è una notifica di sistema test, mostrala sempre
        if (data?.type === 'system_test' || data?.type === 'emergency_test') {
          return {
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          };
        }

        // FILTRO DRASTICO: Blocca TUTTE le notifiche che arrivano troppo presto
        if (data?.scheduledDate) {
          const scheduledTime = new Date(data.scheduledDate);
          const now = new Date();
          const timeDiff = scheduledTime.getTime() - now.getTime();
          
          // TOLLERANZA ZERO: Solo 30 secondi di margine
          const toleranceMs = 30 * 1000; // 30 secondi
          
          if (timeDiff > toleranceMs) {
            console.log(`🚫 NOTIFICA BLOCCATA DRASTICAMENTE: troppo presto di ${Math.floor(timeDiff / (1000 * 60))} minuti`);
            console.log(`   Programmata: ${scheduledTime.toISOString()}`);
            console.log(`   Ora corrente: ${now.toISOString()}`);
            console.log(`   Tipo: ${data?.type}`);
            console.log(`   🗑️ CANCELLANDO IMMEDIATAMENTE`);
            
            // Cancella immediatamente e NON riprogrammare
            try {
              await Notifications.cancelScheduledNotificationAsync(notification.request.identifier);
              console.log(`🗑️ Notifica prematura DEFINITIVAMENTE cancellata: ${notification.request.identifier}`);
            } catch (error) {
              console.warn('⚠️ Errore cancellazione notifica prematura:', error);
            }
            
            // BLOCCA COMPLETAMENTE la notifica
            return {
              shouldShowBanner: false,
              shouldShowList: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
          
          // Se è nel range ristretto, mostra la notifica
          console.log(`✅ NOTIFICA AUTORIZZATA: differenza di ${Math.floor(Math.abs(timeDiff) / (1000 * 60))} minuti è accettabile`);
        }

        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });

    // Listener per quando l'app viene aperta tramite notifica
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 App aperta tramite notifica:', response.notification.request.identifier);
    });
  }

  // Programma una notifica con ripetizione e persistenza migliorata
  async scheduleNotificationWithBackup(identifier, content, trigger, options = {}) {
    try {
      // Programma la notifica principale
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...content,
          data: {
            ...content.data,
            persistent: true,
            scheduleTime: Date.now(),
            ...options.data
          }
        },
        trigger
      });

      // Salva una copia locale per backup
      await this.saveNotificationBackup(identifier, content, trigger);

      console.log(`📱 ✅ Notifica programmata: ${identifier}`);
      return notificationId;
    } catch (error) {
      console.error(`❌ Errore programmazione notifica ${identifier}:`, error);
      throw error;
    }
  }

  // Salva backup locale delle notifiche programmate
  async saveNotificationBackup(identifier, content, trigger) {
    try {
      const backupKey = `notification_backup_${identifier}`;
      const backupData = {
        identifier,
        content,
        trigger,
        createdAt: Date.now(),
        type: 'scheduled'
      };
      
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
    } catch (error) {
      console.warn('⚠️ Impossibile salvare backup notifica:', error);
    }
  }

  // Ripristina notifiche da backup se necessario
  async restoreNotificationsFromBackup() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith('notification_backup_'));
      
      for (const key of backupKeys) {
        try {
          const backupData = JSON.parse(await AsyncStorage.getItem(key));
          const triggerDate = new Date(backupData.trigger.date);
          
          // Se la notifica non è ancora scaduta, riprogrammala
          if (triggerDate > new Date()) {
            await this.scheduleNotificationWithBackup(
              backupData.identifier,
              backupData.content,
              backupData.trigger
            );
          } else {
            // Rimuovi backup scaduti
            await AsyncStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`⚠️ Errore ripristino backup ${key}:`, error);
          await AsyncStorage.removeItem(key); // Rimuovi backup corrotti
        }
      }
    } catch (error) {
      console.error('❌ Errore ripristino notifiche da backup:', error);
    }
  }
  
  // Richiede i permessi per le notifiche
  async requestPermissions() {
    try {
      // Richiedi permessi di base per le notifiche
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (status === 'granted') {
        console.log('✅ Permessi notifiche concessi');
        return true;
      } else {
        console.warn('❌ Permessi notifiche non concessi:', status);
        return false;
      }
    } catch (error) {
      console.error('❌ Errore richiesta permessi:', error);
      return false;
    }
  }

  // Controlla se i permessi sono stati concessi
  async hasPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Carica le impostazioni notifiche
  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Errore nel caricamento impostazioni notifiche:', error);
      return this.getDefaultSettings();
    }
  }

  // Impostazioni predefinite
  getDefaultSettings() {
    return {
      enabled: false,
      workReminders: {
        enabled: false,
        morningTime: '08:00',
        eveningTime: '17:00',
        weekendsEnabled: false
      },
      timeEntryReminders: {
        enabled: false,
        time: '18:00',
        weekendsEnabled: false
      },
      standbyReminders: {
        enabled: false,
        notifications: [
          {
            enabled: true,
            daysInAdvance: 1,
            time: '20:00',
            message: 'Domani sei in reperibilità. Assicurati di essere disponibile!'
          },
          {
            enabled: false,
            daysInAdvance: 0,
            time: '08:00',
            message: 'Oggi sei in reperibilità. Tieni il telefono sempre a portata di mano!'
          },
          {
            enabled: false,
            daysInAdvance: 2,
            time: '19:00',
            message: 'Tra 2 giorni sarai in reperibilità. Preparati per essere disponibile!'
          }
        ]
      },
      vacationReminders: {
        enabled: false,
        time: '09:00',
        daysInAdvance: 7
      },
      overtimeAlerts: {
        enabled: false,
        hoursThreshold: 8.5
      },
      dailySummary: {
        enabled: false,
        time: '19:00'
      }
    };
  }

  // Salva le impostazioni
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Errore nel salvataggio impostazioni notifiche:', error);
      return false;
    }
  }

  // 🚀 NUOVO: Controllo del sistema alternativo
  setUseAlternativeSystem(enabled) {
    this.useAlternativeSystem = enabled;
    console.log(`🔄 Sistema alternativo ${enabled ? 'ATTIVATO' : 'DISATTIVATO'}`);
    
    if (!enabled) {
      // Se disabilitato, cancella i timer JavaScript
      this.alternativeService.clearAllTimers();
    }
  }

  // 🚀 NUOVO: Verifica se usare il sistema alternativo
  shouldUseAlternativeSystem() {
    return this.useAlternativeSystem;
  }

  // Programma tutte le notifiche (IBRIDO: Expo + Sistema alternativo)
  async scheduleNotifications(settings = null) {
    try {
      // THROTTLING MIGLIORATO - 30 minuti per evitare riprogrammazioni eccessive
      const now = Date.now();
      if (this.schedulingInProgress) {
        console.log('📱 Programmazione notifiche già in corso, saltando...');
        return;
      }
      
      // Aumentato a 30 minuti (1800000ms) per evitare riprogrammazioni continue
      if (now - this.lastScheduleTime < 1800000) { 
        const remainingTime = Math.round((1800000 - (now - this.lastScheduleTime)) / 60000);
        console.log(`📱 Notifiche programmate di recente, prossima programmazione tra ${remainingTime} minuti`);
        return;
      }

      this.schedulingInProgress = true;
      this.lastScheduleTime = now;

      console.log('📱 🚀 INIZIO programmazione notifiche (con controllo duplicati)...');

      if (!settings) {
        settings = await this.getSettings();
      }

      // VERIFICA se ci sono già notifiche programmate
      const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔍 Trovate ${existingNotifications.length} notifiche già programmate`);

      // Cancella SOLO se necessario (evita cancellazioni inutili)
      if (existingNotifications.length > 0) {
        console.log('🗑️ Cancellazione notifiche esistenti...');
        await Notifications.cancelAllScheduledNotificationsAsync();
      }

      if (!settings.enabled) {
        console.log('📱 ❌ Notifiche disabilitate nelle impostazioni');
        return;
      }

      // PROGRAMMAZIONE SELETTIVA - Solo se abilitato
      let totalScheduled = 0;
      
      if (settings.workReminders?.enabled) {
        console.log('📱 ⏰ Programmando promemoria lavoro...');
        
        if (this.shouldUseAlternativeSystem()) {
          console.log('🚀 Usando sistema alternativo per promemoria lavoro');
          const workCount = await this.alternativeService.scheduleAlternativeWorkReminders(settings.workReminders);
          totalScheduled += workCount;
          console.log(`✅ ${workCount} timer JavaScript lavoro attivati`);
        } else {
          const workCount = await this.scheduleWorkReminders(settings.workReminders);
          totalScheduled += workCount;
          console.log(`✅ ${workCount} promemoria lavoro Expo programmati`);
        }
      }
      
      if (settings.timeEntryReminders?.enabled) {
        console.log('📱 ✍️ Programmando promemoria inserimento orari...');
        
        if (this.shouldUseAlternativeSystem()) {
          console.log('🚀 Usando sistema alternativo per inserimento orari');
          const entryCount = await this.alternativeService.scheduleAlternativeTimeEntryReminders(settings.timeEntryReminders);
          totalScheduled += entryCount;
          console.log(`✅ ${entryCount} timer JavaScript inserimento attivati`);
        } else {
          const entryCount = await this.scheduleTimeEntryReminders(settings.timeEntryReminders);
          totalScheduled += entryCount;
          console.log(`✅ ${entryCount} promemoria inserimento Expo programmati`);
        }
      }
      
      if (settings.dailySummary?.enabled) {
        console.log('📱 📊 Programmando riepilogo giornaliero...');
        
        if (this.shouldUseAlternativeSystem()) {
          console.log('🚀 Usando sistema alternativo per riepilogo giornaliero');
          // Per ora usiamo Expo per il riepilogo, poi implementeremo anche questo
          const summaryCount = await this.scheduleDailySummary(settings.dailySummary);
          totalScheduled += summaryCount;
          console.log(`✅ ${summaryCount} riepiloghi giornalieri Expo programmati`);
        } else {
          const summaryCount = await this.scheduleDailySummary(settings.dailySummary);
          totalScheduled += summaryCount;
          console.log(`✅ ${summaryCount} riepiloghi giornalieri programmati`);
        }
      }
      
      // NOTA: Gli avvisi straordinario sono gestiti dinamicamente (non qui)
      
      // Programma i promemoria di reperibilità SOLO se abilitati
      if (settings.standbyReminders?.enabled) {
        console.log('📱 📞 Programmando promemoria reperibilità...');
        
        try {
          // Forza la sincronizzazione delle settings al database
          const DatabaseService = (await import('./DatabaseService')).default;
          const syncCount = await DatabaseService.syncStandbySettingsToDatabase();
          console.log(`📞 SYNC: ${syncCount} date sincronizzate dal settings al database`);
          
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1); // Ridotto a 1 mese per evitare spam
          const standbyDates = await this.getStandbyDatesFromSettings(new Date(), endDate);
          
          if (standbyDates.length > 0) {
            const standbyCount = await this.scheduleStandbyReminders(standbyDates, settings);
            totalScheduled += standbyCount;
          } else {
            console.log('📞 ⚠️ Nessuna data di reperibilità trovata per programmare notifiche');
          }
        } catch (standbyError) {
          console.error('📞 ❌ Errore programmazione reperibilità:', standbyError);
        }
      }

      // VERIFICA FINALE - Controlla le notifiche effettivamente programmate
      const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const alternativeStats = this.alternativeService.getActiveTimersStats();
      
      const totalActiveNotifications = finalScheduled.length + alternativeStats.total;
      
      console.log(`✅ 🎯 Programmazione completata!`);
      console.log(`   📱 Notifiche Expo: ${finalScheduled.length}`);
      console.log(`   🚀 Timer JavaScript: ${alternativeStats.total}`);
      console.log(`   🎯 TOTALE ATTIVE: ${totalActiveNotifications}`);
      
      if (alternativeStats.total > 0) {
        console.log('🚀 TIMER JAVASCRIPT ATTIVI:');
        console.log(`   Totale: ${alternativeStats.total}`);
        console.log(`   Per tipo:`, alternativeStats.byType);
        if (alternativeStats.nextNotification) {
          console.log(`   Prossimo: ${alternativeStats.nextNotification.title} alle ${alternativeStats.nextNotification.scheduledFor.toLocaleString('it-IT')}`);
        }
      }
      
      // PROGRAMMAZIONE AUTO-RINNOVAMENTO
      console.log('📱 🔄 Programmando auto-rinnovamento...');
      await this.setupAutoRenewal();
      
      // Log dettagliato SOLO se ci sono notifiche
      if (finalScheduled.length > 0) {
        console.log('📋 LISTA NOTIFICHE PROGRAMMATE:');
        finalScheduled.forEach((notif, index) => {
          const triggerInfo = this.describeTrigger(notif.trigger);
          console.log(`  ${index + 1}. ${notif.content.title} - ${triggerInfo}`);
        });
      } else {
        console.log('⚠️ ATTENZIONE: Nessuna notifica è stata effettivamente programmata!');
      }

    } catch (error) {
      console.error('❌ Errore nella programmazione notifiche:', error);
    } finally {
      this.schedulingInProgress = false;
    }
  }

  // Helper per descrivere il trigger di una notifica
  describeTrigger(trigger) {
    if (trigger.weekday && trigger.hour !== undefined) {
      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const dayName = days[trigger.weekday - 1] || 'Sconosciuto';
      return `${dayName} alle ${trigger.hour.toString().padStart(2, '0')}:${(trigger.minute || 0).toString().padStart(2, '0')}`;
    }
    if (trigger.hour !== undefined) {
      return `Ogni giorno alle ${trigger.hour.toString().padStart(2, '0')}:${(trigger.minute || 0).toString().padStart(2, '0')}`;
    }
    if (trigger.seconds) {
      return `Tra ${trigger.seconds} secondi`;
    }
    if (trigger.date) {
      const date = new Date(trigger.date);
      return `${date.toLocaleDateString('it-IT')} alle ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Trigger sconosciuto';
  }

  // Programma promemoria inizio lavoro
  async scheduleWorkReminders(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.morningTime.split(':');
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]; // 0=domenica, 1=lunedì...
    let scheduledCount = 0;

    // NUOVO APPROCCIO: Programma per le prossime 4 settimane invece di ripetizioni settimanali
    const now = new Date();
    const weeksToSchedule = 4; // Programma per le prossime 4 settimane
    
    for (let week = 0; week < weeksToSchedule; week++) {
      for (const dayOfWeek of daysToSchedule) {
        // Calcola la data specifica
        const targetDate = new Date(now);
        const daysUntilTarget = ((dayOfWeek - now.getDay() + 7) % 7) + (week * 7);
        
        // Se è oggi e l'ora è già passata, salta alla settimana successiva
        if (daysUntilTarget === 0) {
          const nowHour = now.getHours();
          const nowMinute = now.getMinutes();
          const targetHour = parseInt(hours);
          const targetMinute = parseInt(minutes);
          
          if (nowHour > targetHour || (nowHour === targetHour && nowMinute >= targetMinute)) {
            continue; // Salta, l'ora è già passata oggi
          }
        }
        
        targetDate.setDate(now.getDate() + daysUntilTarget);
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Verifica che la data sia nel futuro
        if (targetDate <= now) continue;

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // domenica o sabato
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        
        const content = {
          title: isWeekend ? '🌅 Weekend' : '🌅 Buongiorno!',
          body: isWeekend 
            ? 'Se lavori oggi, ricordati di registrare gli orari.'
            : 'Ricordati di registrare gli orari di lavoro di oggi.',
          sound: true,
          data: { 
            type: 'work_reminder', 
            day: dayOfWeek,
            scheduledDate: targetDate.toISOString(),
            week: week
          }
        };

        try {
          await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              date: targetDate,
            },
          });
          scheduledCount++;
          console.log(`  ✅ Promemoria lavoro programmato per ${dayNames[dayOfWeek]} ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
        } catch (error) {
          console.error(`  ❌ Errore programmazione promemoria lavoro per ${dayNames[dayOfWeek]} ${targetDate.toLocaleDateString('it-IT')}:`, error);
        }
      }
    }
    
    return scheduledCount;
  }

  // Programma promemoria inserimento orari
  async scheduleTimeEntryReminders(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.time.split(':');
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]; // 0=domenica, 1=lunedì...
    let scheduledCount = 0;

    // APPROCCIO SEMPLIFICATO: Solo trigger basati su date
    const now = new Date();
    const weeksToSchedule = 4; // Programma per le prossime 4 settimane
    
    for (let week = 0; week < weeksToSchedule; week++) {
      for (const dayOfWeek of daysToSchedule) {
        // Calcola la data specifica
        const targetDate = new Date();
        
        // Trova il prossimo giorno specifico
        let daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
        if (daysUntilTarget === 0 && week === 0) {
          // È oggi, controlla se l'ora è già passata
          const nowHour = now.getHours();
          const nowMinute = now.getMinutes();
          const targetHour = parseInt(hours);
          const targetMinute = parseInt(minutes);
          
          if (nowHour > targetHour || (nowHour === targetHour && nowMinute >= targetMinute)) {
            daysUntilTarget = 7; // Sposta alla prossima settimana
          }
        }
        
        // Aggiungi i giorni per la settimana corrente
        daysUntilTarget += (week * 7);
        
        targetDate.setDate(now.getDate() + daysUntilTarget);
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        // Verifica OBBLIGATORIA che la data sia nel futuro
        if (targetDate <= now) {
          console.warn(`⚠️ Data nel passato per ${dayOfWeek}, settimana ${week}: ${targetDate.toISOString()}`);
          continue;
        }

        // Verifica che la data non sia troppo nel futuro (più di 64 giorni)
        const maxFutureDate = new Date(now.getTime() + (64 * 24 * 60 * 60 * 1000));
        if (targetDate > maxFutureDate) {
          console.warn(`⚠️ Data troppo nel futuro: ${targetDate.toISOString()}`);
          continue;
        }

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // domenica o sabato
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        
        const content = {
          title: isWeekend ? '📝 Inserimento Orari Weekend' : '📝 Inserimento Orari',
          body: isWeekend 
            ? 'Se hai lavorato oggi, ricordati di inserire gli orari.'
            : 'Hai inserito gli orari di lavoro di oggi?',
          sound: 'default',
          autoDismiss: true,
          data: { 
            type: 'time_entry_reminder', 
            day: dayOfWeek,
            scheduledDate: targetDate.toISOString(),
            week: week
          }
        };

        try {
          // Verifica finale: la data deve essere DEFINITIVAMENTE nel futuro
          const timeUntilTarget = targetDate.getTime() - now.getTime();
          if (timeUntilTarget <= 0) {
            console.warn(`⚠️ Saltando notifica per data nel passato: ${targetDate.toISOString()}`);
            continue;
          }

          console.log(`🕐 Programmando per ${targetDate.toISOString()} (tra ${Math.floor(timeUntilTarget / (1000 * 60))} minuti)`);
          
          // SOLO TRIGGER DATE - Eliminata logica con secondi
          const notificationRequest = {
            content,
            trigger: {
              date: targetDate,
            },
          };

          console.log(`📡 Trigger usato:`, notificationRequest.trigger);
          
          await Notifications.scheduleNotificationAsync(notificationRequest);
          scheduledCount++;
          console.log(`  ✅ Promemoria inserimento programmato per ${dayNames[dayOfWeek]} ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
        } catch (error) {
          console.error(`  ❌ Errore programmazione promemoria inserimento per ${dayNames[dayOfWeek]} ${targetDate.toLocaleDateString('it-IT')}:`, error);
        }
      }
    }
    
    return scheduledCount;
  }

  // Programma riepilogo giornaliero
  async scheduleDailySummary(settings) {
    if (!settings.enabled) return 0;

    const [hours, minutes] = settings.time.split(':');

    // NUOVO APPROCCIO: Programma per i prossimi 30 giorni invece di ripetizioni giornaliere
    const now = new Date();
    const daysToSchedule = 30; // Programma per i prossimi 30 giorni
    let scheduledCount = 0;
    
    for (let day = 0; day < daysToSchedule; day++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + day);
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Se è oggi e l'ora è già passata, salta al giorno successivo
      if (day === 0) {
        const nowHour = now.getHours();
        const nowMinute = now.getMinutes();
        const targetHour = parseInt(hours);
        const targetMinute = parseInt(minutes);
        
        if (nowHour > targetHour || (nowHour === targetHour && nowMinute >= targetMinute)) {
          continue; // Salta, l'ora è già passata oggi
        }
      }
      
      // Verifica che la data sia nel futuro
      if (targetDate <= now) continue;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 Riepilogo Giornaliero',
            body: 'Controlla il tuo riepilogo guadagni di oggi.',
            sound: true,
            data: { 
              type: 'daily_summary',
              scheduledDate: targetDate.toISOString(),
              day: day
            }
          },
          trigger: {
            date: targetDate,
          },
        });
        scheduledCount++;
        console.log(`  ✅ Riepilogo giornaliero programmato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
      } catch (error) {
        console.error(`  ❌ Errore programmazione riepilogo per ${targetDate.toLocaleDateString('it-IT')}:`, error);
      }
    }
    
    return scheduledCount;
  }

  // CONTROLLO STRAORDINARIO - Chiamato dinamicamente (NON nella programmazione automatica)
  async checkOvertimeAlert(workHours, settings = null) {
    try {
      if (!settings) {
        settings = await this.getSettings();
      }

      // Verifica se le notifiche sono abilitate
      if (!settings.enabled || !settings.overtimeAlerts?.enabled) {
        console.log('⚠️ Controllo straordinario: notifiche disabilitate');
        return;
      }

      // Verifica la soglia
      const threshold = settings.overtimeAlerts.hoursThreshold || 8.5;
      if (workHours <= threshold) {
        console.log(`⚠️ Controllo straordinario: ${workHours.toFixed(1)}h <= ${threshold}h (soglia non superata)`);
        return;
      }

      // THROTTLING per evitare spam di notifiche straordinario
      const lastOvertimeKey = 'last_overtime_notification';
      const lastOvertimeStr = await AsyncStorage.getItem(lastOvertimeKey);
      const now = Date.now();
      
      if (lastOvertimeStr) {
        const lastOvertime = parseInt(lastOvertimeStr);
        const timeDiff = now - lastOvertime;
        const minInterval = 3600000; // 1 ora di intervallo minimo
        
        if (timeDiff < minInterval) {
          const remainingMinutes = Math.round((minInterval - timeDiff) / 60000);
          console.log(`⚠️ Notifica straordinario già inviata di recente, prossima tra ${remainingMinutes} minuti`);
          return;
        }
      }

      // Programma notifica straordinario IMMEDIATA
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Straordinario Rilevato',
          body: `Hai superato le ${threshold} ore giornaliere (${workHours.toFixed(1)}h totali). Ottimo lavoro!`,
          sound: true,
          data: { 
            type: 'overtime_alert', 
            hours: workHours,
            threshold: threshold,
            timestamp: now
          }
        },
        trigger: { seconds: 3 }, // 3 secondi di delay
      });

      // Salva timestamp per throttling
      await AsyncStorage.setItem(lastOvertimeKey, now.toString());
      console.log(`✅ Notifica straordinario programmata: ${workHours.toFixed(1)}h > ${threshold}h`);
      
    } catch (error) {
      console.error('❌ Errore nel controllo notifica straordinario:', error);
    }
  }

  // Invia notifica di test
  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Test Notifica',
        body: 'Le notifiche funzionano correttamente!',
        sound: true,
        data: { type: 'test' }
      },
      trigger: { seconds: 1 },
    });
  }

  // Programma promemoria per giorni di reperibilità (basato sul calendario)
  async scheduleStandbyReminders(standbyDates, settings = null) {
    if (!settings) {
      settings = await this.getSettings();
    }

    if (!settings.enabled || !settings.standbyReminders.enabled) {
      console.log('📞 Promemoria reperibilità disabilitati');
      return;
    }

    const activeNotifications = settings.standbyReminders.notifications?.filter(n => n.enabled) || [];
    
    if (activeNotifications.length === 0) {
      console.log('📞 Nessun promemoria reperibilità attivo');
      return;
    }

    let scheduledCount = 0;

    for (const dateStr of standbyDates) {
      const standbyDate = new Date(dateStr + 'T00:00:00');
      
      // Formatta la data per i messaggi
      const standbyDateFormatted = standbyDate.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      for (const notification of activeNotifications) {
        const [hours, minutes] = notification.time.split(':');
        const reminderDate = new Date(standbyDate);
        reminderDate.setDate(reminderDate.getDate() - notification.daysInAdvance);
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Solo se la data del promemoria è nel futuro
        if (reminderDate > new Date()) {
          const title = this.getStandbyReminderTitle(notification.daysInAdvance);
          const body = this.getStandbyReminderBody(notification.daysInAdvance, standbyDateFormatted, notification.message);

          const notificationRequest = {
            content: {
              title: title,
              body: body,
              sound: 'default',
              data: { 
                type: 'standby_reminder',
                standbyDate: dateStr,
                daysInAdvance: notification.daysInAdvance,
                scheduledDate: reminderDate.toISOString()
              }
            },
            trigger: {
              date: reminderDate,
            },
          };

          console.log(`📡 Standby trigger:`, notificationRequest.trigger);
          await Notifications.scheduleNotificationAsync(notificationRequest);

          scheduledCount++;
          console.log(`📞 Promemoria reperibilità programmato: ${title} per il ${standbyDateFormatted}`);
        }
      }
    }

    console.log(`✅ Programmati ${scheduledCount} promemoria di reperibilità`);
  }

  // Helper per generare titoli dinamici
  getStandbyReminderTitle(daysInAdvance) {
    switch (daysInAdvance) {
      case 0:
        return '📞 Reperibilità OGGI';
      case 1:
        return '📞 Reperibilità DOMANI';
      case 2:
        return '📞 Reperibilità tra 2 giorni';
      default:
        return `📞 Reperibilità tra ${daysInAdvance} giorni`;
    }
  }

  // Helper per generare messaggi dinamici
  getStandbyReminderBody(daysInAdvance, dateFormatted, customMessage) {
    if (customMessage) {
      return customMessage;
    }

    switch (daysInAdvance) {
      case 0:
        return `Oggi (${dateFormatted}) sei in reperibilità. Tieni il telefono sempre a portata di mano!`;
      case 1:
        return `Domani (${dateFormatted}) sei in reperibilità. Assicurati di essere disponibile!`;
      case 2:
        return `Dopodomani (${dateFormatted}) sarai in reperibilità. Preparati per essere disponibile!`;
      default:
        return `Il ${dateFormatted} sarai in reperibilità. Non dimenticartelo!`;
    }
  }

  // Sincronizza notifiche di reperibilità con il calendario del database
  async syncStandbyNotificationsWithCalendar() {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.standbyReminders.enabled) {
        console.log('📞 Sincronizzazione reperibilità saltata: notifiche disabilitate');
        return 0;
      }

      // Ottieni le date di reperibilità future dal database SQLite (prossimi 30 giorni)
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      
      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];
      
      // Cerca nel database SQLite (tabella STANDBY_CALENDAR)
      const standbyDates = await this.getStandbyDatesFromSettings(startDate, endDate);
      
      if (standbyDates.length > 0) {
        console.log(`📞 Trovate ${standbyDates.length} date di reperibilità future nel database`);
        
        // Cancella solo le notifiche di reperibilità esistenti
        await this.cancelStandbyNotifications();
        
        // Riprogramma le notifiche di reperibilità
        await this.scheduleStandbyReminders(standbyDates, settings);
      } else {
        console.log('📞 Nessuna data di reperibilità trovata nel database');
      }
      
      return standbyDates.length;
    } catch (error) {
      console.error('❌ Errore nella sincronizzazione notifiche reperibilità:', error);
      return 0;
    }
  }

  // Ottieni date di reperibilità dal database SQLite e dalle settings
  async getStandbyDatesFromSettings(startDate, endDate) {
    try {
      // Converti le date in stringhe se sono oggetti Date
      const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
      const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
      
      console.log(`📞 DEBUG: Cercando date reperibilità tra ${startStr} e ${endStr}`);
      
      const standbyDates = [];
      
      // Metodo 1: Leggi dalle settings (nuovo sistema)
      try {
        const settingsStr = await AsyncStorage.getItem('settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const standbyDaysFromSettings = settings?.standbySettings?.standbyDays || {};
          
          console.log(`📞 DEBUG: Trovate ${Object.keys(standbyDaysFromSettings).length} date nelle settings`);
          
          // Filtra le date nel range richiesto
          Object.keys(standbyDaysFromSettings).forEach(dateStr => {
            const dayData = standbyDaysFromSettings[dateStr];
            if (dayData?.selected === true) {
              const checkDate = new Date(dateStr);
              const start = new Date(startStr);
              const end = new Date(endStr);
              
              if (checkDate >= start && checkDate <= end) {
                standbyDates.push(dateStr);
                console.log(`📞 DEBUG: Aggiunta data reperibilità dalle settings: ${dateStr}`);
              }
            }
          });
        }
      } catch (settingsError) {
        console.warn('📞 Errore lettura settings per reperibilità:', settingsError);
      }
      
      // Metodo 2: Leggi dal database SQLite (sistema legacy)
      try {
        const databaseService = DatabaseService;
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        // Cicla mese per mese per recuperare tutte le date nel range
        let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        // Aggiungi una protezione contro loop infiniti
        let iterationCount = 0;
        const maxIterations = 24; // Max 2 anni
        
        while (currentMonth <= endMonth && iterationCount < maxIterations) {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1; // JavaScript months are 0-based
          
          console.log(`📞 DEBUG: Verificando mese ${year}-${month.toString().padStart(2, '0')} nel database`);
          
          // Ottieni i giorni di reperibilità per questo mese dal database
          const monthStandbyDays = await databaseService.getStandbyDays(year, month);
          console.log(`📞 DEBUG: Trovati ${monthStandbyDays.length} giorni di reperibilità nel database mese ${year}-${month}`);
          
          for (const standbyDay of monthStandbyDays) {
            const standbyDate = new Date(standbyDay.date);
            
            // Verifica che la data sia nel range richiesto e non sia già presente
            if (standbyDate >= start && standbyDate <= end && !standbyDates.includes(standbyDay.date)) {
              standbyDates.push(standbyDay.date);
              console.log(`📞 DEBUG: Aggiunta data reperibilità dal database: ${standbyDay.date}`);
            }
          }
          
          // Passa al mese successivo in modo sicuro
          currentMonth.setMonth(currentMonth.getMonth() + 1);
          iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
          console.warn('⚠️ AVVISO: Interrotto loop per protezione anti-infinito');
        }
      } catch (dbError) {
        console.warn('📞 Errore lettura database per reperibilità:', dbError);
      }
      
      // Rimuovi duplicati e ordina
      const uniqueDates = [...new Set(standbyDates)].sort();
      
      console.log(`📞 Trovate ${uniqueDates.length} date di reperibilità totali tra ${startStr} e ${endStr}`);
      console.log(`📞 Date trovate:`, uniqueDates);
      
      return uniqueDates;
      
    } catch (error) {
      console.error('❌ Errore nel caricamento date reperibilità:', error);
      return [];
    }
  }

  // Cancella solo le notifiche di reperibilità
  async cancelStandbyNotifications() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const standbyNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'standby_reminder'
      );
      
      for (const notification of standbyNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log(`🗑️ Cancellate ${standbyNotifications.length} notifiche di reperibilità`);
    } catch (error) {
      console.error('❌ Errore nella cancellazione notifiche reperibilità:', error);
    }
  }

  // Cancella tutte le notifiche (IBRIDO: Expo + Timer JavaScript)
  async cancelAllNotifications() {
    // Cancella notifiche Expo
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ Tutte le notifiche Expo cancellate');
    
    // Cancella timer JavaScript
    if (this.alternativeService) {
      this.alternativeService.clearAllTimers();
      console.log('🗑️ Tutti i timer JavaScript cancellati');
    }
    
    console.log('✅ Pulizia completa: Expo + Timer JavaScript');
  }

  // Ottieni lista notifiche programmate (per debug)
  async getScheduledNotifications() {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📅 Notifiche programmate:', notifications.length);
    return notifications;
  }

  // Gestione click notifiche (da chiamare nell'app principale)
  setupNotificationListener() {
    // Listener per notifiche ricevute mentre l'app è aperta
    Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      const scheduledDate = data?.scheduledDate ? new Date(data.scheduledDate) : null;
      const now = new Date();
      
      console.log('📬 Notifica ricevuta:', notification.request.identifier);
      console.log(`   Tipo: ${data?.type}`);
      
      if (scheduledDate) {
        const timeDiff = scheduledDate.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        
        if (Math.abs(minutesDiff) > 5) {
          console.log(`⚠️ TIMING ERRATO: Programmata per ${scheduledDate.toISOString()}, ricevuta ora (differenza: ${minutesDiff} minuti)`);
        } else {
          console.log(`✅ TIMING CORRETTO: Ricevuta al momento giusto (differenza: ${minutesDiff} minuti)`);
        }
      }

      // Gestione auto-rinnovamento
      if (data?.type === 'auto_renewal') {
        console.log('🔄 Triggered auto-renewal');
        this.handleAutoRenewal();
      }
    });

    // Listener per click su notifiche
    Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Notifica cliccata:', data);

      // Gestisci diverse azioni in base al tipo
      switch (data?.type) {
        case 'work_reminder':
        case 'time_entry_reminder':
          // Naviga alla schermata di inserimento orari
          // NavigationService.navigate('TimeEntryForm');
          break;
        case 'daily_summary':
          // Naviga alla dashboard
          // NavigationService.navigate('Dashboard');
          break;
        case 'overtime_alert':
          // Mostra alert informativo
          break;
        case 'standby_reminder':
          // Naviga alle impostazioni reperibilità
          // NavigationService.navigate('StandbySettings');
          break;
        case 'auto_renewal':
          // Auto-rinnovamento già gestito nel listener di ricezione
          console.log('🔄 Auto-rinnovamento completato tramite click');
          break;
      }
    });
  }

  // Programma avvisi straordinario (placeholder - non hanno bisogno di programmazione automatica)
  async scheduleOvertimeAlerts(overtimeSettings) {
    // Gli avvisi straordinario sono programmati dinamicamente quando necessario
    // Questo metodo esiste per compatibilità con il sistema di programmazione
    console.log('📋 Configurazione avvisi straordinario aggiornata:', overtimeSettings);
    return true;
  }

  // Metodo per aggiornare promemoria specifici senza riprogrammare tutto
  async updateSpecificReminders(type, settings) {
    switch (type) {
      case 'work':
        await this.scheduleWorkReminders(settings.workReminders);
        break;
      case 'timeEntry':
        await this.scheduleTimeEntryReminders(settings.timeEntryReminders);
        break;
      case 'dailySummary':
        await this.scheduleDailySummary(settings.dailySummary);
        break;
      case 'overtime':
        await this.scheduleOvertimeAlerts(settings.overtimeAlerts);
        break;
    }
  }

  // Calcola statistiche notifiche per la dashboard
  async getNotificationStats() {
    const scheduled = await this.getScheduledNotifications();
    const settings = await this.getSettings();
    
    return {
      totalScheduled: scheduled.length,
      enabled: settings.enabled,
      activeReminders: [
        settings.workReminders.enabled && 'Promemoria lavoro',
        settings.timeEntryReminders.enabled && 'Inserimento orari',
        settings.dailySummary.enabled && 'Riepilogo giornaliero',
        settings.overtimeAlerts.enabled && 'Avvisi straordinario'
      ].filter(Boolean)
    };
  }

  // Metodo pubblico per aggiornare le notifiche di reperibilità quando il calendario cambia
  async updateStandbyNotifications() {
    try {
      // Throttling specifico per evitare chiamate multiple
      if (this.schedulingInProgress) {
        console.log('📞 Aggiornamento reperibilità saltato - programmazione in corso');
        return;
      }

      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.standbyReminders?.enabled) {
        console.log('📞 Aggiornamento notifiche reperibilità saltato - disabilitate');
        return;
      }

      console.log('📞 INIZIO aggiornamento notifiche reperibilità...');

      // Forza la sincronizzazione delle settings al database prima di cercare le date
      console.log('📞 Sincronizzazione settings->database...');
      const DatabaseService = (await import('./DatabaseService')).default;
      await DatabaseService.syncStandbySettingsToDatabase();

      // Cancella solo le notifiche di reperibilità esistenti
      const currentNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const standbyNotifications = currentNotifications.filter(notif => 
        notif.content.data?.type === 'standby_reminder'
      );
      
      console.log(`📞 Cancellando ${standbyNotifications.length} notifiche reperibilità esistenti...`);
      for (const notification of standbyNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      // Riprogramma le notifiche di reperibilità
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2); // Programma per i prossimi 2 mesi
      const standbyDates = await this.getStandbyDatesFromSettings(new Date(), endDate);
      
      if (standbyDates.length > 0) {
        await this.scheduleStandbyReminders(standbyDates, settings);
        console.log(`📞 Aggiornate notifiche reperibilità per ${standbyDates.length} date`);
      } else {
        console.log('📞 Nessuna data di reperibilità trovata nel database');
      }

      // Verifica il totale finale
      const finalNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`📞 Aggiornamento completato. Notifiche totali: ${finalNotifications.length}`);

    } catch (error) {
      console.error('❌ Errore nell\'aggiornamento notifiche reperibilità:', error);
    }
  }

  // Programma automaticamente il rinnovamento delle notifiche
  async setupAutoRenewal() {
    try {
      // Cancella eventuali auto-rinnovamenti precedenti
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const autoRenewalNotifications = allScheduled.filter(notification => 
        notification.content?.data?.type === 'auto_renewal'
      );
      
      for (const notification of autoRenewalNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      // Programma il rinnovo tra 3 settimane (21 giorni)
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 21);
      renewalDate.setHours(2, 0, 0, 0); // 2:00 di notte per non disturbare

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔄 Sistema Notifiche',
          body: 'Rinnovamento automatico delle notifiche in corso...',
          sound: false,
          data: { 
            type: 'auto_renewal',
            scheduledDate: renewalDate.toISOString()
          }
        },
        trigger: {
          date: renewalDate,
        },
      });

      console.log(`  ✅ Auto-rinnovamento programmato per ${renewalDate.toLocaleDateString('it-IT')} alle 02:00`);
    } catch (error) {
      console.error('  ❌ Errore programmazione auto-rinnovamento:', error);
    }
  }

  // Handler per il rinnovamento automatico
  async handleAutoRenewal() {
    try {
      console.log('🔄 Avvio rinnovamento automatico notifiche...');
      
      // Ottieni le impostazioni correnti
      const settings = await this.getSettings();
      
      if (settings.enabled) {
        // Riprogramma tutte le notifiche
        await this.scheduleNotifications(settings);
        console.log('✅ Rinnovamento automatico completato');
      } else {
        console.log('⚠️ Notifiche disabilitate, rinnovamento saltato');
      }
    } catch (error) {
      console.error('❌ Errore durante rinnovamento automatico:', error);
    }
  }

  // 🔧 DEBUG: Funzione per diagnosticare problemi notifiche
  async debugNotifications() {
    try {
      console.log('🔧 === DEBUG NOTIFICHE ===');
      
      // 1. Controlla permessi
      const permissions = await Notifications.getPermissionsAsync();
      console.log(`🔧 Permessi: ${permissions.status}`);
      
      // 2. Controlla notifiche programmate
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔧 Notifiche programmate: ${scheduled.length}`);
      
      if (scheduled.length > 0) {
        console.log('🔧 LISTA DETTAGLIATA:');
        scheduled.forEach((notif, index) => {
          console.log(`  ${index + 1}. ID: ${notif.identifier}`);
          console.log(`     Titolo: ${notif.content.title}`);
          console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
          console.log(`     Data: ${notif.content.data ? JSON.stringify(notif.content.data) : 'Nessuna'}`);
        });
      }
      
      // 3. Controlla settings
      const settings = await this.getSettings();
      console.log(`🔧 Notifiche abilitate: ${settings.enabled}`);
      console.log(`🔧 Work reminders: ${settings.workReminders?.enabled}`);
      console.log(`🔧 Time entry reminders: ${settings.timeEntryReminders?.enabled}`);
      console.log(`🔧 Daily summary: ${settings.dailySummary?.enabled}`);
      console.log(`🔧 Standby reminders: ${settings.standbyReminders?.enabled}`);
      console.log(`🔧 Overtime alerts: ${settings.overtimeAlerts?.enabled}`);
      
      // 4. Controlla timestamp ultima programmazione
      const lastSchedule = new Date(this.lastScheduleTime);
      console.log(`🔧 Ultima programmazione: ${lastSchedule.toLocaleString('it-IT')}`);
      console.log(`🔧 Programmazione in corso: ${this.schedulingInProgress}`);
      
      return {
        permissions: permissions.status,
        scheduledCount: scheduled.length,
        settings: settings,
        lastSchedule: lastSchedule,
        inProgress: this.schedulingInProgress
      };
      
    } catch (error) {
      console.error('🔧 ❌ Errore nel debug notifiche:', error);
      return null;
    }
  }

  // 🧹 PULIZIA: Cancella tutte le notifiche e reset
  async cleanupAllNotifications() {
    try {
      console.log('🧹 Pulizia completa notifiche...');
      
      // Cancella tutte le notifiche programmate
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Reset stato interno
      this.schedulingInProgress = false;
      this.lastScheduleTime = 0;
      
      // Verifica cancellazione
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🧹 Pulizia completata. Notifiche rimanenti: ${remaining.length}`);
      
      return remaining.length === 0;
      
    } catch (error) {
      console.error('🧹 ❌ Errore nella pulizia notifiche:', error);
      return false;
    }
  }

  // 🎯 PROGRAMMAZIONE FORZATA: Ignora throttling
  async forceScheduleNotifications() {
    console.log('🎯 PROGRAMMAZIONE FORZATA (ignoro throttling)...');
    
    // Reset throttling temporaneamente
    const originalLastScheduleTime = this.lastScheduleTime;
    this.lastScheduleTime = 0;
    this.schedulingInProgress = false;
    
    try {
      await this.scheduleNotifications();
      console.log('🎯 Programmazione forzata completata');
    } finally {
      // Ripristina il timestamp originale se necessario
      if (this.lastScheduleTime === 0) {
        this.lastScheduleTime = Date.now();
      }
    }
  }

  // 🚨 EMERGENZA: Pulisci e riprogramma notifiche
  async emergencyNotificationFix() {
    try {
      console.log('🚨 EMERGENZA: Avvio riparazione notifiche...');
      
      // 1. Cancella TUTTE le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Tutte le notifiche cancellate');
      
      // 2. Reset completo dello stato interno
      this.schedulingInProgress = false;
      this.lastScheduleTime = 0;
      
      // 3. Aspetta un po' per assicurarsi che la cancellazione sia effettiva
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Verifica che non ci siano notifiche residue
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔍 Verifica pulizia: ${remaining.length} notifiche rimanenti`);
      
      if (remaining.length > 0) {
        console.log('⚠️ Alcune notifiche non sono state cancellate, nuovo tentativo...');
        for (const notif of remaining) {
          try {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          } catch (error) {
            console.warn(`⚠️ Impossibile cancellare notifica ${notif.identifier}:`, error);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 5. Ottieni le impostazioni correnti
      const settings = await this.getSettings();
      
      if (!settings.enabled) {
        console.log('⚠️ Notifiche disabilitate nelle impostazioni');
        return { success: false, reason: 'Notifiche disabilitate' };
      }
      
      // 6. Riprogramma CON VERIFICHE AGGIUNTIVE
      console.log('📱 Riprogrammazione notifiche con verifiche anti-immediato...');
      
      // 7. Programma SOLO notifiche di test per verificare il funzionamento
      console.log('🧪 Test preliminare: programmo notifica di verifica...');
      
      const testDate = new Date();
      testDate.setMinutes(testDate.getMinutes() + 2); // 2 minuti nel futuro
      
      const testResult = await this.scheduleNotificationWithVerification(
        '🔧 Test Sistema',
        'Se vedi questa notifica tra 2 minuti, il sistema funziona!',
        testDate,
        { type: 'system_test', immediate: false }
      );
      
      if (testResult.success) {
        console.log('✅ Test notifica programmata con successo');
        
        // 8. Ora programma le notifiche reali con il nuovo sistema
        await this.scheduleNotificationsWithVerification(settings);
        
        // 9. Verifica finale
        const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`✅ Riparazione completata. Notifiche programmate: ${finalScheduled.length}`);
        
        return { 
          success: true, 
          notificationsScheduled: finalScheduled.length,
          message: `Riparazione completata con ${finalScheduled.length} notifiche programmate`
        };
      } else {
        console.log('❌ Test notifica fallito, sistema di notifiche non funzionante');
        return { success: false, reason: 'Sistema notifiche non funzionante' };
      }
      
    } catch (error) {
      console.error('🚨 ❌ Errore nella riparazione di emergenza:', error);
      return { success: false, reason: error.message };
    }
  }

  // Programma notifica con verifica anti-immediato ALTERNATIVA
  async scheduleNotificationWithVerification(title, body, targetDate, data = {}) {
    try {
      const now = new Date();
      const timeDiff = targetDate.getTime() - now.getTime();
      
      // Verifica che la data sia effettivamente nel futuro
      if (timeDiff <= 0) {
        console.warn('⚠️ Data nel passato, saltando programmazione');
        return { success: false, reason: 'Data nel passato' };
      }
      
      // Verifica che la data non sia troppo nel futuro (limite Expo: 64 giorni)
      const maxFuture = 64 * 24 * 60 * 60 * 1000; // 64 giorni in ms
      if (timeDiff > maxFuture) {
        console.warn('⚠️ Data troppo nel futuro, saltando');
        return { success: false, reason: 'Data troppo nel futuro' };
      }
      
      console.log(`📅 Programmando per ${targetDate.toISOString()} (tra ${Math.floor(timeDiff / (1000 * 60))} minuti)`);
      
      // NUOVO: Usa SECONDI invece di DATE per evitare bug Expo
      const delaySeconds = Math.max(30, Math.floor(timeDiff / 1000)); // Minimo 30 secondi
      
      console.log(`⏰ USANDO TRIGGER SECONDI: ${delaySeconds} secondi`);
      
      const notificationRequest = {
        content: {
          title: title,
          body: body,
          sound: 'default',
          data: {
            ...data,
            scheduledDate: targetDate.toISOString(),
            originalScheduledDate: targetDate.toISOString(),
            programmedAt: now.toISOString(),
            verificationEnabled: true,
            antiImmediateDelivery: true,
            triggerType: 'seconds',
            delaySeconds: delaySeconds
          }
        },
        trigger: {
          seconds: delaySeconds, // USA SECONDI invece di DATE
        },
      };
      
      console.log(`📡 Trigger SECONDI usato:`, notificationRequest.trigger);
      
      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);
      
      console.log(`✅ Notifica programmata con SECONDI: ${notificationId}`);
      
      // VERIFICA IMMEDIATA: Controlla che la notifica sia effettivamente programmata
      setTimeout(async () => {
        try {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          const ourNotification = scheduled.find(n => n.identifier === notificationId);
          
          if (ourNotification) {
            console.log(`✅ VERIFICA: Notifica ${notificationId} trovata nella lista programmate`);
            console.log(`   Trigger: ${JSON.stringify(ourNotification.trigger)}`);
          } else {
            console.log(`❌ VERIFICA: Notifica ${notificationId} NON trovata nella lista programmate!`);
          }
        } catch (verifyError) {
          console.warn('⚠️ Errore verifica programmazione:', verifyError);
        }
      }, 2000);
      
      return { success: true, notificationId, actualDate: targetDate, triggerSeconds: delaySeconds };
      
    } catch (error) {
      console.error('❌ Errore programmazione notifica verificata:', error);
      return { success: false, reason: error.message };
    }
  }

  // NUOVO: Test multipli trigger per trovare quello che funziona
  async testAllTriggerTypes() {
    try {
      console.log('🧪 === TEST TUTTI I TRIGGER EXPO ===');
      
      // Cancella tutto prima del test
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Notifiche esistenti cancellate');
      
      const testConfigs = [
        {
          name: 'seconds_30',
          trigger: { seconds: 30 },
          expectedMinutes: 0.5
        },
        {
          name: 'seconds_60',
          trigger: { seconds: 60 },
          expectedMinutes: 1
        },
        {
          name: 'seconds_120',
          trigger: { seconds: 120 },
          expectedMinutes: 2
        },
        {
          name: 'date_1min',
          trigger: (() => {
            const date = new Date();
            date.setMinutes(date.getMinutes() + 1);
            return { date };
          })(),
          expectedMinutes: 1
        },
        {
          name: 'date_2min',
          trigger: (() => {
            const date = new Date();
            date.setMinutes(date.getMinutes() + 2);
            return { date };
          })(),
          expectedMinutes: 2
        },
        {
          name: 'hour_minute_1',
          trigger: (() => {
            const now = new Date();
            return {
              hour: now.getHours(),
              minute: now.getMinutes() + 1
            };
          })(),
          expectedMinutes: 1
        },
        {
          name: 'hour_minute_2',
          trigger: (() => {
            const now = new Date();
            return {
              hour: now.getHours(),
              minute: now.getMinutes() + 2
            };
          })(),
          expectedMinutes: 2
        }
      ];
      
      const results = [];
      
      for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        try {
          console.log(`🧪 Test ${i + 1}/${testConfigs.length}: ${config.name}`);
          console.log(`   Trigger: ${JSON.stringify(config.trigger)}`);
          console.log(`   Atteso: ${config.expectedMinutes} min`);
          
          const startTime = new Date();
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🧪 Test ${i + 1}: ${config.name}`,
              body: `Trigger ${config.name} - Dovrebbe arrivare tra ${config.expectedMinutes} min. Programmato: ${startTime.toLocaleTimeString('it-IT')}`,
              sound: 'default',
              data: {
                type: 'trigger_test',
                triggerType: config.name,
                testNumber: i + 1,
                expectedMinutes: config.expectedMinutes,
                programmingTime: startTime.toISOString(),
                trigger: config.trigger
              }
            },
            trigger: config.trigger
          });
          
          results.push({
            testNumber: i + 1,
            name: config.name,
            success: true,
            notificationId,
            trigger: config.trigger,
            expectedMinutes: config.expectedMinutes
          });
          
          console.log(`   ✅ Programmato - ID: ${notificationId.substring(0, 8)}...`);
          
        } catch (error) {
          console.error(`   ❌ Errore: ${error.message}`);
          results.push({
            testNumber: i + 1,
            name: config.name,
            success: false,
            error: error.message
          });
        }
        
        // Piccola pausa tra i test
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Verifica quanti sono stati effettivamente programmati
      setTimeout(async () => {
        try {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          console.log(`🔍 === VERIFICA FINALE ===`);
          console.log(`📊 Notifiche programmate: ${scheduled.length}`);
          
          if (scheduled.length > 0) {
            console.log('📋 Lista dettagliata:');
            scheduled.forEach((notif, idx) => {
              const testType = notif.content.data?.triggerType;
              const testNumber = notif.content.data?.testNumber;
              if (testType) {
                console.log(`  ${idx + 1}. Test ${testNumber}: ${testType}`);
                console.log(`      Trigger: ${JSON.stringify(notif.trigger)}`);
                console.log(`      Atteso: ${notif.content.data?.expectedMinutes} min`);
              }
            });
          }
          
          console.log('');
          console.log('⏰ === MONITORAGGIO ===');
          console.log('📱 Osserva QUANDO arrivano le notifiche:');
          console.log('✅ Se arrivano al momento giusto = Trigger funzionante');
          console.log('❌ Se arrivano subito = Trigger rotto');
          
        } catch (verifyError) {
          console.error('❌ Errore verifica finale:', verifyError);
        }
      }, 3000);
      
      return results;
      
    } catch (error) {
      console.error('❌ Errore test trigger multipli:', error);
      return [];
    }
  }

  // Versione migliorata di scheduleNotifications con verifiche
  async scheduleNotificationsWithVerification(settings = null) {
    try {
      console.log('📱 🔧 INIZIO programmazione verificata...');

      if (!settings) {
        settings = await this.getSettings();
      }

      if (!settings.enabled) {
        console.log('📱 ❌ Notifiche disabilitate nelle impostazioni');
        return;
      }

      let totalScheduled = 0;
      let totalFailed = 0;
      
      // SOLO Time Entry Reminders per ora (evitando spam)
      if (settings.timeEntryReminders?.enabled) {
        console.log('📱 ✍️ Programmando promemoria inserimento con verifica...');
        
        const [hours, minutes] = settings.timeEntryReminders.time.split(':');
        const daysToSchedule = settings.timeEntryReminders.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        
        // Solo prossimi 7 giorni per ridurre il problema
        const now = new Date();
        for (let day = 0; day < 7; day++) {
          for (const dayOfWeek of daysToSchedule) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + day);
            
            // Se non è il giorno giusto, salta
            if (targetDate.getDay() !== dayOfWeek) continue;
            
            targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Se è oggi e l'ora è già passata, salta
            if (day === 0 && targetDate <= now) continue;
            
            const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const result = await this.scheduleNotificationWithVerification(
              isWeekend ? '📝 Inserimento Orari Weekend' : '📝 Inserimento Orari',
              isWeekend 
                ? 'Se hai lavorato oggi, ricordati di inserire gli orari.'
                : 'Hai inserito gli orari di lavoro di oggi?',
              targetDate,
              { 
                type: 'time_entry_reminder', 
                day: dayOfWeek,
                dayName: dayNames[dayOfWeek]
              }
            );
            
            if (result.success) {
              totalScheduled++;
              console.log(`  ✅ ${dayNames[dayOfWeek]} ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
            } else {
              totalFailed++;
              console.log(`  ❌ FAILED ${dayNames[dayOfWeek]}: ${result.reason}`);
            }
          }
        }
      }
      
      console.log(`✅ Programmazione verificata completata: ${totalScheduled} successi, ${totalFailed} fallimenti`);
      
    } catch (error) {
      console.error('❌ Errore nella programmazione verificata:', error);
    }
  }

  // Funzione per test rapido delle notifiche corrette
  async scheduleTestNotification(title, body, delaySeconds = 10) {
    try {
      const triggerDate = new Date();
      triggerDate.setSeconds(triggerDate.getSeconds() + delaySeconds);

      console.log(`🧪 Test notifica: programmando per ${triggerDate.toISOString()} (tra ${delaySeconds} secondi)`);

      // Usa il nuovo sistema di verifica
      const result = await this.scheduleNotificationWithVerification(
        title,
        body,
        triggerDate,
        { 
          type: 'test_notification',
          testTime: triggerDate.toISOString(),
          version: 'verified_system',
          immediate: false
        }
      );

      if (result.success) {
        console.log(`🧪 ✅ Test notifica programmata con successo`);
        return true;
      } else {
        console.log(`🧪 ❌ Test notifica fallita: ${result.reason}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Errore programmazione notifica di test:', error);
      throw error;
    }
  }

  // 🔧 Diagnostica avanzata del sistema notifiche
  async advancedNotificationDiagnostic() {
    try {
      console.log('🔧 === DIAGNOSTICA AVANZATA NOTIFICHE ===');
      
      // 1. Verifica permessi
      const permissions = await Notifications.getPermissionsAsync();
      console.log(`🔧 Permessi: ${permissions.status}`);
      
      // 2. Controlla notifiche esistenti
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔧 Notifiche programmate: ${scheduled.length}`);
      
      // 3. Analizza notifiche problematiche
      const now = new Date();
      let immediateNotifications = 0;
      let futureNotifications = 0;
      let expiredNotifications = 0;
      
      for (const notif of scheduled) {
        if (notif.trigger?.date) {
          const triggerDate = new Date(notif.trigger.date);
          const timeDiff = triggerDate.getTime() - now.getTime();
          
          if (timeDiff <= 0) {
            expiredNotifications++;
          } else if (timeDiff < 60000) { // Meno di 1 minuto
            immediateNotifications++;
          } else {
            futureNotifications++;
          }
        }
      }
      
      console.log(`🔧 Analisi timing:`);
      console.log(`   - Immediate (< 1 min): ${immediateNotifications}`);
      console.log(`   - Future (> 1 min): ${futureNotifications}`);
      console.log(`   - Expired: ${expiredNotifications}`);
      
      // 4. Test rapido del sistema
      console.log(`� Test sistema: programmando notifica tra 30 secondi...`);
      const testResult = await this.scheduleTestNotification(
        '🔧 Test Diagnostica',
        'Test timing sistema notifiche',
        30
      );
      
      // 5. Verifica se la notifica è stata davvero programmata
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterTest = await Notifications.getAllScheduledNotificationsAsync();
      const testNotifications = afterTest.filter(n => n.content.data?.type === 'test_notification');
      
      console.log(`🔧 Test completato: ${testNotifications.length} notifiche test trovate`);
      
      return {
        permissions: permissions.status,
        totalScheduled: scheduled.length,
        immediateCount: immediateNotifications,
        futureCount: futureNotifications,
        expiredCount: expiredNotifications,
        testResult: testResult,
        testNotificationsFound: testNotifications.length
      };
      
    } catch (error) {
      console.error('🔧 ❌ Errore diagnostica avanzata:', error);
      return null;
    }
  }

}

// Esporta un'istanza singleton
export default new NotificationService();
