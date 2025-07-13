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
import PDFExportService from '../services/PDFExportService';
import { useCalculationService } from '../hooks';

const { width } = Dimensions.get('window');

const PDFExportScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const calculationService = useCalculationService();
  const [loading, setLoading] = useState(false);
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
      const savedSettings = await DatabaseService.getSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Errore caricamento settings:', error);
    }
  };

  const loadWorkData = async () => {
    try {
      setLoading(true);
      
      // Carica i dati del mese selezionato
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth);
      setWorkEntries(entries);
      
      // Calcola le statistiche
      if (entries.length > 0) {
        const stats = calculateMonthlyStats(entries);
        setMonthlyStats(stats);
      } else {
        setMonthlyStats({});
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del mese selezionato');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyStats = (entries) => {
    if (!settings || !calculationService) {
      console.log('🚫 PDF Export: Settings o calculationService non disponibili');
      return {};
    }

    console.log('📊 PDF Export: Calcolo statistiche per', entries.length, 'entries');

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let travelHours = 0;
    let totalEarnings = 0;
    let regularEarnings = 0;
    let overtimeEarnings = 0;
    let travelEarnings = 0;
    let standbyEarnings = 0;
    let allowances = 0;
    let workDays = entries.length;
    let standbyDays = 0;

    entries.forEach((entry, index) => {
      try {
        console.log(`📝 PDF Export: Processando entry ${index + 1}/${entries.length} - ${entry.date}`);
        
        const breakdown = calculationService.calculateEarningsBreakdown(entry, settings);
        const workHours = calculationService.calculateWorkHours(entry) || 0;
        const travelHoursEntry = calculationService.calculateTravelHours(entry) || 0;
        
        console.log(`💼 PDF Export: Entry ${entry.date} - Work: ${workHours}h, Travel: ${travelHoursEntry}h, Earnings: €${breakdown?.totalEarnings || 0}`);
        
        if (breakdown) {
          // Calcolo ore
          totalHours += workHours + travelHoursEntry;
          regularHours += Math.min(workHours, 8); // Assumiamo max 8 ore regolari
          overtimeHours += Math.max(0, workHours - 8); // Ore eccedenti le 8
          travelHours += travelHoursEntry;
          
          // Calcolo guadagni
          if (breakdown.totalEarnings) totalEarnings += breakdown.totalEarnings;
          if (breakdown.regularEarnings) regularEarnings += breakdown.regularEarnings;
          if (breakdown.overtimeEarnings) overtimeEarnings += breakdown.overtimeEarnings;
          if (breakdown.travelEarnings) travelEarnings += breakdown.travelEarnings;
          if (breakdown.standbyEarnings) standbyEarnings += breakdown.standbyEarnings;
          if (breakdown.allowances) allowances += breakdown.allowances;
          
          if (entry.is_standby_day || entry.isStandbyDay) standbyDays++;
        } else {
          console.log(`⚠️ PDF Export: Breakdown nullo per entry ${entry.date}`);
        }
      } catch (error) {
        console.error('❌ PDF Export: Errore calcolo statistiche per entry:', entry.id, error);
      }
    });

    const stats = {
      totalHours,
      regularHours,
      overtimeHours,
      travelHours,
      totalEarnings,
      regularEarnings,
      overtimeEarnings,
      travelEarnings,
      standbyEarnings,
      allowances,
      workDays,
      standbyDays
    };
    
    console.log('📊 PDF Export: Statistiche finali:', stats);
    return stats;
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
      
      if (workEntries.length === 0) {
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
                // Trasforma i dati delle work entries per il PDF
                const formattedEntries = workEntries.map(entry => {
                  if (calculationService && settings) {
                    const breakdown = calculationService.calculateEarningsBreakdown(entry, settings);
                    const workHours = calculationService.calculateWorkHours(entry) || 0;
                    const travelHoursEntry = calculationService.calculateTravelHours(entry) || 0;
                    
                    return {
                      date: entry.date,
                      type: entry.day_type === 'festivo' || entry.dayType === 'festivo' ? 'vacation' : 'regular',
                      startTime: entry.work_start_1 || entry.workStart1 || entry.departure_company || entry.departureCompany || '-',
                      endTime: entry.work_end_2 || entry.workEnd2 || entry.work_end_1 || entry.workEnd1 || entry.arrival_company || entry.arrivalCompany || '-',
                      totalHours: workHours + travelHoursEntry,
                      regularHours: Math.min(workHours, 8),
                      overtimeHours: Math.max(0, workHours - 8),
                      travelHours: travelHoursEntry,
                      location: entry.site_name || entry.siteName || 'Non specificato',
                      workSite: entry.site_name || entry.siteName || 'Non specificato',
                      totalEarnings: breakdown?.totalEarnings || entry.total_earnings || 0
                    };
                  }
                  
                  // Fallback se calculationService non è disponibile
                  return {
                    date: entry.date,
                    type: entry.day_type === 'festivo' || entry.dayType === 'festivo' ? 'vacation' : 'regular',
                    startTime: entry.work_start_1 || entry.workStart1 || entry.departure_company || entry.departureCompany || '-',
                    endTime: entry.work_end_2 || entry.workEnd2 || entry.work_end_1 || entry.workEnd1 || entry.arrival_company || entry.arrivalCompany || '-',
                    totalHours: 0,
                    regularHours: 0,
                    overtimeHours: 0,
                    travelHours: 0,
                    location: entry.site_name || entry.siteName || 'Non specificato',
                    workSite: entry.site_name || entry.siteName || 'Non specificato',
                    totalEarnings: entry.total_earnings || 0
                  };
                });

                const result = await PDFExportService.exportMonthlyReport(
                  formattedEntries,
                  monthlyStats,
                  selectedMonth,
                  selectedYear
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.colors.statusBarStyle}
        backgroundColor={theme.colors.statusBarBackground}
      />
      
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
