// 🚀 BACKUPSERVICE IBRIDO: NATIVO + JAVASCRIPT
// Sistema backup con supporto nativo per app builds e fallback JavaScript

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import JavaScriptBackupService from './JavaScriptBackupService';
import NativeBackupService from './NativeBackupService';
import { Alert, Platform } from 'react-native';

class BackupService {
  constructor() {
    // 🚀 SISTEMA IBRIDO: Prova NATIVO prima, poi fallback JavaScript
    this.nativeBackupService = NativeBackupService;
    this.jsBackupService = JavaScriptBackupService;
    this.useJavaScriptSystem = false; // Inizia con nativo
    
    console.log('🚀 BackupService inizializzato con SISTEMA IBRIDO (Nativo + JavaScript)');
    console.log('📱 Tentativo sistema NATIVO per app builds, fallback JavaScript per Expo');
  }

  // ✅ INIZIALIZZA BACKUP AUTOMATICO (Nativo o JavaScript)
  async initialize() {
    try {
      // Prova prima il sistema nativo
      const nativeStatus = this.nativeBackupService.getSystemStatus();
      
      if (nativeStatus.isNativeReady) {
        console.log('🚀 Usando sistema backup NATIVO (expo-notifications)');
        console.log('✅ Backup automatico funzionerà anche con app chiusa!');
        this.useJavaScriptSystem = false;
        // Il sistema nativo si auto-inizializza
      } else {
        console.log('📱 Sistema nativo non disponibile, usando fallback JavaScript');
        console.log('⚠️ Backup automatico solo con app aperta');
        this.useJavaScriptSystem = true;
        await this.jsBackupService.initialize();
      }
      
      console.log('✅ Sistema backup inizializzato correttamente');
    } catch (error) {
      console.error('❌ Errore inizializzazione backup service:', error);
      // Fallback garantito al sistema JavaScript
      this.useJavaScriptSystem = true;
      await this.jsBackupService.initialize();
    }
  }
  
  // Verifica se il backup automatico è abilitato
  async isEnabled() {
    try {
      // Controlla prima lo stato nelle impostazioni
      const backupSettings = await AsyncStorage.getItem('backupSettings');
      if (backupSettings) {
        const settings = JSON.parse(backupSettings);
        return settings.autoBackupEnabled === true;
      }
      
      // Se non ci sono impostazioni, controlla i servizi
      if (this.useJavaScriptSystem) {
        // Per il sistema JavaScript, verifica che il servizio sia inizializzato
        return this.jsBackupService.isInitialized === true;
      } else {
        // Per il sistema nativo, controlla lo stato del servizio
        return this.nativeBackupService?.isInitialized === true;
      }
    } catch (error) {
      console.error('❌ Errore verifica stato backup:', error);
      return false;
    }
  }

