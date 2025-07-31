import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
const NotificationService = require('../services/SuperNotificationService');

const NotificationSettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [settings, setSettings] = useState({
    enabled: false,
    morningTime: '07:30',
    eveningTime: '18:30',
    weekendsEnabled: false,
    workReminder: { enabled: false, morningTime: '07:30', weekendsEnabled: false },
    timeEntryReminder: { enabled: false, time: '18:30', weekendsEnabled: false },
    standbyReminder: { enabled: false, notifications: [] },
    backupReminder: { enabled: false, time: '02:00', frequency: 'weekly' }
  });
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerField, setTimePickerField] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Carica le impostazioni al mount
  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
    
    // Setup listener per le notifiche - DISATTIVATO per evitare programmazione automatica
    // NotificationService.setupNotificationListener();
  }, []);

  const checkNotificationPermissions = async () => {
    try {
      const permission = await NotificationService.hasPermissions();
      setHasPermission(permission);
    } catch (error) {
      console.error('❌ Errore verifica permessi notifiche:', error);
      setHasPermission(false);
    }
  };

  const requestNotificationPermissions = async () => {
    const granted = await NotificationService.requestPermissions();
    setHasPermission(granted);
    
    if (!granted) {
      Alert.alert(
        'Permessi necessari',
        'Per ricevere notifiche, abilita i permessi nelle impostazioni del dispositivo.',
        [{ text: 'OK' }]
      );
    }
    
    return granted;
  };

  const loadSettings = async () => {
    try {
      const loadedSettings = await NotificationService.getSettings();
      
      // Verifica che loadedSettings sia un oggetto valido
      if (!loadedSettings || typeof loadedSettings !== 'object') {
        console.error('❌ Impostazioni caricate non valide');
        // Usa le impostazioni predefinite
        setSettings(NotificationService.getDefaultSettings());
      } else {
        // Converti le impostazioni dal formato servizio (singolare) a normalizedSettings (plurale)
        const normalizedSettings = {
          ...loadedSettings,
          // Normalizzazione da singolare a plurale per la UI
          workReminders: loadedSettings.workReminder || loadedSettings.workReminders || { enabled: false, morningTime: '07:30', weekendsEnabled: false },
          timeEntryReminders: loadedSettings.timeEntryReminder || loadedSettings.timeEntryReminders || { enabled: false, time: '18:30', weekendsEnabled: false },
          standbyReminders: loadedSettings.standbyReminder || loadedSettings.standbyReminders || { enabled: false, notifications: [] },
          dailySummary: loadedSettings.dailySummary || { enabled: false, time: '21:00' },
          overtimeAlerts: loadedSettings.overtimeAlerts || { enabled: false }
        };
        
        // Usa le impostazioni normalizzate
        setSettings(normalizedSettings);
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento impostazioni notifiche:', error);
      // In caso di errore, usa le impostazioni predefinite
      setSettings(NotificationService.getDefaultSettings());
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      // Converti le impostazioni da normalizedSettings (plurale) a formato servizio (singolare)
      const serviceSettings = {
        ...newSettings,
        // Normalizzazione da plurale a singolare per il servizio
        workReminder: newSettings.workReminders,
        timeEntryReminder: newSettings.timeEntryReminders,
        standbyReminder: newSettings.standbyReminders
      };
      
      // Rimuovi le chiavi duplicate (plurali) per non confondere il servizio
      delete serviceSettings.workReminders;
      delete serviceSettings.timeEntryReminders;
      delete serviceSettings.standbyReminders;
      
      const success = await NotificationService.saveSettings(serviceSettings);
      if (success) {
        setSettings(newSettings);
        
        // Riprogramma automaticamente le notifiche con le nuove impostazioni
        await NotificationService.scheduleNotifications(serviceSettings, true);
        console.log('✅ Impostazioni salvate e notifiche riprogrammate');
        
        Alert.alert('Successo', 'Impostazioni salvate e notifiche riprogrammate automaticamente.');
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
      }
    } catch (error) {
      console.error('❌ Errore nel salvataggio impostazioni notifiche:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
    }
  };

  const handleMainToggle = async (value) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
    }

    const newSettings = { ...settings, enabled: value };
    await saveSettings(newSettings);
  };

  const handleSectionToggle = (section, value) => {
    // Verifica che la sezione esista prima di aggiornarla
    if (!settings || !settings[section]) {
      console.error(`❌ Sezione ${section} non trovata nelle impostazioni`);
      
      // Inizializza la sezione se non esiste
      const newSettings = { ...settings };
      newSettings[section] = { enabled: value };
      saveSettings(newSettings);
      return;
    }
    
    const newSettings = {
      ...settings,
      [section]: { ...settings[section], enabled: value }
    };
    saveSettings(newSettings);
  };

  const handleTimeChange = (section, field, time) => {
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    let newSettings = { ...settings };
    
    // Verifica che la sezione esista
    if (!newSettings[section]) {
      console.warn(`⚠️ Sezione ${section} non trovata, inizializzazione...`);
      newSettings[section] = {};
    }
    
    // Gestione speciale per notifiche di reperibilità
    if (section === 'standbyReminders' && field.startsWith('notifications.')) {
      const notificationIndex = parseInt(field.split('.')[1]);
      
      // Verifica che notifications esista
      if (!newSettings.standbyReminders.notifications) {
        newSettings.standbyReminders.notifications = [];
      }
      
      // Verifica che l'elemento all'indice esista
      if (!newSettings.standbyReminders.notifications[notificationIndex]) {
        newSettings.standbyReminders.notifications[notificationIndex] = {};
      }
      
      newSettings.standbyReminders.notifications[notificationIndex].time = timeString;
    } else {
      // Gestione normale
      newSettings[section] = { ...newSettings[section], [field]: timeString };
    }
    
    saveSettings(newSettings);
    setShowTimePicker(false);
  };

  const openTimePicker = (section, field) => {
    setTimePickerField(`${section}.${field}`);
    setShowTimePicker(true);
  };

  const openStandbyTimePicker = (notificationIndex) => {
    // Per gestire correttamente l'aggiornamento, usiamo lo stesso pattern delle altre funzioni
    setTimePickerField(`standbyReminders.notifications.${notificationIndex}`);
    setShowTimePicker(true);
  };

  const getCurrentTime = () => {
    if (!timePickerField) return new Date();
    
    const [section, field] = timePickerField.split('.');
    let timeString = '00:00'; // Default
    
    try {
      // Verifica che la sezione esista
      if (!settings || !settings[section]) {
        console.warn(`⚠️ Sezione ${section} non trovata in getCurrentTime`);
        return new Date();
      }
      
      if (section === 'standbyReminders' && field.startsWith('notifications.')) {
        // Caso speciale per standbyReminders.notifications.X
        const notificationIndex = parseInt(field.split('.')[1]);
        
        if (settings.standbyReminders.notifications && 
            settings.standbyReminders.notifications[notificationIndex] &&
            settings.standbyReminders.notifications[notificationIndex].time) {
          timeString = settings.standbyReminders.notifications[notificationIndex].time;
        }
      } else {
        // Caso normale section.field
        if (settings[section] && settings[section][field]) {
          timeString = settings[section][field];
        }
      }
      
      // Assicurati che il formato sia corretto
      if (!timeString || !timeString.includes(':')) {
        console.warn(`⚠️ Formato orario non valido: ${timeString}`);
        timeString = '08:00';
      }
      
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      
      return date;
    } catch (error) {
      console.error('❌ Errore in getCurrentTime:', error);
      return new Date(); // Valore predefinito in caso di errore
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style={theme.dark ? "light" : "dark"} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="bell-outline" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Normalizza i nomi delle proprietà (singolare/plurale) e assicura che tutte le proprietà necessarie esistano
  const normalizedSettings = { ...settings };
  
  // Assicurati che workReminder/workReminders esista e sia normalizzato
  if (!normalizedSettings.workReminders && normalizedSettings.workReminder) {
    normalizedSettings.workReminders = { ...normalizedSettings.workReminder };
  } else if (!normalizedSettings.workReminders) {
    normalizedSettings.workReminders = { 
      enabled: false, 
      morningTime: '07:30',
      weekendsEnabled: false 
    };
  }
  
  // Assicurati che timeEntryReminder/timeEntryReminders esista e sia normalizzato
  if (!normalizedSettings.timeEntryReminders && normalizedSettings.timeEntryReminder) {
    normalizedSettings.timeEntryReminders = { ...normalizedSettings.timeEntryReminder };
  } else if (!normalizedSettings.timeEntryReminders) {
    normalizedSettings.timeEntryReminders = { 
      enabled: false, 
      time: '18:30',
      weekendsEnabled: false 
    };
  }
  
  // Assicurati che standbyReminder/standbyReminders esista e sia normalizzato
  if (!normalizedSettings.standbyReminders && normalizedSettings.standbyReminder) {
    normalizedSettings.standbyReminders = { ...normalizedSettings.standbyReminder };
  } else if (!normalizedSettings.standbyReminders) {
    normalizedSettings.standbyReminders = { 
      enabled: false,
      notifications: []
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header principale */}
        <View style={styles.headerCard}>
          <MaterialCommunityIcons name="bell-ring" size={32} color="#2196F3" />
          <Text style={styles.headerTitle}>Notifiche</Text>
          <Text style={styles.headerSubtitle}>
            Configura promemoria e avvisi per non dimenticare mai di registrare i tuoi orari di lavoro
          </Text>
        </View>

        {/* Interruttore principale */}
        <View style={styles.sectionCard}>
          <View style={styles.mainToggleContainer}>
            <View style={styles.toggleInfo}>
              <Text style={styles.mainToggleTitle}>Abilita Notifiche</Text>
              <Text style={styles.mainToggleSubtitle}>
                {hasPermission ? 'Permessi concessi' : 'Permessi necessari'}
              </Text>
            </View>
            <Switch
              value={normalizedSettings.enabled}
              onValueChange={handleMainToggle}
              trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
              thumbColor={normalizedSettings.enabled ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          
          {!hasPermission && (
            <TouchableOpacity 
              style={styles.permissionButton}
              onPress={requestNotificationPermissions}
            >
              <MaterialCommunityIcons name="shield-check" size={20} color="#2196F3" />
              <Text style={styles.permissionButtonText}>Richiedi Permessi</Text>
            </TouchableOpacity>
          )}
        </View>

        {normalizedSettings.enabled && (
          <>
            {/* Promemoria inizio lavoro */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alarm" size={24} color="#FF9800" />
                <Text style={styles.sectionTitle}>Promemoria Inizio Lavoro</Text>
                <Switch
                  value={normalizedSettings.workReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('workReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={normalizedSettings.workReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.workReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('workReminders', 'morningTime')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{normalizedSettings.workReminders.morningTime}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={normalizedSettings.workReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...normalizedSettings,
                          workReminders: { ...normalizedSettings.workReminders, weekendsEnabled: value }
                        };
                        saveSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={normalizedSettings.workReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Promemoria inserimento orari */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clock-edit" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Promemoria Inserimento</Text>
                <Switch
                  value={normalizedSettings.timeEntryReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('timeEntryReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={normalizedSettings.timeEntryReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.timeEntryReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('timeEntryReminders', 'time')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{normalizedSettings.timeEntryReminders.time}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={normalizedSettings.timeEntryReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...normalizedSettings,
                          timeEntryReminders: { ...normalizedSettings.timeEntryReminders, weekendsEnabled: value }
                        };
                        saveSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={normalizedSettings.timeEntryReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Riepilogo giornaliero */}
            {/* Riepilogo giornaliero */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#2196F3" />
                <Text style={styles.sectionTitle}>Riepilogo Giornaliero</Text>
                <Switch
                  value={normalizedSettings.dailySummary && normalizedSettings.dailySummary.enabled}
                  onValueChange={(value) => handleSectionToggle('dailySummary', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={(normalizedSettings.dailySummary && normalizedSettings.dailySummary.enabled) ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.dailySummary && normalizedSettings.dailySummary.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('dailySummary', 'time')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{normalizedSettings.dailySummary.time}</Text>
                  </TouchableOpacity>
                  <Text style={styles.optionDescription}>
                    Ricevi un riepilogo dei tuoi guadagni giornalieri
                  </Text>
                </View>
              )}
            </View>

            {/* Avvisi straordinario */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#F44336" />
                <Text style={styles.sectionTitle}>Avvisi Straordinario</Text>
                <Switch
                  value={normalizedSettings.overtimeAlerts && normalizedSettings.overtimeAlerts.enabled}
                  onValueChange={(value) => handleSectionToggle('overtimeAlerts', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={(normalizedSettings.overtimeAlerts && normalizedSettings.overtimeAlerts.enabled) ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.overtimeAlerts && normalizedSettings.overtimeAlerts.enabled && (
                <View style={styles.sectionContent}>
                  <Text style={styles.optionDescription}>
                    Ricevi un avviso quando superi le 8 ore giornaliere
                  </Text>
                </View>
              )}
            </View>

            {/* Promemoria reperibilità */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="phone-alert" size={24} color="#9C27B0" />
                <Text style={styles.sectionTitle}>Promemoria Reperibilità</Text>
                <Switch
                  value={normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('standbyReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={(normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled) ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {normalizedSettings.standbyReminders && normalizedSettings.standbyReminders.enabled && (
                <View style={styles.sectionContent}>
                  <Text style={styles.optionDescription}>
                    Ricevi promemoria basati sul calendario di reperibilità
                  </Text>
                  
                  {/* Lista notifiche reperibilità configurabili */}
                  {normalizedSettings.standbyReminders.notifications && normalizedSettings.standbyReminders.notifications.map((notification, index) => (
                    <View key={index} style={styles.standbyNotificationItem}>
                      <View style={styles.standbyNotificationHeader}>
                        <Text style={styles.standbyNotificationTitle}>
                          {notification.daysInAdvance === 0 ? 'Giorno stesso' :
                           notification.daysInAdvance === 1 ? 'Il giorno prima' :
                           `${notification.daysInAdvance} giorni prima`}
                        </Text>
                        <Switch
                          value={notification.enabled}
                          onValueChange={(value) => {
                            const newSettings = { ...normalizedSettings };
                            if (!newSettings.standbyReminders.notifications) {
                              newSettings.standbyReminders.notifications = [];
                            }
                            if (!newSettings.standbyReminders.notifications[index]) {
                              newSettings.standbyReminders.notifications[index] = {};
                            }
                            newSettings.standbyReminders.notifications[index].enabled = value;
                            saveSettings(newSettings);
                          }}
                          trackColor={{ false: '#E0E0E0', true: '#E1BEE7' }}
                          thumbColor={notification.enabled ? '#9C27B0' : '#f4f3f4'}
                          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                      </View>
                      
                      {notification.enabled && (
                        <View style={styles.standbyNotificationContent}>
                          <TouchableOpacity 
                            style={styles.timeSelector}
                            onPress={() => openStandbyTimePicker(index)}
                          >
                            <Text style={styles.timeSelectorLabel}>Orario</Text>
                            <Text style={styles.timeSelectorValue}>{notification.time}</Text>
                          </TouchableOpacity>
                          <Text style={styles.standbyNotificationMessage}>
                            "{notification.message}"
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* Pulsante Test Immediato */}
        {normalizedSettings.enabled && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="test-tube" size={24} color="#FF5722" />
              <Text style={styles.sectionTitle}>Test Sistema</Text>
            </View>
            
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={async () => {
                  try {
                    Alert.alert(
                      '🧪 Test Notifiche',
                      'Vuoi testare il sistema di notifiche aggiornato?\n\nRiceverai una notifica di test tra 5 secondi.',
                      [
                        { text: 'Annulla', style: 'cancel' },
                        { 
                          text: 'Testa', 
                          onPress: async () => {
                            // Test immediato
                            await NotificationService.scheduleTestNotification();
                            Alert.alert('✅ Test Avviato', 'Notifica di test programmata per tra 5 secondi!');
                          }
                        }
                      ]
                    );
                  } catch (error) {
                    console.error('❌ Errore test notifiche:', error);
                    Alert.alert('❌ Errore', 'Impossibile avviare il test.');
                  }
                }}
              >
                <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                <Text style={styles.testButtonText}>Testa Notifiche Ora</Text>
              </TouchableOpacity>
              
              <Text style={styles.testDescription}>
                Invia una notifica di test per verificare che le modifiche funzionino correttamente
              </Text>
            </View>
          </View>
        )}

        {/* Info e suggerimenti */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
          <Text style={styles.infoTitle}>Suggerimenti</Text>
          <Text style={styles.infoText}>
            • Le notifiche ti aiutano a mantenere la costanza nell'inserimento degli orari{'\n'}
            • Puoi disabilitare specifici tipi di promemoria{'\n'}
            • I promemoria weekend sono opzionali{'\n'}
            • Le notifiche rispettano le impostazioni del sistema{'\n'}
            • Le notifiche vengono programmate automaticamente quando salvi le impostazioni
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={getCurrentTime()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime && timePickerField) {
              const [section, field] = timePickerField.split('.');
              handleTimeChange(section, field, selectedTime);
            } else {
              setShowTimePicker(false);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: theme.dark ? '#1C1C1E' : theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
  },
  mainToggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mainToggleSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dark ? 'rgba(0, 122, 255, 0.2)' : '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  permissionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 12,
  },
  sectionContent: {
    paddingLeft: 36,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255, 255, 255, 0.2)' : '#E0E0E0',
  },
  timeSelectorLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  optionDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: theme.dark ? '#2C2C2E' : '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.dark ? '#FFFFFF' : '#2E7D32',
    marginLeft: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.dark ? '#FFFFFF' : '#2E7D32',
    lineHeight: 20,
  },
  standbyNotificationItem: {
    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0',
  },
  standbyNotificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  standbyNotificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.dark ? '#FFFFFF' : '#333333',
    flex: 1,
  },
  standbyNotificationContent: {
    paddingLeft: 8,
  },
  standbyNotificationMessage: {
    fontSize: 12,
    color: theme.dark ? '#FFFFFF' : '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  testDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NotificationSettingsScreen;
