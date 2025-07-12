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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkEntries, useSettings } from '../hooks';
import { formatDate, formatTime, formatCurrency, getDayName } from '../utils';
import { createWorkEntryFromData, getSafeSettings, calculateItemBreakdown, formatSafeHours } from '../utils/earningsHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import DatabaseService from '../services/DatabaseService';
import CalculationService from '../services/CalculationService';

const TimeEntryScreen = ({ navigation, route }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [showFeriePermesso, setShowFeriePermesso] = useState(false);
  const [standbyConfirmations, setStandbyConfirmations] = useState({});
  const [editingDayTypeId, setEditingDayTypeId] = useState(null);
  const [editingDayTypeValue, setEditingDayTypeValue] = useState('');
  const [dayTypeModalVisible, setDayTypeModalVisible] = useState(false);
  const [selectedDayTypeEntry, setSelectedDayTypeEntry] = useState(null);
  const [selectedDayTypeValue, setSelectedDayTypeValue] = useState('');
  
  // Mostra sempre tutti gli inserimenti di tutti i mesi
  const { entries, isLoading, refreshEntries } = useWorkEntries(selectedYear, selectedMonth, true);
  const { settings } = useSettings();
  const contract = settings.contract || {};
  const monthlySalary = contract.monthlySalary || 0;
  const dailyRate = monthlySalary / 26;
  const officialHourlyRate = monthlySalary / 173;
  
  // Debug per verificare il caricamento
  useEffect(() => {
    console.log(`TimeEntryScreen: Caricati ${entries?.length || 0} inserimenti`);
    if (entries && entries.length > 0) {
      // Log date range per debug
      const dates = entries.map(e => new Date(e.date));
      const minDate = new Date(Math.min.apply(null, dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max.apply(null, dates)).toISOString().split('T')[0];
      console.log(`TimeEntryScreen: Range date da ${minDate} a ${maxDate}`);
    }
  }, [entries]);
  const overtimeDay = officialHourlyRate * 1.20;
  const overtimeNightUntil22 = officialHourlyRate * 1.25;
  const overtimeNightAfter22 = officialHourlyRate * 1.35;

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
  };  // Aggiorna la dashboard dopo ogni salvataggio
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

  const calculateTotalHours = (item) => {
    // Calcola le ore totali di lavoro e viaggio
    let totalHours = 0;
    
    // Ore di lavoro
    if (item.work_start_1 && item.work_end_1) {
      const start = convertTimeStringToMinutes(item.work_start_1);
      const end = convertTimeStringToMinutes(item.work_end_1);
      if (start !== null && end !== null) {
        totalHours += (end - start) / 60;
      }
    }
    
    if (item.work_start_2 && item.work_end_2) {
      const start = convertTimeStringToMinutes(item.work_start_2);
      const end = convertTimeStringToMinutes(item.work_end_2);
      if (start !== null && end !== null) {
        totalHours += (end - start) / 60;
      }
    }
    
    // Ore di viaggio
    if (item.departure_company && item.arrival_site) {
      const start = convertTimeStringToMinutes(item.departure_company);
      const end = convertTimeStringToMinutes(item.arrival_site);
      if (start !== null && end !== null) {
        totalHours += (end - start) / 60;
      }
    }
    
    if (item.departure_return && item.arrival_company) {
      const start = convertTimeStringToMinutes(item.departure_return);
      const end = convertTimeStringToMinutes(item.arrival_company);
      if (start !== null && end !== null) {
        totalHours += (end - start) / 60;
      }
    }
    
    return parseFloat(totalHours.toFixed(2));
  };

  // Converte una stringa oraria nel formato HH:MM in minuti
  const convertTimeStringToMinutes = (timeString) => {
    if (!timeString) return null;
    
    // Supporta sia il formato HH:MM che H:MM
    const parts = timeString.split(':');
    if (parts.length !== 2) return null;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    
    if (isNaN(hours) || isNaN(minutes)) return null;
    
    return hours * 60 + minutes;
  };

  // Helper per formattare le ore in formato HH:MM
  const formatSafeHours = (hours) => {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Componente migliorato per il riepilogo dei guadagni
  const EntryBreakdown = ({ item, breakdown, settings, isCollapsed, onToggleCollapse }) => {
    if (!breakdown) return null;
    
    // Controlla se ci sono ore ordinarie o di reperibilità
    const hasOrdinaryHours = breakdown.ordinary && 
      (breakdown.ordinary.hours?.lavoro_giornaliera > 0 || 
       breakdown.ordinary.hours?.viaggio_giornaliera > 0 || 
       breakdown.ordinary.hours?.lavoro_extra > 0 || 
       breakdown.ordinary.hours?.viaggio_extra > 0);
       
    const hasStandbyHours = breakdown.standby?.workHours && 
      (Object.values(breakdown.standby.workHours).some(h => h > 0) || 
       Object.values(breakdown.standby.travelHours).some(h => h > 0));
       
    const hasAllowances = breakdown.allowances && 
      (breakdown.allowances.travel > 0 || 
       breakdown.allowances.meal > 0 || 
       breakdown.allowances.standby > 0);

    // Se il riepilogo è collassato, mostra solo il totale
    if (isCollapsed) {
      return (
        <TouchableOpacity 
          style={styles.collapsedBreakdown}
          onPress={onToggleCollapse}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text style={{color: '#333', fontWeight: 'bold'}}>Guadagno giornaliero</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={{fontWeight: 'bold', fontSize: 16, color: '#2e7d32', marginRight: 8}}>
                {formatCurrency(breakdown.totalEarnings || 0)}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#555" />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Determina il tipo di giornata
    const { isSaturday, isSunday, isHoliday } = breakdown.details || {};
    const dayTypeLabel = isHoliday ? 'Festivo' : (isSunday ? 'Domenica' : (isSaturday ? 'Sabato' : 'Feriale'));
    
    return (
      <View style={styles.expandedBreakdown}>
        <TouchableOpacity 
          style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 8}}
          onPress={onToggleCollapse}
        >
          <Text style={{color: '#1976d2', fontWeight: 'bold', fontSize: 16}}>Riepilogo Guadagni</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{fontWeight: 'bold', fontSize: 16, color: '#2e7d32', marginRight: 8}}>
              {formatCurrency(breakdown.totalEarnings || 0)}
            </Text>
            <Ionicons name="chevron-up" size={18} color="#555" />
          </View>
        </TouchableOpacity>

        <View style={{marginBottom: 8}}>
          <View style={styles.breakdownInfoRow}>
            <Text style={styles.breakdownInfoLabel}>Tipo giornata:</Text>
            <Text style={[styles.breakdownInfoValue, {color: isHoliday || isSunday ? '#d32f2f' : (isSaturday ? '#ef6c00' : '#2196F3')}]}>
              {dayTypeLabel}
            </Text>
          </View>
          <View style={styles.breakdownInfoRow}>
            <Text style={styles.breakdownInfoLabel}>Ore totali:</Text>
            <Text style={styles.breakdownInfoValue}>
              {formatSafeHours(breakdown.totalHours || 0)}
            </Text>
          </View>
        </View>

        {hasOrdinaryHours && (
          <View style={styles.breakdownCategory}>
            <Text style={styles.breakdownCategoryTitle}>Attività Ordinarie</Text>
            
            {/* Giornaliero/Ordinario (per feriali) */}
            {!isSaturday && !isSunday && !isHoliday && breakdown.ordinary.earnings?.giornaliera > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Giornaliero (prime 8h)</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.ordinary.earnings.giornaliera)}</Text>
                </View>
                {breakdown.ordinary.hours?.lavoro_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    Lavoro: {formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}
                  </Text>
                )}
                {breakdown.ordinary.hours?.viaggio_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    Viaggio: {formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}
                  </Text>
                )}
              </View>
            )}
            
            {/* Lavoro ordinario sabato/domenica/festivo */}
            {(isSaturday || isSunday || isHoliday) && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>
                    Lavoro {isHoliday ? 'festivo' : (isSunday ? 'domenica' : 'sabato')}
                  </Text>
                  <Text style={styles.breakdownItemValue}>
                    {formatCurrency((breakdown.ordinary.earnings?.festivo || 0) + 
                                   (breakdown.ordinary.earnings?.domenica || 0) + 
                                   (breakdown.ordinary.earnings?.sabato || 0))}
                  </Text>
                </View>
                {(breakdown.ordinary.hours?.lavoro_giornaliera > 0 || breakdown.ordinary.hours?.viaggio_giornaliera > 0) && (
                  <Text style={styles.breakdownDetail}>
                    Ore: {formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                                        (breakdown.ordinary.hours.viaggio_giornaliera || 0))}
                  </Text>
                )}
              </View>
            )}
            
            {/* Straordinario */}
            {breakdown.ordinary.earnings?.extra > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Straordinario</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.ordinary.earnings.extra)}</Text>
                </View>
                {breakdown.ordinary.hours?.lavoro_extra > 0 && (
                  <Text style={styles.breakdownDetail}>
                    Lavoro extra: {formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}
                  </Text>
                )}
                {breakdown.ordinary.hours?.viaggio_extra > 0 && (
                  <Text style={styles.breakdownDetail}>
                    Viaggio extra: {formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
        
        {/* Reperibilità */}
        {hasStandbyHours && (
          <View style={styles.breakdownCategory}>
            <Text style={styles.breakdownCategoryTitle}>Reperibilità</Text>
            
            {breakdown.standby?.earnings?.work > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Interventi</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.standby.earnings.work)}</Text>
                </View>
              </View>
            )}
            
            {breakdown.standby?.earnings?.travel > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Viaggio (Reperibilità)</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.standby.earnings.travel)}</Text>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Indennità */}
        {hasAllowances && (
          <View style={styles.breakdownCategory}>
            <Text style={styles.breakdownCategoryTitle}>Indennità</Text>
            
            {breakdown.allowances?.standby > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Indennità reperibilità</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.allowances.standby)}</Text>
                </View>
              </View>
            )}
            
            {breakdown.allowances?.travel > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Indennità trasferta</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.allowances.travel)}</Text>
                </View>
              </View>
            )}
            
            {breakdown.allowances?.meal > 0 && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownItemLabel}>Rimborso pasti</Text>
                  <Text style={styles.breakdownItemValue}>{formatCurrency(breakdown.allowances.meal)}</Text>
                </View>
                {(item.mealLunchVoucher === 1 || item.mealLunchCash > 0) && (
                  <Text style={styles.breakdownDetail}>Pranzo: {item.mealLunchCash > 0 ? `${item.mealLunchCash.toFixed(2)}€ (contanti)` : 'Buono pasto'}</Text>
                )}
                {(item.mealDinnerVoucher === 1 || item.mealDinnerCash > 0) && (
                  <Text style={styles.breakdownDetail}>Cena: {item.mealDinnerCash > 0 ? `${item.mealDinnerCash.toFixed(2)}€ (contanti)` : 'Buono pasto'}</Text>
                )}
              </View>
            )}
          </View>
        )}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalRowLabel}>TOTALE GIORNALIERO</Text>
          <Text style={styles.totalRowValue}>{formatCurrency(breakdown.totalEarnings || 0)}</Text>
        </View>
      </View>
    );
  };

  const renderWorkEntry = ({ item }) => {
    const entryDate = new Date(item.date);
    const dayName = getDayName(item.date);
    const workHours = calculateTotalHours(item);

    // Breakdown dettagliato (se presente)
    const breakdown = item.breakdown || {};
    const standbyAllowance = item.standbyAllowance || item.standby_allowance || 0;
    const standbyWorkPay = item.standbyWorkPay || item.standby_work_pay || 0;
    const standbyTravelPay = item.standbyTravelPay || item.standby_travel_pay || 0;
    const note = item.note;
    const isStandbyConfirmed = standbyConfirmations[item.date];

    // Calcolo breakdown reale con CalculationService
    const settingsObj = settings || {};
    // Mappa i campi dell'entry per CalculationService
    const entryForCalc = {
      ...item,
      workStart1: item.work_start_1,
      workEnd1: item.work_end_1,
      workStart2: item.work_start_2,
      workEnd2: item.work_end_2,
      departureCompany: item.departure_company,
      arrivalSite: item.arrival_site,
      departureReturn: item.departure_return,
      arrivalCompany: item.arrival_company,
      standbyWorkStart1: item.standby_work_start_1,
      standbyWorkEnd1: item.standby_work_end_1,
      standbyWorkStart2: item.standby_work_start_2,
      standbyWorkEnd2: item.standby_work_end_2,
      standbyDeparture: item.standby_departure,
      standbyArrival: item.standby_arrival,
      standbyReturnDeparture: item.standby_return_departure,
      standbyReturnArrival: item.standby_return_arrival,
      ferie: item.ferie,
      permesso: item.permesso,
      is_standby_day: item.is_standby_day,
      date: item.date
    };
    const result = CalculationService.calculateDailyEarnings(entryForCalc, settingsObj);
    const travelPay = result.travelPay || 0;
    const travelAllowance = result.travelAllowance || 0;
    const overtimePay = result.overtimePay || 0;
    const overtimeHours = breakdown.overtimeHours || 0;
    const regularPay = result.regularPay || 0;
    const regularHours = breakdown.regularHours || 0;
    const baseRate = contract.hourlyRate || (contract.monthlySalary ? contract.monthlySalary / 173 : 0);

    const dayType = item.day_type || item.dayType || 'lavorativa';
    const dayTypeInfo = dayTypeLabels[dayType] || dayTypeLabels.lavorativa;

    return (
      <TouchableOpacity 
        style={[styles.entryCard, {borderLeftWidth:4, borderLeftColor: item.is_standby_day === 1 ? '#9C27B0' : '#2196F3'}]}
        onPress={() => handleEditEntry(item)}
        onLongPress={() => saveEntry(item)}
      >
        {/* Separatore data e tipo giornata */}
        <View style={{borderBottomWidth:1,borderBottomColor:'#e0e0e0',marginBottom:8,paddingBottom:4}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
            <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
              <View style={styles.dateContainer}>
                <Text style={styles.entryDate}>{formatDate(item.date, 'dd/MM')}</Text>
                <Text style={styles.entryDay}>{dayName}</Text>
              </View>
              {/* Picker tipo giornata accanto alla data */}
              <View style={{marginLeft:8, minWidth:120}}>
                <Picker
                  selectedValue={dayType}
                  onValueChange={(value) => handleDayTypeChange(item, value)}
                  style={{height:36, width:120, color: dayTypeLabels[dayType]?.color || '#333', fontWeight:'bold'}}>
                  {Object.entries(dayTypeLabels).map(([key, val]) => (
                    <Picker.Item key={key} label={val.label} value={key} color={val.color} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.entryEarnings}>
              {/* Se NON lavorativa, mostra solo la retribuzione giornaliera come importo principale */}
              {dayType !== 'lavorativa' ? (
                <Text style={styles.earningsAmount}>{formatCurrency(dailyRate)}</Text>
              ) : workHours < 8 ? (
                <View style={{alignItems:'flex-end'}}>
                  <Text style={{fontSize:13,color:'#d32f2f'}}>Attenzione: ore segnate inferiori a 8. Come vuoi calcolare le restanti ore? (ferie, permesso, malattia o riposo compensativo?)</Text>
                  <Text style={styles.earningsAmount}>{formatCurrency(item.total_earnings)}</Text>
                </View>
              ) : (
                <Text style={styles.earningsAmount}>{formatCurrency(item.total_earnings)}</Text>
              )}
              {item.is_standby_day === 1 && (
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <View style={styles.standbyBadge}>
                    <Text style={styles.standbyText}>R</Text>
                  </View>
                  <TouchableOpacity onPress={()=>Alert.alert('Reperibilità','Badge R = Giorno di reperibilità. Il check indica conferma ricevuta.')}
                    style={[styles.standbyConfirmBadge, {backgroundColor: isStandbyConfirmed ? '#4CAF50' : '#BDBDBD'}]}>
                    <Ionicons name={isStandbyConfirmed ? 'checkmark' : 'help'} size={12} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          {/* Badge visuale tipo giornata in riga separata */}
          <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
            <View style={{
              backgroundColor: dayTypeInfo.color,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 4,
              flexDirection:'row',
              alignItems:'center',
              alignSelf:'flex-start'
            }}>
              <Ionicons name={dayTypeIcons[dayType].icon} size={14} color="#fff" style={{marginRight:4}} />
              <Text style={{
                color:'#fff',
                fontWeight:'bold',
                fontSize:11
              }}>
                {dayTypeInfo.label}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.entryTimes}>
          {item.departure_company && (
            <Text style={styles.timeText}>
              <Ionicons name="car-outline" size={14} color="#555" /> Partenza: {formatTime(item.departure_company)}
            </Text>
          )}
          {item.work_start_1 && item.work_end_1 && (
            <Text style={styles.timeText}>
              <Ionicons name="build-outline" size={14} color="#555" /> Lavoro: {formatTime(item.work_start_1)} - {formatTime(item.work_end_1)}
            </Text>
          )}
          {item.work_start_2 && item.work_end_2 && (
            <Text style={styles.timeText}>
              <Ionicons name="build-outline" size={14} color="#555" /> 2° Turno: {formatTime(item.work_start_2)} - {formatTime(item.work_end_2)}
            </Text>
          )}
          {item.arrival_company && (
            <Text style={styles.timeText}>
              <Ionicons name="home-outline" size={14} color="#555" /> Rientro: {formatTime(item.arrival_company)}
            </Text>
          )}
        </View>

        {/* Mostra interventi di reperibilità */}
        {item.interventi && item.interventi.length > 0 && (
          <View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0'}}>
            <Text style={{fontWeight: 'bold', color: '#9C27B0', marginBottom: 4}}>Interventi Reperibilità ({item.interventi.length})</Text>
            {item.interventi.map((intervento, index) => (
              <View key={index} style={{marginLeft: 10, marginBottom: 5}}>
                {intervento.departure_company && intervento.arrival_site && (
                  <Text style={styles.timeText}>
                    <Ionicons name="car-outline" size={14} color="#9C27B0" /> Viaggio: {formatTime(intervento.departure_company)} - {formatTime(intervento.arrival_site)}
                  </Text>
                )}
                {intervento.work_start_1 && intervento.work_end_1 && (
                  <Text style={styles.timeText}>
                    <Ionicons name="build-outline" size={14} color="#9C27B0" /> Intervento: {formatTime(intervento.work_start_1)} - {formatTime(intervento.work_end_1)}
                  </Text>
                )}
                 {intervento.departure_return && intervento.arrival_company && (
                  <Text style={styles.timeText}>
                    <Ionicons name="home-outline" size={14} color="#9C27B0" /> Rientro: {formatTime(intervento.departure_return)} - {formatTime(intervento.arrival_company)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Breakdown dettagliato reperibilità, viaggio, straordinari, trasferta e nota CCNL */}
        {(standbyAllowance > 0 || standbyWorkPay > 0 || standbyTravelPay > 0 || travelPay > 0 || overtimePay > 0 || travelAllowance > 0 || note || dayType !== 'lavorativa') && (
          <View style={{marginTop:10,backgroundColor:'#e3f2fd',borderRadius:8,padding:10}}>
            <Text style={{fontWeight:'bold',fontSize:15,marginBottom:4}}>Dettaglio calcolo CCNL</Text>
            {/* Breakdown per lavorativa < 8h */}
            {dayType === 'lavorativa' && workHours < 8 && (
              <Text style={{color:'#d32f2f',fontSize:13,marginBottom:4}}>
                Attenzione: ore segnate inferiori a 8. Come vuoi calcolare le restanti ore? (ferie, permesso, malattia o riposo compensativo?)
              </Text>
            )}
            {/* Breakdown per ferie/permesso: mostra ore segnate e avviso se <8 */}
            {(dayType === 'ferie' || dayType === 'permesso') && (
              <View style={{marginBottom:4}}>
                <Text style={{color:'#388e3c',fontWeight:'bold'}}>Retribuzione giornaliera: {formatCurrency(dailyRate)}</Text>
                <Text style={{color:'#1976d2',fontSize:13}}>Ore segnate: {workHours.toFixed(2)}h</Text>
                {workHours < 8 && (
                  <Text style={{color:'#d32f2f',fontSize:12,marginTop:2}}>
                    Attenzione: ore segnate inferiori a 8. Come vuoi calcolare le restanti ore?
                  </Text>
                )}
              </View>
            )}
            {/* Breakdown per altri giorni non lavorativi */}
            {dayType !== 'lavorativa' && dayType !== 'ferie' && dayType !== 'permesso' && (
              <Text style={{color:'#388e3c',fontWeight:'bold'}}>Retribuzione giornaliera: {formatCurrency(dailyRate)}</Text>
            )}
            {dayType === 'lavorativa' && regularPay > 0 && (
              <View style={{flexDirection:'column'}}>
                <Text style={{color:'#388e3c'}}>
                  Retribuzione base: {formatCurrency(regularPay)}
                </Text>
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>
                  ({result.breakdown.regularHours?.toFixed(2) || '0'}h {result.breakdown.regularHours >= 8 ? 'giornata intera' : 'parziale'}{result.breakdown.regularHours >= 8 ? ', tariffa giornaliera' : ', tariffa oraria'})
                </Text>
              </View>
            )}
            {overtimePay > 0 && (
              <Text style={{color:'#ef6c00'}}>
                Straordinario: {formatCurrency(overtimePay)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  ({overtimeHours?.toFixed(2) || '0'}h x maggiorazione CCNL)</Text>
              </Text>
            )}
            {travelPay > 0 && (
              <Text style={{color:'#1976d2'}}>
                Compenso viaggio: {formatCurrency(travelPay)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  (Solo ore oltre 8h, tariffa: {formatCurrency(baseRate * (settings.travelCompensationRate || 1))}/h)</Text>
              </Text>
            )}
            {standbyAllowance > 0 && (
              <Text style={{color:'#1976d2',fontWeight:'bold'}}>
                Indennità reperibilità: {formatCurrency(standbyAllowance)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  (Tariffa: {formatCurrency(item.standbyAllowanceRate || item.standby_allowance_rate || contract.standbyAllowanceRate || 0)})</Text>
              </Text>
            )}
            {standbyWorkPay > 0 && (
              <Text style={{color:'#1976d2'}}>
                Compenso interventi reperibilità: {formatCurrency(standbyWorkPay)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  (Tariffa: {formatCurrency(item.standbyWorkRate || item.standby_work_rate || contract.standbyWorkRate || 0)})</Text>
              </Text>
            )}
            {standbyTravelPay > 0 && (
              <Text style={{color:'#1976d2'}}>
                Compenso viaggio reperibilità: {formatCurrency(standbyTravelPay)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  (Tariffa: {formatCurrency(item.standbyTravelRate || item.standby_travel_rate || contract.standbyTravelRate || 0)})</Text>
              </Text>
            )}
            {travelAllowance > 0 && (
              <Text style={{color:'#1976d2'}}>
                Indennità trasferta: {formatCurrency(travelAllowance)}
                <Text style={{color:'#666', fontWeight:'normal', fontSize:12}}>  (Regole: {settings.travelAllowance?.option || 'WITH_TRAVEL'})</Text>
              </Text>
            )}
            {note && (
              <Text style={{color:'#333',marginTop:6,fontSize:12}}>{note}</Text>
            )}
            <Text style={{color:'#888',fontSize:11,marginTop:6}}>
              Le ore di viaggio vengono pagate solo se eccedenti le 8h totali (lavoro+viaggio), secondo impostazioni. La retribuzione base è calcolata con tariffa giornaliera se la somma raggiunge 8h.
            </Text>
          </View>
        )}
        {item.is_standby_day === 1 && (
          <Text style={{fontSize:11,color:isStandbyConfirmed?'#388e3c':'#757575',marginTop:2}}>
            {isStandbyConfirmed ? 'Reperibilità confermata' : 'In attesa di conferma reperibilità'}
          </Text>
        )}
        {/* Rimborsi pasti */}
        {(item.meal_lunch_voucher === 1 || item.meal_lunch_cash > 0 || item.meal_dinner_voucher === 1 || item.meal_dinner_cash > 0) && (
          <View style={{marginTop:10,flexDirection:'row',gap:10,flexWrap:'wrap'}}>
            {item.meal_lunch_voucher === 1 && (
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#e3f2fd',borderRadius:16,paddingVertical:4,paddingHorizontal:10,marginRight:6,marginBottom:6}}>
                <Ionicons name="fast-food" size={16} color="#1976d2" style={{marginRight:4}} />
                <Text style={{color:'#1976d2',fontWeight:'bold'}}>Pranzo</Text>
                <Text style={{color:'#1976d2',marginLeft:4}}>Voucher</Text>
                <Text style={{color:'#1976d2',marginLeft:4}}>{settings.mealAllowances?.lunch?.voucherAmount ? formatCurrency(settings.mealAllowances.lunch.voucherAmount) : ''}</Text>
              </View>
            )}
            {item.meal_lunch_cash > 0 && (
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#fff3e0',borderRadius:16,paddingVertical:4,paddingHorizontal:10,marginRight:6,marginBottom:6}}>
                <Ionicons name="cash" size={16} color="#ef6c00" style={{marginRight:4}} />
                <Text style={{color:'#ef6c00',fontWeight:'bold'}}>Pranzo</Text>
                <Text style={{color:'#ef6c00',marginLeft:4}}>Cash</Text>
                <Text style={{color:'#ef6c00',marginLeft:4}}>{formatCurrency(item.meal_lunch_cash)}</Text>
              </View>
            )}
            {item.meal_dinner_voucher === 1 && (
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#ede7f6',borderRadius:16,paddingVertical:4,paddingHorizontal:10,marginRight:6,marginBottom:6}}>
                <Ionicons name="restaurant" size={16} color="#7e57c2" style={{marginRight:4}} />
                <Text style={{color:'#7e57c2',fontWeight:'bold'}}>Cena</Text>
                <Text style={{color:'#7e57c2',marginLeft:4}}>Voucher</Text>
                <Text style={{color:'#7e57c2',marginLeft:4}}>{settings.mealAllowances?.dinner?.voucherAmount ? formatCurrency(settings.mealAllowances.dinner.voucherAmount) : ''}</Text>
              </View>
            )}
            {item.meal_dinner_cash > 0 && (
              <View style={{flexDirection:'row',alignItems:'center',backgroundColor:'#ffe0b2',borderRadius:16,paddingVertical:4,paddingHorizontal:10,marginRight:6,marginBottom:6}}>
                <Ionicons name="cash" size={16} color="#ef6c00" style={{marginRight:4}} />
                <Text style={{color:'#ef6c00',fontWeight:'bold'}}>Cena</Text>
                <Text style={{color:'#ef6c00',marginLeft:4}}>Cash</Text>
                <Text style={{color:'#ef6c00',marginLeft:4}}>{formatCurrency(item.meal_dinner_cash)}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Salvataggio reale entry su DatabaseService (SQLite)
  const saveEntry = async (entry) => {
    try {
      // Mappa i campi per compatibilità DB
      const dbEntry = {
        ...entry,
        siteName: entry.site_name || entry.siteName || '',
        vehicleDriven: entry.vehicle_driven || entry.vehicleDriven || '',
        departureCompany: entry.departure_company || entry.departureCompany || '',
        arrivalSite: entry.arrival_site || entry.arrivalSite || '',
        workStart1: entry.work_start_1 || entry.workStart1 || '',
        workEnd1: entry.work_end_1 || entry.workEnd1 || '',
        workStart2: entry.work_start_2 || entry.workStart2 || '',
        workEnd2: entry.work_end_2 || entry.workEnd2 || '',
        departureReturn: entry.departure_return || entry.departureReturn || '',
        arrivalCompany: entry.arrival_company || entry.arrivalCompany || '',
        standbyDeparture: entry.standby_departure || entry.standbyDeparture || '',
        standbyArrival: entry.standby_arrival || entry.standbyArrival || '',
        standbyWorkStart1: entry.standby_work_start_1 || entry.standbyWorkStart1 || '',
        standbyWorkEnd1: entry.standby_work_end_1 || entry.standbyWorkEnd1 || '',
        standbyWorkStart2: entry.standby_work_start_2 || entry.standbyWorkStart2 || '',
        standbyWorkEnd2: entry.standby_work_end_2 || entry.standbyWorkEnd2 || '',
        standbyReturnDeparture: entry.standby_return_departure || entry.standbyReturnDeparture || '',
        standbyReturnArrival: entry.standby_return_arrival || entry.standbyReturnArrival || '',
        interventi: entry.interventi || [], // Assicura che l'array interventi sia passato
        mealLunchVoucher: entry.meal_lunch_voucher || entry.mealLunchVoucher || 0,
        mealLunchCash: entry.meal_lunch_cash || entry.mealLunchCash || 0,
        mealDinnerVoucher: entry.meal_dinner_voucher || entry.mealDinnerVoucher || 0,
        mealDinnerCash: entry.meal_dinner_cash || entry.mealDinnerCash || 0,
        travelAllowance: entry.travelAllowance || 0,
        standbyAllowance: entry.standbyAllowance || 0,
        isStandbyDay: entry.is_standby_day || entry.isStandbyDay || 0,
        totalEarnings: entry.total_earnings || entry.totalEarnings || 0,
        notes: entry.note || entry.notes || '',
      };
      await DatabaseService.insertWorkEntry(dbEntry);
      Alert.alert('Salvataggio','Inserimento salvato su database!');
      refreshEntries();
    } catch (e) {
      Alert.alert('Errore','Errore durante il salvataggio su database.');
    }
  };

  const handleDayTypeChange = async (entry, newDayType) => {
    try {
      await DatabaseService.updateWorkEntry({ ...entry, day_type: newDayType });
      refreshEntries();
    } catch (e) {
      Alert.alert('Errore', 'Impossibile aggiornare il tipo giornata.');
    }
  };

  // Mostra sempre tutti gli hook PRIMA di ogni return condizionale!
  // Sposta il return condizionale DOPO la dichiarazione di tutti gli hook e funzioni

  let loadingContent = null;
  if (isLoading && entries.length === 0) {
    loadingContent = (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Caricamento inserimenti...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Array dei mesi in italiano (scope locale al componente)
  const mesiItaliani = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  // Funzione per determinare il nome del mese dall'entry
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
      <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1b5e20' }}>
        {section.title}
      </Text>
      <Text style={{ color: '#388e3c' }}>
        {section.data.length} inserimenti
      </Text>
    </View>
  );

  // Completamento della definizione del componente TimeEntryScreen
  // Qui sono incluse altre funzionalità come il rendering principale e la gestione degli stati
  const sections = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    
    // Raggruppamento per mese
    const entriesByMonth = {};
    entries.forEach(entry => {
      const monthYear = getMonthLabel(entry.date);
      if (!entriesByMonth[monthYear]) entriesByMonth[monthYear] = [];
      entriesByMonth[monthYear].push(entry);
    });

    // Conversione in array di sezioni per SectionList
    return Object.keys(entriesByMonth)
      .sort((a, b) => {
        const dateA = new Date(entriesByMonth[a][0].date);
        const dateB = new Date(entriesByMonth[b][0].date);
        return dateB - dateA; // Ordine decrescente (più recenti prima)
      })
      .map(month => ({
        title: month,
        data: entriesByMonth[month].sort((a, b) => new Date(b.date) - new Date(a.date))
      }));
  }, [entries]);

  // Logica per la visualizzazione del contenuto
  const content = isLoading && entries.length === 0 
    ? loadingContent 
    : (
      <SafeAreaView style={{flex: 1, backgroundColor: '#f5f5f5'}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976D2' }}>
              Inserimenti Ore
            </Text>
          </View>
        </View>

        {entries.length === 0 ? (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40}}>
            <Ionicons name="calendar-outline" size={60} color="#bdbdbd" />
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10}}>Nessun inserimento</Text>
            <Text style={{fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24}}>
              Non hai ancora inserito nessuna giornata lavorativa.
              Premi il pulsante "+" per registrare il primo inserimento.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            renderItem={renderWorkEntry}
            renderSectionHeader={renderSectionHeader}
            style={{flex: 1}}
            contentContainerStyle={{padding: 15}}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshEntries}
                colors={['#2196F3']}
              />
            }
          />
        )}

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
            margin: 15
          }}
          onPress={handleNewEntry}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 10,
            letterSpacing: 0.5
          }}>Nuovo Inserimento</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );

  return content;
};

// Stili per il componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#333',
    textAlign: 'center',
    marginTop: 8
  },
  addButton: {
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
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 0.5
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
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
  },
  entryDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entryDay: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  entryDetails: {
    flex: 1,
  },
  entrySite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  entryHours: {
    fontSize: 14,
    color: '#666',
  },
  entryEarnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  standbyBadge: {
    backgroundColor: '#9C27B0',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  standbyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  entryTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  standbyConfirmBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  // Aggiungi stili per i breakdown
  collapsedBreakdown: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8
  },
  expandedBreakdown: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8
  },
  breakdownInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  breakdownInfoLabel: {
    color: '#555',
    fontSize: 14
  },
  breakdownInfoValue: {
    fontSize: 14,
    fontWeight: '500'
  },
  breakdownCategory: {
    marginTop: 8,
    marginBottom: 4
  },
  breakdownCategoryTitle: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 14,
    marginBottom: 4
  },
  breakdownItem: {
    marginLeft: 8,
    marginBottom: 6
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  breakdownItemLabel: {
    fontSize: 13,
    color: '#333'
  },
  breakdownItemValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2e7d32'
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8
  },
  totalRowLabel: {
    fontWeight: 'bold',
    fontSize: 15
  },
  totalRowValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2e7d32'
  }
});

export default TimeEntryScreen;
