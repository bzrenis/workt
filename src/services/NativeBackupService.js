// 🚀 NATIVE BACKUP SERVICE
// Sistema backup per app nativa con notifiche programmate e scelta destinazione

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import { Alert } from 'react-native';

class NativeBackupService {
  constructor() {
    this.notificationsModule = null;
    this.fileSystemModule = null;
    this.sharingModule = null;
    this.isNativeReady = false;
    this.initializationAttempted = false;
    this.scheduledBackupId = null;
    this.lastAutoBackupTime = 0; // Timestamp ultimo backup automatico (anti-loop)
    
    console.log('🚀 NativeBackupService inizializzato con supporto destinazioni multiple');
    this.initializeNativeBackup();
  }

  // 🔧 Inizializzazione automatica con supporto destinazioni
  async initializeNativeBackup() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      // Tenta di importare expo-notifications
      const Notifications = await import('expo-notifications');
      this.notificationsModule = Notifications;
      
      // Tenta di importare expo-file-system
      try {
        const FileSystem = await import('expo-file-system');
        this.fileSystemModule = FileSystem;
        console.log('✅ FileSystem module caricato per backup su file');
      } catch (fsError) {
        console.log('📱 FileSystem non disponibile - solo AsyncStorage');
      }
      
      // Tenta di importare expo-sharing
      try {
        const Sharing = await import('expo-sharing');
        this.sharingModule = Sharing;
        console.log('✅ Sharing module caricato per backup cloud');
      } catch (shareError) {
        console.log('📱 Sharing non disponibile - solo storage locale');
      }
      
      // Configura il comportamento delle notifiche
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
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
        console.log('✅ Sistema backup NATIVO pronto (expo-notifications)');
        console.log('🔔 Backup automatico NATIVE: funziona anche con app chiusa!');
        
