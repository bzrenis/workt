import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMonthlySummary, useSettings } from '../hooks';
import { formatCurrency, formatHours, formatDate, getMonthName } from '../utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import MonthlySummary from './MonthlySummary';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  const { summary, isLoading, error, refreshSummary, canRefresh } = useMonthlySummary(selectedYear, selectedMonth);
  const { settings } = useSettings();
  const contract = settings.contract || {};
  const monthlySalary = contract.monthlySalary || 0;
  const dailyRate = monthlySalary / 26;
  const officialHourlyRate = monthlySalary / 173;
  const overtimeDay = officialHourlyRate * 1.20;
  const overtimeNightUntil22 = officialHourlyRate * 1.25;
  const overtimeNightAfter22 = officialHourlyRate * 1.35;

  const [standbyConfirmations, setStandbyConfirmations] = useState({});
  const [confirmedCount, setConfirmedCount] = useState(0);

  useEffect(() => {
    // Carica stato conferma per tutti i giorni di standby del mese
    const loadConfirmations = async () => {
      if (!summary || !summary.dailyBreakdown) return;
      let count = 0;
      const confirmations = {};
      for (const day of summary.dailyBreakdown) {
        if (day.isStandbyDay) {
          const key = `standby_confirmed_${day.date}`;
          const value = await AsyncStorage.getItem(key);
          confirmations[day.date] = value === 'true';
          if (value === 'true') count++;
        }
      }
      setStandbyConfirmations(confirmations);
      setConfirmedCount(count);
    };
    if (summary && summary.standbyDays > 0) loadConfirmations();
  }, [summary]);
  useEffect(() => {
    if (route && route.params && route.params.refresh) {
      refreshSummary();
      navigation.setParams({ refresh: false });
    }
  }, [route?.params?.refresh]);  // Refresh automatico quando la Dashboard torna in primo piano (per aggiornamenti da TimeEntry)
  useFocusEffect(
    React.useCallback(() => {
      // Refresh controllato quando la Dashboard torna in primo piano
      const doRefresh = async () => {
        try {
          console.log('Dashboard: Focus effect triggered, checking for refresh...');
          
          // Controlla se può fare refresh (prevenzione loop)
          if (!canRefresh) {
            console.log('Dashboard: Cannot refresh, skipping...');
            return;
          }
          
          // Controlla se c'è una richiesta di refresh da altre schermate
          const shouldRefresh = await AsyncStorage.getItem('dashboard_needs_refresh');
          if (shouldRefresh === 'true') {
            console.log('Dashboard: Found refresh flag, removing it and refreshing');
            await AsyncStorage.removeItem('dashboard_needs_refresh');
            await refreshSummary(true); // Force refresh
          } else {
            console.log('Dashboard: No refresh flag, doing normal refresh');
            await refreshSummary(); // Normal refresh with throttling
          }
        } catch (e) {
          console.error('Dashboard: Error during focus refresh:', e);
          // Non fare refresh se c'è stato un errore grave
        }
      };
        doRefresh();
    }, [selectedYear, selectedMonth, canRefresh])
  );

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    setSelectedYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth() + 1);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Caricamento dati...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshSummary} />
        }
      >
        {/* Header with month navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleToday} style={styles.monthSelector}>
            <Text style={styles.monthText}>
              {getMonthName(selectedMonth)} {selectedYear}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={24} color="#ff4444" />
            <Text style={styles.errorText}>
              {error.message || 'Errore nel caricamento dei dati'}
            </Text>
            {canRefresh && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => refreshSummary(true)}
              >
                <Text style={styles.retryButtonText}>Riprova</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!summary ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.noDataText}>Nessun dato per questo mese</Text>
            <Text style={styles.noDataSubtext}>Inserisci le tue ore di lavoro per vedere il riepilogo</Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Ore Totali</Text>
                <Text style={styles.cardValue}>{formatHours(summary.totalHours)}</Text>
                <Text style={styles.cardSubtext}>Lavoro + Viaggio</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Giorni Lavorati</Text>
                <Text style={styles.cardValue}>{summary.regularDays}</Text>
                <Text style={styles.cardSubtext}>Giorni ordinari</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Guadagno Totale</Text>
                <Text style={[styles.cardValue, styles.earningsValue]}>
                  {formatCurrency(summary.totalEarnings)}
                </Text>
                <Text style={styles.cardSubtext}>Retribuzione</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Straordinari</Text>
                <Text style={styles.cardValue}>{formatHours(summary.overtimeHours)}</Text>
                <Text style={styles.cardSubtext}>Ore extra</Text>
              </View>
            </View>

            {/* Detailed Days Breakdown */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Dettaglio Giorni</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giorni Ordinari</Text>
                <Text style={styles.detailValue}>{summary.regularDays}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giorni con Retribuzione Giornaliera</Text>
                <Text style={styles.detailValue}>{summary.regularDays + (summary.weekendHolidayDays || 0)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sabati/Domeniche/Festivi</Text>
                <Text style={styles.detailValue}>{summary.weekendHolidayDays || 0}</Text>
              </View>

              {summary.weekendHolidayDays > 0 && (
                <View style={[styles.detailSubRow, {marginLeft: 16, marginTop: 4}]}>
                  <Text style={[styles.detailSubLabel, {fontStyle: 'italic', color: '#1976d2'}]}>
                    • Sabato: +{((contract.overtimeRates?.saturday || 1.25) - 1) * 100}% • Domenica/Festivi: +30%
                  </Text>
                  <Text style={[styles.detailSubLabel, {fontStyle: 'italic', color: '#888', fontSize: 11, marginTop: 2}]}>
                    (Configurabile nelle impostazioni contratto)
                  </Text>
                </View>
              )}

              {summary.standbyDays > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni Reperibilità</Text>
                  <Text style={styles.detailValue}>{summary.standbyDays}</Text>
                </View>
              )}

              {summary.travelAllowanceDays > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni Trasferta</Text>
                  <Text style={styles.detailValue}>{summary.travelAllowanceDays || 0}</Text>
                </View>
              )}

              {(summary.mealVoucherDays > 0 || summary.mealCashDays > 0) && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni con Pasti</Text>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    {summary.mealVoucherDays > 0 && summary.mealCashDays > 0 ? (
                      <Text style={styles.detailValue}>
                        {Math.max(summary.mealVoucherDays, summary.mealCashDays)} giorni
                      </Text>
                    ) : (
                      <>
                        {summary.mealVoucherDays > 0 && (
                          <Text style={styles.detailValue}>
                            {summary.mealVoucherDays || 0} buoni
                          </Text>
                        )}
                        {summary.mealVoucherDays > 0 && summary.mealCashDays > 0 && (
                          <Text style={{color:'#888', marginHorizontal:4}}>+</Text>
                        )}
                        {summary.mealCashDays > 0 && (
                          <Text style={styles.detailValue}>
                            {summary.mealCashDays || 0} contanti
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Detailed Hours Breakdown */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Dettaglio Ore</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ore Lavoro</Text>
                <Text style={styles.detailValue}>{formatHours(summary.workHours)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ore Viaggio</Text>
                <Text style={styles.detailValue}>{formatHours(summary.travelHours)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ore Viaggio Extra</Text>
                <Text style={styles.detailValue}>{formatHours(summary.travelExtraHours || 0)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ore Straordinarie</Text>
                <Text style={styles.detailValue}>{formatHours(summary.overtimeHours)}</Text>
              </View>

              {summary.overtimeHours > 0 && summary.overtimeDetail && (
                <View style={[styles.detailSubRow, {marginBottom: 10}]}>
                  <Text style={styles.detailSubLabel}>• Diurno (+20%)</Text>
                  <Text style={styles.detailSubValue}>{formatHours(summary.overtimeDetail.day || 0)}</Text>
                </View>
              )}

              {summary.overtimeHours > 0 && summary.overtimeDetail && (
                <View style={styles.detailSubRow}>
                  <Text style={styles.detailSubLabel}>• Notturno fino 22 (+25%)</Text>
                  <Text style={styles.detailSubValue}>{formatHours(summary.overtimeDetail.nightUntil22 || 0)}</Text>
                </View>
              )}

              {summary.overtimeHours > 0 && summary.overtimeDetail && (
                <View style={styles.detailSubRow}>
                  <Text style={styles.detailSubLabel}>• Notturno dopo 22 (+35%)</Text>
                  <Text style={styles.detailSubValue}>{formatHours(summary.overtimeDetail.nightAfter22 || 0)}</Text>
                </View>
              )}
              
              {summary.standbyWorkHours > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ore Lavoro in Reperibilità</Text>
                  <Text style={styles.detailValue}>{formatHours(summary.standbyWorkHours)}</Text>
                </View>
              )}

              {summary.standbyTravelHours > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ore Viaggio in Reperibilità</Text>
                  <Text style={styles.detailValue}>{formatHours(summary.standbyTravelHours)}</Text>
                </View>
              )}

              {(summary.standbyWorkHours > 0 || summary.standbyTravelHours > 0) && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Totale Ore in Reperibilità</Text>
                  <Text style={styles.detailValue}>
                    {formatHours(summary.standbyWorkHours + summary.standbyTravelHours)}
                  </Text>
                </View>
              )}

              <View style={[styles.detailRow, {marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8}]}>
                <Text style={[styles.detailLabel, {fontWeight: 'bold'}]}>Ore Totali</Text>
                <Text style={[styles.detailValue, {fontWeight: 'bold'}]}>{formatHours(summary.totalHours)}</Text>
              </View>
            </View>

            {/* Earnings Breakdown */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Dettaglio Retribuzione</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Retribuzione Base</Text>
                <Text style={styles.detailValue}>{formatCurrency(summary.regularPay)}</Text>
              </View>
              
              {summary.overtimePay > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Straordinari</Text>
                  <Text style={styles.detailValue}>{formatCurrency(summary.overtimePay)}</Text>
                </View>
              )}
              
              {summary.travelPay > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Retribuzione Viaggio</Text>
                  <Text style={styles.detailValue}>{formatCurrency(summary.travelPay)}</Text>
                </View>
              )}
              
              {summary.standbyPay > 0 && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reperibilità</Text>
                    <Text style={styles.detailValue}>{formatCurrency(summary.standbyPay)}</Text>
                  </View>
                  <View style={{flexDirection:'row', flexWrap:'wrap', marginLeft:20, marginBottom:5}}>
                    <Text style={{color:'#757575', fontSize:12}}>
                      Indennità giornaliera e retribuzione per interventi in reperibilità
                    </Text>
                  </View>
                </>
              )}
              
              {summary.allowances > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Indennità</Text>
                  <Text style={styles.detailValue}>{formatCurrency(summary.allowances)}</Text>
                </View>
              )}
            </View>

            {/* Meal Allowances (separate section) - Enhanced with breakdown like TimeEntryScreen */}
            {summary.mealAllowances > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Rimborsi Pasti (non tassabili)</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Totale Rimborsi</Text>
                  <Text style={styles.detailValue}>{formatCurrency(summary.mealAllowances)}</Text>
                </View>

                {/* Breakdown dettagliato buoni vs contanti */}
                {summary.mealVoucherAmount > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>• Buoni Pasto</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(summary.mealVoucherAmount || 0)}
                    </Text>
                  </View>
                )}

                {summary.mealCashAmount > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>• Rimborsi in Contanti</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(summary.mealCashAmount || 0)}
                    </Text>
                  </View>
                )}

                {/* Dettaglio giorni e conteggi */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni con Pasti</Text>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    {summary.mealVoucherDays > 0 && (
                      <Text style={styles.detailValue}>
                        {summary.mealVoucherDays || 0} giorni buoni
                      </Text>
                    )}
                    {summary.mealVoucherDays > 0 && summary.mealCashDays > 0 && (
                      <Text style={{color:'#888', marginHorizontal:4}}>+</Text>
                    )}
                    {summary.mealCashDays > 0 && (
                      <Text style={styles.detailValue}>
                        {summary.mealCashDays || 0} giorni contanti
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Totale Pasti</Text>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Text style={styles.detailValue}>
                      {summary.lunchCount || 0} pranzi
                    </Text>
                    <Text style={{color:'#888', marginHorizontal:4}}>+</Text>
                    <Text style={styles.detailValue}>
                      {summary.dinnerCount || 0} cene
                    </Text>
                  </View>
                </View>

                {/* Nota informativa allineata al form */}
                <View style={{marginTop: 8, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4}}>
                  <Text style={{fontSize: 12, color: '#666', fontStyle: 'italic'}}>
                    💡 I rimborsi in contanti specifici hanno priorità sui valori standard delle impostazioni. 
                    La logica è identica al form di inserimento.
                  </Text>
                </View>
              </View>
            )}

            {/* Standby Days */}
            {summary.standbyDays > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Reperibilità</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni Reperibilità Confermati</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                    <View style={{width:16,height:16,borderRadius:8,backgroundColor:'#4CAF50',marginRight:2}} />
                    <Text style={[styles.detailValue,{color:'#388e3c'}]}>{confirmedCount}</Text>
                    <Text style={{color:'#888',marginHorizontal:2}}>/</Text>
                    <Text style={styles.detailValue}>{summary.standbyDays}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Giorni Reperibilità Totali</Text>
                  <Text style={styles.detailValue}>{summary.standbyDays}</Text>
                </View>
              </View>
            )}
          </>
        )}
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    padding: 10,
  },
  monthSelector: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
    marginLeft: 10,
  },
  retryButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 10,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  earningsValue: {
    color: '#4CAF50',
  },
  cardSubtext: {
    fontSize: 12,
    color: '#999',
  },
  detailsSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  detailSubLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailSubValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
});

export default DashboardScreen;
