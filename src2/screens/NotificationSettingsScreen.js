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
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import NotificationService from '../services/NotificationService';

const NotificationSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState(NotificationService.getDefaultSettings());
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerField, setTimePickerField] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // Carica le impostazioni al mount
  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
    
    // Setup listener per le notifiche
    NotificationService.setupNotificationListener();
  }, []);

  const checkNotificationPermissions = async () => {
    const permission = await NotificationService.hasPermissions();
    setHasPermission(permission);
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
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Errore nel caricamento impostazioni notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const success = await NotificationService.saveSettings(newSettings);
      if (success) {
        setSettings(newSettings);
        
        // Riprogramma le notifiche con le nuove impostazioni
        await NotificationService.scheduleNotifications(newSettings);
        
        Alert.alert('Successo', 'Impostazioni salvate e notifiche aggiornate.');
      } else {
        Alert.alert('Errore', 'Impossibile salvare le impostazioni.');
      }
    } catch (error) {
      console.error('Errore nel salvataggio impostazioni notifiche:', error);
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
    const newSettings = {
      ...settings,
      [section]: { ...settings[section], enabled: value }
    };
    saveSettings(newSettings);
  };

  const handleTimeChange = (section, field, time) => {
    const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    
    let newSettings = { ...settings };
    
    // Gestione speciale per notifiche di reperibilità
    if (section === 'standbyReminders' && field.startsWith('notifications.')) {
      const notificationIndex = parseInt(field.split('.')[1]);
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
    let timeString;
    
    if (section === 'standbyReminders' && field.startsWith('notifications.')) {
      // Caso speciale per standbyReminders.notifications.X
      const notificationIndex = parseInt(field.split('.')[1]);
      timeString = settings.standbyReminders.notifications[notificationIndex].time;
    } else {
      // Caso normale section.field
      timeString = settings[section][field];
    }
    
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="bell-outline" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Caricamento impostazioni...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
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
              value={settings.enabled}
              onValueChange={handleMainToggle}
              trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
              thumbColor={settings.enabled ? '#4CAF50' : '#f4f3f4'}
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
          
          {/* Banner informativo per notifiche in test */}
          {settings.enabled && (
            <View style={styles.testBanner}>
              <MaterialCommunityIcons name="flask" size={20} color="#FF9800" />
              <View style={styles.testBannerContent}>
                <Text style={styles.testBannerTitle}>🧪 Notifiche in Test - Versione Migliorata</Text>
                <Text style={styles.testBannerText}>
                  Sistema recentemente aggiornato per risolvere il problema delle notifiche multiple. 
                  Ora utilizza programmazione basata su date assolute invece di trigger settimanali.
                </Text>
                <View style={styles.testBannerButtons}>
                  <TouchableOpacity 
                    style={styles.testBannerButton}
                    onPress={() => {
                      Alert.alert(
                        '🔧 Correzioni Implementate',
                        '✅ Risolto: Notifiche multiple immediate\n' +
                        '✅ Nuovo: Trigger basati su date specifiche\n' +
                        '✅ Auto-rinnovamento ogni 3 settimane\n' +
                        '✅ Throttling migliorato (30 min)\n' +
                        '✅ Logging dettagliato per debug\n\n' +
                        'Le notifiche dovrebbero ora arrivare agli orari corretti invece che tutte insieme.',
                        [{ text: 'Capito', style: 'default' }]
                      );
                    }}
                  >
                    <Text style={styles.testBannerButtonText}>Dettagli Correzioni</Text>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#F57C00" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.testBannerButton, { backgroundColor: '#E8F5E9' }]}
                    onPress={async () => {
                      try {
                        // Test rapido: invia una notifica tra 10 secondi
                        await NotificationService.scheduleTestNotification(
                          '🧪 Test Sistema Corretto',
                          'Se ricevi questa notifica tra 10 secondi, il sistema funziona correttamente!',
                          10
                        );
                        Alert.alert(
                          '🧪 Test Avviato',
                          'Notifica di test programmata tra 10 secondi. Se la ricevi, il sistema è funzionante!',
                          [{ text: 'OK' }]
                        );
                      } catch (error) {
                        Alert.alert('Errore', 'Impossibile avviare il test: ' + error.message);
                      }
                    }}
                  >
                    <Text style={[styles.testBannerButtonText, { color: '#2E7D32' }]}>Test Rapido</Text>
                    <MaterialCommunityIcons name="play-circle-outline" size={14} color="#2E7D32" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {settings.enabled && (
          <>
            {/* Promemoria inizio lavoro */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alarm" size={24} color="#FF9800" />
                <Text style={styles.sectionTitle}>Promemoria Inizio Lavoro</Text>
                <Switch
                  value={settings.workReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('workReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={settings.workReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {settings.workReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('workReminders', 'morningTime')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{settings.workReminders.morningTime}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={settings.workReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...settings,
                          workReminders: { ...settings.workReminders, weekendsEnabled: value }
                        };
                        saveSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={settings.workReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
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
                  value={settings.timeEntryReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('timeEntryReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={settings.timeEntryReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {settings.timeEntryReminders.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('timeEntryReminders', 'time')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{settings.timeEntryReminders.time}</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.optionRow}>
                    <Text style={styles.optionLabel}>Includi weekend</Text>
                    <Switch
                      value={settings.timeEntryReminders.weekendsEnabled}
                      onValueChange={(value) => {
                        const newSettings = {
                          ...settings,
                          timeEntryReminders: { ...settings.timeEntryReminders, weekendsEnabled: value }
                        };
                        saveSettings(newSettings);
                      }}
                      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                      thumbColor={settings.timeEntryReminders.weekendsEnabled ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Riepilogo giornaliero */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="chart-line" size={24} color="#2196F3" />
                <Text style={styles.sectionTitle}>Riepilogo Giornaliero</Text>
                <Switch
                  value={settings.dailySummary.enabled}
                  onValueChange={(value) => handleSectionToggle('dailySummary', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={settings.dailySummary.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {settings.dailySummary.enabled && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity 
                    style={styles.timeSelector}
                    onPress={() => openTimePicker('dailySummary', 'time')}
                  >
                    <Text style={styles.timeSelectorLabel}>Orario promemoria</Text>
                    <Text style={styles.timeSelectorValue}>{settings.dailySummary.time}</Text>
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
                  value={settings.overtimeAlerts.enabled}
                  onValueChange={(value) => handleSectionToggle('overtimeAlerts', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={settings.overtimeAlerts.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {settings.overtimeAlerts.enabled && (
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
                  value={settings.standbyReminders.enabled}
                  onValueChange={(value) => handleSectionToggle('standbyReminders', value)}
                  trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
                  thumbColor={settings.standbyReminders.enabled ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              
              {settings.standbyReminders.enabled && (
                <View style={styles.sectionContent}>
                  <Text style={styles.optionDescription}>
                    Ricevi promemoria basati sul calendario di reperibilità
                  </Text>
                  
                  {/* Lista notifiche reperibilità configurabili */}
                  {settings.standbyReminders.notifications?.map((notification, index) => (
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
                            const newSettings = { ...settings };
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
                            onPress={() => openTimePicker('standbyReminders', `notifications.${index}`)}
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
                  
                  <TouchableOpacity 
                    style={[styles.testButton, { backgroundColor: '#F3E5F5', marginTop: 12 }]}
                    onPress={async () => {
                      const syncCount = await NotificationService.syncStandbyNotificationsWithCalendar();
                      Alert.alert(
                        'Sincronizzazione Completata', 
                        `Trovate e programmate ${syncCount} date di reperibilità future.`,
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <MaterialCommunityIcons name="sync" size={20} color="#9C27B0" />
                    <Text style={[styles.testButtonText, { color: '#9C27B0' }]}>Sincronizza con Calendario</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Test notifica */}
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={async () => {
                  await NotificationService.sendTestNotification();
                  Alert.alert('Test Inviato', 'Dovresti ricevere una notifica tra pochi secondi.');
                }}
              >
                <MaterialCommunityIcons name="bell-ring" size={20} color="#2196F3" />
                <Text style={styles.testButtonText}>Invia Notifica di Test</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.testButton, { marginTop: 8, backgroundColor: '#FFF3E0' }]}
                onPress={async () => {
                  const stats = await NotificationService.getNotificationStats();
                  Alert.alert(
                    'Statistiche Notifiche',
                    `Notifiche programmate: ${stats.totalScheduled}\nPromemoria attivi: ${stats.activeReminders.length}\n\n${stats.activeReminders.join('\n')}`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <MaterialCommunityIcons name="chart-line" size={20} color="#FF9800" />
                <Text style={[styles.testButtonText, { color: '#FF9800' }]}>Mostra Statistiche</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Info e suggerimenti */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
          <Text style={styles.infoTitle}>Suggerimenti</Text>
          <Text style={styles.infoText}>
            • Le notifiche ti aiutano a mantenere la costanza nell'inserimento degli orari{'\n'}
            • Puoi disabilitare specifici tipi di promemoria{'\n'}
            • I promemoria weekend sono opzionali{'\n'}
            • Le notifiche rispettano le impostazioni del sistema
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
  headerCard: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  mainToggleSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  permissionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196F3',
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
    color: '#333',
    marginLeft: 12,
  },
  sectionContent: {
    paddingLeft: 36,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  timeSelectorLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  testBannerContent: {
    flex: 1,
    marginLeft: 8,
  },
  testBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  testBannerText: {
    fontSize: 12,
    color: '#BF360C',
    lineHeight: 16,
    marginBottom: 8,
  },
  testBannerButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  testBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE0B2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  testBannerButtonText: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '600',
    marginRight: 4,
  },
});

export default NotificationSettingsScreen;
