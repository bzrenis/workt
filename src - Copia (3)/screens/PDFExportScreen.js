import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import PDFExportServiceNew from '../services/PDFExportServiceNew';
import { useCalculationService } from '../hooks';
import { DEFAULT_SETTINGS } from '../constants';
import { createWorkEntryFromData } from '../utils/earningsHelper';

const { width } = Dimensions.get('window');

const PDFExportScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const calculationService = useCalculationService();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [workEntries, setWorkEntries] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [settings, setSettings] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      loadWorkData();
    }
  }, [selectedMonth, selectedYear, settings]);

  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      const savedSettings = await DatabaseService.getSetting('appSettings', DEFAULT_SETTINGS);
      setSettings(savedSettings || DEFAULT_SETTINGS);
    } catch (error) {
      console.error('❌ PDF Export: Errore caricamento settings:', error);
      // Fallback ai settings di default
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Sostituisco la chiamata a calculateMonthlyStats in loadWorkData per usare formattedEntries
  const loadWorkData = async () => {
    try {
      setLoading(true);
      console.log('🔍 PDF Export: Caricamento dati per mese:', selectedMonth, 'anno:', selectedYear);
      // Carica i dati del mese selezionato
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth);
      console.log('🔍 PDF Export: Entries caricate dal DB:', entries.length);
      if (entries.length > 0) {
        console.log('🔍 PDF Export: Prima entry (esempio):', JSON.stringify(entries[0], null, 2));
      }
      setWorkEntries(entries);
      // Calcola breakdown dettagliato come la Dashboard
      let detailedEntries = [];
      if (calculationService && settings) {
        detailedEntries = entries.map(entry => {
          const workEntry = createWorkEntryFromData(entry);
          const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
          // Calcolo coerente con Dashboard/TimeEntryForm
          return {
            ...entry,
            ...workEntry,
            breakdown,
            // Ore lavoro ordinarie
            workHours: breakdown?.ordinary?.hours?.lavoro_giornaliera || 0,
            // Ore viaggio (solo viaggio, non straordinari)
            travelHours: breakdown?.ordinary?.hours?.viaggio_giornaliera || 0,
            // Ore straordinarie (solo lavoro extra)
            overtimeHours: breakdown?.ordinary?.hours?.lavoro_extra || 0,
            // Ore viaggio extra (separato)
            extraTravelHours: breakdown?.ordinary?.hours?.viaggio_extra || 0,
            // Ore notturne
            nightHours: breakdown?.standby?.workHours?.night || 0,
            // Indennità e rimborsi
            mealAllowance: breakdown?.allowances?.meal || 0,
            travelAllowance: breakdown?.allowances?.travel || 0,
            standbyAllowance: breakdown?.allowances?.standby || 0,
            overnightAllowance: breakdown?.allowances?.overnight || 0,
            // Guadagni
            regularEarnings: breakdown?.ordinary?.earnings?.giornaliera || 0,
            overtimeEarnings: breakdown?.ordinary?.earnings?.lavoro_extra || 0,
            travelEarnings: breakdown?.ordinary?.earnings?.viaggio_giornaliera || 0,
            extraTravelEarnings: breakdown?.ordinary?.earnings?.viaggio_extra || 0,
            nightEarnings: breakdown?.standby?.workEarnings?.night || 0,
            standbyEarnings: breakdown?.standby?.totalEarnings || 0,
            totalEarnings: breakdown?.totalEarnings || 0,
          };
        });
      } else {
        detailedEntries = entries;
      }
      // Calcola le statistiche mensili con breakdown dettagliato
      const stats = calculateMonthlyStats(detailedEntries);
      setMonthlyStats(stats);
      setWorkEntries(detailedEntries);
    } catch (error) {
      console.error('❌ PDF Export: Errore caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del mese selezionato');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (entries) => {
    if (!settings || !calculationService || settingsLoading) {
      console.log('🚫 PDF Export: Settings o calculationService non disponibili');
      return {};
    }

    console.log('📊 PDF Export: Calcolo statistiche per', entries.length, 'entries');
    console.log('⚙️ PDF Export: Settings loaded:', !!settings);

    try {
      // 🚀 CRITICAL FIX: Parse entries usando createWorkEntryFromData prima di passarle a calculateMonthlySummary
      const parsedEntries = entries.map(entry => createWorkEntryFromData(entry));
      console.log('📊 PDF Export: Parsed entries sample:', JSON.stringify(parsedEntries[0], null, 2));
      console.log('📊 PDF Export: Settings per calcolo:', JSON.stringify(settings, null, 2));
      
      const result = calculationService.calculateMonthlySummary(parsedEntries, settings, selectedMonth, selectedYear);
      console.log('📊 PDF Export: Monthly summary result:', JSON.stringify(result, null, 2));

      return {
        totalHours: result.totalHours || 0,
        regularHours: result.totalHours || 0, // Potresti voler calcolare solo le ore regolari
        overtimeHours: result.overtimeHours || 0,
        travelHours: result.travelHours || 0,
        totalEarnings: result.totalEarnings || 0,
        regularEarnings: result.regularPay || 0,
        overtimeEarnings: result.overtimePay || 0,
        travelEarnings: result.travelPay || 0,
        standbyEarnings: result.standbyPay || 0,
        allowances: result.allowances || 0,
        workDays: entries.length,
        regularDays: result.regularDays || 0,
        overtimeDays: result.overtimeDays || 0,
        travelDays: result.travelAllowanceDays || 0,
        standbyDays: result.standbyDays || 0
      };
    } catch (error) {
      console.error('❌ PDF Export: Errore nel calcolo delle statistiche:', error);
      return {};
    }
  };

  const formatHours = (hours) => {
    if (!hours) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return '€0,00';
    return `€${amount.toFixed(2).replace('.', ',')}`;
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 PDF Export: Inizio export PDF');
      console.log('🚀 PDF Export: WorkEntries disponibili:', workEntries.length);
      console.log('🚀 PDF Export: Settings caricate:', !!settings);
      console.log('🚀 PDF Export: CalculationService disponibile:', !!calculationService);
      
      if (workEntries.length === 0) {
        console.log('⚠️ PDF Export: Nessuna work entry disponibile');
        Alert.alert(
          'Nessun Dato',
          'Non ci sono registrazioni per il mese selezionato. Seleziona un mese diverso o aggiungi alcune registrazioni.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        '📄 Genera Report PDF',
        `Stai per generare un report PDF per ${getMonthName(selectedMonth)} ${selectedYear}.\n\nIl report includerà:\n• ${workEntries.length} registrazioni\n• ${formatHours(monthlyStats.totalHours)} ore totali\n• ${formatCurrency(monthlyStats.totalEarnings)} guadagno lordo`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Genera PDF',
            onPress: async () => {
              try {
                // Trasforma i dati delle work entries per il PDF con breakdown dettagliato
                const formattedEntries = workEntries.map(entry => {
                  if (calculationService && settings) {
                    const workEntry = createWorkEntryFromData(entry);
                    const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
                    
                    console.log('🔍 PDF DEBUG - Original entry:', JSON.stringify(entry, null, 2));
                    console.log('🔍 PDF DEBUG - Parsed workEntry:', JSON.stringify(workEntry, null, 2));
                    
                    const workHours = calculationService.calculateWorkHours(workEntry) || 0;
                    const travelHours = calculationService.calculateTravelHours(workEntry) || 0;
                    const standbyWorkHours = calculationService.calculateStandbyWorkHours(workEntry) || 0;
                    const standbyTravelHours = calculationService.calculateStandbyTravelHours(workEntry) || 0;
                    const totalStandbyHours = standbyWorkHours + standbyTravelHours;
                    
                    console.log('🔍 PDF DEBUG - Calculated hours:', {
                      workHours,
                      travelHours,
                      standbyWorkHours,
                      standbyTravelHours,
                      totalStandbyHours
                    });
                    
                    // Calcola orari di lavoro dettagliati
                    const workStart1 = workEntry.workStart1 || entry.work_start_1;
                    const workEnd1 = workEntry.workEnd1 || entry.work_end_1;
                    const workStart2 = workEntry.workStart2 || entry.work_start_2;
                    const workEnd2 = workEntry.workEnd2 || entry.work_end_2;
                    
                    let workSchedule = '';
                    if (workStart1 && workEnd1) {
                      workSchedule = `${workStart1}-${workEnd1}`;
                      if (workStart2 && workEnd2) {
                        workSchedule += ` / ${workStart2}-${workEnd2}`;
                      }
                    }
                    
                    // Calcola orari di viaggio
                    const depCompany = workEntry.departureCompany || entry.departure_company;
                    const arrCompany = workEntry.arrivalCompany || entry.arrival_company;
                    const depSite = workEntry.departureSite || entry.departure_site;
                    const arrSite = workEntry.arrivalSite || entry.arrival_site;
                    
                    let travelSchedule = '';
                    if (depCompany || depSite || arrCompany || arrSite) {
                      const depTime = depCompany || depSite || '-';
                      const arrTime = arrCompany || arrSite || '-';
                      travelSchedule = `${depTime}-${arrTime}`;
                    }
                    
                    // Determina il tipo di giornata
                    let dayTypeLabel = 'Lavoro';
                    const dayType = workEntry.dayType || entry.day_type;
                    if (dayType === 'festivo') {
                      dayTypeLabel = 'Festivo';
                    } else if (dayType === 'malattia') {
                      dayTypeLabel = 'Malattia';
                    } else if (dayType === 'ferie') {
                      dayTypeLabel = 'Ferie';
                    } else if (dayType === 'permesso') {
                      dayTypeLabel = 'Permesso';
                    }
                    
                    return {
                      // Dati base
                      ...entry,
                      date: entry.date,
                      dayType: dayTypeLabel,
                      workSchedule,
                      travelSchedule,
                      
                      // Ore calcolate
                      totalHours: (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0) + (breakdown?.ordinary?.hours?.lavoro_extra || 0) + (breakdown?.ordinary?.hours?.viaggio_extra || 0),
                      workHours: breakdown?.ordinary?.hours?.lavoro_giornaliera || 0,
                      travelHours: breakdown?.ordinary?.hours?.viaggio_giornaliera || 0,
                      standbyHours: breakdown?.standby?.workHours?.ordinary || 0,
                      standbyWorkHours: breakdown?.standby?.workHours?.ordinary || 0,
                      standbyTravelHours: breakdown?.standby?.travelHours?.ordinary || 0,
                      overtimeHours: breakdown?.ordinary?.hours?.lavoro_extra || 0,
                      extraTravelHours: breakdown?.ordinary?.hours?.viaggio_extra || 0,
                      nightHours: breakdown?.standby?.workHours?.night || 0,
                      
                      // Indennità e compensi
                      mealAllowance: breakdown?.allowances?.meal || 0,
                      travelAllowance: breakdown?.allowances?.travel || 0,
                      standbyAllowance: breakdown?.allowances?.standby || 0,
                      overnightAllowance: breakdown?.allowances?.overnight || 0,
                      
                      // Guadagni
                      regularEarnings: breakdown?.ordinary?.earnings?.giornaliera || 0,
                      overtimeEarnings: breakdown?.ordinary?.earnings?.lavoro_extra || 0,
                      nightEarnings: breakdown?.standby?.workEarnings?.night || 0,
                      travelEarnings: breakdown?.ordinary?.earnings?.viaggio_giornaliera || 0,
                      extraTravelEarnings: breakdown?.ordinary?.earnings?.viaggio_extra || 0,
                      standbyEarnings: breakdown?.standby?.totalEarnings || 0,
                      totalEarnings: breakdown?.totalEarnings || 0,
                      
                      // Informazioni lavoro
                      location: workEntry.siteName || entry.site_name || 'Non specificato',
                      siteName: workEntry.siteName || entry.site_name || 'Non specificato',
                      
                      // Breakdown completo per referenza
                      breakdown
                    };
                  }
                  
                  // Fallback se calculationService non è disponibile
                  return {
                    ...entry,
                    date: entry.date,
                    dayType: 'Lavoro',
                    workSchedule: '-',
                    travelSchedule: '-',
                    totalHours: 0,
                    workHours: 0,
                    travelHours: 0,
                    standbyHours: 0,
                    standbyWorkHours: 0,
                    standbyTravelHours: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    nightHours: 0,
                    mealAllowance: 0,
                    travelAllowance: 0,
                    standbyAllowance: 0,
                    overnightAllowance: 0,
                    regularEarnings: 0,
                    overtimeEarnings: 0,
                    nightEarnings: 0,
                    travelEarnings: 0,
                    standbyEarnings: 0,
                    totalEarnings: 0,
                    location: entry.site_name || entry.siteName || 'Non specificato',
                    siteName: entry.site_name || entry.siteName || 'Non specificato'
                  };
                });

                const result = await PDFExportServiceNew.generateAndExportPDF(
                  monthlyStats,
                  formattedEntries,
                  settings,
                  getMonthName(selectedMonth),
                  selectedYear,
                  calculationService
                );

                if (result.success) {
                  Alert.alert(
                    '✅ PDF Generato',
                    `Report esportato con successo!\n\nFile: ${result.filename}\n${result.shared ? 'PDF condiviso tramite sistema operativo.' : 'PDF salvato nel dispositivo.'}`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    '❌ Errore',
                    `Impossibile generare il PDF:\n${result.error}`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert('Errore', 'Errore durante la generazione del PDF: ' + error.message);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Errore export PDF:', error);
      Alert.alert('Errore', 'Errore durante la preparazione del PDF');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[month - 1];
  };

  const MonthSelector = () => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = [selectedYear - 1, selectedYear, selectedYear + 1];

    return (
      <View style={[styles.selectorContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.selectorTitle, { color: theme.colors.text }]}>
          Seleziona Periodo
        </Text>
        
        <View style={styles.selectorRow}>
          <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>
            Mese:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            {months.map(month => (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthButton,
                  {
                    backgroundColor: month === selectedMonth ? theme.colors.primary : theme.colors.surface,
                  }
                ]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text style={[
                  styles.monthButtonText,
                  {
                    color: month === selectedMonth ? 'white' : theme.colors.text,
                  }
                ]}>
                  {getMonthName(month).substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.selectorRow}>
          <Text style={[styles.selectorLabel, { color: theme.colors.textSecondary }]}>
            Anno:
          </Text>
          <View style={styles.yearContainer}>
            {years.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  {
                    backgroundColor: year === selectedYear ? theme.colors.primary : theme.colors.surface,
                  }
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text style={[
                  styles.yearButtonText,
                  {
                    color: year === selectedYear ? 'white' : theme.colors.text,
                  }
                ]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const StatsPreview = () => (
    <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
        📊 Anteprima Report: {getMonthName(selectedMonth)} {selectedYear}
      </Text>
      
      {workEntries.length > 0 ? (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatHours(monthlyStats.totalHours)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Ore Totali
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="currency-eur" size={24} color={theme.colors.income} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(monthlyStats.totalEarnings)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Guadagno Lordo
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {monthlyStats.workDays}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Giorni Lavorati
            </Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-fast" size={24} color={theme.colors.overtime} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatHours(monthlyStats.overtimeHours)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Straordinari
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.noDataText, { color: theme.colors.textSecondary }]}>
            Nessuna registrazione trovata per {getMonthName(selectedMonth)} {selectedYear}
          </Text>
          <Text style={[styles.noDataSubtext, { color: theme.colors.textSecondary }]}>
            Seleziona un mese diverso o aggiungi alcune registrazioni
          </Text>
        </View>
      )}
    </View>
  );

  // 🔍 DEBUG: Funzione per verificare tutti i dati disponibili
  const debugCheckAllData = async () => {
    try {
      console.log('🔍 DEBUG: Controllo tutti i dati disponibili...');
      
      // Verifica se il database è inizializzato
      await DatabaseService.ensureInitialized();
      console.log('✅ Database inizializzato');
      
      // Query per tutti i mesi disponibili
      const allEntries = await DatabaseService.getAllWorkEntries();
      console.log('📊 Totale entries nel database:', allEntries.length);
      
      if (allEntries.length > 0) {
        // Raggruppa per mese
        const entriesByMonth = {};
        allEntries.forEach(entry => {
          const monthKey = entry.date.substring(0, 7); // YYYY-MM
          if (!entriesByMonth[monthKey]) {
            entriesByMonth[monthKey] = [];
          }
          entriesByMonth[monthKey].push(entry);
        });
        
        console.log('📅 Entries per mese:');
        Object.keys(entriesByMonth).sort().forEach(month => {
          console.log(`${month}: ${entriesByMonth[month].length} entries`);
        });
        
        // Mostra esempio della prima entry
        console.log('📝 Esempio prima entry:', JSON.stringify(allEntries[0], null, 2));
        
        // Verifica il mese corrente selezionato
        const currentMonthKey = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
        const currentMonthEntries = entriesByMonth[currentMonthKey] || [];
        console.log(`🎯 Entries per mese selezionato (${currentMonthKey}):`, currentMonthEntries.length);
        
        Alert.alert(
          'Debug Database',
          `Database trovato!\n\n• Totale entries: ${allEntries.length}\n• Mesi disponibili: ${Object.keys(entriesByMonth).length}\n• Mese corrente (${currentMonthKey}): ${currentMonthEntries.length} entries\n\nDettagli nei log della console.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Nessuna entry trovata nel database');
        Alert.alert('Debug Database', 'Database vuoto - nessuna work entry trovata');
      }
      
    } catch (error) {
      console.error('❌ Errore nel debug:', error);
      Alert.alert('Errore Debug', `Errore: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.colors.statusBarStyle}
        backgroundColor={theme.colors.statusBarBackground}
      />
      
      {settingsLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Caricamento impostazioni...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.headerCard, { backgroundColor: theme.colors.card }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={theme.colors.error} />
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Export PDF Report
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Genera report PDF professionale dei tuoi orari di lavoro
            </Text>
          </View>

        {/* Selettore mese/anno */}
        <MonthSelector />

        {/* Anteprima statistiche */}
        <StatsPreview />

        {/* Pulsante di export */}
        <View style={[styles.exportContainer, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              {
                backgroundColor: workEntries.length > 0 ? theme.colors.error : theme.colors.border,
              }
            ]}
            onPress={handleExportPDF}
            disabled={loading || workEntries.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="download" size={24} color="white" />
                <Text style={styles.exportButtonText}>
                  Genera PDF Report
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.exportDescription, { color: theme.colors.textSecondary }]}>
            Il report includerà tutte le registrazioni del mese selezionato con breakdown dettagliato di ore e guadagni
          </Text>

          {/* 🔍 DEBUG: Pulsante temporaneo per verificare i dati */}
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: theme.colors.secondary }]}
            onPress={debugCheckAllData}
          >
            <MaterialCommunityIcons name="bug" size={20} color="white" />
            <Text style={styles.debugButtonText}>
              🔍 Debug Database
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="information" size={24} color={theme.colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              📋 Contenuto del Report
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              • Informazioni contratto CCNL{'\n'}
              • Riepilogo ore e guadagni{'\n'}
              • Tabella dettagliata registrazioni{'\n'}
              • Breakdown per tipologie di lavoro{'\n'}
              • Formato PDF professionale per condivisione
            </Text>
          </View>
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectorContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  selectorRow: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  monthScroll: {
    flexDirection: 'row',
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  yearContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  yearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  exportContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  exportDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default PDFExportScreen;
