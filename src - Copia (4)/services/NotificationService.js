import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class NotificationService {
  constructor() {
    this.setupNotificationHandler();
  }

  setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  // Richiede i permessi per le notifiche
  async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
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

  // Programma tutte le notifiche
  async scheduleNotifications(settings = null) {
    try {
      if (!settings) {
        settings = await this.getSettings();
      }

      // Cancella tutte le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (!settings.enabled) {
        console.log('📱 Notifiche disabilitate');
        return;
      }

      // Programma i vari tipi di notifiche
      await this.scheduleWorkReminders(settings.workReminders);
      await this.scheduleTimeEntryReminders(settings.timeEntryReminders);
      await this.scheduleDailySummary(settings.dailySummary);
      await this.scheduleOvertimeAlerts(settings.overtimeAlerts);

      console.log('✅ Notifiche programmate con successo');
    } catch (error) {
      console.error('❌ Errore nella programmazione notifiche:', error);
    }
  }

  // Programma promemoria inizio lavoro
  async scheduleWorkReminders(settings) {
    if (!settings.enabled) return;

    const [hours, minutes] = settings.morningTime.split(':');
    const daysToSchedule = settings.weekendsEnabled ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

    for (const day of daysToSchedule) {
      const isWeekend = day === 6 || day === 7;
      const content = {
        title: isWeekend ? '🌅 Weekend' : '🌅 Buongiorno!',
        body: isWeekend 
          ? 'Se lavori oggi, ricordati di registrare gli orari.'
          : 'Ricordati di registrare gli orari di lavoro di oggi.',
        sound: true,
        data: { type: 'work_reminder', day: day }
      };

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          weekday: day,
          hour: parseInt(hours),
          minute: parseInt(minutes),
          repeats: true,
        },
      });
    }
  }

  // Programma promemoria inserimento orari
  async scheduleTimeEntryReminders(settings) {
    if (!settings.enabled) return;

    const [hours, minutes] = settings.time.split(':');
    const daysToSchedule = settings.weekendsEnabled ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5];

    for (const day of daysToSchedule) {
      const isWeekend = day === 6 || day === 7;
      const content = {
        title: isWeekend ? '📝 Inserimento Orari Weekend' : '📝 Inserimento Orari',
        body: isWeekend 
          ? 'Se hai lavorato oggi, ricordati di inserire gli orari.'
          : 'Hai inserito gli orari di lavoro di oggi?',
        sound: true,
        data: { type: 'time_entry_reminder', day: day }
      };

      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          weekday: day,
          hour: parseInt(hours),
          minute: parseInt(minutes),
          repeats: true,
        },
      });
    }
  }

  // Programma riepilogo giornaliero
  async scheduleDailySummary(settings) {
    if (!settings.enabled) return;

    const [hours, minutes] = settings.time.split(':');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Riepilogo Giornaliero',
        body: 'Controlla il tuo riepilogo guadagni di oggi.',
        sound: true,
        data: { type: 'daily_summary' }
      },
      trigger: {
        hour: parseInt(hours),
        minute: parseInt(minutes),
        repeats: true,
      },
    });
  }

  // Programma avvisi straordinario (chiamato dinamicamente quando si inseriscono orari)
  async checkOvertimeAlert(workHours, settings = null) {
    if (!settings) {
      settings = await this.getSettings();
    }

    if (!settings.enabled || !settings.overtimeAlerts.enabled) return;

    if (workHours > settings.overtimeAlerts.hoursThreshold) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Straordinario Rilevato',
          body: `Hai superato le ${settings.overtimeAlerts.hoursThreshold} ore giornaliere (${workHours.toFixed(1)}h totali).`,
          sound: true,
          data: { 
            type: 'overtime_alert', 
            hours: workHours,
            threshold: settings.overtimeAlerts.hoursThreshold
          }
        },
        trigger: { seconds: 5 },
      });
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

          await Notifications.scheduleNotificationAsync({
            content: {
              title: title,
              body: body,
              sound: 'default',
              data: { 
                type: 'standby_reminder',
                standbyDate: dateStr,
                daysInAdvance: notification.daysInAdvance
              }
            },
            trigger: { date: reminderDate },
          });

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

  // Sincronizza notifiche di reperibilità con il calendario
  async syncStandbyNotificationsWithCalendar() {
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.standbyReminders.enabled) {
        console.log('📞 Sincronizzazione reperibilità saltata: notifiche disabilitate');
        return;
      }

      // Importa DatabaseService per accedere al calendario reperibilità
      const DatabaseService = require('./DatabaseService').default;
      
      // Ottieni le date di reperibilità future (prossimi 30 giorni)
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);
      
      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];
      
      // Cerca nel calendario delle impostazioni reperibilità
      // Le date sono salvate come stringhe nel formato 'yyyy-MM-dd'
      const standbyDates = await this.getStandbyDatesFromSettings(startDate, endDate);
      
      if (standbyDates.length > 0) {
        console.log(`📞 Trovate ${standbyDates.length} date di reperibilità future`);
        
        // Cancella solo le notifiche di reperibilità esistenti
        await this.cancelStandbyNotifications();
        
        // Riprogramma le notifiche di reperibilità
        await this.scheduleStandbyReminders(standbyDates, settings);
      } else {
        console.log('📞 Nessuna data di reperibilità trovata nel calendario');
      }
      
      return standbyDates.length;
    } catch (error) {
      console.error('❌ Errore nella sincronizzazione notifiche reperibilità:', error);
      return 0;
    }
  }

  // Ottieni date di reperibilità dalle impostazioni
  async getStandbyDatesFromSettings(startDate, endDate) {
    try {
      // Carica le impostazioni reperibilità da AsyncStorage
      const standbySettings = await AsyncStorage.getItem('standby_settings');
      if (!standbySettings) return [];
      
      const settings = JSON.parse(standbySettings);
      const standbyDates = [];
      
      // Controlla il calendario reperibilità
      if (settings.calendar && Array.isArray(settings.calendar)) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (const dateStr of settings.calendar) {
          const date = new Date(dateStr);
          if (date >= start && date <= end) {
            standbyDates.push(dateStr);
          }
        }
      }
      
      return standbyDates.sort();
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

  // Cancella tutte le notifiche
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ Tutte le notifiche sono state cancellate');
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
      console.log('📬 Notifica ricevuta:', notification);
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
}

// Esporta un'istanza singleton
export default new NotificationService();
