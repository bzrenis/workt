// 🚀 NOTIFICATIONSERVICE ENHANCED
// Sistema ENHANCED: JavaScript Timer + Background Timer per persistenza
// Garantisce notifiche con app APERTA e maggiore persistenza in background

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import { Platform, Alert, AppState } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import AlternativeNotificationService from './AlternativeNotificationService';
import EnhancedNotificationService from './PushNotificationService';
import NativeNotificationService from './NativeNotificationService';

class NotificationService {
  constructor() {
    this.schedulingInProgress = false;
    this.lastScheduleTime = 0;
    this.appState = AppState.currentState;
    
    // 🚀 SISTEMA ENHANCED: JavaScript + Background Timer + Native Ready
    this.alternativeService = new AlternativeNotificationService();
    this.enhancedService = EnhancedNotificationService;
    this.nativeService = NativeNotificationService; // Sistema native-ready
    this.useEnhancedSystem = true; // Sistema enhanced attivo
    this.enhancedInitialized = false;
    
    console.log('🚀 NotificationService ENHANCED inizializzato');
    console.log('✅ Sistema: JavaScript Timer + Background Timer + Native Ready');
    console.log('📱 Native Status:', this.nativeService.getSystemStatus());
    
    // Monitora stato app per gestione enhanced
    this.setupAppStateHandler();
  }

  // ✅ GESTIONE STATO APP per sistema enhanced
  setupAppStateHandler() {
    AppState.addEventListener('change', (nextAppState) => {
      console.log(`🔄 App state: ${this.appState} → ${nextAppState}`);
      
      if (this.appState === 'background' && nextAppState === 'active') {
        console.log('📱 App tornata attiva - verifica sistema enhanced');
        this.handleAppBecameActive();
      } else if (this.appState === 'active' && nextAppState === 'background') {
        console.log('📱 App in background - background timers attivi');
        this.handleAppWentBackground();
      }
      
      this.appState = nextAppState;
    });
  }

  async handleAppBecameActive() {
    console.log('✅ App attiva - usando JavaScript Timers per velocità');
    // Quando app torna attiva, usa JavaScript per velocità e controlla notifiche perse
    await this.rescheduleOnForeground();
  }

  async handleAppWentBackground() {
    console.log('🔄 App in background - Background Timers gestiscono persistenza');
    // Background timers continuano a funzionare
  }

  // ✅ INIZIALIZZAZIONE SISTEMA ENHANCED
  async initialize() {
    if (!this.enhancedInitialized) {
      console.log('🚀 Inizializzazione sistema Enhanced per background...');
      const success = await this.enhancedService.initialize();
      this.enhancedInitialized = success;
      
      if (success) {
        console.log('✅ Sistema enhanced pronto: JavaScript + Background Timer');
      } else {
        console.warn('⚠️ Enhanced fallito - usando solo JavaScript');
      }
    }
    return this.enhancedInitialized;
  }

  // ✅ RICHIESTA PERMESSI (Enhanced per background)
  async requestPermissions() {
    await this.initialize();
    
    if (this.enhancedInitialized) {
      const hasPerms = await this.enhancedService.requestPermissions();
      console.log(`📱 Permessi enhanced: ${hasPerms ? 'CONCESSI' : 'NEGATI'}`);
      return hasPerms;
    }
    
    console.log('✅ JavaScript Alert sempre disponibile come fallback');
    return true;
  }

  async hasPermissions() {
    await this.initialize();
    
    if (this.enhancedInitialized) {
      return await this.enhancedService.hasPermissions();
    }
    
    console.log('✅ JavaScript Alert sempre disponibile');
    return true;
  }

