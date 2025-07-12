import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMonthlySummary, useSettings } from '../hooks';
import { formatCurrency, formatHours, formatDate, getMonthName } from '../utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import MonthlySummary from './MonthlySummary';

const { width } = Dimensions.get('window');

// Helper functions identical to TimeEntryForm
const formatSafeAmount = (amount) => {
  if (amount === undefined || amount === null) return '0,00 €';
  return `${amount.toFixed(2).replace('.', ',')} €`;
};

const formatSafeHours = (hours) => {
  if (hours === undefined || hours === null) return '0:00';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

// Componenti moderni allineati a TimeEntryScreen
const ModernCard = ({ children, style, ...props }) => (
  <View style={[styles.modernCard, style]} {...props}>
    {children}
  </View>
);

const QuickStat = ({ icon, label, value, color, backgroundColor, onPress }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.quickStatCard, { backgroundColor: backgroundColor || '#f8f9fa' }]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <View style={styles.quickStatIcon}>
          <MaterialCommunityIcons name={icon} size={24} color={color || '#666'} />
        </View>
        <Text style={[styles.quickStatValue, { color: color || '#333' }]}>{value}</Text>
        <Text style={styles.quickStatLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DetailSection = ({ title, icon, children, expanded, onToggle, totalValue }) => {
  return (
    <ModernCard style={styles.detailSectionCard}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialCommunityIcons name={icon} size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionHeaderRight}>
          {totalValue && (
            <Text style={styles.sectionTotal}>{totalValue}</Text>
          )}
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </ModernCard>
  );
};

const DetailRow = ({ label, value, subLabel, calculation, isTotal, isHighlight }) => (
  <View style={[styles.detailRow, isTotal && styles.totalRow]}>
    <View style={styles.detailLabelContainer}>
      <Text style={[
        styles.detailLabel, 
        isTotal && styles.totalLabel,
        subLabel && styles.subDetailLabel
      ]}>
        {label}
      </Text>
      {calculation && (
        <Text style={styles.calculationText}>{calculation}</Text>
      )}
    </View>
    <Text style={[
      styles.detailValue,
      isTotal && styles.totalValue,
      isHighlight && styles.highlightValue
    ]}>
      {value}
    </Text>
  </View>
);

const EarningsCard = ({ summary }) => {
  const components = [];
  
  if (summary.regularPay > 0) {
    components.push({ label: 'Ordinario', value: summary.regularPay, color: '#2196F3' });
  }
  if (summary.overtimePay > 0) {
    components.push({ label: 'Straordinari', value: summary.overtimePay, color: '#FF9800' });
  }
  if (summary.travelPay > 0) {
    components.push({ label: 'Viaggio', value: summary.travelPay, color: '#9C27B0' });
  }
  if (summary.standbyPay > 0) {
    components.push({ label: 'Reperibilità', value: summary.standbyPay, color: '#4CAF50' });
  }
  if (summary.allowances > 0) {
    components.push({ label: 'Indennità', value: summary.allowances, color: '#607D8B' });
  }

  return (
    <View style={styles.earningsCard}>
      <View style={styles.earningsHeader}>
        <MaterialCommunityIcons name="cash-multiple" size={20} color="#4CAF50" />
        <Text style={styles.earningsTitle}>Retribuzione</Text>
      </View>
      <Text style={styles.earningsTotal}>
        {formatSafeAmount(summary.totalEarnings)}
      </Text>
      {components.length > 0 && (
        <View style={styles.earningsBreakdown}>
          {components.map((comp, index) => (
            <View key={index} style={styles.earningsComponent}>
              <View style={[styles.componentDot, { backgroundColor: comp.color }]} />
              <Text style={styles.componentLabel}>{comp.label}</Text>
              <Text style={styles.componentValue}>{formatSafeAmount(comp.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const MealBreakdownCard = ({ summary }) => {
  if (!summary.mealAllowances || summary.mealAllowances <= 0) return null;

  const voucherAmount = summary.mealVoucherAmount || 0;
  const cashAmount = summary.mealCashAmount || 0;
  const lunchCount = summary.lunchCount || 0;
  const dinnerCount = summary.dinnerCount || 0;

  return (
    <ModernCard style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <MaterialCommunityIcons name="food" size={20} color="#FF9800" />
        <Text style={styles.mealTitle}>Rimborsi Pasti</Text>
        <Text style={styles.mealTotal}>{formatSafeAmount(summary.mealAllowances)}</Text>
      </View>
      
      <View style={styles.mealBreakdown}>
        {voucherAmount > 0 && (
          <View style={styles.mealRow}>
            <MaterialCommunityIcons name="ticket" size={16} color="#4CAF50" />
            <Text style={styles.mealLabel}>Buoni Pasto</Text>
            <Text style={styles.mealValue}>{formatSafeAmount(voucherAmount)}</Text>
          </View>
        )}
        
        {cashAmount > 0 && (
          <View style={styles.mealRow}>
            <MaterialCommunityIcons name="cash" size={16} color="#2196F3" />
            <Text style={styles.mealLabel}>Contanti</Text>
            <Text style={styles.mealValue}>{formatSafeAmount(cashAmount)}</Text>
          </View>
        )}
        
        <View style={styles.mealCountRow}>
          <Text style={styles.mealCountLabel}>
            {lunchCount} pranzi • {dinnerCount} cene
          </Text>
        </View>
      </View>
      
      <View style={styles.mealNote}>
        <MaterialCommunityIcons name="information" size={14} color="#666" />
        <Text style={styles.mealNoteText}>
          Rimborsi non tassabili - Logica priorità: contanti specifici &gt; impostazioni
        </Text>
      </View>
      
      {/* Breakdown dettagliato come nel form */}
      <View style={styles.mealDetailBreakdown}>
        <Text style={styles.mealBreakdownTitle}>Dettaglio breakdown mensile:</Text>
        
        {voucherAmount > 0 && (
          <Text style={styles.mealBreakdownDetail}>
            • Buoni pasto: {formatSafeAmount(voucherAmount)} ({lunchCount + dinnerCount} pasti)
          </Text>
        )}
        
        {cashAmount > 0 && (
          <Text style={styles.mealBreakdownDetail}>
            • Rimborsi contanti: {formatSafeAmount(cashAmount)} (importi specifici)
          </Text>
        )}
        
        <Text style={styles.mealBreakdownNote}>
          Note: I rimborsi contanti hanno priorità sui valori configurati nelle impostazioni
        </Text>
      </View>
    </ModernCard>
  );
};

const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  
  // Stati per le sezioni espandibili
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    earnings: true,
    days: false,
    meals: false,
    standby: false
  });
  
  const { summary, isLoading, error, refreshSummary, canRefresh } = useMonthlySummary(selectedYear, selectedMonth);
  const { settings } = useSettings();
  const contract = settings.contract || {};

  const [standbyConfirmations, setStandbyConfirmations] = useState({});
  const [confirmedCount, setConfirmedCount] = useState(0);

  // Helper per calcolare breakdown mensile usando la stessa logica del form
  const calculateDetailedMonthlyBreakdown = (summary, settings) => {
    if (!summary || !summary.dailyBreakdown) return null;

    const monthlyBreakdown = {
      ordinary: {
        hours: {
          lavoro_giornaliera: 0,
          viaggio_giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0,
          lavoro_domenica: 0,
          lavoro_sabato: 0,
          lavoro_festivo: 0
        },
        earnings: {
          giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0,
          sabato_bonus: 0,
          domenica_bonus: 0,
          festivo_bonus: 0
        },
        total: 0
      },
      standby: {
        workHours: {
          ordinary: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        workEarnings: {
          ordinary: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelHours: {
          ordinary: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelEarnings: {
          ordinary: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        dailyIndemnity: 0,
        totalEarnings: 0
      },
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0
      },
      mealBreakdown: {
        voucherAmount: 0,
        cashAmount: 0,
        lunchCount: 0,
        dinnerCount: 0,
        cashDetails: []
      },
      totalEarnings: 0,
      details: {
        hasWeekends: false,
        hasHolidays: false,
        hasSaturdays: false,
        totalWorkAndTravelHours: 0,
        partialDays: 0
      }
    };

    // Aggregate data from daily breakdowns
    if (summary.dailyBreakdown && Array.isArray(summary.dailyBreakdown)) {
      summary.dailyBreakdown.forEach(day => {
        // Update counters for special days
        if (day.isSaturday) monthlyBreakdown.details.hasSaturdays = true;
        if (day.isSunday || day.isHoliday) monthlyBreakdown.details.hasHolidays = true;
        if (day.isWeekend) monthlyBreakdown.details.hasWeekends = true;
        
        // Aggregate meal data
        if (day.mealLunchVoucher === 1) monthlyBreakdown.mealBreakdown.lunchCount++;
        if (day.mealDinnerVoucher === 1) monthlyBreakdown.mealBreakdown.dinnerCount++;
        
        // Sum basic totals from summary
        monthlyBreakdown.totalEarnings += day.totalEarnings || 0;
      });
    }

    // Use existing summary data for main calculations
    monthlyBreakdown.ordinary.total = summary.regularPay || 0;
    monthlyBreakdown.standby.totalEarnings = summary.standbyPay || 0;
    monthlyBreakdown.allowances.travel = summary.allowances || 0;
    monthlyBreakdown.allowances.meal = summary.mealAllowances || 0;
    monthlyBreakdown.allowances.standby = summary.standbyAllowance || 0;
    
    // Meal breakdown details
    monthlyBreakdown.mealBreakdown.voucherAmount = summary.mealVoucherAmount || 0;
    monthlyBreakdown.mealBreakdown.cashAmount = summary.mealCashAmount || 0;
    monthlyBreakdown.mealBreakdown.lunchCount = summary.lunchCount || 0;
    monthlyBreakdown.mealBreakdown.dinnerCount = summary.dinnerCount || 0;

    // Set final total
    monthlyBreakdown.totalEarnings = summary.totalEarnings || 0;

    return monthlyBreakdown;
  };

  // Calcola breakdown dettagliato
  const detailedBreakdown = calculateDetailedMonthlyBreakdown(summary, settings);

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
  }, [route?.params?.refresh]);

  useFocusEffect(
    React.useCallback(() => {
      const doRefresh = async () => {
        try {
          console.log('Dashboard: Focus effect triggered, checking for refresh...');
          
          if (!canRefresh) {
            console.log('Dashboard: Cannot refresh, skipping...');
            return;
          }
          
          const shouldRefresh = await AsyncStorage.getItem('dashboard_needs_refresh');
          if (shouldRefresh === 'true') {
            console.log('Dashboard: Found refresh flag, removing it and refreshing');
            await AsyncStorage.removeItem('dashboard_needs_refresh');
            await refreshSummary(true);
          } else {
            console.log('Dashboard: No refresh flag, doing normal refresh');
            await refreshSummary();
          }
        } catch (e) {
          console.error('Dashboard: Error during focus refresh:', e);
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navigateToTimeEntry = () => {
    navigation.navigate('TimeEntry');
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Caricamento riepilogo mensile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshSummary} />
        }
      >
        {/* Header moderno con navigazione mese */}
        <View style={styles.modernHeader}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleToday} style={styles.monthSelector}>
            <Text style={styles.monthText}>
              {getMonthName(selectedMonth)} {selectedYear}
            </Text>
            <Text style={styles.monthSubtext}>
              Tocca per andare al mese corrente
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {error && (
          <ModernCard style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="warning-outline" size={24} color="#FF5722" />
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
          </ModernCard>
        )}

        {!summary ? (
          <ModernCard style={styles.noDataCard}>
            <View style={styles.noDataContent}>
              <MaterialCommunityIcons name="calendar-clock" size={48} color="#ccc" />
              <Text style={styles.noDataTitle}>Nessun dato per questo mese</Text>
              <Text style={styles.noDataText}>
                Inserisci le tue ore di lavoro per vedere il riepilogo mensile
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={navigateToTimeEntry}>
                <MaterialCommunityIcons name="plus" size={20} color="white" />
                <Text style={styles.addButtonText}>Aggiungi ore</Text>
              </TouchableOpacity>
            </View>
          </ModernCard>
        ) : (
          <>
            {/* Quick Stats Grid - sempre visibili */}
            <View style={styles.quickStatsGrid}>
              <QuickStat
                icon="clock-outline"
                label="Ore Totali"
                value={formatSafeHours(summary.totalHours)}
                color="#2196F3"
                backgroundColor="#e3f2fd"
              />
              <QuickStat
                icon="calendar-check"
                label="Giorni Lavorati"
                value={summary.regularDays.toString()}
                color="#4CAF50"
                backgroundColor="#e8f5e8"
              />
              <QuickStat
                icon="trending-up"
                label="Straordinari"
                value={formatSafeHours(summary.overtimeHours)}
                color="#FF9800"
                backgroundColor="#fff3e0"
              />
              <QuickStat
                icon="currency-eur"
                label="Totale"
                value={formatSafeAmount(summary.totalEarnings + (summary.mealAllowances || 0))}
                color="#4CAF50"
                backgroundColor="#e8f5e8"
                onPress={() => toggleSection('earnings')}
              />
            </View>

            {/* Card Retribuzione */}
            <EarningsCard summary={summary} />

            {/* Card Rimborsi Pasti */}
            <MealBreakdownCard summary={summary} />

            {/* Sezione Ore Dettagliate */}
            <DetailSection
              title="Dettaglio Ore"
              icon="clock-time-four"
              expanded={expandedSections.hours}
              onToggle={() => toggleSection('hours')}
              totalValue={formatSafeHours(summary.totalHours)}
            >
              <DetailRow
                label="Ore Lavoro"
                value={formatSafeHours(summary.workHours)}
              />
              <DetailRow
                label="Ore Viaggio"
                value={formatSafeHours(summary.travelHours)}
              />
              {summary.travelExtraHours > 0 && (
                <DetailRow
                  label="Ore Viaggio Extra"
                  value={formatSafeHours(summary.travelExtraHours)}
                  subLabel={true}
                />
              )}
              <DetailRow
                label="Ore Straordinarie"
                value={formatSafeHours(summary.overtimeHours)}
                isHighlight={summary.overtimeHours > 0}
              />
              {summary.overtimeHours > 0 && summary.overtimeDetail && (
                <>
                  <DetailRow
                    label="• Diurno (+20%)"
                    value={formatSafeHours(summary.overtimeDetail.day || 0)}
                    subLabel={true}
                  />
                  <DetailRow
                    label="• Notturno fino 22 (+25%)"
                    value={formatSafeHours(summary.overtimeDetail.nightUntil22 || 0)}
                    subLabel={true}
                  />
                  <DetailRow
                    label="• Notturno dopo 22 (+35%)"
                    value={formatSafeHours(summary.overtimeDetail.nightAfter22 || 0)}
                    subLabel={true}
                  />
                </>
              )}
              {(summary.standbyWorkHours > 0 || summary.standbyTravelHours > 0) && (
                <>
                  <DetailRow
                    label="Ore Lavoro in Reperibilità"
                    value={formatSafeHours(summary.standbyWorkHours)}
                    isHighlight={true}
                  />
                  <DetailRow
                    label="Ore Viaggio in Reperibilità"
                    value={formatSafeHours(summary.standbyTravelHours)}
                    isHighlight={true}
                  />
                </>
              )}
            </DetailSection>

            {/* Sezione Guadagni Dettagliati */}
            <DetailSection
              title="Breakdown Guadagni"
              icon="cash-multiple"
              expanded={expandedSections.earnings}
              onToggle={() => toggleSection('earnings')}
              totalValue={formatSafeAmount(detailedBreakdown?.totalEarnings || summary.totalEarnings)}
            >
              {/* Attività Ordinarie */}
              {detailedBreakdown?.ordinary?.total > 0 && (
                <>
                  <DetailRow
                    label="Attività Ordinarie"
                    value={formatSafeAmount(detailedBreakdown.ordinary.total)}
                    isHighlight={true}
                  />
                  
                  <View style={styles.subBreakdownContainer}>
                    <Text style={styles.subBreakdownTitle}>Dettaglio ore ordinarie:</Text>
                    
                    {/* Giornaliero normale */}
                    {summary.regularHours >= 8 && !detailedBreakdown.details.hasHolidays && (
                      <DetailRow
                        label="• Giornaliero (prime 8h)"
                        value={`${Math.floor(summary.regularHours / 8)} giorni`}
                        calculation={`${formatSafeAmount(settings.contract?.dailyRate || 109.19)} × ${Math.floor(summary.regularHours / 8)} giorni`}
                        subLabel={true}
                      />
                    )}
                    
                    {/* Ore sabato/domenica/festivo */}
                    {detailedBreakdown.details.hasSaturdays && (
                      <DetailRow
                        label="• Lavoro sabato (maggiorazione +25%)"
                        value="Variabile"
                        calculation="Tariffe con maggiorazione CCNL sabato"
                        subLabel={true}
                      />
                    )}
                    
                    {detailedBreakdown.details.hasHolidays && (
                      <DetailRow
                        label="• Lavoro festivo/domenica (+30%)"
                        value="Variabile"
                        calculation="Tariffe con maggiorazione CCNL festivo"
                        subLabel={true}
                      />
                    )}
                    
                    {/* Ore extra/viaggio */}
                    {summary.travelExtraHours > 0 && (
                      <DetailRow
                        label="• Viaggio extra (oltre 8h)"
                        value={formatSafeHours(summary.travelExtraHours)}
                        calculation={`${formatSafeAmount((settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0))} × ${formatSafeHours(summary.travelExtraHours)}`}
                        subLabel={true}
                      />
                    )}
                    
                    {summary.overtimeHours > 0 && (
                      <DetailRow
                        label="• Lavoro straordinario"
                        value={formatSafeHours(summary.overtimeHours)}
                        calculation="Con maggiorazioni CCNL per fasce orarie"
                        subLabel={true}
                      />
                    )}
                  </View>
                </>
              )}

              {/* Interventi Reperibilità */}
              {detailedBreakdown?.standby?.totalEarnings > 0 && (
                <>
                  <DetailRow
                    label="Interventi Reperibilità"
                    value={formatSafeAmount(detailedBreakdown.standby.totalEarnings - (detailedBreakdown.standby.dailyIndemnity || 0))}
                    isHighlight={true}
                  />
                  
                  <View style={styles.subBreakdownContainer}>
                    <Text style={styles.subBreakdownTitle}>Dettaglio interventi:</Text>
                    
                    {(summary.standbyWorkHours > 0) && (
                      <DetailRow
                        label="• Lavoro in reperibilità"
                        value={formatSafeHours(summary.standbyWorkHours)}
                        calculation="Tariffe base + maggiorazioni per fascia oraria"
                        subLabel={true}
                      />
                    )}
                    
                    {(summary.standbyTravelHours > 0) && (
                      <DetailRow
                        label="• Viaggio in reperibilità"
                        value={formatSafeHours(summary.standbyTravelHours)}
                        calculation="Tariffe viaggio + maggiorazioni per fascia oraria"
                        subLabel={true}
                      />
                    )}
                    
                    <Text style={styles.reperibilityNote}>
                      ℹ️ Gli interventi sono retribuiti come ore ordinarie con maggiorazioni per fascia oraria
                    </Text>
                  </View>
                </>
              )}

              {/* Indennità */}
              {(detailedBreakdown?.allowances?.travel > 0 || detailedBreakdown?.allowances?.standby > 0) && (
                <>
                  <DetailRow
                    label="Indennità"
                    value={formatSafeAmount((detailedBreakdown.allowances.travel || 0) + (detailedBreakdown.allowances.standby || 0))}
                    isHighlight={true}
                  />
                  
                  <View style={styles.subBreakdownContainer}>
                    {detailedBreakdown.allowances.travel > 0 && (
                      <DetailRow
                        label="• Indennità trasferta"
                        value={formatSafeAmount(detailedBreakdown.allowances.travel)}
                        calculation={summary.travelAllowanceDays > 0 ? `${summary.travelAllowanceDays} giorni con trasferta` : 'Calcolata su presenza viaggio'}
                        subLabel={true}
                      />
                    )}
                    
                    {detailedBreakdown.allowances.standby > 0 && (
                      <DetailRow
                        label="• Indennità reperibilità"
                        value={formatSafeAmount(detailedBreakdown.allowances.standby)}
                        calculation={summary.standbyDays > 0 ? `${summary.standbyDays} giorni di reperibilità` : 'Indennità giornaliera CCNL'}
                        subLabel={true}
                      />
                    )}
                  </View>
                </>
              )}

              {/* Totale con breakdown */}
              <DetailRow
                label="Totale Retribuzione Mensile"
                value={formatSafeAmount(detailedBreakdown?.totalEarnings || summary.totalEarnings)}
                calculation="Include ordinarie, reperibilità e indennità (esclusi rimborsi pasti)"
                isTotal={true}
              />
              
              {/* Note informative per giorni speciali */}
              {(detailedBreakdown?.details?.hasSaturdays || detailedBreakdown?.details?.hasHolidays) && (
                <View style={styles.ccnlNotesContainer}>
                  <Text style={styles.ccnlNotesTitle}>📋 Note CCNL Metalmeccanico:</Text>
                  
                  {detailedBreakdown.details.hasSaturdays && (
                    <Text style={styles.ccnlNote}>
                      • Sabato: Maggiorazione +25% su tutte le ore lavorate
                    </Text>
                  )}
                  
                  {detailedBreakdown.details.hasHolidays && (
                    <Text style={styles.ccnlNote}>
                      • Domenica/Festivi: Maggiorazione +30% su tutte le ore, nessuna diaria giornaliera
                    </Text>
                  )}
                  
                  <Text style={styles.ccnlNote}>
                    • Le maggiorazioni si applicano sia al lavoro che al viaggio secondo CCNL
                  </Text>
                </View>
              )}
            </DetailSection>

            {/* Sezione Giorni */}
            <DetailSection
              title="Dettaglio Giorni"
              icon="calendar-multiple"
              expanded={expandedSections.days}
              onToggle={() => toggleSection('days')}
              totalValue={`${summary.regularDays + (summary.weekendHolidayDays || 0)} giorni`}
            >
              <DetailRow
                label="Giorni Ordinari"
                value={summary.regularDays.toString()}
              />
              {summary.weekendHolidayDays > 0 && (
                <DetailRow
                  label="Sabati/Domeniche/Festivi"
                  value={summary.weekendHolidayDays.toString()}
                  calculation="Maggiorazioni: Sabato +25%, Dom/Fest +30%"
                />
              )}
              {summary.standbyDays > 0 && (
                <DetailRow
                  label="Giorni Reperibilità"
                  value={`${confirmedCount}/${summary.standbyDays}`}
                  calculation="Confermati / Totali"
                />
              )}
              {summary.travelAllowanceDays > 0 && (
                <DetailRow
                  label="Giorni Trasferta"
                  value={summary.travelAllowanceDays.toString()}
                />
              )}
            </DetailSection>

            {/* Sezione Reperibilità dettagliata - solo se presente */}
            {(summary.standbyDays > 0 || summary.standbyWorkHours > 0 || summary.standbyTravelHours > 0) && (
              <DetailSection
                title="Dettaglio Reperibilità"
                icon="phone-alert"
                expanded={expandedSections.standby}
                onToggle={() => toggleSection('standby')}
                totalValue={`${summary.standbyDays} giorni`}
              >
                <DetailRow
                  label="Giorni di Reperibilità"
                  value={`${confirmedCount}/${summary.standbyDays}`}
                  calculation="Confermati / Totali"
                />
                
                {summary.standbyAllowance > 0 && (
                  <DetailRow
                    label="Indennità Giornaliera CCNL"
                    value={formatSafeAmount(summary.standbyAllowance)}
                    calculation={`${summary.standbyDays} giorni × indennità CCNL`}
                  />
                )}
                
                {(summary.standbyWorkHours > 0 || summary.standbyTravelHours > 0) && (
                  <>
                    <DetailRow
                      label="Interventi Effettuati"
                      value=""
                      isHighlight={true}
                    />
                    
                    {summary.standbyWorkHours > 0 && (
                      <DetailRow
                        label="• Ore lavoro interventi"
                        value={formatSafeHours(summary.standbyWorkHours)}
                        calculation="Retribuite con maggiorazioni per fascia oraria"
                        subLabel={true}
                      />
                    )}
                    
                    {summary.standbyTravelHours > 0 && (
                      <DetailRow
                        label="• Ore viaggio interventi"
                        value={formatSafeHours(summary.standbyTravelHours)}
                        calculation="Retribuite con maggiorazioni per fascia oraria"
                        subLabel={true}
                      />
                    )}
                    
                    <DetailRow
                      label="Totale Retribuzione Interventi"
                      value={formatSafeAmount(summary.standbyPay)}
                      calculation="Include indennità giornaliera + ore interventi"
                      isTotal={true}
                    />
                  </>
                )}
                
                {summary.standbyDays > 0 && !(summary.standbyWorkHours > 0 || summary.standbyTravelHours > 0) && (
                  <View style={styles.standbyNoInterventions}>
                    <Text style={styles.standbyNoInterventionsText}>
                      Reperibilità senza interventi registrati
                    </Text>
                    <Text style={styles.standbyNoInterventionsSubtext}>
                      Applicata solo l'indennità giornaliera CCNL
                    </Text>
                  </View>
                )}
                
                <View style={styles.standbyInfoContainer}>
                  <MaterialCommunityIcons name="information" size={16} color="#4CAF50" />
                  <Text style={styles.standbyInfoText}>
                    Gli interventi di reperibilità sono retribuiti come ore ordinarie con maggiorazioni per fascia oraria secondo CCNL.
                  </Text>
                </View>
              </DetailSection>
            )}

            {/* Quick Actions */}
            <ModernCard style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Azioni Rapide</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity style={styles.quickActionButton} onPress={navigateToTimeEntry}>
                  <MaterialCommunityIcons name="plus-circle" size={24} color="#4CAF50" />
                  <Text style={styles.quickActionText}>Aggiungi Ore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton} onPress={navigateToSettings}>
                  <MaterialCommunityIcons name="cog" size={24} color="#2196F3" />
                  <Text style={styles.quickActionText}>Impostazioni</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton} 
                  onPress={() => navigation.navigate('MonthlySummary', { year: selectedYear, month: selectedMonth })}
                >
                  <MaterialCommunityIcons name="file-chart" size={24} color="#FF9800" />
                  <Text style={styles.quickActionText}>Report</Text>
                </TouchableOpacity>
              </View>
            </ModernCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Loading e stati
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  
  // Header moderno
  modernHeader: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
  },
  monthSelector: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  monthText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  monthSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Card moderna base
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Error e no data
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
    backgroundColor: '#fff3e0',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF5722',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  noDataCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataContent: {
    alignItems: 'center',
  },
  noDataTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Quick Stats Grid
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  quickStatCard: {
    width: (width - 32 - 8) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickStatIcon: {
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Earnings Card
  earningsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  earningsTotal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  earningsBreakdown: {
    gap: 8,
  },
  earningsComponent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  componentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  componentLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  componentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  
  // Meal Card
  mealCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  mealTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  mealBreakdown: {
    gap: 8,
    marginBottom: 12,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mealValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mealCountRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mealCountLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mealNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  mealNoteText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  mealDetailBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  mealBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  mealBreakdownDetail: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  mealBreakdownNote: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
  
  // Detail Sections
  detailSectionCard: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 8,
  },
  sectionContent: {
    marginTop: 16,
    paddingLeft: 4,
  },
  
  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  subDetailLabel: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    paddingLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  calculationText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  highlightValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  
  // Quick Actions
  quickActionsCard: {
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Sub-breakdown styles (like TimeEntryForm)
  subBreakdownContainer: {
    marginLeft: 16,
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  subBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  reperibilityNote: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  ccnlNotesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  ccnlNotesTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  ccnlNote: {
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 18,
    marginBottom: 4,
  },

  // Standby styles
  standbyNoInterventions: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  standbyNoInterventionsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  standbyNoInterventionsSubtext: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  standbyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  standbyInfoText: {
    fontSize: 11,
    color: '#2e7d32',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
});

export default DashboardScreen;
