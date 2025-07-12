import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

class NotificationService {
  constructor() {
    this.setupNotificationHandler();
    this.schedulingInProgress = false; // Throttling per evitare chiamate multiple
    this.lastScheduleTime = 0;
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
      // Throttling per evitare chiamate multiple simultanee
      const now = Date.now();
      if (this.schedulingInProgress) {
        console.log('📱 Programmazione notifiche già in corso, saltando...');
        return;
      }
      
      if (now - this.lastScheduleTime < 5000) { // 5 secondi di cooldown
        console.log('📱 Programmazione notifiche troppo recente, saltando...');
        return;
      }

      this.schedulingInProgress = true;
      this.lastScheduleTime = now;

      console.log('📱 INIZIO programmazione notifiche...');

      if (!settings) {
        settings = await this.getSettings();
      }

      // Cancella tutte le notifiche esistenti
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Notifiche esistenti cancellate');

      if (!settings.enabled) {
        console.log('📱 Notifiche disabilitate');
        return;
      }

      // Programma i vari tipi di notifiche
      console.log('📱 Programmando promemoria lavoro...');
      await this.scheduleWorkReminders(settings.workReminders);
      
      console.log('📱 Programmando promemoria inserimento orari...');
      await this.scheduleTimeEntryReminders(settings.timeEntryReminders);
      
      console.log('📱 Programmando riepilogo giornaliero...');
      await this.scheduleDailySummary(settings.dailySummary);
      
      console.log('📱 Configurando avvisi straordinario...');
      await this.scheduleOvertimeAlerts(settings.overtimeAlerts);
      
      // Programma i promemoria di reperibilità
      if (settings.standbyReminders?.enabled) {
        console.log('📱 Programmando promemoria reperibilità...');
        
        // Forza la sincronizzazione delle settings al database prima di cercare le date
        const DatabaseService = (await import('./DatabaseService')).default;
        const syncCount = await DatabaseService.syncStandbySettingsToDatabase();
        console.log(`📞 SYNC: ${syncCount} date sincronizzate dal settings al database`);
        
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2); // Programma per i prossimi 2 mesi
        const standbyDates = await this.getStandbyDatesFromSettings(new Date(), endDate);
        if (standbyDates.length > 0) {
          await this.scheduleStandbyReminders(standbyDates, settings);
        } else {
          console.log('📞 Nessuna data di reperibilità trovata per programmare notifiche');
          console.log('📞 SUGGERIMENTO: Controlla che le date di reperibilità siano state impostate nel calendario');
        }
      }

      // Verifica quante notifiche sono state programmate in totale
      const totalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`✅ Programmazione notifiche completata. Totale programmate: ${totalScheduled.length}`);
      
      // Log dettagliato delle notifiche programmate
      totalScheduled.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.content.title} - Tipo: ${notif.content.data?.type || 'unknown'}`);
      });

    } catch (error) {
      console.error('❌ Errore nella programmazione notifiche:', error);
    } finally {
      this.schedulingInProgress = false;
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
}

// Esporta un'istanza singleton
export default new NotificationService();
