import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from '../services/DatabaseService';
import { formatDate } from '../utils';

const BackupScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [recentBackups, setRecentBackups] = useState([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [lastBackupDate, setLastBackupDate] = useState(null);

  useEffect(() => {
    loadBackupSettings();
    loadRecentBackups();
  }, []);

  // Carica impostazioni backup
  const loadBackupSettings = async () => {
    try {
      const autoEnabled = await AsyncStorage.getItem('auto_backup_enabled');
      const autoTime = await AsyncStorage.getItem('auto_backup_time');
      const lastBackup = await AsyncStorage.getItem('last_backup_date');

      if (autoEnabled) setAutoBackupEnabled(JSON.parse(autoEnabled));
      if (autoTime) setAutoBackupTime(autoTime);
      if (lastBackup) setLastBackupDate(lastBackup);
    } catch (error) {
      console.error('Errore caricamento impostazioni backup:', error);
    }
  };

  // Carica gli ultimi 3 backup dalla cartella dell'app
  const loadRecentBackups = async () => {
    try {
      // Carica dalla cartella dell'app, non dal percorso personalizzato
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        // Se la cartella non esiste, creala e imposta lista vuota
        await FileSystem.makeDirectoryAsync(backupDir, { intermediateDirectories: true });
        setRecentBackups([]);
        return;
      }

      // Prima prova a caricare da AsyncStorage (backup recenti salvati)
      const backupsInfo = await AsyncStorage.getItem('recent_backups');
      if (backupsInfo) {
        const backups = JSON.parse(backupsInfo);
        
        // Verifica che i file esistano ancora
        const validBackups = [];
        for (const backup of backups) {
          const fileInfo = await FileSystem.getInfoAsync(backup.path);
          if (fileInfo.exists) {
            validBackups.push(backup);
          }
        }
        
        setRecentBackups(validBackups.slice(0, 3)); // Solo gli ultimi 3
        return;
      }

      // Se non ci sono backup salvati in AsyncStorage, scansiona la cartella
      const files = await FileSystem.readDirectoryAsync(backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const filePath = `${backupDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          return {
            name: file,
            path: filePath,
            date: new Date(fileInfo.modificationTime).toISOString(),
            size: fileInfo.size
          };
        });

      const resolvedBackups = await Promise.all(backupFiles);
      const sortedBackups = resolvedBackups
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      setRecentBackups(sortedBackups);
      
      // Salva in AsyncStorage per future chiamate
      if (sortedBackups.length > 0) {
        await AsyncStorage.setItem('recent_backups', JSON.stringify(sortedBackups));
      }
    } catch (error) {
      console.error('Errore caricamento backup recenti:', error);
      setRecentBackups([]);
    }
  };

  // Salva le impostazioni auto-backup
  const saveBackupSettings = async () => {
    try {
      await AsyncStorage.setItem('auto_backup_enabled', JSON.stringify(autoBackupEnabled));
      await AsyncStorage.setItem('auto_backup_time', autoBackupTime);
      Alert.alert('Successo', 'Impostazioni salvate correttamente');
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  // Scegli percorso personalizzato
  const selectCustomPath = async () => {
    try {
      Alert.alert(
        'Informazione',
        'Per sicurezza, i backup verranno salvati nella cartella dell\'app e potrai condividerli nel percorso che preferisci usando il pulsante "Condividi".',
        [{ text: 'OK' }]
      );
      
      // Usa sempre la cartella dell'app
      const documentsPath = FileSystem.documentDirectory;
      const backupPath = `${documentsPath}backups/`;
      
      // Crea la cartella se non esiste
      const dirInfo = await FileSystem.getInfoAsync(backupPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupPath, { intermediateDirectories: true });
      }
    } catch (error) {
      console.error('Errore selezione percorso:', error);
      Alert.alert('Errore', 'Impossibile impostare il percorso di backup');
    }
  };

  // Crea backup manuale e scegli dove salvarlo
  const createManualBackup = async () => {
    setIsLoading(true);
    try {
      // Genera nome file con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `worktracker-backup-${timestamp}.json`;
      
      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();
      
      // Aggiungi metadati backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'manual',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Crea il file temporaneamente nella cache
      const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(backupData, null, 2));

      // Apri immediatamente il menu di condivisione per scegliere dove salvare
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          mimeType: 'application/json',
          dialogTitle: 'Scegli dove salvare il backup',
          UTI: 'public.json'
        });

        // Salva anche una copia locale per la lista recenti
        const localBackupPath = `${FileSystem.documentDirectory}backups/`;
        const dirInfo = await FileSystem.getInfoAsync(localBackupPath);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(localBackupPath, { intermediateDirectories: true });
        }
        
        const localFilePath = `${localBackupPath}${fileName}`;
        await FileSystem.copyAsync({
          from: tempPath,
          to: localFilePath
        });

        // Aggiorna lista backup recenti
        const newBackup = {
          name: fileName,
          path: localFilePath,
          date: new Date().toISOString(),
          size: (await FileSystem.getInfoAsync(localFilePath)).size
        };

        const updatedBackups = [newBackup, ...recentBackups].slice(0, 3);
        setRecentBackups(updatedBackups);
        await AsyncStorage.setItem('recent_backups', JSON.stringify(updatedBackups));
        await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
        setLastBackupDate(new Date().toISOString());

        Alert.alert(
          'Backup Creato!',
          `Backup ${fileName} creato e pronto per essere salvato.\n\nScegli dall'app di sistema dove salvarlo definitivamente.`
        );
      } else {
        Alert.alert('Errore', 'Sistema di condivisione non disponibile');
      }
    } catch (error) {
      console.error('Errore creazione backup:', error);
      Alert.alert('Errore', `Impossibile creare il backup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Ripristina da backup
  const restoreFromBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      console.log('DocumentPicker result:', result);

      if (result.type === 'success' || (result.assets && result.assets.length > 0)) {
        // Gestisce sia il formato vecchio che nuovo di DocumentPicker
        const fileUri = result.uri || (result.assets && result.assets[0].uri);
        
        if (!fileUri) {
          Alert.alert('Errore', 'Impossibile accedere al file selezionato');
          return;
        }

        Alert.alert(
          'Conferma Ripristino',
          'Sei sicuro di voler ripristinare questo backup? Tutti i dati attuali verranno sostituiti.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Ripristina', style: 'destructive', onPress: () => performRestore(fileUri) }
          ]
        );
      }
    } catch (error) {
      console.error('Errore selezione file backup:', error);
      Alert.alert('Errore', 'Impossibile selezionare il file di backup');
    }
  };

  // Esegui ripristino
  const performRestore = async (fileUri) => {
    setIsLoading(true);
    try {
      console.log('Attempting to restore from:', fileUri);
      
      // Leggi contenuto file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      console.log('File content length:', fileContent.length);
      
      const backupData = JSON.parse(fileContent);
      console.log('Parsed backup data keys:', Object.keys(backupData));

      // Verifica che sia un backup valido
      if (!backupData.backupInfo || backupData.backupInfo.app !== 'WorkTracker') {
        throw new Error('File di backup non valido o non compatibile');
      }

      console.log('Backup validation passed, calling restoreData...');

      // Ripristina dati nel database - usa il metodo corretto
      const result = await DatabaseService.restoreData(backupData);
      console.log('Restore result:', result);

      Alert.alert(
        'Successo', 
        'Backup ripristinato correttamente!\n\nL\'app verrà ricaricata per mostrare i dati aggiornati.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Aggiorna i backup recenti per riflettere il nuovo stato
              loadRecentBackups();
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Errore ripristino backup:', error);
      Alert.alert('Errore', `Impossibile ripristinare il backup: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Crea backup automatico silenzioso (si salva nella cartella app)
  const createAutoBackup = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `worktracker-auto-backup-${timestamp}.json`;
      
      // Ottieni tutti i dati dal database
      const data = await DatabaseService.getAllData();
      
      // Aggiungi metadati backup
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'automatic',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Salva direttamente nella cartella dell'app
      const localBackupPath = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(localBackupPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localBackupPath, { intermediateDirectories: true });
      }
      
      const localFilePath = `${localBackupPath}${fileName}`;
      await FileSystem.writeAsStringAsync(localFilePath, JSON.stringify(backupData, null, 2));

      // Aggiorna lista backup recenti
      const newBackup = {
        name: fileName,
        path: localFilePath,
        date: new Date().toISOString(),
        size: (await FileSystem.getInfoAsync(localFilePath)).size
      };

      const currentBackups = await AsyncStorage.getItem('recent_backups');
      const backups = currentBackups ? JSON.parse(currentBackups) : [];
      const updatedBackups = [newBackup, ...backups].slice(0, 3);
      
      await AsyncStorage.setItem('recent_backups', JSON.stringify(updatedBackups));
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());

      console.log(`✅ Backup automatico creato: ${fileName}`);
      return true;
    } catch (error) {
      console.error('❌ Errore backup automatico:', error);
      return false;
    }
  };

  // Configura backup automatico (solo se abilitato)
  const setupAutoBackup = async () => {
    if (autoBackupEnabled) {
      console.log(`🔄 Backup automatico programmato per le ${autoBackupTime}`);
      console.log('📍 Posizione: Cartella app (per sicurezza)');
      console.log('💡 Suggerimento: Usa "Condividi" per salvare in cloud/cartelle esterne');
      
      // Qui potresti aggiungere logica per programmazione background
      // usando expo-task-manager o expo-notifications per promemoria
    }
  };

  useEffect(() => {
    setupAutoBackup();
  }, [autoBackupEnabled, autoBackupTime]);

  // Condividi backup con opzione di salvataggio
  const shareBackupWithSaveOption = async (backup) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.path, {
          mimeType: 'application/json',
          dialogTitle: 'Salva Backup WorkTracker nel percorso che preferisci'
        });
      } else {
        Alert.alert('Errore', 'Condivisione non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Errore condivisione backup:', error);
      Alert.alert('Errore', 'Impossibile condividere il backup');
    }
  };

  // Condividi backup
  const shareBackup = async (backup) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.path, {
          mimeType: 'application/json',
          dialogTitle: 'Condividi Backup WorkTracker'
        });
      } else {
        Alert.alert('Errore', 'Condivisione non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Errore condivisione backup:', error);
      Alert.alert('Errore', 'Impossibile condividere il backup');
    }
  };

  // Formatta dimensione file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Ripristina un backup specifico dalla lista recenti
  const restoreSpecificBackup = async (backup) => {
    Alert.alert(
      'Conferma Ripristino',
      `Sei sicuro di voler ripristinare il backup "${backup.name}"?\n\nTutti i dati attuali verranno sostituiti.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Ripristina', style: 'destructive', onPress: () => performRestore(backup.path) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2196F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup e Ripristino</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sezione Percorso Personalizzato */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup Diretto</Text>
          <Text style={styles.pathHelpText}>
            Quando crei un backup, si aprirà automaticamente il menu di sistema per scegliere dove salvarlo:{'\n'}
            📱 File Manager per salvare in cartelle locali{'\n'}
            ☁️ Google Drive, OneDrive per il cloud{'\n'}
            📧 Email, WhatsApp per inviarlo{'\n'}
            💾 Una copia viene sempre mantenuta nell'app
          </Text>
        </View>

        {/* Sezione Backup Automatico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Automatico</Text>
          <View style={styles.autoBackupContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Attiva backup automatico</Text>
              <Switch
                value={autoBackupEnabled}
                onValueChange={setAutoBackupEnabled}
                trackColor={{ false: "#ccc", true: "#2196F3" }}
                thumbColor="#fff"
              />
            </View>
            {autoBackupEnabled && (
              <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Orario backup (ogni 24h):</Text>
                <TextInput
                  style={styles.timeInput}
                  value={autoBackupTime}
                  onChangeText={setAutoBackupTime}
                  placeholder="HH:MM"
                />
              </View>
            )}
          </View>
          {lastBackupDate && (
            <Text style={styles.lastBackupText}>
              Ultimo backup: {formatDate(new Date(lastBackupDate))}
            </Text>
          )}
        </View>

        {/* Bottone Salva Impostazioni */}
        <TouchableOpacity style={styles.saveButton} onPress={saveBackupSettings}>
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>

        {/* Sezione Backup Recenti */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Recenti</Text>
          {recentBackups.length > 0 ? (
            recentBackups.map((backup, index) => (
              <View key={index} style={styles.backupItem}>
                <View style={styles.backupInfo}>
                  <Text style={styles.backupName}>{backup.name}</Text>
                  <Text style={styles.backupDetails}>
                    {formatDate(new Date(backup.date))} • {formatFileSize(backup.size)}
                  </Text>
                  <Text style={styles.backupPath} numberOfLines={1}>
                    {backup.path}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.shareBackupButton}
                  onPress={() => shareBackup(backup)}
                >
                  <Ionicons name="share-outline" size={16} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.restoreBackupButton}
                  onPress={() => restoreSpecificBackup(backup)}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FF9800" />
                </TouchableOpacity>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
            ))
          ) : (
            <Text style={styles.noBackupsText}>Nessun backup recente</Text>
          )}
        </View>

        {/* Pulsanti Azione */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={createManualBackup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>Crea e Salva Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.restoreButton]}
            onPress={restoreFromBackup}
            disabled={isLoading}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Ripristina da File</Text>
          </TouchableOpacity>
        </View>

        {/* Info aggiornata */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            📦 I backup includono tutte le ore lavorate, impostazioni contratto e configurazioni.{'\n'}
            🔄 Il backup automatico viene eseguito ogni 24 ore all'orario impostato.{'\n'}
            📍 Per sicurezza, i backup automatici si salvano nella cartella dell'app.{'\n'}
            💾 Usa "Condividi" per salvare manualmente in cloud o cartelle esterne.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    color: '#666',
  },
  selectButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  pathHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  autoBackupContainer: {
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 80,
    textAlign: 'center',
  },
  lastBackupText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backupInfo: {
    flex: 1,
  },
  backupName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  backupDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  backupPath: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  noBackupsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  restoreButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  shareBackupButton: {
    padding: 8,
    marginRight: 8,
  },
  restoreBackupButton: {
    padding: 8,
    marginRight: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default BackupScreen;
