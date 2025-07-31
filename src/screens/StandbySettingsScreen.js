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
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/FixedNotificationService';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
    // Programma notifica automatica per i giorni di reperibilità usando il nostro sistema Enhanced
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (formData.enabled && standbyDays && standbyDays[todayStr]?.selected) {
      // Usa il sistema Alert per notificare immediatamente
      Alert.alert(
        'Reperibilità',
        'Oggi sei in reperibilità. Conferma la tua disponibilità!',
        [
          {
            text: 'Annulla',
            style: 'cancel'
          },
          {
            text: 'Conferma',
            onPress: async () => {
              await AsyncStorage.setItem(`standby_confirmed_${todayStr}`, 'true');
              Alert.alert('Conferma reperibilità', 'Hai confermato la tua disponibilità per oggi.');
            }
          }
        ]
      );
    }
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
            customStyles: { 
              container: { 
                backgroundColor: theme.name === 'dark' ? 'rgba(244, 67, 54, 0.2)' : '#FFEBEE',
                borderRadius: 6
              },
              text: {
                color: theme.colors.text
              }
            }
          };
        } else if (isWk) {
          marked[date] = {
            marked: true,
            dotColor: '#FF9800',
            customStyles: { 
              container: { 
                backgroundColor: theme.name === 'dark' ? 'rgba(255, 152, 0, 0.2)' : '#FFF3E0',
                borderRadius: 6
              },
              text: {
                color: theme.colors.text
              }
            }
          };
        }
      } else {
        // Migliora visibilità: blu intenso, testo bianco, bordo spesso
        marked[date] = {
          selected: true,
          customStyles: {
            container: {
              backgroundColor: '#007AFF',
              borderWidth: 2,
              borderColor: '#007AFF',
              borderRadius: 6,
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
          marked[date].customStyles.container.borderColor = '#F44336';
          marked[date].customStyles.container.borderWidth = 3;
        } else if (isWk) {
          marked[date].customStyles.container.borderColor = '#FF9800';
          marked[date].customStyles.container.borderWidth = 3;
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
          <ActivityIndicator size="large" color="#007AFF" />
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
              trackColor={{ false: theme.colors.border, true: '#007AFF' }}
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
                      placeholderTextColor={theme.colors.textSecondary}
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
                      placeholderTextColor={theme.colors.textSecondary}
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
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                    thumbColor={formData.includeWeekends ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Include giorni festivi</Text>
                  <Switch
                    value={formData.includeHolidays}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, includeHolidays: value }))}
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
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
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor={saturdayAsRest ? '#fff' : '#f4f3f4'}
                  />
                </View>
                
                <View style={styles.optionRow}>
                  <Text style={styles.optionLabel}>Maggiorazione CCNL anche sul viaggio in reperibilità</Text>
                  <Switch
                    value={formData.travelWithBonus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, travelWithBonus: value }))}
                    trackColor={{ false: theme.colors.border, true: '#007AFF' }}
                    thumbColor={formData.travelWithBonus ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Calendario selezione giorni reperibilità */}
              <View style={{marginBottom:20}}>
                <Text style={styles.sectionTitle}>Calendario Giorni Reperibilità</Text>
                <Calendar
                  markedDates={getMarkedDates()}
                  onDayPress={async (day) => {
                    const newStandbyDays = { ...standbyDays };
                    if (newStandbyDays[day.dateString]) {
                      delete newStandbyDays[day.dateString];
                    } else {
                      newStandbyDays[day.dateString] = { selected: true, selectedColor: '#007AFF' };
                    }
                    
                    // Aggiorna stato locale
                    setStandbyDays(newStandbyDays);
                    
                    // Salva immediatamente in settings
                    try {
                      const updatedStandbySettings = {
                        ...settings.standbySettings,
                        standbyDays: newStandbyDays
                      };
                      
                      await updatePartialSettings({
                        standbySettings: updatedStandbySettings
                      });
                      
                      // Aggiorna notifiche
                      await NotificationService.updateStandbyNotifications();
                      console.log('✅ Calendario reperibilità aggiornato e notifiche sincronizzate');
                    } catch (error) {
                      console.error('❌ Errore salvando calendario reperibilità:', error);
                    }
                  }}
                  onMonthChange={m => {
                    setCurrentMonth(`${m.year}-${m.month.toString().padStart(2,'0')}`);
                  }}
                  enableSwipeMonths={true}
                  markingType="custom"
                  theme={{
                    backgroundColor: theme.colors.card,
                    calendarBackground: theme.colors.card,
                    textSectionTitleColor: theme.colors.text,
                    textSectionTitleDisabledColor: theme.colors.textSecondary,
                    selectedDayBackgroundColor: '#007AFF',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#007AFF',
                    dayTextColor: theme.colors.text,
                    textDisabledColor: theme.colors.textSecondary,
                    dotColor: '#007AFF',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#007AFF',
                    disabledArrowColor: theme.colors.textSecondary,
                    monthTextColor: theme.colors.text,
                    indicatorColor: '#007AFF',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: 'bold',
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13,
                  }}
                />
                <Text style={styles.inputHelp}>Tocca i giorni sul calendario per attivare/disattivare la reperibilità.</Text>
              </View>

              <View style={styles.infoContainer}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
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
                <View style={{
                  marginTop:10,
                  backgroundColor: theme.colors.surface,
                  borderRadius:8,
                  padding:10,
                  borderLeftWidth: 3,
                  borderLeftColor: '#FF9800'
                }}>
                  <Text style={{fontWeight:'bold',color:'#FF9800'}}>Esempi pratici:</Text>
                  <Text style={{color: theme.colors.text,marginTop:4,fontSize:13}}>
                    {`• Seleziona i giorni di reperibilità dal calendario (es: sabato e domenica)
• Imposta l'indennità giornaliera secondo il tuo CCNL (es: 15€/giorno)
• Orari tipici: dalle 18:00 alle 08:00 del giorno dopo
• Se effettui un intervento in reperibilità (es: chiamata notturna), l'app calcola automaticamente la maggiorazione notturna e l'indennità`}
                  </Text>
                  <Text style={{color: theme.colors.text,marginTop:4,fontSize:13}}>
                    {`• I giorni festivi e i weekend sono evidenziati automaticamente nel calendario`}
                  </Text>
                </View>
              </View>

              <View style={{
                marginBottom:20,
                backgroundColor: theme.colors.card,
                borderRadius:14,
                padding:16,
                shadowColor: theme.colors.shadow,
                shadowOpacity:0.07,
                shadowRadius:8,
                elevation:2,
                borderWidth:1,
                borderColor: theme.colors.border
              }}>
                <View style={{flexDirection:'row',alignItems:'center',marginBottom:10}}>
                  <Ionicons name="cash-outline" size={22} color="#007AFF" style={{marginRight:8}} />
                  <Text style={{fontWeight:'bold',fontSize:17,color: theme.colors.text}}>Indennità reperibilità CCNL 2024</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15,color: theme.colors.text}}>Feriale (16h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#007AFF'}}>€4,22</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15,color: theme.colors.text}}>Feriale (24h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#007AFF'}}>€7,03</Text>
                </View>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Text style={{fontSize:15,color: theme.colors.text}}>Festivo/libero (24h)</Text>
                  <Text style={{fontWeight:'bold',fontSize:15,color:'#007AFF'}}>€10,63</Text>
                </View>
                <View style={{flexDirection:'row',alignItems:'center',marginTop:10}}>
                  <Ionicons name="information-circle-outline" size={16} color="#007AFF" style={{marginRight:4}} />
                  <Text style={{fontSize:12,color: theme.colors.textSecondary,flex:1}}>
                    Fonte: CCNL Metalmeccanico PMI Confapi, art. 23, aggiornamento 2024. Il sabato è feriale salvo sia il tuo giorno di riposo settimanale.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Indennità Personalizzata</Text>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Feriale (16h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale16}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale16: value }))
                      }
                      placeholder="4.22"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Feriale (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFeriale24}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFeriale24: value }))
                      }
                      placeholder="7.03"
                      placeholderTextColor={theme.colors.textSecondary}
                      keyboardType="numeric"
                      returnKeyType="next"
                    />
                    <Text style={styles.inputSuffix}>€</Text>
                  </View>
                </View>
                <View style={{marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:'bold',color: theme.colors.text}}>Festivo/Libero (24h)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={formData.customFestivo}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, customFestivo: value }))
                      }
                      placeholder="10.63"
                      placeholderTextColor={theme.colors.textSecondary}
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

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: theme.colors.card,
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
    borderBottomColor: theme.colors.border,
  },
  enableLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputSuffix: {
    paddingRight: 12,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  inputHelp: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
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
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    width: 60,
  },
  timeSeparator: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginHorizontal: 15,
    marginBottom: 12,
  },
  timeHelp: {
    fontSize: 12,
    color: theme.colors.textDisabled,
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
    borderBottomColor: theme.colors.border,
  },
  optionLabel: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 4,
    backgroundColor: theme.colors.card,
  },
  toggleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: theme.name === 'dark' ? 'rgba(0, 122, 255, 0.15)' : '#f0f7ff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: theme.colors.background,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
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