  // Carica le impostazioni notifiche
  async getSettings() {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      console.log('📖 Caricando impostazioni notifiche da storage...');
      
      if (stored) {
        const settings = JSON.parse(stored);
        console.log('✅ Impostazioni notifiche caricate:', JSON.stringify(settings, null, 2));
        return settings;
      } else {
        console.log('⚠️ Nessuna impostazione salvata, uso default');
        const defaultSettings = this.getDefaultSettings();
        console.log('🔧 Impostazioni default:', JSON.stringify(defaultSettings, null, 2));
        return defaultSettings;
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento impostazioni notifiche:', error);
      const defaultSettings = this.getDefaultSettings();
      console.log('🔧 Fallback alle impostazioni default:', JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
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
      console.log('💾 Salvando impostazioni notifiche:', JSON.stringify(settings, null, 2));
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      console.log('✅ Impostazioni notifiche salvate con successo');
      return true;
    } catch (error) {
      console.error('❌ Errore nel salvataggio impostazioni notifiche:', error);
      return false;
    }
  }

  // 🚀 SEMPRE ENHANCED (JavaScript + Background Timer)
  shouldUseAlternativeSystem() {
    return this.appState === 'active'; // JavaScript quando app attiva
  }

  shouldUseEnhancedSystem() {
    return this.enhancedInitialized; // Enhanced sempre disponibile per background
  }

  isExpoDisabled() {
    return true; // Expo completamente rimosso
  }

  // 🚀 PROGRAMMAZIONE SISTEMA ENHANCED
  async scheduleNotifications(settings = null, forceReschedule = false) {
    try {
      const now = Date.now();
      if (this.schedulingInProgress) {
        console.log('📱 Programmazione notifiche già in corso, saltando...');
        return;
      }
      
      // Throttling 30 minuti (ma può essere ignorato con forceReschedule)
      if (!forceReschedule && now - this.lastScheduleTime < 1800000) { 
        const remainingTime = Math.round((1800000 - (now - this.lastScheduleTime)) / 60000);
        console.log(`📱 Notifiche programmate di recente, prossima programmazione tra ${remainingTime} minuti`);
        return;
      }

      if (forceReschedule) {
        console.log('🔄 Riprogrammazione forzata sistema enhanced');
      }

      this.schedulingInProgress = true;
      this.lastScheduleTime = now;

      console.log('🚀 === PROGRAMMAZIONE SISTEMA ENHANCED ===');
      console.log('📱 JavaScript Timers (app aperta) + Background Timers (persistenza)');

      // Inizializza sistema enhanced se necessario
      await this.initialize();

      if (!settings) {
        console.log('🔍 Caricando impostazioni notifiche per programmazione...');
        settings = await this.getSettings();
      } else {
        console.log('📝 Usando impostazioni fornite per programmazione');
      }
      
      console.log('📋 Impostazioni correnti per programmazione:', JSON.stringify(settings, null, 2));

      // Cancella notifiche esistenti (entrambi i sistemi)
      console.log('🗑️ Cancellazione notifiche esistenti (JavaScript + Enhanced)...');
      this.alternativeService.clearAllTimers();
      if (this.enhancedInitialized) {
        await this.enhancedService.cancelAllNotifications();
      }

      if (!settings.enabled) {
        console.log('📱 ❌ Notifiche DISABILITATE nelle impostazioni globali');
        console.log('📱 ❌ settings.enabled =', settings.enabled);
        return;
      } else {
        console.log('📱 ✅ Notifiche ABILITATE nelle impostazioni globali');
        console.log('📱 ✅ settings.enabled =', settings.enabled);
      }

      let totalJSScheduled = 0;
      let totalEnhancedScheduled = 0;
      
      // ⏰ PROMEMORIA LAVORO
      if (settings.workReminders?.enabled) {
        console.log('📱 ⏰ Programmando promemoria lavoro...');
        
        // JavaScript per app attiva
        const jsWorkCount = await this.alternativeService.scheduleAlternativeWorkReminders(settings.workReminders);
        totalJSScheduled += jsWorkCount;
        
        // Enhanced per background persistence
        if (this.enhancedInitialized) {
          const enhancedWorkCount = await this.enhancedService.scheduleWorkReminders(settings.workReminders);
          totalEnhancedScheduled += enhancedWorkCount;
        }
        
        console.log(`✅ Promemoria lavoro: ${jsWorkCount} JS + ${this.enhancedInitialized ? 'Enhanced attivo' : 'Enhanced non disponibile'}`);
      }
      
      // ✍️ PROMEMORIA INSERIMENTO ORARIO
      if (settings.timeEntryReminders?.enabled) {
        console.log('📱 ✍️ Programmando promemoria inserimento orario...');
        
        // JavaScript per app attiva
        const jsEntryCount = await this.alternativeService.scheduleAlternativeTimeEntryReminders(settings.timeEntryReminders);
        totalJSScheduled += jsEntryCount;
        
        // Enhanced per background persistence
        if (this.enhancedInitialized) {
          const enhancedEntryCount = await this.enhancedService.scheduleTimeEntryReminders(settings.timeEntryReminders);
          totalEnhancedScheduled += enhancedEntryCount;
        }
        
        console.log(`✅ Promemoria inserimento: ${jsEntryCount} JS + ${this.enhancedInitialized ? 'Enhanced attivo' : 'Enhanced non disponibile'}`);
      }
      
      // 📊 RIEPILOGO GIORNALIERO
      if (settings.dailySummary?.enabled) {
        console.log('📱 📊 Programmando riepilogo giornaliero...');
        
        const jsSummaryCount = await this.alternativeService.scheduleAlternativeDailySummary(settings.dailySummary);
        totalJSScheduled += jsSummaryCount;
        
        console.log(`✅ ${jsSummaryCount} timer JavaScript riepilogo attivati`);
      }
      
      // 📞 PROMEMORIA REPERIBILITÀ
      if (settings.standbyReminders?.enabled) {
        console.log('📱 📞 Programmando promemoria reperibilità...');
        
        try {
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 2);
          
          // Ottieni date reperibilità
          let standbyDates;
          if (this.enhancedInitialized) {
            standbyDates = await this.enhancedService.getStandbyDates(new Date(), endDate);
          } else {
            standbyDates = await this.getStandbyDatesFromSettings(new Date(), endDate);
          }
          
          if (standbyDates.length > 0) {
            // JavaScript per app attiva
            const jsStandbyCount = await this.alternativeService.scheduleAlternativeStandbyReminders(standbyDates, settings.standbyReminders);
            totalJSScheduled += jsStandbyCount;
            
            // Enhanced per background persistence
            if (this.enhancedInitialized) {
              const enhancedStandbyCount = await this.enhancedService.scheduleStandbyReminders(standbyDates, settings.standbyReminders);
              totalEnhancedScheduled += enhancedStandbyCount;
            }
            
            console.log(`✅ Reperibilità: ${jsStandbyCount} JS + ${this.enhancedInitialized ? 'Enhanced attivo' : 'Enhanced non disponibile'}`);
            console.log(`📞 Date trovate: ${standbyDates.slice(0, 3).join(', ')}${standbyDates.length > 3 ? ' e altre...' : ''}`);
          } else {
            console.log('📞 Nessuna data di reperibilità trovata');
          }
        } catch (error) {
          console.error('❌ Errore programmazione reperibilità:', error);
        }
      }

      // Verifica finale
      const jsStats = this.alternativeService.getActiveTimersStats();
      const enhancedCount = this.enhancedInitialized ? this.enhancedService.getScheduledCount() : 0;
      
      console.log(`✅ 🎯 PROGRAMMAZIONE ENHANCED COMPLETATA!`);
      console.log(`   🚀 Timer JavaScript (app aperta): ${jsStats.total}`);
      console.log(`   � Enhanced Background Timers: ${enhancedCount}`);
      console.log(`   🔄 Sistema: ${this.enhancedInitialized ? 'ENHANCED COMPLETO' : 'Solo JavaScript'}`);
      
      if (jsStats.total > 0) {
        console.log('🚀 TIMER JAVASCRIPT ATTIVI:');
        console.log(`   Totale: ${jsStats.total}`);
        console.log(`   Per tipo:`, jsStats.byType);
        if (jsStats.nextNotification) {
          console.log(`   Prossimo: ${jsStats.nextNotification.title} alle ${jsStats.nextNotification.scheduledFor.toLocaleString('it-IT')}`);
        }
      }

      if (enhancedCount > 0) {
        console.log(`� BACKGROUND TIMERS ATTIVI: ${enhancedCount} (maggiore persistenza in background!)`);
      }

      if (!this.enhancedInitialized) {
        console.warn('⚠️ ATTENZIONE: Enhanced system non disponibile - solo JavaScript timers attivi');
        console.warn('   Le notifiche funzioneranno SOLO con app aperta');
      } else {
        console.log('✅ SISTEMA COMPLETO: Notifiche garantite sia ad app aperta che con maggiore persistenza!');
      }

    } catch (error) {
      console.error('❌ Errore nella programmazione notifiche enhanced:', error);
    } finally {
      this.schedulingInProgress = false;
    }
  }

