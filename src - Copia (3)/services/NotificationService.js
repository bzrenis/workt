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
        const workCount = await this.scheduleWorkReminders(settings.workReminders);
        totalScheduled += workCount;
      }
      
      if (settings.timeEntryReminders?.enabled) {
        console.log('📱 ✍️ Programmando promemoria inserimento orari...');
        const entryCount = await this.scheduleTimeEntryReminders(settings.timeEntryReminders);
        totalScheduled += entryCount;
      }
      
      if (settings.dailySummary?.enabled) {
        console.log('📱 📊 Programmando riepilogo giornaliero...');
        await this.scheduleDailySummary(settings.dailySummary);
        totalScheduled += 1;
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
      console.log(`✅ 🎯 Programmazione completata! Notifiche attive: ${finalScheduled.length}`);
      
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
          title: isWeekend ? '📝 Inserimento Orari Weekend' : '📝 Inserimento Orari',
          body: isWeekend 
            ? 'Se hai lavorato oggi, ricordati di inserire gli orari.'
            : 'Hai inserito gli orari di lavoro di oggi?',
          sound: true,
          data: { 
            type: 'time_entry_reminder', 
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
      
      // Gestione auto-rinnovamento
      const data = notification.request.content.data;
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

  // Funzione per test rapido delle notifiche corrette
  async scheduleTestNotification(title, body, delaySeconds = 10) {
    try {
      const triggerDate = new Date();
      triggerDate.setSeconds(triggerDate.getSeconds() + delaySeconds);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: true,
          data: { 
            type: 'test_notification',
            testTime: triggerDate.toISOString(),
            version: 'corrected_system'
          }
        },
        trigger: {
          date: triggerDate,
        },
      });

      console.log(`🧪 Notifica di test programmata per ${triggerDate.toLocaleTimeString('it-IT')}`);
      return true;
    } catch (error) {
      console.error('❌ Errore programmazione notifica di test:', error);
      throw error;
    }
  }

}

// Esporta un'istanza singleton
export default new NotificationService();
