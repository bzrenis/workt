import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { isWeekend } from '../utils';
import { isItalianHoliday } from '../constants/holidays';
import { CCNL_CONTRACTS } from '../constants';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurazione locale italiana per il calendario
LocaleConfig.locales['it'] = {
  monthNames: [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
  ],
  monthNamesShort: [
    'Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'
  ],
  dayNames: [
    'Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'
  ],
  dayNamesShort: ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'],
  today: 'Oggi'
};
LocaleConfig.defaultLocale = 'it';

const StandbySettingsScreen = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    enabled: false,
    dailyAllowance: '',
    startHour: '18',
    endHour: '8',
    includeWeekends: true,
    includeHolidays: true,
    travelWithBonus: false, // Nuova opzione: viaggio reperibilità con maggiorazione
    // Personalizzazioni indennità CCNL
    customFeriale16: '',
    customFeriale24: '',
    customFestivo: '',
    // Impostazioni aggiuntive
    allowanceType: '24h', // '16h' o '24h'
    saturdayAsRest: false, // se sabato è considerato giorno di riposo
  });
  const [standbyDays, setStandbyDays] = useState(settings.standbySettings?.standbyDays || {});
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}`;
  });
  const [tariffa24h, setTariffa24h] = useState(true); // true = 24h, false = 16h
  const [saturdayAsRest, setSaturdayAsRest] = useState(false); // nuovo toggle

  // Indennità CCNL ufficiali Confapi 2024
  const IND_16H_FERIALE = 4.22;
  const IND_24H_FERIALE = 7.03;
  const IND_24H_FESTIVO = 10.63;

  // Calcolo tipo giorno e tariffa
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const isTodayHoliday = isItalianHoliday(todayStr);
  const isTodaySunday = today.getDay() === 0;
  const isTodaySaturday = today.getDay() === 6;
  let tipoGiorno = 'Feriale';
  let indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  if (isTodayHoliday || isTodaySunday || (isTodaySaturday && saturdayAsRest)) {
    tipoGiorno = isTodayHoliday ? 'Festivo' : (isTodaySunday ? 'Domenica' : 'Sabato (riposo)');
    indennita = IND_24H_FESTIVO;
  } else if (isTodaySaturday && !saturdayAsRest) {
    tipoGiorno = 'Sabato (lavorativo)';
    indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  } else {
    tipoGiorno = 'Feriale';
    indennita = tariffa24h ? IND_24H_FERIALE : IND_16H_FERIALE;
  }
  // Personalizzazione
  let customValue = '';
  if (tipoGiorno === 'Festivo' || tipoGiorno === 'Domenica' || tipoGiorno === 'Sabato (riposo)') {
    customValue = formData.customFestivo;
    if (customValue) indennita = parseFloat(customValue);
  } else {
    customValue = tariffa24h ? formData.customFeriale24 : formData.customFeriale16;
    if (customValue) indennita = parseFloat(customValue);
  }

  useEffect(() => {
    if (settings.standbySettings) {
      setFormData({
        enabled: settings.standbySettings.enabled || false,
        dailyAllowance: settings.standbySettings.dailyAllowance?.toString() || '',
        startHour: settings.standbySettings.startHour?.toString() || '18',
        endHour: settings.standbySettings.endHour?.toString() || '8',
        includeWeekends: settings.standbySettings.includeWeekends !== false,
        includeHolidays: settings.standbySettings.includeHolidays !== false,
        travelWithBonus: settings.standbySettings.travelWithBonus === true, // default false
        // Personalizzazioni indennità CCNL
        customFeriale16: settings.standbySettings.customFeriale16?.toString() || '',
        customFeriale24: settings.standbySettings.customFeriale24?.toString() || '',
        customFestivo: settings.standbySettings.customFestivo?.toString() || '',
        // Impostazioni aggiuntive
        allowanceType: settings.standbySettings.allowanceType || '24h',
        saturdayAsRest: settings.standbySettings.saturdayAsRest === true,
      });
      setStandbyDays(settings.standbySettings.standbyDays || {});
      // Aggiorna anche i toggle locali
      setTariffa24h(settings.standbySettings.allowanceType !== '16h');
      setSaturdayAsRest(settings.standbySettings.saturdayAsRest === true);
    }
  }, [settings]);

  useEffect(() => {
    // Richiedi permessi notifiche all'avvio
    (async () => {
      await Notifications.requestPermissionsAsync();
    })();

    // Programma notifica automatica per i giorni di reperibilità
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (formData.enabled && standbyDays && standbyDays[todayStr]?.selected) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reperibilità',
          body: 'Oggi sei in reperibilità. Conferma la tua disponibilità!',
          sound: true,
          data: { type: 'standby-confirm', date: todayStr }
        },
        trigger: null // immediata all'apertura, oppure { hour: 7, minute: 0, repeats: false } per le 7:00
      });
    }

    // Listener per risposta alla notifica
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'standby-confirm' && data?.date) {
        await AsyncStorage.setItem(`standby_confirmed_${data.date}`, 'true');
        Alert.alert('Conferma reperibilità', 'Hai confermato la tua disponibilità per oggi.');
      }
    });

    // Listener per notifica ricevuta mentre l'app è aperta
    const foregroundSub = Notifications.addNotificationReceivedListener(async notification => {
      const data = notification.request.content.data;
      if (data?.type === 'standby-confirm' && data?.date) {
        Alert.alert('Reperibilità', 'Oggi sei in reperibilità. Conferma la tua disponibilità!');
      }
    });

    return () => {
      subscription.remove();
      foregroundSub.remove();
    };
  }, [formData.enabled, standbyDays]);

  // Funzione per generare tutti i giorni del mese corrente
  const getAllDaysOfMonth = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${month.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`);
    }
    return days;
  };

  // Genera oggetto markedDates combinando selezione, weekend e festivi
  const getMarkedDates = () => {
    const days = getAllDaysOfMonth(currentMonth);
    const marked = { ...standbyDays };
    days.forEach(date => {
      const isSel = standbyDays[date]?.selected;
      const isWk = isWeekend(date);
      const isHol = isItalianHoliday(date);
      if (!isSel) {
        if (isHol) {
          marked[date] = {
            marked: true,
            dotColor: '#F44336',
            customStyles: { container: { backgroundColor: '#FFEBEE' } }
          };
        } else if (isWk) {
          marked[date] = {
            marked: true,
            dotColor: '#FF9800',
            customStyles: { container: { backgroundColor: '#FFF3E0' } }
          };
        }
      } else {
        // Migliora visibilità: blu intenso, testo bianco, bordo spesso
        marked[date] = {
          selected: true,
          customStyles: {
            container: {
              backgroundColor: '#1565c0', // blu intenso
              borderWidth: 3,
              borderColor: '#1976d2',
              elevation: 2,
            },
            text: {
              color: '#fff',
              fontWeight: 'bold',
            }
          }
        };
        // Se anche festivo/weekend, aggiungi alone
        if (isHol) {
          marked[date].customStyles.container.boxShadow = '0 0 0 2px #F44336';
        } else if (isWk) {
          marked[date].customStyles.container.boxShadow = '0 0 0 2px #FF9800';
        }
      }
    });
    return marked;
  };

  const handleSave = async () => {
    try {
      const dailyAllowance = parseFloat(formData.dailyAllowance) || 0;
      const startHour = parseInt(formData.startHour) || 18;
      const endHour = parseInt(formData.endHour) || 8;

      if (dailyAllowance < 0) {
        Alert.alert('Errore', 'L\'indennità giornaliera non può essere negativa');
        return;
      }

      if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
        Alert.alert('Errore', 'Gli orari devono essere compresi tra 0 e 23');
        return;
      }

      const updatedStandbySettings = {
        enabled: formData.enabled,
        dailyAllowance,
        startHour,
        endHour,
        includeWeekends: formData.includeWeekends,
        includeHolidays: formData.includeHolidays,
        travelWithBonus: formData.travelWithBonus === true, // salva la nuova opzione
        standbyDays, // aggiungo i giorni selezionati
        // Personalizzazioni indennità CCNL
        customFeriale16: parseFloat(formData.customFeriale16) || null,
        customFeriale24: parseFloat(formData.customFeriale24) || null,
        customFestivo: parseFloat(formData.customFestivo) || null,
        // Impostazioni aggiuntive
        allowanceType: tariffa24h ? '24h' : '16h',
        saturdayAsRest: saturdayAsRest,
      };

      await updatePartialSettings({
        standbySettings: updatedStandbySettings
      });

      Alert.alert('Successo', 'Impostazioni reperibilità salvate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving standby settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  // Tariffe indennità giornaliera CCNL Metalmeccanico PMI Livello 5
  const contract = settings.contract || CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
  const dailyRate = contract.dailyRate;
  // Esempio: 14% del giornaliero per feriale, maggiorazioni per sabato/domenica/festivo
  const indFeriale = dailyRate * 0.14;
  const indSabato = dailyRate * 0.14 * 1.2;
  const indDomenica = dailyRate * 0.14 * 1.5;
  const indFestivo = dailyRate * 0.14 * 1.5;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reperibilità</Text>
          <Text style={styles.headerSubtitle}>
            Configura indennità e orari di reperibilità
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.enableContainer}>
            <Text style={styles.enableLabel}>Attiva Reperibilità</Text>
            <Switch
              value={formData.enabled}
              onValueChange={(value) => setFormData(prev => ({ ...prev, enabled: value }))}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
              thumbColor={formData.enabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          {formData.enabled && (
            <>
              <View style={styles.timeContainer}>
                <Text style={styles.sectionTitle}>Orari Reperibilità</Text>
                
                <View style={styles.timeRow}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Dalle ore</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={formData.startHour}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, startHour: value }))}
                      placeholder="18"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  
                  <Text style={styles.timeSeparator}>alle ore</Text>
                  
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>del giorno dopo</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={formData.endHour}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, endHour: value }))}
                      placeholder="8"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                </View>
                
                <Text style={styles.timeHelp}>
                  Esempio: dalle 18:00 alle 08:00 del giorno dopo
                </Text>
              </View>

              <View style={styles.optionsContainer}>
                <Text style={styles.sectionTitle}>Opzioni Aggiuntive</Text>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Include fine settimana</Text>
                  <Switch
                    value={formData.includeWeekends}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, includeWeekends: value }))}
                    trackColor={{ false: '#ccc', true: '#2196F3' }}
                    thumbColor={formData.includeWeekends ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Include giorni festivi</Text>
                  <Switch
                    value={formData.includeHolidays}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, includeHolidays: value }))}
                    trackColor={{ false: '#ccc', true: '#2196F3' }}
                    thumbColor={formData.includeHolidays ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Tipo indennità CCNL</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <TouchableOpacity 
                      style={[styles.toggleButton, !tariffa24h && styles.toggleButtonActive]}
                      onPress={() => {
                        setTariffa24h(false);
                        setFormData(prev => ({ ...prev, allowanceType: '16h' }));
                      }}
                    >
                      <Text style={[styles.toggleButtonText, !tariffa24h && styles.toggleButtonTextActive]}>16h</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleButton, tariffa24h && styles.toggleButtonActive]}
                      onPress={() => {
                        setTariffa24h(true);
                        setFormData(prev => ({ ...prev, allowanceType: '24h' }));
                      }}
                    >
                      <Text style={[styles.toggleButtonText, tariffa24h && styles.toggleButtonTextActive]}>24h</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Sabato come giorno di riposo</Text>
                  <Switch
                    value={saturdayAsRest}
                    onValueChange={(value) => {
                      setSaturdayAsRest(value);
                      setFormData(prev => ({ ...prev, saturdayAsRest: value }));
                    }}
                    trackColor={{ false: '#ccc', true: '#2196F3' }}
                    thumbColor={saturdayAsRest ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Maggiorazione CCNL anche sul viaggio in reperibilità</Text>
                  <Switch
                    value={formData.travelWithBonus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, travelWithBonus: value }))}
                    trackColor={{ false: '#ccc', true: '#1976d2' }}
                    thumbColor={formData.travelWithBonus ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Calendario selezione giorni reperibilità */}
              <View style={{marginBottom:20}}>
                <Text style={styles.sectionTitle}>Calendario Giorni Reperibilità</Text>
                <Calendar
                  markedDates={getMarkedDates()}
                  onDayPress={day => {
                    setStandbyDays(prev => {
                      const copy = { ...prev };
                      if (copy[day.dateString]) {
                        delete copy[day.dateString];
                      } else {
                        copy[day.dateString] = { selected: true, selectedColor: '#1976d2' };
                      }
                      return copy;
                    });
                  }}
                  onMonthChange={m => {
                    setCurrentMonth(`${m.year}-${m.month.toString().padStart(2,'0')}`);
                  }}
                  enableSwipeMonths={true}
                  markingType="custom"
                  theme={{
                    todayTextColor: '#1976d2',
                    selectedDayBackgroundColor: '#1976d2',
                    arrowColor: '#1976d2',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: 'bold',
                  }}
                />
                <Text style={styles.inputHelp}>Tocca i giorni sul calendario per attivare/disattivare la reperibilità.</Text>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={20} color="#2196F3" />
                  <Text style={styles.infoTitle}>Come funziona</Text>
                </View>
                <Text style={styles.infoText}>
                  • L'indennità viene calcolata automaticamente in base al tipo di giorno: Feriale (16h/24h) o Festivo/Libero (24h){"\n"}
                  • Puoi personalizzare separatamente le 3 indennità: Feriale 16h, Feriale 24h, Festivo/Libero 24h (es. secondo accordi aziendali){"\n"}
                  • Il sabato può essere considerato lavorativo o giorno di riposo tramite apposito selettore; se impostato come riposo, applica la tariffa festiva/libera{"\n"}
                  • I giorni di reperibilità si selezionano dal calendario; weekend e festivi sono evidenziati automaticamente{"\n"}
                  • Gli interventi durante la reperibilità sono calcolati con le maggiorazioni CCNL (straordinario, notturno, festivo){"\n"}
                  • I viaggi in reperibilità seguono le impostazioni del contratto CCNL
                </Text>
                <View style={{marginTop:10,backgroundColor:'#fffde7',borderRadius:8,padding:10}}>
                  <Text style={{fontWeight:'bold',color:'#ef6c00'}}>Esempi pratici:</Text>
                  <Text style={{color:'#333',marginTop:4,fontSize:13}}>
                    {`• Seleziona i giorni di reperibilità dal calendario (es: sabato e domenica)
• Imposta l'indennità giornaliera secondo il tuo CCNL (es: 15€/giorno)
• Orari tipici: dalle 18:00 alle 08:00 del giorno dopo
• Se effettui un intervento in reperibilità (es: chiamata notturna), l'app calcola automaticamente la maggiorazione notturna e l'indennità`}
                  </Text>
                  <Text style={{color:'#333',marginTop:4,fontSize:13}}>
                    {`• I giorni festivi e i weekend sono evidenziati automaticamente nel calendario`}
                  </Text>
                </View>
              </View>

              <View style={{marginBottom:20,backgroundColor:'#fff',borderRadius:14,padding:16,shadowColor:'#000',shadowOpacity:0.07,shadowRadius:8,elevation:2,borderWidth:1,borderColor:'#e3eafc'}}>
                <View style={{flexDirection:'row',alignItems:'center',marginBottom:10}}>
                  <Ionicons name="cash-outline" size={22} color="#1976d2" style={{marginRight:8}} />
                  <Text style={{fontWeight:'bold',fontSize:17,color:'#1976d2'}}>Indennità reperibilità CCNL 2024</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15}}>Feriale (16h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#1976d2'}}>€4,22</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15}}>Feriale (24h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#1976d2'}}>€7,03</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15}}>Festivo/libero (24h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#d32f2f'}}>€10,63</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',marginTop:10}}>
                  <Ionicons name="information-circle-outline" size={16} color="#1976d2" style={{marginRight:4}} />
                  <Text style={{fontSize:12,color:'#666',flex:1}}>
                    Fonte: CCNL Metalmeccanico PMI Confapi, art. 23, aggiornamento 2024. Il sabato è feriale salvo sia il tuo giorno di riposo settimanale.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Indennità Personalizzata</Text>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color:'#1976d2'}}>Feriale (16h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale16}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale16: value }))
                      }
                      placeholder="4.22"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color:'#1976d2'}}>Feriale (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale24}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale24: value }))
                      }
                      placeholder="7.03"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color:'#d32f2f'}}>Festivo/Libero (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFestivo}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFestivo: value }))
                      }
                      placeholder="10.63"
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <Text style={styles.inputHelp}>
                  Lascia vuoto per usare il valore CCNL oppure inserisci l'importo reale della tua azienda per ciascuna tipologia di giorno.
                </Text>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  enableLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputSuffix: {
    paddingRight: 12,
    fontSize: 16,
    color: '#666',
  },
  inputHelp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  timeContainer: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    width: 60,
  },
  timeSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 15,
    marginBottom: 12,
  },
  timeHelp: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#2196F3',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default StandbySettingsScreen;