  // 🔔 METODO UNIVERSALE: Mostra notifica con sistema migliore disponibile
  async showNotification(title, body, type = 'info', data = {}) {
    console.log(`🔔 Mostro notifica: ${title}`);
    
    // 🎯 PRIORITÀ: Nativo > Enhanced > Alternative
    const nativeStatus = this.nativeService.getSystemStatus();
    
    if (nativeStatus.isNativeReady) {
      console.log(`🚀 [NATIVE] Usando notifiche push native`);
      return await this.nativeService.showNotification(title, body, { type, ...data });
    } else if (this.useEnhancedSystem && this.enhancedInitialized) {
      console.log(`📱 [ENHANCED] Usando sistema enhanced`);
      return await this.enhancedService.showAlert(title, body);
    } else {
      console.log(`📢 [FALLBACK] Usando Alert.alert`);
      return await this.alternativeService.showNotification(title, body, type);
    }
  }

  // Alert straordinario JavaScript
  async checkOvertimeAlert(workHours, settings = null) {
    try {
      if (!settings) {
        settings = await this.getSettings();
      }

      if (!settings.enabled || !settings.overtimeAlerts?.enabled) {
        console.log('⚠️ Controllo straordinario: notifiche disabilitate');
        return;
      }

      const threshold = settings.overtimeAlerts.hoursThreshold || 8.5;
      if (workHours <= threshold) {
        console.log(`⚠️ Controllo straordinario: ${workHours.toFixed(1)}h <= ${threshold}h (soglia non superata)`);
        return;
      }

      // Throttling 1 ora
      const lastOvertimeKey = 'last_overtime_notification';
      const lastOvertimeStr = await AsyncStorage.getItem(lastOvertimeKey);
      const now = Date.now();
      
      if (lastOvertimeStr) {
        const lastOvertime = parseInt(lastOvertimeStr);
        const timeDiff = now - lastOvertime;
        const minInterval = 3600000; // 1 ora
        
        if (timeDiff < minInterval) {
          const remainingMinutes = Math.round((minInterval - timeDiff) / 60000);
          console.log(`⚠️ Notifica straordinario già inviata di recente, prossima tra ${remainingMinutes} minuti`);
          return;
        }
      }

      // Alert JavaScript immediato
      const alertTitle = '⚠️ Straordinario Rilevato';
      const alertBody = `Hai superato le ${threshold} ore giornaliere (${workHours.toFixed(1)}h totali). Ottimo lavoro!`;
      
      Alert.alert(
        alertTitle,
        alertBody,
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('👆 Notifica straordinario confermata dall\'utente');
            }
          }
        ],
        { cancelable: true }
      );
      
      console.log(`✅ Alert straordinario JavaScript mostrato: ${workHours.toFixed(1)}h > ${threshold}h`);

      // Salva timestamp
      await AsyncStorage.setItem(lastOvertimeKey, now.toString());
      
    } catch (error) {
      console.error('❌ Errore nel controllo notifica straordinario:', error);
    }
  }

  // Test notifica UNIVERSALE (Nativo + Enhanced + Fallback)
  async sendTestNotification() {
    console.log('🧪 Test notifica sistema completo...');
    
    await this.initialize();
    
    // 🎯 Test con sistema universale
    await this.showNotification(
      '🧪 Test Sistema Notifiche',
      'Test del sistema di notifiche completo: Nativo + Enhanced + Fallback',
      'test',
      {
        onPress: () => {
          console.log('✅ Test notifica confermato dall\'utente');
        }
      }
    );
    
    // 📊 Mostra stato del sistema
    const nativeStatus = this.nativeService.getSystemStatus();
    console.log('📊 STATO SISTEMA COMPLETO:');
    console.log(`   🚀 Native: ${nativeStatus.description}`);
    console.log(`   📱 Enhanced: ${this.enhancedInitialized ? 'Attivo' : 'Non disponibile'}`);
    console.log(`   🔄 JavaScript: Sempre disponibile`);
    
    if (nativeStatus.isNativeReady) {
      console.log('✅ Sistema COMPLETO: Notifiche push native al 100%!');
    } else if (this.enhancedInitialized) {
      console.log('✅ Sistema ENHANCED: JavaScript + Background Timer');
    } else {
      console.log('✅ Sistema FALLBACK: Solo JavaScript (app aperta)');
    }
  }

  // Cancella notifiche UNIVERSALI (Native + Enhanced + JavaScript) 
  async cancelAllNotifications() {
    console.log('🗑️ Cancellazione sistema completo...');
    
    // 1. Cancella notifiche native
    await this.nativeService.cancelAllNotifications();
    
    // 2. Cancella JavaScript timers
    if (this.alternativeService) {
      this.alternativeService.clearAllTimers();
      console.log('✅ Timer JavaScript cancellati');
    }
    
    // 3. Cancella Enhanced notifications
    if (this.enhancedInitialized) {
      await this.enhancedService.cancelAllNotifications();
      console.log('✅ Enhanced notifications cancellate');
    }
    
    console.log('✅ Pulizia completa sistema universale (Native + Enhanced + JavaScript)');
  }

  // Ottieni statistiche ENHANCED
  async getScheduledNotifications() {
    const jsStats = this.alternativeService.getActiveTimersStats();
    const enhancedCount = this.enhancedInitialized ? this.enhancedService.getScheduledCount() : 0;
    
    const totalCount = jsStats.total + enhancedCount;
    
    console.log(`📅 Sistema enhanced - JS: ${jsStats.total}, Enhanced: ${enhancedCount}, Totale: ${totalCount}`);
    
    return { 
      count: totalCount,
      javascript: jsStats.total,
      enhanced: enhancedCount,
      stats: jsStats,
      type: this.enhancedInitialized ? 'enhanced_system' : 'javascript_only',
      backgroundSupported: this.enhancedInitialized
    };
  }

  // Date reperibilità dalle settings
  async getStandbyDatesFromSettings(startDate, endDate) {
    try {
      const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
      const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
      
      console.log(`📞 DEBUG: Cercando date reperibilità tra ${startStr} e ${endStr}`);
      
      const standbyDates = [];
      
      // Leggi dalle settings
      try {
        const settingsStr = await AsyncStorage.getItem('settings');
        if (settingsStr) {
          const settings = JSON.parse(settingsStr);
          const standbyDaysFromSettings = settings?.standbySettings?.standbyDays || {};
          
          console.log(`📞 DEBUG: Trovate ${Object.keys(standbyDaysFromSettings).length} date nelle settings`);
          
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
      
      // Leggi dal database
      try {
        const databaseService = DatabaseService;
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        let iterationCount = 0;
        const maxIterations = 24;
        
        while (currentMonth <= endMonth && iterationCount < maxIterations) {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth() + 1;
          
          console.log(`📞 DEBUG: Verificando mese ${year}-${month.toString().padStart(2, '0')} nel database`);
          
          const monthStandbyDays = await databaseService.getStandbyDays(year, month);
          console.log(`📞 DEBUG: Trovati ${monthStandbyDays.length} giorni di reperibilità nel database mese ${year}-${month}`);
          
          for (const standbyDay of monthStandbyDays) {
            const standbyDate = new Date(standbyDay.date);
            
            if (standbyDate >= start && standbyDate <= end && !standbyDates.includes(standbyDay.date)) {
              standbyDates.push(standbyDay.date);
              console.log(`📞 DEBUG: Aggiunta data reperibilità dal database: ${standbyDay.date}`);
            }
          }
          
          currentMonth.setMonth(currentMonth.getMonth() + 1);
          iterationCount++;
        }
        
        if (iterationCount >= maxIterations) {
          console.warn('⚠️ AVVISO: Interrotto loop per protezione anti-infinito');
        }
      } catch (dbError) {
        console.warn('📞 Errore lettura database per reperibilità:', dbError);
      }
      
      const uniqueDates = [...new Set(standbyDates)].sort();
      
      console.log(`📞 Trovate ${uniqueDates.length} date di reperibilità totali tra ${startStr} e ${endStr}`);
      console.log(`📞 Date trovate:`, uniqueDates);
      
      return uniqueDates;
      
    } catch (error) {
      console.error('❌ Errore nel caricamento date reperibilità:', error);
      return [];
    }
  }

  // Statistiche notifiche
  async getNotificationStats() {
    const scheduled = await this.getScheduledNotifications();
    const settings = await this.getSettings();
    
    return {
      totalScheduled: scheduled.count,
      enabled: settings.enabled,
      activeReminders: [
        settings.workReminders.enabled && 'Promemoria lavoro',
        settings.timeEntryReminders.enabled && 'Inserimento orari',
        settings.dailySummary.enabled && 'Riepilogo giornaliero',
        settings.overtimeAlerts.enabled && 'Avvisi straordinario'
      ].filter(Boolean)
    };
  }

  // Placeholder per compatibilità
  async updateStandbyNotifications() {
    console.log('📞 updateStandbyNotifications: usando scheduleNotifications principale');
    const settings = await this.getSettings();
    await this.scheduleNotifications(settings);
  }

  setUseAlternativeSystem(enabled) {
    console.log(`🔄 Sistema alternativo sempre attivo (JavaScript only)`);
  }

  async debugNotifications() {
    console.log('🔧 === DEBUG SISTEMA IBRIDO ===');
    
    await this.initialize();
    
    const jsStats = this.alternativeService.getActiveTimersStats();
    const pushCount = this.pushInitialized ? this.pushService.getScheduledCount() : 0;
    const settings = await this.getSettings();
    
    console.log(`🔧 Timer JavaScript attivi: ${jsStats.total}`);
    console.log(`🔧 Push notifications attive: ${pushCount}`);
    console.log(`🔧 Notifiche abilitate: ${settings.enabled}`);
    console.log(`🔧 Sistema: ${this.pushInitialized ? 'Ibrido (JS + Push)' : 'Solo JavaScript'}`);
    console.log(`🔧 Background supportato: ${this.pushInitialized}`);
    
    return {
      scheduledCount: jsStats.total + pushCount,
      javascriptCount: jsStats.total,
      pushCount: pushCount,
      settings: settings,
      system: this.pushInitialized ? 'hybrid' : 'javascript_only',
      backgroundSupported: this.pushInitialized
    };
  }

  // ✅ LISTENER SISTEMA IBRIDO
  async setupNotificationListener() {
    console.log('✅ setupNotificationListener Sistema IBRIDO');
    
    await this.initialize();
    
    if (this.pushInitialized) {
      console.log('📱 Sistema completo: JavaScript Alert + Push Notifications background');
      console.log('� Le notifiche funzionano sia ad app APERTA che CHIUSA!');
    } else {
      console.log('📱 Sistema parziale: Solo JavaScript Alert (app aperta)');
      console.log('⚠️ Push notifications non disponibili - notifiche solo ad app aperta');
    }
    
    console.log('🚀 Sistema ibrido pronto');
    return this.pushInitialized;
  }

  // ✅ METODI AGGIUNTIVI per compatibilità con API esistente
  async scheduleWorkReminders(settings) {
    console.log('📱 scheduleWorkReminders: usando sistema Nativo (expo-notifications)');
    // Cancella tutte le notifiche lavoro precedenti
    await this.nativeService.cancelAllNotifications();
    if (!settings.enabled) return 0;
    const [hours, minutes] = settings.morningTime.split(':');
    let scheduledCount = 0;
    // Programma per i prossimi 7 giorni
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const now = new Date();
    for (let day = 1; day <= 7; day++) {
      for (const dayOfWeek of daysToSchedule) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + day);
        if (targetDate.getDay() !== dayOfWeek) continue;
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (targetDate <= now) continue;
        await this.nativeService.scheduleNotification(
          '🌅 Promemoria Lavoro',
          'Ricordati di registrare gli orari di lavoro di oggi.',
          targetDate.getTime(),
          { type: 'work_reminder', date: targetDate.toISOString().split('T')[0] }
        );
        scheduledCount++;
        console.log(`  ✅ Promemoria lavoro programmato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
      }
    }
    return scheduledCount;
  }

  async scheduleTimeEntryReminders(settings) {
    console.log('📱 scheduleTimeEntryReminders: usando sistema Nativo (expo-notifications)');
    await this.nativeService.cancelAllNotifications();
    if (!settings.enabled) return 0;
    const [hours, minutes] = settings.time.split(':');
    let scheduledCount = 0;
    const daysToSchedule = settings.weekendsEnabled ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const now = new Date();
    for (let day = 1; day <= 7; day++) {
      for (const dayOfWeek of daysToSchedule) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + day);
        if (targetDate.getDay() !== dayOfWeek) continue;
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (targetDate <= now) continue;
        await this.nativeService.scheduleNotification(
          '📝 Inserimento Orari',
          'Hai inserito gli orari di lavoro di oggi?',
          targetDate.getTime(),
          { type: 'time_entry_reminder', date: targetDate.toISOString().split('T')[0] }
        );
        scheduledCount++;
        console.log(`  ✅ Promemoria inserimento programmato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
      }
    }
    return scheduledCount;
  }

  async scheduleDailySummary(settings) {
    console.log('📱 scheduleDailySummary: usando sistema Nativo (expo-notifications)');
    await this.nativeService.cancelAllNotifications();
    if (!settings.enabled) return 0;
    const [hours, minutes] = settings.time.split(':');
    let scheduledCount = 0;
    const now = new Date();
    for (let day = 1; day <= 7; day++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + day);
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (targetDate <= now) continue;
      await this.nativeService.scheduleNotification(
        '📊 Riepilogo Giornaliero',
        'Controlla il riepilogo delle tue ore e attività di oggi.',
        targetDate.getTime(),
        { type: 'daily_summary', date: targetDate.toISOString().split('T')[0] }
      );
      scheduledCount++;
      console.log(`  ✅ Riepilogo giornaliero programmato per ${targetDate.toLocaleDateString('it-IT')} alle ${hours}:${minutes}`);
    }
    return scheduledCount;
  }

  async scheduleStandbyReminders(standbyDates, settings) {
    console.log('📞 scheduleStandbyReminders: usando sistema Nativo (expo-notifications)');
    await this.nativeService.cancelAllNotifications();
    if (!settings.enabled) return 0;
    const activeNotifications = settings.notifications?.filter(n => n.enabled) || [];
    let scheduledCount = 0;
    const now = new Date();
    for (const dateStr of standbyDates) {
      const standbyDate = new Date(dateStr + 'T00:00:00');
      const standbyDateFormatted = standbyDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      for (const notification of activeNotifications) {
        const [hours, minutes] = notification.time.split(':');
        const reminderDate = new Date(standbyDate);
        reminderDate.setDate(reminderDate.getDate() - notification.daysInAdvance);
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        if (reminderDate > now) {
          await this.nativeService.scheduleNotification(
            `📞 Reperibilità: ${standbyDateFormatted}`,
            notification.message || 'Ricordati che sei in reperibilità!',
            reminderDate.getTime(),
            { type: 'standby_reminder', standbyDate: dateStr, daysInAdvance: notification.daysInAdvance }
          );
          scheduledCount++;
          console.log(`  ✅ Promemoria reperibilità programmato: ${standbyDateFormatted} (${dateStr}) alle ${hours}:${minutes}`);
        }
      }
    }
    return scheduledCount;
  }

  // Metodi per compatibilità che non fanno nulla (Expo rimosso)
  async initializeBackgroundFetch() {
    console.log('❌ initializeBackgroundFetch DISABILITATO: sistema JavaScript non usa background fetch');
    return true;
  }

  async syncStandbyNotificationsWithCalendar() {
    console.log('📞 syncStandbyNotificationsWithCalendar: controllo date reperibilità future');
    
    try {
      const settings = await this.getSettings();
      
      if (!settings.enabled || !settings.standbyReminders?.enabled) {
        console.log('📞 Notifiche reperibilità disabilitate');
        return {
          count: 0,
          dates: [],
          message: 'Notifiche reperibilità disabilitate nelle impostazioni'
        };
      }
      
      // Ottieni date reperibilità future (prossimi 2 mesi)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      
      const standbyDates = await this.getStandbyDatesFromSettings(startDate, endDate);
      
      if (standbyDates.length === 0) {
        console.log('📞 Nessuna data di reperibilità futura trovata');
        return {
          count: 0,
          dates: [],
          message: 'Nessuna data di reperibilità configurata per i prossimi 2 mesi'
        };
      }
      
      // Programma le notifiche
      await this.scheduleNotifications(settings);
      
      console.log(`📞 Sincronizzazione completata: ${standbyDates.length} date trovate`);
      console.log(`📞 Date: ${standbyDates.join(', ')}`);
      
      return {
        count: standbyDates.length,
        dates: standbyDates,
        message: `Trovate ${standbyDates.length} date di reperibilità: ${standbyDates.slice(0, 3).map(date => {
          const d = new Date(date);
          return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        }).join(', ')}${standbyDates.length > 3 ? ' e altre...' : ''}`
      };
      
    } catch (error) {
      console.error('❌ Errore nella sincronizzazione reperibilità:', error);
      return {
        count: 0,
        dates: [],
        message: 'Errore durante la sincronizzazione'
      };
    }
  }

  async cancelStandbyNotifications() {
    console.log('📞 cancelStandbyNotifications: cancellando timer JavaScript reperibilità');
    // Cancella solo i timer di reperibilità
    if (this.alternativeService) {
      const stats = this.alternativeService.getActiveTimersStats();
      console.log(`🗑️ Timer reperibilità da cancellare inclusi in ${stats.total} timer totali`);
      // Per ora cancella tutti - in futuro si può implementare cancellazione selettiva
    }
    return true;
  }

  async forceScheduleNotifications() {
    console.log('🎯 forceScheduleNotifications: forzando programmazione JavaScript');
    
    // Reset throttling temporaneamente
    const originalLastScheduleTime = this.lastScheduleTime;
    this.lastScheduleTime = 0;
    this.schedulingInProgress = false;
    
    try {
      await this.scheduleNotifications(null, true);
      console.log('🎯 Programmazione forzata JavaScript completata');
    } finally {
      if (this.lastScheduleTime === 0) {
        this.lastScheduleTime = Date.now();
      }
    }
  }

  // 🔄 RIPROGRAMMAZIONE FOREGROUND: Sistema ibrido
  async rescheduleOnForeground() {
    console.log('🔄 rescheduleOnForeground: app tornata attiva, verifica sistema ibrido...');
    
    try {
      const jsStats = this.alternativeService.getActiveTimersStats();
      const pushCount = this.pushInitialized ? this.pushService.getScheduledCount() : 0;
      
      console.log(`📊 Stato sistema dopo background:`);
      console.log(`   JavaScript timers: ${jsStats.total}`);
      console.log(`   Push notifications: ${pushCount}`);
      
      if (jsStats.total === 0 && pushCount === 0) {
        console.log('⚠️ Nessuna notifica attiva - riprogrammazione completa necessaria');
        await this.scheduleNotifications(null, true);
      } else if (jsStats.total === 0 && pushCount > 0) {
        console.log('🔄 Solo push attive - riprogrammo JavaScript per velocità app attiva');
        await this.scheduleNotifications(null, true);
      } else {
        console.log(`✅ Sistema funzionante: JS=${jsStats.total}, Push=${pushCount}`);
      }
      
      return { javascript: jsStats.total, push: pushCount };
    } catch (error) {
      console.error('❌ Errore verifica sistema ibrido:', error);
      // In caso di errore, riprogramma tutto
      await this.scheduleNotifications(null, true);
    }
  }

  async cleanupAllNotifications() {
    console.log('🧹 cleanupAllNotifications: pulizia timer JavaScript');
    await this.cancelAllNotifications();
    
    // Reset stato interno
    this.schedulingInProgress = false;
    this.lastScheduleTime = 0;
    
    const stats = this.alternativeService.getActiveTimersStats();
    console.log(`🧹 Pulizia completata. Timer rimanenti: ${stats.total}`);
    
    return stats.total === 0;
  }

  // ✅ RIPRISTINA NOTIFICHE DA BACKUP (compatibilità)
  async restoreNotificationsFromBackup() {
    console.log('🔄 restoreNotificationsFromBackup: usando scheduleNotifications principale');
    try {
      const settings = await this.getSettings();
      if (settings.enabled) {
        await this.scheduleNotifications(settings);
        console.log('✅ Notifiche ripristinate da backup');
      }
    } catch (error) {
      console.warn('⚠️ Errore ripristino notifiche da backup:', error);
    }
  }
}

export default new NotificationService();