  // ✅ BACKUP LOCALE JAVASCRIPT (AsyncStorage)
  async createLocalBackup(backupName = null, filteredData = null) {
    try {
      console.log('🔄 Creazione backup locale JavaScript...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = backupName || `worktracker-backup-${timestamp}.json`;

      let data;
      if (filteredData && typeof filteredData === 'object') {
        data = filteredData;
        console.log('✅ Utilizzo dati filtrati forniti dal chiamante');
      } else {
        data = await DatabaseService.getAllData();
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error('Nessun dato trovato per il backup');
      }

      // Metadati backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'javascript_local',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Salva in AsyncStorage
      const backupKey = `manual_backup_${timestamp}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));

      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'manual');

      console.log(`✅ Backup locale JavaScript creato: ${fileName}`);
      
      return {
        success: true,
        fileName: fileName,
        backupKey: backupKey,
        size: JSON.stringify(backupData).length,
        data: backupData
      };
      
    } catch (error) {
      console.error('❌ Errore creazione backup locale:', error);
      throw error;
    }
  }

  // ✅ EXPORT BACKUP per condivisione
  async exportBackup(backupName = null, filteredData = null) {
    try {
      console.log('📤 Export backup per condivisione...');
      
      const result = await this.createLocalBackup(backupName, filteredData);
      
      if (result.success) {
        return {
          success: true,
          fileName: result.fileName,
          jsonData: JSON.stringify(result.data, null, 2),
          shareText: `Backup WorkTracker - ${result.fileName}\n\nCreato: ${new Date().toLocaleString('it-IT')}\n\nPer ripristinare: importa questo file nell'app.`,
          data: result.data
        };
      }
      
      throw new Error('Creazione backup fallita');
      
    } catch (error) {
      console.error('❌ Errore export backup:', error);
      throw error;
    }
  }

  // ✅ IMPORT BACKUP da testo/file
  async importBackup(backupData = null) {
    try {
      console.log('📥 Importazione backup JavaScript...');
      
      let parsedData;
      
      if (typeof backupData === 'string') {
        parsedData = JSON.parse(backupData);
      } else if (typeof backupData === 'object') {
        parsedData = backupData;
      } else {
        throw new Error('Formato backup non valido');
      }

      // Valida formato
      if (!this.validateBackupFormat(parsedData)) {
        throw new Error('Formato backup non valido o corrotto');
      }

      // Ripristina nel database
      await DatabaseService.restoreFromBackup(parsedData);
      
      console.log('✅ Backup importato con successo');
      
      return {
        success: true,
        backupName: parsedData.backupInfo?.name || 'backup-importato',
        importDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Errore importazione backup:', error);
      throw error;
    }
  }

  // ✅ LISTA BACKUP JAVASCRIPT (AsyncStorage)
  async listLocalBackups() {
    try {
      // 1. Carica backup JavaScript tradizionali
      const jsBackups = await AsyncStorage.getItem('javascript_backups');
      const parsedJsBackups = jsBackups ? JSON.parse(jsBackups) : [];
      
      // 2. Carica backup nativi (chiavi che iniziano con backup_)
      const allKeys = await AsyncStorage.getAllKeys();
      const nativeBackupKeys = allKeys.filter(key => 
        key.startsWith('backup_auto_') || key.startsWith('backup_manual_')
      );
      
      // 3. Costruisci array backup nativi
      const nativeBackups = await Promise.all(
        nativeBackupKeys.map(async (key) => {
          try {
            const data = await AsyncStorage.getItem(key);
            if (!data) return null;
            
            const backupData = JSON.parse(data);
            
            // Estrai timestamp dal nome del backup e convertilo in formato ISO
            const timestampMatch = key.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
            let timestamp;
            
            if (timestampMatch) {
              // Converte 2025-07-30T19-36-58 → 2025-07-30T19:36:58.000Z
              const rawTimestamp = timestampMatch[1];
              const isoTimestamp = rawTimestamp.replace(/-(\d{2})-(\d{2})$/, ':$1:$2') + '.000Z';
              timestamp = isoTimestamp;
              
              console.log(`🕐 Backup ${key}: ${rawTimestamp} → ${isoTimestamp}`);
            } else {
              timestamp = new Date().toISOString();
              console.log(`⚠️ Backup ${key}: formato timestamp non riconosciuto, usando data corrente`);
            }
            
            return {
              key: key,
              fileName: key + '.json',
              createdAt: timestamp,
              type: key.includes('auto') ? 'automatic' : 'manual',
              system: 'native',
              size: data.length,
              entries: backupData?.metadata?.entries || backupData?.workEntries?.length || 0
            };
          } catch (error) {
            console.error(`Errore lettura backup nativo ${key}:`, error);
            return null;
          }
        })
      );
      
      // 4. Filtra backup nativi validi e combina con JavaScript
      const validNativeBackups = nativeBackups.filter(backup => backup !== null);
      const allBackups = [...parsedJsBackups, ...validNativeBackups];
      
      console.log(`📂 Lista backup: ${parsedJsBackups.length} JS + ${validNativeBackups.length} Native = ${allBackups.length} totali`);
      
      return allBackups;
    } catch (error) {
      console.error('Errore lettura lista backup:', error);
      return [];
    }
  }

  // Lista tutti i backup (alias per compatibilità)
  async listAllBackups() {
    return await this.listLocalBackups();
  }

  // ✅ ELIMINA BACKUP JAVASCRIPT
  async deleteLocalBackup(backupKey) {
    try {
      console.log(`🗑️ Eliminazione backup: ${backupKey}`);
      
      // Rimuovi da AsyncStorage
      await AsyncStorage.removeItem(backupKey);
      
      // Aggiorna lista
      const backups = await this.listLocalBackups();
      const updatedBackups = backups.filter(backup => backup.key !== backupKey);
      await AsyncStorage.setItem('javascript_backups', JSON.stringify(updatedBackups));
      
      console.log('✅ Backup eliminato con successo');
      return true;
      
    } catch (error) {
      console.error('❌ Errore eliminazione backup:', error);
      throw error;
    }
  }

  // ✅ AGGIORNA LISTA BACKUP
  async updateBackupList(fileName, backupKey, type = 'manual') {
    try {
      const currentBackups = await AsyncStorage.getItem('javascript_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      
      const backupData = await AsyncStorage.getItem(backupKey);
      const size = backupData ? backupData.length : 0;
      
      const newBackup = {
        name: fileName,
        key: backupKey,
        date: new Date().toISOString(),
        type: type,
        size: size
      };

      const updatedBackups = [newBackup, ...backups];
      await AsyncStorage.setItem('javascript_backups', JSON.stringify(updatedBackups));
      
      console.log(`📝 Lista backup aggiornata: ${updatedBackups.length} backup totali`);
    } catch (error) {
      console.error('Errore aggiornamento lista backup:', error);
    }
  }

  // ✅ VALIDA FORMATO BACKUP
  validateBackupFormat(backupData) {
    try {
      if (!backupData || typeof backupData !== 'object') {
        console.log('❌ Backup non è un oggetto valido');
        return false;
      }

      if (!backupData.backupInfo) {
        console.log('❌ Metadati backup mancanti');
        return false;
      }

      const requiredFields = ['name', 'created', 'version', 'app'];
      for (const field of requiredFields) {
        if (!backupData.backupInfo[field]) {
          console.log(`❌ Campo richiesto mancante: ${field}`);
          return false;
        }
      }

      console.log('✅ Formato backup valido');
      return true;
      
    } catch (error) {
      console.error('❌ Errore validazione backup:', error);
      return false;
    }
  }

  // ✅ BACKUP AUTOMATICO (delega a JavaScriptBackupService)
  async autoBackup() {
    try {
      console.log('🔄 Backup automatico JavaScript...');
      return await this.jsBackupService.executeBackup();
    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      throw error;
    }
  }

  // ✅ PULIZIA BACKUP VECCHI
  async cleanupOldAutoBackups() {
    try {
      return await this.jsBackupService.cleanupOldBackups();
    } catch (error) {
      console.error('❌ Errore pulizia backup:', error);
    }
  }

  // ✅ CONFIGURA BACKUP AUTOMATICO
  async setupAutoBackup(enabled, time = '02:00') {
    try {
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(enabled));
      await AsyncStorage.setItem('auto_backup_time', time);
      
      if (enabled) {
        await this.jsBackupService.restartAutoBackup();
        console.log(`✅ Backup automatico attivato per le ${time}`);
      } else {
        await this.jsBackupService.stopAutoBackup();
        console.log('🛑 Backup automatico disattivato');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore configurazione backup automatico:', error);
      throw error;
    }
  }

  // ✅ OTTIENI STATISTICHE BACKUP
  async getBackupStats() {
    try {
      // Assicurati che il servizio sia inizializzato
      if (!this.jsBackupService.isInitialized) {
        console.log('📱 Inizializzazione JavaScriptBackupService per statistiche...');
        await this.jsBackupService.initialize();
      }
      
      const localBackups = await this.listLocalBackups();
      const jsStats = await this.jsBackupService.getBackupStats();
      
      return {
        totalBackups: localBackups.length,
        manualBackups: localBackups.filter(b => b.type === 'manual').length,
        automaticBackups: localBackups.filter(b => b.type === 'automatic').length,
        lastBackup: jsStats?.lastBackup,
        nextBackup: jsStats?.nextBackup,
        autoBackupEnabled: jsStats?.enabled || false,
        isActive: jsStats?.isActive || false,
        system: 'javascript_only',
        debug: {
          jsServiceInitialized: this.jsBackupService.isInitialized,
          hasBackupTimer: jsStats?.isActive,
          settings: await this.jsBackupService.getBackupSettings()
        }
      };
    } catch (error) {
      console.error('Errore calcolo statistiche backup:', error);
      return null;
    }
  }

  // ✅ CONDIVIDI BACKUP (React Native Share)
  async shareBackup(backupKey) {
    try {
      console.log('📱 Condivisione backup JavaScript...');
      
      const backupData = await AsyncStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup non trovato');
      }

      const parsedBackup = JSON.parse(backupData);
      const fileName = parsedBackup.backupInfo?.name || 'backup.json';
      
      // Usa React Native Share se disponibile
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        try {
          const { Share } = require('react-native');
          
          await Share.share({
            message: `Backup WorkTracker - ${fileName}\n\nCreato: ${new Date(parsedBackup.backupInfo.created).toLocaleString('it-IT')}\n\nDati JSON:\n${backupData}`,
            title: `Backup ${fileName}`
          });
          
          console.log('✅ Backup condiviso tramite Share nativo');
          return true;
        } catch (shareError) {
          console.warn('⚠️ Share nativo non disponibile:', shareError);
        }
      }
      
      // Fallback: mostra i dati in un alert (per debug)
      Alert.alert(
        'Backup Pronto',
        `Il backup è stato preparato. Nome: ${fileName}\n\nUsa la funzione di esportazione per salvare in file.`,
        [{ text: 'OK' }]
      );
      
      return true;
      
    } catch (error) {
      console.error('❌ Errore condivisione backup:', error);
      throw error;
    }
  }

  // ✅ TEST BACKUP SYSTEM
  async testBackupSystem() {
    try {
      console.log('🧪 Test sistema backup JavaScript...');
      
      // Test creazione backup
      const testResult = await this.createLocalBackup('test-backup');
      
      if (testResult.success) {
        // Test importazione
        const importResult = await this.importBackup(testResult.data);
        
        if (importResult.success) {
          // Pulizia test
          await this.deleteLocalBackup(testResult.backupKey);
          
          Alert.alert(
            '✅ Test Backup Riuscito',
            'Il sistema backup JavaScript funziona correttamente!',
            [{ text: 'OK' }]
          );
          
          console.log('✅ Test backup JavaScript completato con successo');
          return true;
        }
      }
      
      throw new Error('Test fallito');
      
    } catch (error) {
      console.error('❌ Test backup fallito:', error);
      
      Alert.alert(
        '❌ Test Backup Fallito',
        `Errore durante il test: ${error.message}`,
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }

  // 📊 STATISTICHE BACKUP (Nativo o JavaScript)
  async getBackupStats() {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        // Usa sistema nativo
        const nativeStats = await this.nativeBackupService.getBackupStats();
        return {
          ...nativeStats,
          systemInfo: {
            type: 'native',
            description: 'Sistema backup NATIVO - Funziona anche con app chiusa',
            isReliable: true,
            hasNotifications: true
          }
        };
      } else {
        // Usa sistema JavaScript
        const jsStats = await this.jsBackupService.getBackupStats();
        return {
          ...jsStats,
          systemInfo: {
            type: 'javascript',
            description: 'Sistema backup JavaScript - Solo app aperta',
            isReliable: false,
            hasNotifications: false
          }
        };
      }
    } catch (error) {
      console.error('❌ Errore calcolo statistiche backup:', error);
      return null;
    }
  }

  // ⚙️ AGGIORNA IMPOSTAZIONI BACKUP (Nativo o JavaScript)
  async updateBackupSettings(enabled, time) {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        // Usa sistema nativo
        console.log('🔄 Aggiornamento impostazioni backup NATIVO');
        return await this.nativeBackupService.updateBackupSettings(enabled, time);
      } else {
        // Usa sistema JavaScript
        console.log('🔄 Aggiornamento impostazioni backup JavaScript');
        return await this.jsBackupService.updateBackupSettings(enabled, time);
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento impostazioni backup:', error);
      return false;
    }
  }

  // 📋 OTTIENI IMPOSTAZIONI BACKUP (Nativo o JavaScript)
  async getBackupSettings() {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        // Usa sistema nativo
        return await this.nativeBackupService.getBackupSettings();
      } else {
        // Usa sistema JavaScript
        return await this.jsBackupService.getBackupSettings();
      }
    } catch (error) {
      console.error('❌ Errore lettura impostazioni backup:', error);
      return { enabled: false, time: '02:00' };
    }
  }

  // 💾 BACKUP MANUALE (Nativo o JavaScript)
  async createManualBackup() {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        // Usa sistema nativo
        console.log('💾 Creazione backup manuale NATIVO');
        return await this.nativeBackupService.executeBackup(false);
      } else {
        // Usa sistema JavaScript standard
        console.log('💾 Creazione backup manuale JavaScript');
        return await this.createLocalBackup('manual-backup');
      }
    } catch (error) {
      console.error('❌ Errore backup manuale:', error);
      return { success: false, error: error.message };
    }
  }

  // 💾 BACKUP MANUALE CON SELEZIONE DESTINAZIONE (Expo-friendly)
  async createManualBackupWithDestinationChoice() {
    try {
      console.log('💾 Creazione backup manuale con selezione destinazione...');
      
      // Ottieni dati dal database
      const data = await DatabaseService.getAllData();
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Nessun dato trovato per il backup');
      }

      // Crea metadati backup
      const timestamp = new Date().toISOString();
      const now = new Date();
      const fileName = `WorkT-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.json`;
      
      const backupData = {
        backupInfo: {
          name: fileName,
          created: timestamp,
          type: 'manual',
          version: '1.0',
          app: 'WorkTracker',
          entries: data.work_entries?.length || 0
        },
        ...data
      };

      // Prova prima expo-sharing se disponibile
      try {
        const jsonString = JSON.stringify(backupData, null, 2);
        
        // Prova expo-sharing per salvare direttamente
        try {
          const Sharing = await import('expo-sharing');
          const FileSystem = await import('expo-file-system');
          
          // Crea file temporaneo
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, jsonString);
          
          console.log('📁 File backup creato:', fileUri);
          
          // Condividi/Salva con expo-sharing
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: `Backup WorkT - ${new Date().toLocaleDateString('it-IT')}`,
              UTI: 'public.json'
            });
            
            console.log('✅ Backup condiviso con expo-sharing');
            return { 
              success: true, 
              method: 'expo-sharing', 
              fileName,
              path: fileUri,
              message: 'Backup salvato e condiviso con successo!'
            };
          }
        } catch (expoError) {
          console.log('📱 expo-sharing non disponibile, uso Share API');
        }
        
        // Fallback: React Native Share API
        try {
          const { Share } = require('react-native');
          const shareResult = await Share.share({
            message: `Backup WorkT - ${new Date().toLocaleDateString('it-IT')}\\n\\nFile: ${fileName}`,
            title: 'Backup WorkT',
          });
          
          if (shareResult.action === Share.sharedAction) {
            // Salva anche in AsyncStorage per riferimento
            const backupKey = `manual_backup_${timestamp.replace(/[:.]/g, '_')}`;
            await AsyncStorage.setItem(backupKey, jsonString);
            await this.updateBackupList(fileName, backupKey, 'manual');
            
            console.log('✅ Backup condiviso con Share API');
            return { 
              success: true, 
              method: 'share-api', 
              fileName,
              backupKey,
              message: 'Backup condiviso con successo!'
            };
          }
        } catch (shareError) {
          console.log('📱 Share API fallita:', shareError.message);
        }
        
      } catch (shareError) {
        console.log('📱 Sistemi di condivisione non disponibili, salvo in AsyncStorage');
      }
      
      // Ultimo fallback: AsyncStorage
      const backupKey = `manual_backup_${timestamp.replace(/[:.]/g, '_')}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Aggiorna lista backup
      await this.updateBackupList(fileName, backupKey, 'manual');
      
      console.log('✅ Backup salvato in AsyncStorage');
      return { 
        success: true, 
        method: 'asyncstorage', 
        fileName,
        backupKey,
        message: 'Backup salvato nella memoria dell\'app!'
      };
      
    } catch (error) {
      console.error('❌ Errore backup manuale con destinazione:', error);
      return { success: false, error: error.message };
    }
  }

  // 📱 STATO SISTEMA (Diagnostica)
  getSystemStatus() {
    const nativeStatus = this.nativeBackupService.getSystemStatus();
    const jsStatus = this.jsBackupService.getSystemStatus();
    
    return {
      current: this.useJavaScriptSystem ? 'javascript' : 'native',
      native: nativeStatus,
      javascript: jsStatus,
      recommendation: nativeStatus.isNativeReady 
        ? 'Sistema NATIVO attivo - Backup affidabile 24/7'
        : 'Sistema JavaScript attivo - Backup solo app aperta'
    };
  }

  // 📁 GESTIONE DESTINAZIONI BACKUP (Solo sistema nativo)
  getAvailableDestinations() {
    if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
      return this.nativeBackupService.getAvailableDestinations();
    } else {
      // Sistema JavaScript supporta solo AsyncStorage
      return [{
        id: 'asyncstorage',
        name: 'Memoria App (AsyncStorage)',
        description: 'Salva nella memoria interna dell\'app (solo opzione disponibile in JavaScript)',
        icon: 'phone-portrait-outline',
        available: true,
        reliable: true
      }];
    }
  }

  // ⚙️ AGGIORNA DESTINAZIONE BACKUP
  async updateBackupDestination(destination, customPath = null) {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        return await this.nativeBackupService.updateBackupDestination(destination, customPath);
      } else {
        console.log('📱 Sistema JavaScript: destinazione backup fissa (AsyncStorage)');
        return true; // JavaScript usa sempre AsyncStorage
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento destinazione backup:', error);
      return false;
    }
  }

  // 🔄 AGGIORNA TUTTE LE IMPOSTAZIONI BACKUP
  async updateAllBackupSettings(enabled, time, destination = null, customPath = null) {
    try {
      if (!this.useJavaScriptSystem && this.nativeBackupService.getSystemStatus().isNativeReady) {
        // Sistema nativo supporta destinazioni multiple
        return await this.nativeBackupService.updateAllBackupSettings(enabled, time, destination, customPath);
      } else {
        // Sistema JavaScript usa solo enabled e time
        return await this.updateBackupSettings(enabled, time);
      }
    } catch (error) {
      console.error('❌ Errore aggiornamento completo impostazioni backup:', error);
      return false;
    }
  }
}

export default new BackupService();
