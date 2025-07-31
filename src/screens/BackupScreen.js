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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllBackupsFromAsyncStorage } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';

const BackupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupTime, setAutoBackupTime] = useState('02:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [backupDestination, setBackupDestination] = useState('asyncstorage');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [existingBackups, setExistingBackups] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(false);


  useEffect(() => {
    loadBackupSettings();
    loadAvailableDestinations();
    loadExistingBackups();
  }, []);

  // Gestione attivazione/disattivazione backup automatico
  useEffect(() => {
    // Il BackupService gestisce autonomamente la programmazione
    // Non serve più il vecchio TaskService che creava notifiche immediate
    console.log(`🔄 Backup automatico: ${autoBackupEnabled ? 'abilitato' : 'disabilitato'} alle ${autoBackupTime}`);
  }, [autoBackupEnabled, autoBackupTime]);

  const loadBackupSettings = async () => {
    try {
      const settings = await BackupService.getBackupSettings();
      setAutoBackupEnabled(settings.enabled);
      setAutoBackupTime(settings.time);
      setBackupDestination(settings.destination || 'asyncstorage');
      console.log('✅ Impostazioni backup caricate:', settings);
    } catch (error) {
      console.error('Errore caricamento impostazioni backup:', error);
    }
  };

  const loadAvailableDestinations = async () => {
    try {
      const destinations = BackupService.getAvailableDestinations();
      setAvailableDestinations(destinations);
      console.log('📁 Destinazioni backup disponibili:', destinations);
    } catch (error) {
      console.error('Errore caricamento destinazioni backup:', error);
    }
  };

  // ✅ CARICA BACKUP ESISTENTI
  const loadExistingBackups = async () => {
    try {
      setLoadingBackups(true);
      const backups = await BackupService.listAllBackups();
      
      // Ordina per data (più recenti prima)
      const sortedBackups = backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setExistingBackups(sortedBackups);
      console.log(`📂 Trovati ${sortedBackups.length} backup:`, sortedBackups);
    } catch (error) {
      console.error('Errore caricamento backup esistenti:', error);
      setExistingBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  // ✅ GESTIONE DATETIMEPICKER PER ORARIO BACKUP
  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setAutoBackupTime(timeString);
      
      // Salva immediatamente le nuove impostazioni se il backup è abilitato
      if (autoBackupEnabled) {
        BackupService.updateBackupSettings(autoBackupEnabled, timeString);
      }
    }
  };

  const getCurrentTimeForPicker = () => {
    try {
      const [hours, minutes] = autoBackupTime.split(':');
      const date = new Date();
      date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      return date;
    } catch (error) {
      console.error('Errore parsing orario:', error);
      const date = new Date();
      date.setHours(2, 0, 0, 0); // Default 02:00
      return date;
    }
  };

  // ✅ ELIMINA BACKUP SPECIFICO
  const deleteBackup = async (backup) => {
    Alert.alert(
      '🗑️ Elimina Backup',
      `Vuoi eliminare il backup "${backup.name}"?\n\nCreato: ${new Date(backup.createdAt).toLocaleString('it-IT')}\nDimensione: ${(backup.size / 1024).toFixed(2)} KB`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingBackups(true);
              await BackupService.deleteLocalBackup(backup.key);
              await loadExistingBackups(); // Ricarica la lista
              
              Alert.alert(
                '✅ Backup Eliminato',
                `Il backup "${backup.name}" è stato eliminato con successo.`
              );
            } catch (error) {
              console.error('Errore eliminazione backup:', error);
              Alert.alert(
                '❌ Errore',
                'Impossibile eliminare il backup. Riprova.'
              );
            } finally {
              setLoadingBackups(false);
            }
          }
        }
      ]
    );
  };

  // ✅ RIPRISTINA BACKUP SPECIFICO
  const restoreSpecificBackup = async (backup) => {
    Alert.alert(
      '⚠️ Ripristina Backup',
      `Vuoi ripristinare il backup "${backup.name}"?\n\nCreato: ${new Date(backup.createdAt).toLocaleString('it-IT')}\n\n❌ ATTENZIONE: Tutti i dati attuali verranno sostituiti!`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Leggi i dati del backup
              const backupData = await AsyncStorage.getItem(backup.key);
              if (!backupData) {
                throw new Error('Dati backup non trovati');
              }

              await BackupService.importBackup(backupData);
              
              // 🚨 CRITICAL FIX: Pulisci cache e forza reload completo
              console.log('🔄 RESTORE: Pulizia cache e forzando reload...');
              
              // Pulisci AsyncStorage cache delle impostazioni
              await AsyncStorage.removeItem('settings');
              console.log('🗑️ RESTORE: Cache settings pulita');
              
              Alert.alert(
                '✅ Ripristino Completato',
                `Il backup "${backup.name}" è stato ripristinato con successo!\n\nL'app verrà riavviata per applicare le modifiche.`,
                [{
                  text: 'OK',
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Dashboard' }],
                    });
                  }
                }]
              );
              
            } catch (error) {
              console.error('Errore ripristino backup:', error);
              Alert.alert(
                '❌ Errore Ripristino',
                'Impossibile ripristinare il backup. Il file potrebbe essere corrotto.'
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ ESPORTA BACKUP SPECIFICO
  const exportSpecificBackup = async (backup) => {
    try {
      setIsLoading(true);
      
      // Leggi i dati del backup da AsyncStorage
      const backupData = await AsyncStorage.getItem(backup.key);
      if (!backupData) {
        throw new Error('Dati backup non trovati');
      }

      // Salva come file
      const fileName = `${backup.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      
      const FileSystem = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, backupData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Esporta Backup: ${backup.name}`
        });
      } else {
        Alert.alert('✅ Backup Salvato', `File salvato in: ${fileUri}`);
      }
      
    } catch (error) {
      console.error('Errore esportazione backup:', error);
      Alert.alert(
        '❌ Errore Esportazione',
        'Impossibile esportare il backup. Riprova.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const saveBackupSettings = async () => {
    try {
      setIsLoading(true);
      const success = await BackupService.updateAllBackupSettings(
        autoBackupEnabled, 
        autoBackupTime, 
        backupDestination
      );
      
      if (success) {
        Alert.alert('Successo', 'Impostazioni backup salvate correttamente');
        const systemStatus = BackupService.getSystemStatus();
        console.log('📱 Sistema backup attivo:', systemStatus.current);
        console.log('📁 Destinazione:', backupDestination);
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni backup');
      }
    } catch (error) {
      console.error('Errore salvataggio impostazioni:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const createManualBackup = async () => {
    try {
      setIsLoading(true);
      
      // Usa il nuovo metodo con selezione destinazione
      const result = await BackupService.createManualBackupWithDestinationChoice();
      
      Alert.alert(
        result.success ? '✅ Backup Creato' : '❌ Backup Fallito',
        result.success 
          ? `${result.message}${result.method ? `\n\nMetodo: ${result.method}` : ''}${result.fileName ? `\nFile: ${result.fileName}` : ''}` 
          : `Errore durante la creazione del backup: ${result.error}`,
        [{ 
          text: 'OK',
          onPress: () => {
            if (result.success) {
              loadExistingBackups(); // Ricarica la lista backup
            }
          }
        }]
      );
    } catch (error) {
      console.error('❌ Errore backup manuale:', error);
      Alert.alert('❌ Errore', `Errore: ${error.message}`, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async () => {
    try {
      setIsLoading(true);
      
      // Usa expo-document-picker per scegliere il file
      const DocumentPicker = await import('expo-document-picker');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false
      });
      
      if (result.canceled) {
        console.log('📱 Selezione file annullata dall\'utente');
        return;
      }
      
      console.log('📁 File selezionato:', result.assets[0].name);
      
      // Leggi il contenuto del file
      const FileSystem = await import('expo-file-system');
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      
      // Conferma ripristino
      Alert.alert(
        '⚠️ Conferma Ripristino',
        `Vuoi ripristinare il backup "${result.assets[0].name}"?\n\n❌ ATTENZIONE: Tutti i dati attuali verranno sostituiti con quelli del backup!`,
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Ripristina', 
            style: 'destructive',
            onPress: async () => {
              try {
                const restoreResult = await BackupService.importBackup(fileContent);
                
                // 🚨 CRITICAL FIX: Pulisci cache e forza reload completo
                console.log('🔄 RESTORE: Pulizia cache e forzando reload...');
                
                // Pulisci AsyncStorage cache delle impostazioni
                await AsyncStorage.removeItem('settings');
                console.log('🗑️ RESTORE: Cache settings pulita');
                
                Alert.alert(
                  '✅ Ripristino Completato',
                  `Backup "${result.assets[0].name}" ripristinato con successo!\n\nL'app verrà riavviata per applicare le modifiche.`,
                  [{ 
                    text: 'OK',
                    onPress: () => {
                      // Ricarica l'app
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Dashboard' }],
                      });
                    }
                  }]
                );
              } catch (importError) {
                console.error('❌ Errore ripristino:', importError);
                Alert.alert(
                  '❌ Errore Ripristino', 
                  `Impossibile ripristinare il backup:\n${importError.message}`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore selezione/ripristino backup:', error);
      Alert.alert(
        '❌ Errore', 
        `Errore durante la selezione del file:\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const showBackupStats = async () => {
    try {
      const stats = await BackupService.getBackupStats();
      const systemStatus = BackupService.getSystemStatus();
      
      const message = stats ? 
        `🔄 SISTEMA BACKUP ATTIVO: ${systemStatus.current.toUpperCase()}

📊 Statistiche:
• Backup totali: ${stats.totalBackups || 0}
• Backup manuali: ${stats.manualBackups || 0}
• Backup automatici: ${stats.automaticBackups || 0}
• Sistema attivo: ${stats.isActive ? '✅ SÌ' : '❌ NO'}
• Ultimo backup: ${stats.lastBackup ? new Date(stats.lastBackup).toLocaleString('it-IT') : 'Mai'}
• Prossimo backup: ${stats.nextBackup ? new Date(stats.nextBackup).toLocaleString('it-IT') : 'Non programmato'}

🚀 Sistema Nativo (Affidabile):
• Disponibile: ${systemStatus.native.isNativeReady ? '✅ SÌ' : '❌ NO'}
• Tipo: ${systemStatus.native.systemType}
• Stato: ${systemStatus.native.description}

📱 Sistema JavaScript (Fallback):
• Disponibile: ✅ SÌ
• Tipo: ${systemStatus.javascript.systemType}

💡 Raccomandazione:
${systemStatus.recommendation}

📁 Destinazione Backup:
${availableDestinations.find(d => d.id === backupDestination)?.name || 'Memoria App'}`
        : 'Errore nel recupero delle statistiche';
        
      Alert.alert('📊 Statistiche Sistema Backup', message, [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Errore statistiche:', error);
      Alert.alert('❌ Errore', 'Impossibile ottenere le statistiche', [{ text: 'OK' }]);
    }
  };

  // 🔧 RIPARAZIONE INTERVENTI CORROTTI
  const repairCorruptedInterventi = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        '🔧 Riparazione Interventi Corrotti',
        'Questa operazione verificherà e riparerà eventuali dati di interventi corrotti nel database. I dati corrotti verranno resettati a array vuoto. Vuoi continuare?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Ripara', 
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🔧 INIZIO RIPARAZIONE INTERVENTI');
                
                // Ottieni tutti i work entries
                const allEntries = await DatabaseService.getAllWorkEntries();
                console.log(`📊 Controllo ${allEntries.length} entries...`);
                
                let repairedCount = 0;
                let convertedCount = 0;
                let corruptedEntries = [];
                
                // Controlla ogni entry
                for (const entry of allEntries) {
                  let needsRepair = false;
                  let repairedData = '[]';
                  
                  if (entry.interventi) {
                    if (typeof entry.interventi === 'string') {
                      try {
                        const parsed = JSON.parse(entry.interventi);
                        if (!Array.isArray(parsed)) {
                          needsRepair = true;
                          repairedData = JSON.stringify([]);
                        }
                      } catch (error) {
                        console.warn(`Impossibile parsare JSON per interventi per l'entry id ${entry.id}: ${entry.interventi}`);
                        
                        // Tentativo di conversione automatica per formato oggetto
                        let cleaned = String(entry.interventi)
                          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                          .replace(/\n/g, ' ')
                          .replace(/\r/g, ' ')
                          .replace(/\t/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
                        
                        // Gestione formato specifico: [{departure_company=19:25, arrival_site=22:25...}]
                        if (cleaned.includes('=') && cleaned.includes('{') && cleaned.includes('}')) {
                          try {
                            let jsonString = cleaned
                              .replace(/\{([^}]+)\}/g, (match, content) => {
                                let pairs = content.split(',').map(pair => {
                                  let [key, value] = pair.split('=');
                                  if (key && value !== undefined) {
                                    return `"${key.trim()}":"${value.trim()}"`;
                                  } else if (key) {
                                    return `"${key.trim()}":""`;
                                  }
                                  return '';
                                }).filter(pair => pair);
                                
                                return `{${pairs.join(',')}}`;
                              });
                            
                            // Verifica che sia JSON valido
                            const converted = JSON.parse(jsonString);
                            repairedData = jsonString;
                            convertedCount++;
                            console.log(`✅ Convertito entry ${entry.id} da formato oggetto a JSON`);
                          } catch (conversionError) {
                            console.warn(`❌ Conversione fallita per entry ${entry.id}:`, conversionError.message);
                            repairedData = '[]';
                          }
                        }
                        
                        needsRepair = true;
                        corruptedEntries.push({
                          date: entry.date,
                          id: entry.id,
                          error: error.message
                        });
                      }
                    } else if (!Array.isArray(entry.interventi)) {
                      needsRepair = true;
                      repairedData = JSON.stringify([]);
                    }
                  }
                  
                  // Ripara se necessario
                  if (needsRepair) {
                    console.log(`🔧 Riparando ${entry.date}...`);
                    
                    // Aggiorna nel database
                    await DatabaseService.db.runAsync(
                      `UPDATE work_entries SET interventi = ? WHERE date = ?`,
                      [repairedData, entry.date]
                    );
                    
                    repairedCount++;
                  }
                }
                
                let resultMessage = `🔧 RIPARAZIONE COMPLETATA:

📊 Risultati:
• Entries controllate: ${allEntries.length}
• Entries riparate: ${repairedCount}
• Entries convertite automaticamente: ${convertedCount}
• Entries corrotte trovate: ${corruptedEntries.length}`;

                if (corruptedEntries.length > 0) {
                  resultMessage += `\n\n🗂️ Date con dati corrotti riparate:`;
                  corruptedEntries.forEach((entry, index) => {
                    resultMessage += `\n${index + 1}. ${entry.date} (ID: ${entry.id})`;
                  });
                }

                if (repairedCount === 0) {
                  resultMessage += `\n\n✅ Nessuna riparazione necessaria. Tutti i dati sono integri!`;
                } else {
                  if (convertedCount > 0) {
                    resultMessage += `\n\n🔄 ${convertedCount} entries sono state convertite automaticamente dal formato oggetto al formato JSON.`;
                  }
                  if (repairedCount - convertedCount > 0) {
                    resultMessage += `\n\n⚠️ ${repairedCount - convertedCount} entries con dati non recuperabili sono state resettate a array vuoto.`;
                  }
                }
                
                Alert.alert('✅ Riparazione Completata', resultMessage, [{ text: 'OK' }]);
                
              } catch (error) {
                console.error('❌ Errore durante riparazione:', error);
                Alert.alert(
                  '❌ Errore Riparazione', 
                  `Si è verificato un errore durante la riparazione:\n\n${error.message}`, 
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore riparazione interventi:', error);
      Alert.alert('❌ Errore', 'Impossibile avviare la riparazione', [{ text: 'OK' }]);
      setIsLoading(false);
    }
  };
  const debugInterventiBackup = async () => {
    try {
      setIsLoading(true);
      
      Alert.alert(
        '🧪 Debug Interventi Backup',
        'Questo test verificherà se gli interventi di reperibilità vengono correttamente salvati e ripristinati nei backup. Vuoi continuare?',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Avvia Test', 
            onPress: async () => {
              try {
                console.log('🧪 INIZIO DEBUG INTERVENTI BACKUP');
                
                // 1. Verifica entry attuali con interventi
                const currentEntries = await DatabaseService.getAllWorkEntries();
                const entriesWithInterventi = currentEntries.filter(entry => {
                  try {
                    const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
                    return interventi && Array.isArray(interventi) && interventi.length > 0;
                  } catch (e) {
                    return false;
                  }
                });
                
                console.log(`🧪 Entry totali: ${currentEntries.length}`);
                console.log(`🧪 Entry con interventi: ${entriesWithInterventi.length}`);
                
                // 2. Test backup
                console.log('🧪 Test creazione backup...');
                const backupData = await DatabaseService.getAllData();
                const backupEntriesWithInterventi = backupData.workEntries.filter(entry => 
                  entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0
                );
                
                console.log(`🧪 Entry con interventi nel backup: ${backupEntriesWithInterventi.length}`);
                
                // 3. Risultati
                let resultMessage = `🧪 RISULTATI TEST INTERVENTI:

📊 Situazione Attuale:
• Entry totali nel database: ${currentEntries.length}
• Entry con interventi nel database: ${entriesWithInterventi.length}
• Entry con interventi nel backup: ${backupEntriesWithInterventi.length}

✅ Stato Sistema:`;

                if (entriesWithInterventi.length === 0) {
                  resultMessage += `
⚠️ Non ci sono interventi nel database da testare.

💡 Suggerimento: Aggiungi alcuni interventi di reperibilità tramite la funzione "Modifica Entry" e poi riprova questo test.`;
                } else if (entriesWithInterventi.length === backupEntriesWithInterventi.length) {
                  resultMessage += `
✅ SUCCESSO: Gli interventi vengono inclusi correttamente nel backup!

🎯 Tutti i ${entriesWithInterventi.length} interventi sono presenti nel backup.`;
                } else {
                  resultMessage += `
❌ PROBLEMA: Discrepanza tra database e backup!

Database: ${entriesWithInterventi.length} entry con interventi
Backup: ${backupEntriesWithInterventi.length} entry con interventi`;
                }
                
                // Log dettagliato per debug
                if (entriesWithInterventi.length > 0) {
                  console.log('🧪 DETTAGLI INTERVENTI NEL DATABASE:');
                  entriesWithInterventi.forEach((entry, index) => {
                    const interventi = typeof entry.interventi === 'string' ? JSON.parse(entry.interventi) : entry.interventi;
                    console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${interventi.length}`);
                  });
                }
                
                if (backupEntriesWithInterventi.length > 0) {
                  console.log('🧪 DETTAGLI INTERVENTI NEL BACKUP:');
                  backupEntriesWithInterventi.forEach((entry, index) => {
                    console.log(`  ${index + 1}. Data: ${entry.date}, Interventi: ${entry.interventi.length}`);
                  });
                }
                
                Alert.alert('🧪 Test Completato', resultMessage, [{ text: 'OK' }]);
                
              } catch (error) {
                console.error('❌ Errore durante debug:', error);
                Alert.alert(
                  '❌ Errore Test', 
                  `Si è verificato un errore durante il test:\n\n${error.message}`, 
                  [{ text: 'OK' }]
                );
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Errore debug interventi:', error);
      Alert.alert('❌ Errore', 'Impossibile avviare il test di debug', [{ text: 'OK' }]);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backup e Ripristino</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Sezione Backup Automatico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Backup Automatico</Text>
          
          <View style={styles.autoBackupContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Attiva backup automatico</Text>
              <Switch
                value={autoBackupEnabled}
                onValueChange={async (value) => {
                  setAutoBackupEnabled(value);
                  setIsLoading(true);
                  try {
                    await BackupService.updateBackupSettings(value, autoBackupTime);
                  } catch (e) {
                    console.error('Errore aggiornamento impostazioni backup:', e);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            
            {autoBackupEnabled && (
              <>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeLabel}>Orario backup (ogni 24h):</Text>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={openTimePicker}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.timeSelectorText}>{autoBackupTime}</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Selezione Destinazione Backup */}
                <View style={styles.destinationContainer}>
                  <Text style={styles.destinationLabel}>📁 Destinazione backup:</Text>
                  <TouchableOpacity 
                    style={styles.destinationButton}
                    onPress={() => setShowDestinationPicker(true)}
                  >
                    <Ionicons 
                      name={availableDestinations.find(d => d.id === backupDestination)?.icon || 'folder-outline'} 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.destinationButtonText}>
                      {availableDestinations.find(d => d.id === backupDestination)?.name || 'Memoria App'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  
                  <Text style={styles.destinationDescription}>
                    {availableDestinations.find(d => d.id === backupDestination)?.description || 
                     'Salva nella memoria interna dell\'app'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Bottone Salva Impostazioni */}
        <TouchableOpacity style={styles.saveButton} onPress={saveBackupSettings} disabled={isLoading}>
          <Ionicons name="save-outline" size={20} color={theme.colors.onPrimary} />
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>

        {/* Sezione Backup Manuali */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Backup Manuali</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={createManualBackup}
            disabled={isLoading}
          >
            <Ionicons name="download-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Crea Backup e Scegli Destinazione</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#FF6B35' }]}
            onPress={restoreBackup}
            disabled={isLoading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Ripristina da File</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.colors.secondary }]}
            onPress={showBackupStats}
            disabled={isLoading}
          >
            <Ionicons name="stats-chart-outline" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.buttonText}>Mostra Statistiche</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#e11d48' }]}
            onPress={async () => {
              const count = await clearAllBackupsFromAsyncStorage();
              Alert.alert(
                'Backup eliminati',
                count > 0
                  ? `${count} backup eliminati con successo.`
                  : 'Nessun backup trovato da eliminare.'
              );
              loadExistingBackups();
            }}
            disabled={isLoading}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={[styles.buttonText, { color: '#fff' }]}>Svuota backup</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ BACKUP ESISTENTI */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📂 Backup Salvati</Text>
          
          {loadingBackups ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Caricamento backup...</Text>
            </View>
          ) : existingBackups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>Nessun backup trovato</Text>
              <Text style={styles.emptySubtext}>Crea il tuo primo backup per iniziare</Text>
            </View>
          ) : (
            <>
              <Text style={styles.backupCount}>
                📊 {existingBackups.length} backup disponibili
              </Text>
              {existingBackups.map((backup, index) => (
                <View key={backup.key} style={styles.backupItem}>
                  <View style={styles.backupHeader}>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupName}>{backup.name}</Text>
                      <Text style={styles.backupDate}>
                        📅 {new Date(backup.createdAt).toLocaleString('it-IT')}
                      </Text>
                      <Text style={styles.backupSize}>
                        💾 {(backup.size / 1024).toFixed(2)} KB
                      </Text>
                      {backup.type === 'auto' && (
                        <Text style={styles.backupType}>🤖 Automatico</Text>
                      )}
                    </View>
                    <View style={styles.backupActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.exportButton]}
                        onPress={() => exportSpecificBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.restoreButton]}
                        onPress={() => restoreSpecificBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => deleteBackup(backup)}
                        disabled={isLoading}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {backup.entries && (
                    <Text style={styles.backupEntries}>
                      📋 {backup.entries} ore registrate
                    </Text>
                  )}
                </View>
              ))}
              
              <TouchableOpacity
                style={[styles.button, styles.refreshButton]}
                onPress={loadExistingBackups}
                disabled={loadingBackups}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                  Aggiorna Lista
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Info Sistema */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.infoText}>
            📦 I backup includono tutte le ore lavorate e configurazioni.{'\n'}
            🚀 Sistema IBRIDO: Backup nativo (app builds) + fallback JavaScript (Expo).{'\n'}
            🔔 Sistema nativo: Funziona anche con app chiusa tramite notifiche.{'\n'}
            📁 Backup manuali: Scegli dove salvare (file, condivisione, memoria app).{'\n'}
            📁 Backup automatici: Scegli destinazione dalla sezione sopra.
          </Text>
        </View>
      </ScrollView>

      {/* Modal Selezione Destinazione */}
      {showDestinationPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📁 Scegli Destinazione Backup</Text>
              <TouchableOpacity onPress={() => setShowDestinationPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.destinationList}>
              {availableDestinations.map((destination) => (
                <TouchableOpacity
                  key={destination.id}
                  style={[
                    styles.destinationOption,
                    backupDestination === destination.id && styles.destinationOptionSelected
                  ]}
                  onPress={() => {
                    setBackupDestination(destination.id);
                    setShowDestinationPicker(false);
                  }}
                >
                  <View style={styles.destinationOptionLeft}>
                    <Ionicons 
                      name={destination.icon} 
                      size={24} 
                      color={backupDestination === destination.id ? '#007AFF' : theme.colors.textSecondary} 
                    />
                    <View style={styles.destinationOptionText}>
                      <Text style={[
                        styles.destinationOptionName,
                        backupDestination === destination.id && { color: '#007AFF', fontWeight: '600' }
                      ]}>
                        {destination.name}
                      </Text>
                      <Text style={styles.destinationOptionDescription}>
                        {destination.description}
                      </Text>
                      <View style={styles.destinationOptionTags}>
                        {destination.available && (
                          <View style={[styles.tag, styles.tagAvailable]}>
                            <Text style={styles.tagText}>✅ Disponibile</Text>
                          </View>
                        )}
                        {destination.reliable && (
                          <View style={[styles.tag, styles.tagReliable]}>
                            <Text style={styles.tagText}>🔒 Affidabile</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  {backupDestination === destination.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Elaborando...</Text>
        </View>
      )}

      {/* DateTimePicker per orario backup */}
      {showTimePicker && (
        <DateTimePicker
          value={getCurrentTimeForPicker()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

// Funzione per creare stili dinamici basati sul tema
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  autoBackupContainer: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  timeContainer: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  timeSelectorText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  destinationContainer: {
    gap: 8,
  },
  destinationLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  destinationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  destinationButtonText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  destinationDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  buttonText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    minHeight: 300,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  destinationList: {
    padding: 16,
  },
  destinationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  destinationOptionSelected: {
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  destinationOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  destinationOptionText: {
    flex: 1,
    gap: 4,
  },
  destinationOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  destinationOptionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  destinationOptionTags: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagAvailable: {
    backgroundColor: theme.colors.success || '#4CAF50',
  },
  tagReliable: {
    backgroundColor: theme.colors.warning || '#FF9800',
  },
  tagText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  
  // ✅ STILI BACKUP ESISTENTI
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  backupCount: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  backupItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  backupInfo: {
    flex: 1,
    marginRight: 16,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  backupDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  backupSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  backupType: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  backupEntries: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  exportButton: {
    backgroundColor: '#2196F3', // Blu per condivisione
  },
  restoreButton: {
    backgroundColor: '#4CAF50', // Verde per ripristino
  },
  deleteButton: {
    backgroundColor: '#F44336', // Rosso per eliminazione
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginTop: 8,
  },
});

export default BackupScreen;