        // Inizializza il sistema di backup
        await this.initializeBackupSystem();
      } else {
        console.log('⚠️ Permessi notifiche negati - usando fallback JavaScript');
        this.isNativeReady = false;
      }

    } catch (error) {
      console.log('📱 expo-notifications non disponibile - usando fallback JavaScript');
      console.log('ℹ️ Il backup nativo sarà disponibile con build nativa');
      this.isNativeReady = false;
    }
  }

  // 🔄 Inizializza sistema backup (solo se richiesto)
  async initializeBackupSystem() {
    try {
      const settings = await this.getBackupSettings();
      
      if (settings.enabled && this.isNativeReady) {
        // NON programmare automaticamente all'avvio
        console.log('📱 Sistema backup nativo pronto, attivazione manuale richiesta');
      } else if (settings.enabled) {
        console.log('📱 Backup automatico abilitato ma sistema nativo non disponibile');
      } else {
        console.log('📱 Backup automatico disabilitato nelle impostazioni');
      }
    } catch (error) {
      console.error('❌ Errore inizializzazione sistema backup:', error);
    }
  }

  // 📋 Ottieni impostazioni backup complete
  async getBackupSettings() {
    try {
      const enabled = await AsyncStorage.getItem('auto_backup_enabled');
      const time = await AsyncStorage.getItem('auto_backup_time');
      const destination = await AsyncStorage.getItem('auto_backup_destination');
      const customPath = await AsyncStorage.getItem('auto_backup_custom_path');
      
      return {
        enabled: enabled ? JSON.parse(enabled) : false,
        time: time || '02:00',
        destination: destination || 'asyncstorage', // asyncstorage, filesystem, cloud
        customPath: customPath || null
      };
    } catch (error) {
      console.error('Errore lettura impostazioni backup:', error);
      return { 
        enabled: false, 
        time: '02:00',
        destination: 'asyncstorage',
        customPath: null
      };
    }
  }

  // 📁 Ottieni destinazioni backup disponibili
  getAvailableDestinations() {
    const destinations = [
      {
        id: 'asyncstorage',
        name: 'Memoria App (AsyncStorage)',
        description: 'Salva nella memoria interna dell\'app (più veloce)',
        icon: 'phone-portrait-outline',
        available: true,
        reliable: true
      }
    ];

    if (this.fileSystemModule) {
      destinations.push({
        id: 'filesystem',
        name: 'File System',
        description: 'Salva come file nella cartella documenti del dispositivo',
        icon: 'folder-outline',
        available: true,
        reliable: true
      });
    }

    if (this.sharingModule) {
      destinations.push({
        id: 'cloud',
        name: 'Cloud Storage',
        description: 'Salva e condividi automaticamente nel cloud (Drive, iCloud)',
        icon: 'cloud-outline',
        available: true,
        reliable: false // Dipende dalla connessione
      });
    }

    return destinations;
  }

  // ⚙️ Aggiorna impostazioni destinazione backup
  async updateBackupDestination(destination, customPath = null) {
    try {
      await AsyncStorage.setItem('auto_backup_destination', destination);
      
      if (customPath) {
        await AsyncStorage.setItem('auto_backup_custom_path', customPath);
      } else {
        await AsyncStorage.removeItem('auto_backup_custom_path');
      }
      
      console.log(`📁 [NATIVE] Destinazione backup aggiornata: ${destination}`);
      if (customPath) {
        console.log(`📂 [NATIVE] Percorso personalizzato: ${customPath}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento destinazione backup:', error);
      return false;
    }
  }

  // 🔔 Programma backup nativo con notifiche background-ready
  async scheduleNativeBackup(settings) {
    if (!this.isNativeReady || !this.notificationsModule) {
      console.log('⚠️ Sistema nativo non disponibile per backup programmato');
      return false;
    }

    try {
      // Cancella backup precedente
      if (this.scheduledBackupId) {
        await this.notificationsModule.cancelScheduledNotificationAsync(this.scheduledBackupId);
        this.scheduledBackupId = null;
        console.log('🗑️ [NATIVE] Backup precedente cancellato');
      }

      const [hours, minutes] = settings.time.split(':').map(Number);
      
      // Calcola il prossimo trigger (evita trigger immediato)
      const now = new Date();
      const nextTrigger = new Date();
      nextTrigger.setHours(hours, minutes, 0, 0);
      
      // Se l'orario è già passato oggi, programma per domani
      if (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      
      // Verifica che sia almeno tra 1 minuto (evita trigger immediato)
      if (nextTrigger.getTime() - now.getTime() < 60000) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      
      console.log(`🔔 [NATIVE] Programmando backup per: ${nextTrigger.toLocaleString('it-IT')}`);
      
      // Programma con trigger time-based invece di hour/minute per maggiore controllo
      const notificationId = await this.notificationsModule.scheduleNotificationAsync({
        content: {
          title: '💾 WorkT - Backup Automatico',
          body: 'Avvio backup automatico dei dati lavorativi...',
          data: {
            type: 'auto_backup_trigger',
            action: 'perform_backup',
            timestamp: new Date().toISOString()
          },
          sound: false, // Silent per backup automatico
          priority: this.notificationsModule.AndroidNotificationPriority.LOW,
          categoryIdentifier: 'BACKUP_CATEGORY'
        },
        trigger: {
          date: nextTrigger, // Trigger specifico invece di hour/minute
          repeats: false, // Non ripetere automaticamente
        },
      });

      this.scheduledBackupId = notificationId;
      
      // Setup listener una sola volta
      if (!this.notificationListenerSetup) {
        this.setupBackupNotificationListener();
        this.notificationListenerSetup = true;
      }

      console.log(`✅ [NATIVE] Backup programmato con ID: ${notificationId}`);
      console.log(`📅 [NATIVE] Prossimo backup: ${nextTrigger.toLocaleString('it-IT')}`);
      
      return true;
    } catch (error) {
      console.error(`❌ [NATIVE] Errore programmazione backup: ${error.message}`);
      return false;
    }
  }

  // 👂 Listener per notifiche di backup (background-ready)
  setupBackupNotificationListener() {
    if (!this.notificationsModule) return;

    console.log('👂 [NATIVE] Setup listener notifiche backup');

    // Listener per notifiche ricevute (sia foreground che background)
    this.notificationsModule.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'auto_backup_trigger') {
        console.log('🔔 [NATIVE] Notifica backup automatico triggerata');
        
        // Esegui backup immediatamente
        const result = await this.executeBackup(true);
        
        // 🚫 RIMOSSO: Non riprogrammare automaticamente
        // Il backup viene riprogrammato solo quando l'utente lo attiva manualmente
        console.log(`📅 [NATIVE] Backup completato. Loop automatico fermato.`);
      }
    });

    // Listener per quando l'utente tappa la notifica (app chiusa)
    this.notificationsModule.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'auto_backup_trigger') {
        console.log('👆 [NATIVE] Utente ha toccato notifica backup');
        
        // Esegui backup se non già fatto
        await this.executeBackup(true);
      }
    });

    // Background notification handler
    this.notificationsModule.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        
        if (data?.type === 'auto_backup_trigger') {
          console.log('🔄 [NATIVE] Handling background backup notification');
          
          // 🚨 CONTROLLO 1: Verifica se backup automatico è ancora abilitato
          const currentSettings = await this.getBackupSettings();
          if (!currentSettings.enabled) {
            console.log('🚫 [NATIVE] Backup automatico disabilitato - notifica ignorata');
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
          
          // 🚨 CONTROLLO 2: verifica ultima esecuzione (anti-loop)
          const now = Date.now();
          const lastBackupTime = this.lastAutoBackupTime || 0;
          const timeSinceLastBackup = now - lastBackupTime;
          
          // Se è passato meno di 5 minuti dall'ultimo backup automatico, ignora COMPLETAMENTE
          if (timeSinceLastBackup < 5 * 60 * 1000) { // 5 minuti in millisecondi
            console.log(`🚫 [NATIVE] Backup ignorato - ultimo backup ${Math.round(timeSinceLastBackup/1000)}s fa`);
            // 🛑 NON eseguire backup, NON schedulare niente, FERMA QUI
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          }
          
          // Aggiorna timestamp ultima esecuzione
          this.lastAutoBackupTime = now;
          
          // Esegui backup in background
          const result = await this.executeBackup(true);
          
          return {
            shouldShowAlert: result.success, // Mostra solo se successo
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
        
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });
  }

  // 💾 Esegui backup con destinazione configurabile
  async executeBackup(isAutomatic = false) {
    try {
      console.log(`🔄 [NATIVE] Esecuzione backup ${isAutomatic ? 'automatico' : 'manuale'}...`);
      
      // Ottieni impostazioni backup complete
      const settings = isAutomatic ? await this.getBackupSettings() : { destination: 'asyncstorage' };
      
      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Nessun dato trovato per il backup');
      }

      // Crea metadati backup
      const timestamp = new Date().toISOString();
      const backupData = {
        metadata: {
          version: '1.0.0',
          created: timestamp,
          type: isAutomatic ? 'automatic' : 'manual',
          entries: data.workEntries?.length || 0,
          system: 'native',
          destination: settings.destination || 'asyncstorage'
        },
        data: data
      };

      const backupKey = `backup_${isAutomatic ? 'auto' : 'manual'}_${timestamp.replace(/[:.]/g, '-')}`;
      let saveResult = null;

      // Salva in base alla destinazione scelta
      switch (settings.destination) {
        case 'filesystem':
          saveResult = await this.saveToFileSystem(backupKey, backupData);
          break;
        case 'cloud':
          saveResult = await this.saveToCloud(backupKey, backupData);
          break;
        case 'asyncstorage':
        default:
          saveResult = await this.saveToAsyncStorage(backupKey, backupData);
          break;
      }

      if (!saveResult.success) {
        throw new Error(`Errore salvataggio in ${settings.destination}: ${saveResult.error}`);
      }
      
      // Aggiorna timestamp ultimo backup
      await AsyncStorage.setItem('last_backup_date', timestamp);
      
      console.log(`✅ [NATIVE] Backup ${isAutomatic ? 'automatico' : 'manuale'} completato in ${settings.destination}: ${saveResult.path || backupKey}`);
      
      // Mostra notifica di conferma SOLO per backup automatici
      if (isAutomatic && this.notificationsModule) {
        try {
          await this.notificationsModule.scheduleNotificationAsync({
            content: {
              title: '✅ WorkT - Backup Completato',
              body: `Backup automatico salvato in ${this.getDestinationDisplayName(settings.destination)}.\n${data.workEntries?.length || 0} registrazioni salvate.`,
              data: { 
                type: 'backup_complete',
                timestamp: timestamp,
                destination: settings.destination,
                silent: true
              },
              sound: false,
              priority: this.notificationsModule.AndroidNotificationPriority.LOW,
            },
            trigger: null // Immediata
          });
          
          console.log('📝 [NATIVE] Notifica conferma backup inviata');
        } catch (notificationError) {
          console.warn('⚠️ [NATIVE] Errore invio notifica conferma:', notificationError.message);
        }
      }

      return { success: true, backupKey, timestamp };
      
    } catch (error) {
      console.error(`❌ [NATIVE] Errore backup: ${error.message}`);
      
      // Notifica errore (NON immediata per evitare spam)
      if (this.notificationsModule) {
        try {
          await this.notificationsModule.scheduleNotificationAsync({
            content: {
              title: '❌ Errore Backup',
              body: 'Si è verificato un errore durante il backup automatico',
              data: { type: 'backup_error' },
              priority: this.notificationsModule.AndroidNotificationPriority.LOW,
              sound: false
            },
            trigger: {
              seconds: 5 // Ritarda di 5 secondi per evitare spam
            }
          });
        } catch (notificationError) {
          console.warn('⚠️ [NATIVE] Errore invio notifica errore:', notificationError.message);
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 💾 Salva in AsyncStorage
  async saveToAsyncStorage(backupKey, backupData) {
    try {
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      console.log(`📱 [NATIVE] Backup salvato in AsyncStorage: ${backupKey}`);
      return { success: true, path: backupKey };
    } catch (error) {
      console.error('❌ Errore salvataggio AsyncStorage:', error);
      
      // 🧹 Se è un errore di spazio, prova a pulire e riprovare
      if (error.message && error.message.includes('SQLITE_FULL')) {
        console.log('🧹 Spazio pieno detected, pulisco backup vecchi...');
        
        try {
          // 1. Pulisci backup vecchi
          await this.cleanOldBackups();
          
          // 2. Ottimizza database
          if (typeof DatabaseService !== 'undefined' && DatabaseService.optimizeDatabase) {
            await DatabaseService.optimizeDatabase();
            console.log('🗃️ Database ottimizzato');
          }
          
          // 3. Riprova il salvataggio
          await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
          console.log(`📱 [NATIVE] Backup salvato dopo pulizia: ${backupKey}`);
          
          // 4. Notifica successo della pulizia automatica
          await this.sendNotification(
            'Backup automatico',
            'Spazio liberato automaticamente. Backup completato con successo.',
            { 
              seconds: 3,
              priority: 'normal'
            }
          );
          
          return { success: true, path: backupKey };
          
        } catch (retryError) {
          console.error('❌ Errore anche dopo pulizia:', retryError);
          
          // Notifica ritardata per evitare spam
          await this.sendNotification(
            'Backup automatico',
            'Spazio insufficiente. Controlla le impostazioni backup.',
            { 
              seconds: 10,
              priority: 'low'
            }
          );
          
          return { success: false, error: 'Spazio insufficiente dopo pulizia' };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // 📁 Salva nel file system
  async saveToFileSystem(backupKey, backupData) {
    if (!this.fileSystemModule) {
      return { success: false, error: 'FileSystem non disponibile' };
    }

    try {
      const documentsPath = this.fileSystemModule.documentDirectory;
      const backupPath = `${documentsPath}backup/`;
      
      // Crea cartella backup se non esiste
      const dirInfo = await this.fileSystemModule.getInfoAsync(backupPath);
      if (!dirInfo.exists) {
        await this.fileSystemModule.makeDirectoryAsync(backupPath, { intermediateDirectories: true });
      }
      
      const fileName = `${backupKey}.json`;
      const filePath = `${backupPath}${fileName}`;
      
      await this.fileSystemModule.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Salva anche referenza in AsyncStorage per tracking
      await AsyncStorage.setItem(backupKey, JSON.stringify({
        ...backupData,
        metadata: {
          ...backupData.metadata,
          filePath: filePath,
          fileSize: JSON.stringify(backupData).length
        }
      }));
      
      console.log(`📁 [NATIVE] Backup salvato nel file system: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('❌ Errore salvataggio file system:', error);
      return { success: false, error: error.message };
    }
  }

  // ☁️ Salva nel cloud
  async saveToCloud(backupKey, backupData) {
    if (!this.sharingModule || !this.fileSystemModule) {
      return { success: false, error: 'Moduli cloud non disponibili' };
    }

    try {
      // Prima salva nel file system temporaneo
      const tempResult = await this.saveToFileSystem(backupKey, backupData);
      
      if (!tempResult.success) {
        return tempResult;
      }
      
      // Poi condividi automaticamente nel cloud
      const canShare = await this.sharingModule.isAvailableAsync();
      
      if (canShare) {
        await this.sharingModule.shareAsync(tempResult.path, {
          mimeType: 'application/json',
          dialogTitle: `Backup WorkT - ${new Date().toLocaleDateString('it-IT')}`,
          UTI: 'public.json'
        });
        
        console.log(`☁️ [NATIVE] Backup condiviso nel cloud: ${tempResult.path}`);
        return { success: true, path: tempResult.path, shared: true };
      } else {
        console.log('⚠️ [NATIVE] Sharing non disponibile, salvato solo localmente');
        return { success: true, path: tempResult.path, shared: false };
      }
    } catch (error) {
      console.error('❌ Errore salvataggio cloud:', error);
      return { success: false, error: error.message };
    }
  }

  // 📝 Ottieni nome display della destinazione
  getDestinationDisplayName(destination) {
    const names = {
      'asyncstorage': 'Memoria App',
      'filesystem': 'File System',
      'cloud': 'Cloud Storage'
    };
    return names[destination] || 'Sconosciuta';
  }

  // 📊 Statistiche backup native
  async getBackupStats() {
    try {
      const settings = await this.getBackupSettings();
      const backups = await this.getBackupList();
      const lastBackupDate = await AsyncStorage.getItem('last_backup_date');
      
      return {
        totalBackups: backups.length,
        automaticBackups: backups.filter(b => b.type === 'automatic').length,
        manualBackups: backups.filter(b => b.type === 'manual').length,
        lastBackup: lastBackupDate ? new Date(lastBackupDate) : null,
        nextBackup: this.getNextBackupTime(settings),
        enabled: settings.enabled,
        isActive: this.isNativeReady && this.scheduledBackupId !== null,
        isNativeReady: this.isNativeReady,
        systemType: this.isNativeReady ? 'native' : 'fallback',
        scheduledBackupId: this.scheduledBackupId
      };
    } catch (error) {
      console.error('Errore calcolo statistiche backup native:', error);
      return null;
    }
  }

  // 📅 Calcola prossimo backup
  getNextBackupTime(settings) {
    if (!settings.enabled) return null;
    
    const now = new Date();
    const [hours, minutes] = settings.time.split(':').map(Number);
    const nextBackup = new Date();
    nextBackup.setHours(hours, minutes, 0, 0);
    
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }
    
    return nextBackup;
  }

  // 📋 Lista backup salvati
  async getBackupList() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith('backup_'));
      
      const backups = [];
      for (const key of backupKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          const parsed = JSON.parse(data);
          if (parsed.metadata) {
            backups.push({
              key,
              name: key,
              date: parsed.metadata.created,
              type: parsed.metadata.type,
              entries: parsed.metadata.entries,
              system: parsed.metadata.system || 'unknown'
            });
          }
        } catch (e) {
          console.warn(`Backup corrotto saltato: ${key}`);
        }
      }
      
      return backups.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
      console.error('Errore lettura lista backup:', error);
      return [];
    }
  }

  // 🗑️ Cancella backup programmato
  async cancelScheduledBackup() {
    if (this.isNativeReady && this.scheduledBackupId && this.notificationsModule) {
      try {
        await this.notificationsModule.cancelScheduledNotificationAsync(this.scheduledBackupId);
        this.scheduledBackupId = null;
        console.log('🗑️ [NATIVE] Backup programmato cancellato');
        return true;
      } catch (error) {
        console.error('❌ [NATIVE] Errore cancellazione backup:', error);
        return false;
      }
    }
    return false;
  }

  // � METODO DI EMERGENZA: Cancella TUTTE le notifiche backup
  async emergencyStopAllBackupNotifications() {
    try {
      if (this.isNativeReady && this.notificationsModule) {
        // Cancella tutte le notifiche programmate
        await this.notificationsModule.cancelAllScheduledNotificationsAsync();
        console.log('🚨 [NATIVE] EMERGENZA: Tutte le notifiche backup cancellate');
        
        // Reset contatori
        this.scheduledBackupId = null;
        this.lastAutoBackupTime = Date.now(); // Previene esecuzioni immediate
        
        // Disabilita temporaneamente il backup automatico
        await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(false));
        console.log('🚨 [NATIVE] Backup automatico temporaneamente disabilitato');
        
        return true;
      }
    } catch (error) {
      console.error('❌ [NATIVE] Errore stop emergenza:', error);
    }
    return false;
  }

  // �🔄 Aggiorna impostazioni backup (enabled/time)
  async updateBackupSettings(enabled, time) {
    try {
      console.log(`🔄 [NATIVE] Aggiornamento impostazioni: ${enabled ? 'Abilitato' : 'Disabilitato'} alle ${time}`);
      
      // Cancella sempre il backup precedente
      await this.cancelScheduledBackup();
      
      // Salva nuove impostazioni
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(enabled));
      await AsyncStorage.setItem('auto_backup_time', time);
      
      const settings = { enabled, time };
      
      if (enabled && this.isNativeReady) {
        // Programma nuovo backup con le nuove impostazioni
        const success = await this.scheduleNativeBackup(settings);
        
        if (success) {
          console.log(`✅ [NATIVE] Backup automatico riprogrammato per le ${time}`);
        } else {
          console.error('❌ [NATIVE] Errore riprogrammazione backup');
          return false;
        }
      } else if (enabled && !this.isNativeReady) {
        console.log('⚠️ [NATIVE] Backup abilitato ma sistema nativo non disponibile');
      } else {
        console.log('📱 [NATIVE] Backup automatico disabilitato');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni backup:', error);
      return false;
    }
  }

  // 🔄 Metodo combinato per aggiornare tutte le impostazioni
  async updateAllBackupSettings(enabled, time, destination, customPath = null) {
    try {
      // Prima aggiorna la destinazione
      await this.updateBackupDestination(destination, customPath);
      
      // Poi aggiorna enabled e time
      return await this.updateBackupSettings(enabled, time);
    } catch (error) {
      console.error('❌ Errore aggiornamento completo impostazioni backup:', error);
      return false;
    }
  }

  // 📱 Stato del sistema
  getSystemStatus() {
    return {
      isNativeReady: this.isNativeReady,
      hasNotificationsModule: !!this.notificationsModule,
      systemType: this.isNativeReady ? 'native' : 'fallback',
      description: this.isNativeReady 
        ? 'Backup nativo (100% affidabile anche con app chiusa)'
        : 'Backup JavaScript (solo app aperta)',
      scheduledBackupId: this.scheduledBackupId
    };
  }

  // 🧹 Pulisce backup vecchi per liberare spazio
  async cleanOldBackups() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys.filter(key => 
        key.startsWith('backup_') || 
        key.startsWith('auto_backup_') ||
        key.includes('_backup_')
      );
      
      console.log(`🧹 Trovati ${backupKeys.length} backup da controllare`);
      
      if (backupKeys.length <= 3) {
        console.log('🧹 Meno di 3 backup, non pulisco');
        return;
      }
      
      // Ordina per data (più vecchi prima)
      const backupsWithDates = [];
      for (const key of backupKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const backup = JSON.parse(data);
            const date = backup.timestamp || backup.created_at || key;
            backupsWithDates.push({ key, date });
          }
        } catch (e) {
          // Se non riesco a leggere, lo considero da eliminare
          backupsWithDates.push({ key, date: '1970-01-01' });
        }
      }
      
      // Ordina per data (più vecchi prima)
      backupsWithDates.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Mantieni solo gli ultimi 3, rimuovi gli altri
      const toDelete = backupsWithDates.slice(0, -3);
      
      for (const { key } of toDelete) {
        try {
          await AsyncStorage.removeItem(key);
          console.log(`🗑️ Rimosso backup vecchio: ${key}`);
        } catch (e) {
          console.error(`❌ Errore rimozione ${key}:`, e);
        }
      }
      
      console.log(`🧹 Pulizia completata: rimossi ${toDelete.length} backup vecchi`);
      
    } catch (error) {
      console.error('❌ Errore durante pulizia backup:', error);
    }  
  }

  // 📋 Alias per compatibilità con BackupService
  async listLocalBackups() {
    return await this.getBackupList();
  }

  // 💾 Alias per compatibilità - backup locale 
  async createLocalBackup(backupName = null, filteredData = null) {
    return await this.executeBackup(false); // false = manuale
  }
}

// Esporta istanza singleton
const nativeBackupService = new NativeBackupService();
export default nativeBackupService;
