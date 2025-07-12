import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal
} from 'react-native';

// Array dei mesi in italiano per visualizzazione
const mesiItaliani = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkEntries, useSettings } from '../hooks';
import { formatDate, formatTime, formatCurrency, getDayName } from '../utils';
import { createWorkEntryFromData, getSafeSettings, calculateItemBreakdown, formatSafeHours } from '../utils/earningsHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DatabaseService from '../services/DatabaseService';

const TimeEntryScreen = ({ navigation, route }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [standbyConfirmations, setStandbyConfirmations] = useState({});
  const [dayTypeModalVisible, setDayTypeModalVisible] = useState(false);
  const [selectedDayTypeEntry, setSelectedDayTypeEntry] = useState(null);
  const [selectedDayTypeValue, setSelectedDayTypeValue] = useState('');
  
  // Mostra sempre tutti gli inserimenti di tutti i mesi
  const { entries, isLoading, refreshEntries } = useWorkEntries(selectedYear, selectedMonth, true);
  
  // Log per debug avanzato
  useEffect(() => {
    console.log(`TimeEntryScreen: Caricati ${entries?.length || 0} inserimenti`);
    if (entries && entries.length > 0) {
      // Log date range
      const dates = entries.map(e => new Date(e.date));
      const minDate = new Date(Math.min.apply(null, dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max.apply(null, dates)).toISOString().split('T')[0];
      console.log(`TimeEntryScreen: Range date da ${minDate} a ${maxDate}`);
      
      // Ispeziona il primo inserimento per debug struttura dati
      const firstEntry = entries[0];
      console.log('STRUTTURA PRIMO INSERIMENTO:', JSON.stringify({
        id: firstEntry.id,
        date: firstEntry.date,
        dayType: firstEntry.day_type || firstEntry.dayType,
        siteInfo: {
          siteName: firstEntry.site_name || firstEntry.siteName,
          vehicleDriven: firstEntry.vehicle_driven || firstEntry.vehicleDriven
        },
        times: {
          departureCompany: firstEntry.departure_company,
          arrivalSite: firstEntry.arrival_site,
          workStart1: firstEntry.work_start_1,
          workEnd1: firstEntry.work_end_1
        },
        flags: {
          isStandbyDay: firstEntry.is_standby_day,
          travelAllowance: firstEntry.travel_allowance || firstEntry.travelAllowance
        },
        hasInterventi: Array.isArray(firstEntry.interventi) && firstEntry.interventi.length > 0
      }, null, 2));
    }
  }, [entries]);
  
  const { settings } = useSettings();
  const contract = settings.contract || {};
  const monthlySalary = contract.monthlySalary || 0;
  const dailyRate = monthlySalary / 26;
  const officialHourlyRate = monthlySalary / 173;

  useEffect(() => {
    // Carica stato conferma per tutte le entry del mese
    const loadConfirmations = async () => {
      const confirmations = {};
      for (const entry of entries) {
        if (entry.is_standby_day === 1) {
          const key = `standby_confirmed_${entry.date}`;
          const value = await AsyncStorage.getItem(key);
          confirmations[entry.date] = value === 'true';
        }
      }
      setStandbyConfirmations(confirmations);
    };
    if (entries.length > 0) loadConfirmations();
  }, [entries]);

  // Aggiorna la lista ogni volta che la schermata torna in primo piano
  useFocusEffect(
    React.useCallback(() => {
      refreshEntries();
    }, [selectedYear, selectedMonth])
  );

  useEffect(() => {
    if (route && route.params && route.params.refresh) {
      refreshEntries();
      // Reset param per evitare loop
      navigation.setParams({ refresh: false });
    }
  }, [route?.params?.refresh]);

  const handleNewEntry = () => {
    navigation.navigate('TimeEntryForm', { ferie: false, permesso: false });
  };  
  
  // Aggiorna la dashboard dopo ogni salvataggio
  useEffect(() => {
    if (route && route.params && route.params.refreshDashboard) {
      // Imposta il flag per il refresh della Dashboard
      const setDashboardRefreshFlag = async () => {
        try {
          await AsyncStorage.setItem('dashboard_needs_refresh', 'true');
        } catch (e) {
          // Ignora errori AsyncStorage
        }
      };
      setDashboardRefreshFlag();
      navigation.setParams({ refreshDashboard: false });
    }
  }, [route?.params?.refreshDashboard]);

  const handleEditEntry = (entry) => {
    navigation.navigate('TimeEntryForm', {
      entry,
      isEdit: true,
      ferie: entry.ferie,
      permesso: entry.permesso,
      enableDelete: true // Passa flag per abilitare cancellazione
    });
  };

  const dayTypeLabels = {
    lavorativa: { label: 'Lavoro', color: '#2196F3' },
    ferie: { label: 'Ferie', color: '#43a047' },
    permesso: { label: 'Permesso', color: '#ef6c00' },
    malattia: { label: 'Malattia', color: '#d32f2f' },
    riposo: { label: 'Riposo compensativo', color: '#757575' },
  };
  
  const dayTypeIcons = {
    lavorativa: { icon: 'briefcase', color: '#2196F3' },
    ferie: { icon: 'sunny', color: '#43a047' },
    permesso: { icon: 'person', color: '#ef6c00' },
    malattia: { icon: 'medical', color: '#d32f2f' },
    riposo: { icon: 'bed', color: '#757575' },
  };

  const openDayTypeModal = (entry) => {
    setSelectedDayTypeEntry(entry);
    setSelectedDayTypeValue(entry.day_type || entry.dayType || 'lavorativa');
    setDayTypeModalVisible(true);
  };

  const closeDayTypeModal = () => {
    setDayTypeModalVisible(false);
    setSelectedDayTypeEntry(null);
  };

  const confirmDayTypeChange = async () => {
    if (!selectedDayTypeEntry) return;
    try {
      await DatabaseService.updateWorkEntry({ ...selectedDayTypeEntry, day_type: selectedDayTypeValue });
      closeDayTypeModal();
      refreshEntries();
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aggiornare il tipo giornata.');
    }
  };
  
  // Funzione per verificare se un breakdown è valido
  const isBreakdownValid = (breakdown) => {
    if (!breakdown) return false;
    
    // Verifica presenza campi essenziali
    const hasOrdinary = breakdown.ordinary && typeof breakdown.ordinary.total === 'number';
    const hasAllowances = breakdown.allowances && 
      (breakdown.allowances.travel > 0 || breakdown.allowances.standby > 0 || breakdown.allowances.meal > 0);
    const hasStandby = breakdown.standby &&
      (breakdown.standby.workEarnings?.total > 0 || breakdown.standby.travelEarnings?.total > 0);
    
    const hasTotal = typeof breakdown.total === 'number';
    
    return hasOrdinary || hasAllowances || hasStandby || hasTotal;
  };
  
  // Determina il nome del mese dall'entry
  const getMonthLabel = (dateString) => {
    const entryDate = new Date(dateString);
    return `${mesiItaliani[entryDate.getMonth()]} ${entryDate.getFullYear()}`;
  };

  // Funzione per raggruppare gli inserimenti per mese
  const renderSectionHeader = ({ section }) => (
    <View style={{
      backgroundColor: '#e8f5e9',
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      borderRadius: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1
    }}>
      <Text style={{
        fontWeight: '600',
        fontSize: 14,
        color: '#2e7d32'
      }}>
        {section.title}
      </Text>
      <Text style={{
        fontSize: 11,
        color: '#2e7d32',
        backgroundColor: '#c8e6c9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8
      }}>
        {section.data.length} inserimenti
      </Text>
    </View>
  );

  const renderWorkEntry = ({ item }) => {
    // Log di debug per analizzare i dati dell'entry
    console.log(`Rendering entry ID: ${item.id}, Date: ${item.date}`);
    
    const entryDate = new Date(item.date);
    const dayName = getDayName(item.date);
    const workHours = calculateTotalHours(item);
    console.log(`Ore calcolate: ${workHours}`);
    
    // Determina se l'inserimento è del mese corrente o precedente
    const entryMonth = entryDate.getMonth() + 1;
    const entryYear = entryDate.getFullYear();
    const isPreviousMonth = (entryYear !== selectedYear || entryMonth !== selectedMonth);

    const dayType = item.day_type || item.dayType || 'lavorativa';
    const dayTypeInfo = dayTypeLabels[dayType] || dayTypeLabels.lavorativa;

    // Formattazione date
    const formattedDate = `${entryDate.getDate().toString().padStart(2, '0')}/${(entryDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Usa safeSettings per calcoli coerenti
    const safeSettings = getSafeSettings(settings);
    
    // Calcola breakdown con gestione errori
    let breakdown;
    try {
      breakdown = calculateItemBreakdown(item, settings);
      console.log('Breakdown calcolato per ID ' + item.id + ':', JSON.stringify(breakdown, null, 2));
      
      // Verifica validità breakdown
      if (!isBreakdownValid(breakdown)) {
        console.warn('⚠️ Breakdown non valido per inserimento ID ' + item.id);
        // Crea un breakdown minimo di fallback
        breakdown = {
          ordinary: { hours: {}, earnings: {}, total: dailyRate / 8 * workHours },
          allowances: { travel: item.travel_allowance ? dailyRate * 0.1 : 0, meal: 0, standby: 0 },
          standby: { workEarnings: { total: 0 }, travelEarnings: { total: 0 } },
          total: item.total_earnings || dailyRate
        };
      }
    } catch (err) {
      console.error('🔴 Errore calcolo breakdown:', err);
      // Breakdown di emergenza
      breakdown = {
        ordinary: { hours: {}, earnings: {}, total: dailyRate / 8 * workHours },
        allowances: { travel: 0, meal: 0, standby: 0 },
        standby: { workEarnings: { total: 0 }, travelEarnings: { total: 0 } },
        total: item.total_earnings || dailyRate
      };
    }
    
    // Estrai note e stato reperibilità
    const note = item.note;
    const isStandbyConfirmed = standbyConfirmations[item.date];
    
    // Estrai i valori dal breakdown calcolato
    const regularPay = breakdown.ordinary?.total || 0;
    const regularHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0);
    const overtimeHours = (breakdown.ordinary?.hours?.lavoro_extra || 0) + (breakdown.ordinary?.hours?.viaggio_extra || 0);
    const overtimePay = (breakdown.ordinary?.earnings?.lavoro_extra || 0) + (breakdown.ordinary?.earnings?.viaggio_extra || 0);
    const travelPay = breakdown.ordinary?.earnings?.viaggio_extra || 0;
    const travelAllowance = breakdown.allowances?.travel || 0;
    const standbyAllowance = breakdown.allowances?.standby || 0;
    const standbyWorkPay = breakdown.standby?.workEarnings?.total || 0;
    const standbyTravelPay = breakdown.standby?.travelEarnings?.total || 0;
    const baseRate = safeSettings.contract?.hourlyRate || 16.41;
    
    console.log(`Valori estratti - Ore regolari: ${regularHours}, Straord: ${overtimeHours}, Totale: ${breakdown.total}`);
    
    return (
      <TouchableOpacity 
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          overflow: 'hidden',
          borderLeftWidth: 4,
          borderLeftColor: dayType === 'lavorativa' ? 
            (item.is_standby_day === 1 ? '#9C27B0' : '#2196F3') : 
            dayTypeInfo.color,
        }}
        onPress={() => handleEditEntry(item)}
      >
        {/* Header con data e info principali */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0'
        }}>
          {/* Colonna sinistra: data e giorno */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            {/* Data e giorno settimana */}
            <View style={{
              backgroundColor: dayTypeInfo.color + '22', // Colore sfumato in base al tipo
              borderRadius: 8,
              padding: 8,
              alignItems: 'center',
              width: 65
            }}>
              <Text style={{
                color: dayTypeInfo.color,
                fontSize: 18,
                fontWeight: 'bold'
              }}>{formattedDate}</Text>
              <Text style={{
                fontWeight: '600',
                color: '#555',
                fontSize: 13
              }}>{dayName}</Text>
            </View>
            
            {/* Tipo di giornata */}
            <View style={{
              marginLeft: 12
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: dayTypeInfo.color + '22',
                  padding: 4,
                  borderRadius: 4,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons name={dayTypeIcons[dayType]?.icon || 'briefcase'} size={14} color={dayTypeInfo.color} />
                  <Text style={{
                    color: dayTypeInfo.color,
                    marginLeft: 4,
                    fontWeight: '500',
                    fontSize: 14
                  }}>{dayTypeInfo.label}</Text>
                </View>
              </View>
              
              {/* Mostra ore di lavoro totali */}
              <View style={{marginTop: 4, flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="time-outline" size={14} color="#555" />
                <Text style={{fontSize: 13, color: '#555', marginLeft: 4}}>
                  {formatSafeHours(workHours)} ore
                </Text>
              </View>
            </View>
          </View>
          
          {/* Colonna destra: importo guadagno */}
          <View style={{
            backgroundColor: dayType !== 'lavorativa' ? '#e0e0e0' : '#e3f2fd',
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            minWidth: 100,
            alignItems: 'center'
          }}>
            <Text style={{
              fontSize: 12,
              color: dayType !== 'lavorativa' ? '#616161' : '#1565C0',
              marginBottom: 2
            }}>
              {dayType !== 'lavorativa' ? 'Retribuzione:' : 'Guadagno:'}
            </Text>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: dayType !== 'lavorativa' ? '#424242' : '#0d47a1'
            }}>
              {(() => {
                // Gestione sicura dell'importo
                let amount = 0;
                if (breakdown && typeof breakdown.total === 'number') {
                  amount = breakdown.total;
                } else if (dayType !== 'lavorativa') {
                  amount = dailyRate;
                } else if (typeof item.total_earnings === 'number') {
                  amount = item.total_earnings;
                }
                return formatCurrency(amount, '€');
              })()}
            </Text>
          </View>
        </View>
        
        {/* Riepilogo guadagni per giornate lavorative */}
        {dayType === 'lavorativa' && (
          <View style={{
            backgroundColor: '#f5f5f5',
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0'
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#333',
              marginBottom: 8
            }}>
              Riepilogo Guadagni
            </Text>
            
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
              {/* Ore ordinarie */}
              {(regularHours > 0 || (workHours > 0 && dayType === 'lavorativa')) && (
                <View style={{
                  backgroundColor: '#e8f5e9',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{fontSize: 12, color: '#2e7d32'}}>
                    Ordinarie: {formatCurrency(regularPay - overtimePay || dailyRate / 8 * Math.min(workHours, 8), '€')}
                  </Text>
                </View>
              )}
              
              {/* Straordinario */}
              {overtimeHours > 0 && (
                <View style={{
                  backgroundColor: '#fff3e0',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{fontSize: 12, color: '#e65100'}}>
                    Straord.: {formatCurrency(overtimePay, '€')}
                  </Text>
                </View>
              )}
              
              {/* Trasferta */}
              {travelAllowance > 0 && (
                <View style={{
                  backgroundColor: '#e1f5fe',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{fontSize: 12, color: '#0277bd'}}>
                    Trasferta: {formatCurrency(travelAllowance, '€')}
                  </Text>
                </View>
              )}
              
              {/* Reperibilità */}
              {standbyAllowance > 0 && (
                <View style={{
                  backgroundColor: '#f3e5f5',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{fontSize: 12, color: '#7b1fa2'}}>
                    Reper.: {formatCurrency(standbyAllowance, '€')}
                  </Text>
                </View>
              )}
              
              {/* Interventi */}
              {(standbyWorkPay + standbyTravelPay) > 0 && (
                <View style={{
                  backgroundColor: '#ede7f6',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6
                }}>
                  <Text style={{fontSize: 12, color: '#5e35b1'}}>
                    Interventi: {formatCurrency(standbyWorkPay + standbyTravelPay, '€')}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Totale */}
            <View style={{
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingVertical: 8,
              backgroundColor: '#bbdefb',
              paddingHorizontal: 10,
              borderRadius: 8,
              marginTop: 8
            }}>
              <Text style={{fontSize: 13, fontWeight: 'bold', color: '#0d47a1'}}>
                Totale Giornata
              </Text>
              <Text style={{fontSize: 15, fontWeight: 'bold', color: '#0d47a1'}}>
                {formatCurrency(breakdown.total || 0, '€')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Dettagli sede e veicolo */}
        {(item.site_name || item.siteName || item.vehicle_driven || item.vehicleDriven) && (
          <View style={{
            padding: 8,
            backgroundColor: '#fff'
          }}>
            {(item.site_name || item.siteName) && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4
              }}>
                <Ionicons name="location-outline" size={14} color="#FF9800" style={{marginRight: 4}} />
                <Text style={{fontSize: 13, color: '#555'}}>
                  {item.site_name || item.siteName}
                </Text>
              </View>
            )}
            
            {(item.vehicle_driven || item.vehicleDriven) && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="car-outline" size={14} color="#607D8B" style={{marginRight: 4}} />
                <Text style={{fontSize: 13, color: '#555'}}>
                  {item.vehicle_driven || item.vehicleDriven}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const calculateTotalHours = (entry) => {
    let totalMinutes = 0;
    
    // Calculate work hours
    if (entry.work_start_1 && entry.work_end_1) {
      totalMinutes += calculateTimeDiff(entry.work_start_1, entry.work_end_1);
    }
    if (entry.work_start_2 && entry.work_end_2) {
      totalMinutes += calculateTimeDiff(entry.work_start_2, entry.work_end_2);
    }
    
    // Calculate travel hours
    if (entry.departure_company && entry.arrival_site) {
      totalMinutes += calculateTimeDiff(entry.departure_company, entry.arrival_site);
    }
    if (entry.departure_return && entry.arrival_company) {
      totalMinutes += calculateTimeDiff(entry.departure_return, entry.arrival_company);
    }

    // Aggiungi ore da interventi di reperibilità
    if (entry.interventi && Array.isArray(entry.interventi)) {
      entry.interventi.forEach(intervento => {
        if (intervento.work_start_1 && intervento.work_end_1) {
          totalMinutes += calculateTimeDiff(intervento.work_start_1, intervento.work_end_1);
        }
        if (intervento.work_start_2 && intervento.work_end_2) {
          totalMinutes += calculateTimeDiff(intervento.work_start_2, intervento.work_end_2);
        }
        if (intervento.departure_company && intervento.arrival_site) {
          totalMinutes += calculateTimeDiff(intervento.departure_company, intervento.arrival_site);
        }
        if (intervento.departure_return && intervento.arrival_company) {
          totalMinutes += calculateTimeDiff(intervento.departure_return, intervento.arrival_company);
        }
      });
    }
    
    return totalMinutes / 60;
  };

  const calculateTimeDiff = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;
    
    // Handle overnight work
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60;
    }
    
    return endTotalMinutes - startTotalMinutes;
  };

  // Funzione per ispezionare direttamente il database
  const inspectDatabase = async () => {
    try {
      // Carica direttamente dal database tutti gli inserimenti
      const directEntries = await DatabaseService.getAllWorkEntries();
      console.log(`🔍 Database: ${directEntries.length} inserimenti trovati direttamente`);
      
      if (directEntries.length > 0) {
        // Mostra schema del primo inserimento
        const firstEntry = directEntries[0];
        const keys = Object.keys(firstEntry);
        console.log('🔑 Schema database:', keys.join(', '));
        
        // Verifica problemi comuni
        const missingFields = [];
        if (!keys.includes('id')) missingFields.push('id');
        if (!keys.includes('date')) missingFields.push('date');
        if (!keys.includes('day_type') && !keys.includes('dayType')) missingFields.push('day_type');
        
        if (missingFields.length > 0) {
          console.warn('⚠️ Campi mancanti nel database:', missingFields.join(', '));
        }
        
        // Verifica presenza totale guadagni
        const entriesWithTotals = directEntries.filter(e => 
          e.total_earnings !== undefined && e.total_earnings !== null);
        console.log(`💰 Inserimenti con totale guadagni: ${entriesWithTotals.length}/${directEntries.length}`);
      }
    } catch (err) {
      console.error('🔴 Errore ispezione database:', err);
    }
  };
  
  // Esegui ispezione all'avvio
  useEffect(() => {
    inspectDatabase();
  }, []);

  const handleDayTypeChange = async (entry, newDayType) => {
    try {
      // Crea un work entry aggiornato con il nuovo tipo giornata
      const updatedEntry = { ...entry, day_type: newDayType };
      
      // Ricalcola il totale degli earnings usando lo stesso servizio di calcolo
      const safeSettings = getSafeSettings(settings);
      const breakdown = calculateItemBreakdown(updatedEntry, settings);
      
      // Assicuriamoci che il breakdown.total esista, altrimenti utilizziamo 0
      const totalEarnings = breakdown.total || 0;
      console.log(`Nuovo totale guadagni per ${updatedEntry.date}: ${totalEarnings}`);
      
      // Aggiorna l'entry includendo il totale ricalcolato
      await DatabaseService.updateWorkEntry({ 
        ...updatedEntry, 
        total_earnings: totalEarnings
      });
      
      // Ricarica gli inserimenti per mostrare i totali aggiornati
      refreshEntries();
    } catch (e) {
      console.error('Errore aggiornamento tipo giornata:', e);
      Alert.alert('Errore', 'Impossibile aggiornare il tipo giornata.');
    }
  };

  if (isLoading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Caricamento inserimenti...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Organizza gli inserimenti per mese - ottimizzato con useMemo
  const sectionedEntries = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    console.log(`Ottimizzazione con useMemo: elaborazione di ${entries.length} inserimenti`);
    
    // Crea una mappa per raggruppare gli inserimenti per mese e anno
    const entriesByMonth = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const monthYear = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}`;
      
      if (!entriesByMonth[monthYear]) {
        entriesByMonth[monthYear] = {
          title: getMonthLabel(entry.date),
          year: entryDate.getFullYear(),
          month: entryDate.getMonth() + 1,
          data: []
        };
      }
      
      entriesByMonth[monthYear].data.push(entry);
    });
    
    // Converti la mappa in un array e ordina le sezioni per data (più recenti prima)
    return Object.values(entriesByMonth)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .map(section => {
        // Ordina gli inserimenti all'interno di ciascuna sezione per data (più recenti prima)
        section.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        return section;
      });
  }, [entries]); // La funzione si esegue nuovamente solo quando entries cambia

  return (
    <SafeAreaView style={styles.container}>
      {/* Header rivisto con solo pulsante nuovo inserimento più visibile */}
      <View style={[styles.header, { flexDirection: 'column', alignItems: 'stretch', paddingBottom: 15 }]}>
        {/* Pulsante Nuovo grande e ben visibile in alto */}
        <TouchableOpacity 
          style={{
            backgroundColor: '#1976D2',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 10,
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#1565C0',
          }} 
          onPress={handleNewEntry} 
          onLongPress={()=>Alert.alert('Nuovo inserimento','Aggiungi un nuovo inserimento orario per la giornata selezionata.')}
        >
          <Ionicons name="add-circle" size={32} color="white" />
          <Text style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 10,
            letterSpacing: 0.5
          }}>+ NUOVO INSERIMENTO</Text>
        </TouchableOpacity>

        {/* Seconda riga: solo titolo */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'center', 
          alignItems: 'center', 
          marginTop: 5,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0'
        }}>
          <Text style={styles.headerTitle}>Storico Inserimenti</Text>
        </View>
      </View>
      
      <SectionList
        sections={sectionedEntries}
        renderItem={renderWorkEntry}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshEntries} tintColor="#2196F3" title="Aggiornamento..." titleColor="#2196F3" />
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={() => (
          <View>
            <View style={{
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 8, 
              backgroundColor: '#e3f2fd', 
              borderRadius: 8,
              marginBottom: 8
            }}>
              <Ionicons name="information-circle-outline" size={18} color="#1976d2" style={{marginRight: 4}} />
              <Text style={{color: '#1976d2', fontSize: 12}}>
                Visualizzazione completa di tutti gli inserimenti
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 40
          }}>
            <Ionicons name="calendar-outline" size={48} color="#bdbdbd" />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#757575',
              marginTop: 12
            }}>Nessun inserimento trovato</Text>
            <Text style={{
              fontSize: 14,
              color: '#9e9e9e',
              textAlign: 'center',
              marginTop: 8
            }}>
              Utilizza il pulsante "Nuovo Inserimento" per aggiungere la tua prima giornata lavorativa
            </Text>
          </View>
        )}
      />
      {/* Modal selezione tipo giornata */}
      <Modal
        visible={dayTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDayTypeModal}
      >
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.3)',justifyContent:'center',alignItems:'center'}}>
          <View style={{backgroundColor:'#fff',borderRadius:12,padding:20,minWidth:260}}>
            <Text style={{fontWeight:'bold',fontSize:17,marginBottom:10}}>Seleziona tipo giornata</Text>
            <Picker
              selectedValue={selectedDayTypeValue}
              onValueChange={setSelectedDayTypeValue}
              style={{height:40,marginBottom:10}}
            >
              {Object.entries(dayTypeLabels).map(([key, val]) => (
                <Picker.Item key={key} label={val.label} value={key} />
              ))}
            </Picker>
            <View style={{flexDirection:'row',justifyContent:'flex-end',marginTop:10}}>
              <TouchableOpacity onPress={closeDayTypeModal} style={{marginRight:16}}>
                <Text style={{color:'#757575',fontWeight:'bold'}}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDayTypeChange}>
                <Text style={{color:'#2196F3',fontWeight:'bold'}}>Conferma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateContainer: {
    alignItems: 'center',
    marginRight: 15,
  }
});

// Ensure we're exporting a valid React component
const MemoizedTimeEntryScreen = React.memo(TimeEntryScreen);
export default MemoizedTimeEntryScreen;