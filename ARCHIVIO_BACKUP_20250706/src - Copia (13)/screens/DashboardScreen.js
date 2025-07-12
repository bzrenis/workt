import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Fallback per LinearGradient in caso di problemi - DISABILITATO TEMPORANEAMENTE
let LinearGradient = View; // Sempre fallback per evitare crash
const useGradients = false; // Flag per disabilitare gradients temporaneamente

import { formatDate, formatCurrency } from '../utils';
import { useSettings, useCalculationService } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { PressableAnimated, FadeInCard, CardSkeleton } from '../components/AnimatedComponents';
import { calculateQuickNet } from '../services/NetEarningsCalculator';

const { width } = Dimensions.get('window');

// Helper functions (identical to TimeEntryForm)
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

// Helper functions per calcoli netto/detrazioni
const calculateNetFromGross = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return 0;
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  return RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
};

const calculateDeductions = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return 0;
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  const calculation = RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
  return calculation.totalDeductions;
};

const getDeductionPercentage = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return '0.0';
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  const calculation = RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
  return (calculation.deductionRate * 100).toFixed(1);
};

// Componenti moderni migliorati - VERSIONE SICURA SENZA GRADIENTS
const ModernCard = ({ children, style, gradient = false, colors, ...props }) => {
  const [scale] = useState(new Animated.Value(1));

  const animateCard = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.98, duration: 150, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  // Sempre usa View normale per evitare crash
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <FadeInCard style={[styles.modernCard, style]} {...props}>
        <View style={gradient ? styles.gradientCardFallback : null}>
          {children}
        </View>
      </FadeInCard>
    </Animated.View>
  );
};

// InfoBadge moderno senza gradients - VERSIONE SICURA
const InfoBadge = ({ icon, label, value, color, backgroundColor, gradient = false, colors, onPress }) => {
  const [scale] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Glow animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const handlePress = () => {
    if (onPress) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
      onPress();
    }
  };

  // Sempre usa View normale per evitare crash
  return (
    <Animated.View style={[
      { transform: [{ scale }] },
      {
        shadowOpacity: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.1, 0.3]
        })
      }
    ]}>
      <TouchableOpacity
        style={[styles.modernBadge]}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!onPress}
      >
        <View 
          style={[
            styles.badgeGradient,
            { backgroundColor: backgroundColor || '#f8f9fa' }
          ]}
        >
          <View style={styles.badgeContent}>
            <View style={[styles.badgeIconContainer, { backgroundColor: color + '20' }]}>
              <MaterialCommunityIcons 
                name={icon} 
                size={24} 
                color={color || '#666'} 
              />
            </View>
            <View style={styles.badgeText}>
              <Text style={[styles.badgeValue, { color: color || '#333' }]}>{value}</Text>
              <Text style={styles.badgeLabel}>{label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

  const QuickStat = ({ icon, label, value, color, backgroundColor, gradient, colors, onPress }) => {
    return (
      <InfoBadge
        icon={icon}
        label={label}
        value={value}
        color={color}
        backgroundColor={backgroundColor}
        gradient={gradient}
        colors={colors}
        onPress={onPress}
      />
    );
  };

// EarningsBreakdown component identico al TimeEntryScreen
const EarningsBreakdown = ({ breakdown, expanded, onToggle }) => {
  return (
    <ModernCard style={styles.breakdownCard}>
      <PressableAnimated onPress={onToggle} style={styles.breakdownHeader}>
        <View style={styles.breakdownHeaderLeft}>
          <MaterialCommunityIcons 
            name="cash-multiple" 
            size={24} 
            color="#2196F3" 
            style={styles.breakdownIcon}
          />
          <Text style={styles.breakdownTitle}>Dettaglio Guadagni</Text>
        </View>
        <View style={styles.breakdownHeaderRight}>
          <Text style={styles.breakdownTotal}>
            {formatSafeAmount(breakdown?.totalEarnings || 0)}
          </Text>
          <MaterialCommunityIcons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </View>
      </PressableAnimated>
      
      {expanded && (
        <FadeInCard style={styles.breakdownContent}>
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Lavoro Ordinario</Text>
            <Text style={styles.breakdownSectionValue}>
              {formatSafeAmount(breakdown?.ordinary?.total || 0)}
            </Text>
          </View>
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Interventi Reperibilità</Text>
            <Text style={styles.breakdownSectionValue}>
              {formatSafeAmount(breakdown?.standby?.totalEarnings || 0)}
            </Text>
          </View>
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Indennità</Text>
            <Text style={styles.breakdownSectionValue}>
              {formatSafeAmount((breakdown?.allowances?.travel || 0) + (breakdown?.allowances?.standby || 0))}
            </Text>
          </View>
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Rimborsi Pasti</Text>
            <Text style={styles.breakdownSectionValue}>
              {formatSafeAmount(breakdown?.allowances?.meal || 0)}
            </Text>
          </View>
        </FadeInCard>
      )}
    </ModernCard>
  );
};

const DetailSection = ({ title, icon, children, expanded, onToggle, totalValue, color = "#4CAF50" }) => {
  return (
    <ModernCard style={styles.detailSectionCard}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
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

const DetailRow = ({ icon, label, value, color = "#666", valueColor = "#007AFF" }) => (
  <View style={styles.detailRowContainer}>
    {icon && <MaterialCommunityIcons name={icon} size={16} color={color} style={styles.detailRowIcon} />}
    <Text style={[styles.detailRowLabel, { color }]}>{label}</Text>
    <Text style={[styles.detailRowValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const [workEntries, setWorkEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { settings } = useSettings();
  const calculationService = useCalculationService();
  
  // Stati per le sezioni espandibili
  const [expandedSections, setExpandedSections] = useState({
    hours: true,
    earnings: true,
    days: false,
    overtime: false,
    allowances: false,
    meals: false
  });
  
  // Animated values for smooth transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Funzione per inserire dati di test
  const insertTestData = async () => {
    try {
      console.log('🔄 Inserimento dati di test...');
      
      const testEntries = [
        // Gennaio 2025
        {
          date: '2025-01-15',
          site_name: 'Ufficio Principale',
          work_start_1: '08:00',
          work_end_1: '17:00',
          total_earnings: 131.29,
          notes: 'Giornata normale'
        },
        {
          date: '2025-01-16',
          site_name: 'Cliente A - Milano',
          work_start_1: '08:00',
          work_end_1: '19:00',
          meal_lunch_voucher: 1,
          travel_allowance: 32.82,
          total_earnings: 190.45,
          notes: 'Trasferta con straordinario'
        },
        {
          date: '2025-01-17',
          site_name: 'Cliente B - Torino',
          work_start_1: '09:00',
          work_end_1: '18:00',
          travel_allowance: 16.41,
          total_earnings: 147.70,
          notes: 'Installazione'
        },
        // Luglio 2025 (mese corrente)
        {
          date: '2025-07-01',
          site_name: 'Ufficio Principale',
          work_start_1: '08:00',
          work_end_1: '17:00',
          total_earnings: 131.29,
          notes: 'Primo giorno mese'
        },
        {
          date: '2025-07-02',
          site_name: 'Cliente C - Roma',
          work_start_1: '08:00',
          work_end_1: '18:00',
          meal_lunch_voucher: 1,
          travel_allowance: 16.41,
          total_earnings: 163.11,
          notes: 'Trasferta'
        },
        {
          date: '2025-07-03',
          site_name: 'Ufficio Principale',
          work_start_1: '08:30',
          work_end_1: '17:30',
          total_earnings: 131.29,
          notes: 'Lavoro normale'
        },
        {
          date: '2025-07-04',
          site_name: 'Cliente D - Venezia',
          work_start_1: '07:00',
          work_end_1: '19:00',
          meal_lunch_voucher: 1,
          travel_allowance: 49.23,
          total_earnings: 212.34,
          notes: 'Giornata lunga con trasferta'
        }
      ];

      for (const entryData of testEntries) {
        await DatabaseService.addWorkEntry(entryData);
        console.log(`✅ Inserita entry per: ${entryData.date}`);
      }
      
      console.log('✅ Tutti i dati di test inseriti con successo');
    } catch (error) {
      console.error('❌ Errore inserimento dati di test:', error);
    }
  };

  useEffect(() => {
    // Animate entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load work entries
  const loadWorkEntries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // DEBUG: Log per debugging del bug giorni lavorati
      console.log(`🔍 Dashboard loadWorkEntries - Caricamento per: ${selectedMonth + 1}/${selectedYear}`);
      
      // CLEAR PREVIOUS ENTRIES per evitare race conditions
      setWorkEntries([]);
      
      // STEP 1: Verifica totale entries nel database
      try {
        const allEntries = await DatabaseService.getAllWorkEntries();
        console.log(`🔍 Dashboard loadWorkEntries - Totale entries in DB: ${allEntries.length}`);
        
        if (allEntries.length > 0) {
          console.log('🔍 Dashboard loadWorkEntries - Prime 3 entries nel DB:');
          allEntries.slice(0, 3).forEach((entry, idx) => {
            console.log(`   ${idx + 1}. Date: ${entry.date}, Work: ${entry.workHours}h (ID: ${entry.id})`);
          });
        } else {
          console.log('⚠️  Dashboard loadWorkEntries - Database è vuoto!');
          console.log('🔄 Inserimento dati di test...');
          await insertTestData();
          console.log('✅ Dati di test inseriti');
        }
      } catch (dbError) {
        console.error('❌ Errore accesso database completo:', dbError);
      }
      
      // STEP 2: Use the correct DatabaseService method: getWorkEntries(year, month)
      // Note: DatabaseService expects 1-based month (1-12), JavaScript Date uses 0-based (0-11)
      const entries = await DatabaseService.getWorkEntries(selectedYear, selectedMonth + 1);
      
      console.log(`🔍 Dashboard loadWorkEntries - Entries per ${selectedMonth + 1}/${selectedYear}: ${entries.length}`);
      if (entries.length > 0) {
        console.log('🔍 Dashboard loadWorkEntries - Date delle entries caricate:');
        entries.forEach((entry, idx) => {
          const date = new Date(entry.date);
          console.log(`   ${idx + 1}. ${date.toDateString()} (ID: ${entry.id})`);
        });
      } else {
        console.log(`⚠️  Nessuna entry trovata per ${selectedMonth + 1}/${selectedYear}`);
        console.log('💡 Suggerimenti:');
        console.log('   - Verifica di aver inserito orari per questo mese');
        console.log('   - Controlla il formato delle date nel database');
        console.log('   - Verifica che il range di date sia corretto');
      }
      
      setWorkEntries(entries);
    } catch (error) {
      console.error('Error loading work entries:', error);
      setError('Impossibile caricare i dati');
      Alert.alert('Errore', 'Impossibile caricare i dati');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkEntries();
  }, [selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkEntries();
  };

  const retryButton = () => {
    setError(null);
    loadWorkEntries();
  };

  // Calculate monthly statistics using the same logic as TimeEntryForm
  const monthlyStats = useMemo(() => {
    const entries = workEntries; // For test compatibility
    
    // DEBUG: Log per debugging del bug giorni lavorati
    console.log(`🔍 Dashboard monthlyStats - Mese: ${selectedMonth + 1}/${selectedYear}`);
    console.log(`🔍 Dashboard monthlyStats - Entries ricevute: ${entries.length}`);
    console.log(`🔍 Dashboard monthlyStats - workEntries state:`, entries.map(e => ({ id: e.id, date: e.date })));
    
    // FILTRO SICUREZZA: Verifica che le entries appartengano al mese selezionato
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth(); // 0-based
      const entryYear = entryDate.getFullYear();
      const belongsToMonth = entryMonth === selectedMonth && entryYear === selectedYear;
      
      console.log(`🔍 Entry ${entry.id}: ${entry.date} -> mese ${entryMonth + 1}/${entryYear} vs selezionato ${selectedMonth + 1}/${selectedYear} = ${belongsToMonth}`);
      
      if (!belongsToMonth) {
        console.warn(`⚠️  Entry filtrata - Data: ${entry.date}, Mese entry: ${entryMonth + 1}/${entryYear}, Mese selezionato: ${selectedMonth + 1}/${selectedYear}`);
      }
      
      return belongsToMonth;
    });
    
    console.log(`🔍 Dashboard monthlyStats - Entries dopo filtro: ${filteredEntries.length}`);
    if (filteredEntries.length > 0) {
      console.log('🔍 Dashboard monthlyStats - Date delle entries filtrate:');
      filteredEntries.forEach((entry, idx) => {
        const date = new Date(entry.date);
        console.log(`   ${idx + 1}. ${date.toDateString()} (ID: ${entry.id})`);
      });
    }
    
    if (!settings || filteredEntries.length === 0) {
      return {
        totalDays: 0,
        dailyRateDays: 0,
        weekendDays: 0,
        holidayDays: 0,
        ordinaryTravelHours: 0,
        extraTravelHours: 0,
        ordinaryWorkHours: 0,
        extraWorkHours: 0,
        standbyWorkHours: 0,
        standbyTravelHours: 0,
        totalHours: 0,
        travelAllowanceDays: 0,
        standbyAllowanceDays: 0,
        mealVoucherDays: 0,
        mealCashDays: 0,
        totalEarnings: 0, // Lordo totale
        // 💰 NUOVI CAMPI NETTO
        grossTotalEarnings: 0, // Alias per chiarezza
        netTotalEarnings: 0, // Netto totale  
        totalDeductions: 0, // Trattenute totali
        deductionRate: 0, // Percentuale trattenute
        overtimeBreakdown: {
          day: { hours: 0, earnings: 0 },
          nightUntil22: { hours: 0, earnings: 0 },
          nightAfter22: { hours: 0, earnings: 0 },
          saturday: { hours: 0, earnings: 0 },
          sunday: { hours: 0, earnings: 0 },
          holiday: { hours: 0, earnings: 0 }
        },
        breakdownSummary: {
          ordinary: 0,
          standby: 0,
          allowances: 0,
          meals: 0
        }
      };
    }

    // Default settings (identical to TimeEntryForm)
    const defaultSettings = {
      contract: { 
        dailyRate: 109.19,
        hourlyRate: 16.41,
        overtimeRates: {
          day: 1.2,
          nightUntil22: 1.25,
          nightAfter22: 1.35,
          holiday: 1.3,
          nightHoliday: 1.5
        }
      },
      travelCompensationRate: 1.0,
      standbySettings: {
        dailyAllowance: 7.5,
        dailyIndemnity: 7.5,
        travelWithBonus: false
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 }
      }
    };

    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
    };

    let stats = {
      totalDays: 0,
      dailyRateDays: 0,
      weekendDays: 0,
      holidayDays: 0,
      ordinaryTravelHours: 0,
      extraTravelHours: 0,
      ordinaryWorkHours: 0,
      extraWorkHours: 0,
      standbyWorkHours: 0,
      standbyTravelHours: 0,
      totalHours: 0,
      travelAllowanceDays: 0,
      standbyAllowanceDays: 0,
      mealVoucherDays: 0,
      mealCashDays: 0,
      totalEarnings: 0,
      overtimeBreakdown: {
        day: { hours: 0, earnings: 0 },
        nightUntil22: { hours: 0, earnings: 0 },
        nightAfter22: { hours: 0, earnings: 0 },
        saturday: { hours: 0, earnings: 0 },
        sunday: { hours: 0, earnings: 0 },
        holiday: { hours: 0, earnings: 0 }
      },
      breakdownSummary: {
        ordinary: 0,
        standby: 0,
        allowances: 0,
        meals: 0
      }
    };

    filteredEntries.forEach(entry => {
      try {
        // Create work entry object manually (identical to TimeEntryForm)
        const workEntry = createWorkEntryFromData(entry, calculationService);
        
        // Calculate breakdown using the same service
        let breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
        
        // Fallback to safe settings if needed
        if (!breakdown && safeSettings) {
          breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        }
        
        if (!breakdown) return;

        stats.totalDays++;
        stats.totalEarnings += breakdown.totalEarnings || 0;
        
        // 💰 AGGIUNGI CALCOLI NETTO SE DISPONIBILI
        if (breakdown.netTotal) {
          stats.netTotalEarnings += breakdown.netTotal;
          stats.totalDeductions += breakdown.totalDeductions || 0;
        }
        stats.grossTotalEarnings = stats.totalEarnings; // Alias per chiarezza

        // Test compatibility mappings
        const totalWorkDays = stats.totalDays;
        const totalDailyRateDays = stats.dailyRateDays;
        const specialDays = stats.weekendDays + stats.holidayDays;
        const totalTravel = stats.ordinaryTravelHours + stats.extraTravelHours;
        const travelExtra = stats.extraTravelHours;
        const overtime = stats.overtimeBreakdown;
        const standbyTravel = stats.standbyTravelHours;
        const standbyWork = stats.standbyWorkHours;
        const totalStandby = stats.standbyWorkHours + stats.standbyTravelHours;
        const totalWorkAndTravel = stats.totalHours;
        const travelDays = stats.travelAllowanceDays;
        const standbyDays = stats.standbyAllowanceDays;
        const meals = stats.mealVoucherDays + stats.mealCashDays;

        // Aggregate ordinary hours
        if (breakdown.ordinary?.hours) {
          stats.ordinaryWorkHours += breakdown.ordinary.hours.lavoro_giornaliera || 0;
          stats.ordinaryTravelHours += breakdown.ordinary.hours.viaggio_giornaliera || 0;
          stats.extraWorkHours += breakdown.ordinary.hours.lavoro_extra || 0;
          stats.extraTravelHours += breakdown.ordinary.hours.viaggio_extra || 0;
        }

        // Check if daily rate was used
        if (breakdown.ordinary?.earnings?.giornaliera > 0) {
          stats.dailyRateDays++;
        }

        // Aggregate standby hours
        if (breakdown.standby?.workHours) {
          Object.values(breakdown.standby.workHours).forEach(h => {
            stats.standbyWorkHours += h || 0;
          });
        }
        if (breakdown.standby?.travelHours) {
          Object.values(breakdown.standby.travelHours).forEach(h => {
            stats.standbyTravelHours += h || 0;
          });
        }

        // Count weekend/holiday days
        const date = new Date(workEntry.date);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 6) { // Saturday
          stats.weekendDays++;
          if (breakdown.ordinary?.earnings?.sabato_bonus > 0) {
            stats.overtimeBreakdown.saturday.hours += 1;
            stats.overtimeBreakdown.saturday.earnings += breakdown.ordinary.earnings.sabato_bonus;
          }
        } else if (dayOfWeek === 0) { // Sunday
          stats.weekendDays++;
          if (breakdown.ordinary?.earnings?.domenica_bonus > 0) {
            stats.overtimeBreakdown.sunday.hours += 1;
            stats.overtimeBreakdown.sunday.earnings += breakdown.ordinary.earnings.domenica_bonus;
          }
        }

        // Aggregate overtime breakdown
        if (breakdown.ordinary?.earnings) {
          const earnings = breakdown.ordinary.earnings;
          
          if (earnings.straordinario_giorno > 0) {
            stats.overtimeBreakdown.day.earnings += earnings.straordinario_giorno;
          }
          if (earnings.straordinario_notte_22 > 0) {
            stats.overtimeBreakdown.nightUntil22.earnings += earnings.straordinario_notte_22;
          }
          if (earnings.straordinario_notte_dopo22 > 0) {
            stats.overtimeBreakdown.nightAfter22.earnings += earnings.straordinario_notte_dopo22;
          }
          if (earnings.festivo_bonus > 0) {
            stats.holidayDays++;
            stats.overtimeBreakdown.holiday.earnings += earnings.festivo_bonus;
          }
        }

        // Count allowance days
        if (breakdown.allowances?.travel > 0) {
          stats.travelAllowanceDays++;
        }
        if (breakdown.allowances?.standby > 0) {
          stats.standbyAllowanceDays++;
        }

        // Count meal days
        if (breakdown.allowances?.meal > 0) {
          if (entry.meal_lunch_voucher > 0 || entry.meal_dinner_voucher > 0) {
            stats.mealVoucherDays++;
          }
          if (entry.meal_lunch_cash > 0 || entry.meal_dinner_cash > 0) {
            stats.mealCashDays++;
          }
        }

        // Aggregate breakdown summary
        stats.breakdownSummary.ordinary += breakdown.ordinary?.total || 0;
        stats.breakdownSummary.standby += breakdown.standby?.totalEarnings || 0;
        stats.breakdownSummary.allowances += (breakdown.allowances?.travel || 0) + (breakdown.allowances?.standby || 0);
        stats.breakdownSummary.meals += breakdown.allowances?.meal || 0;

      } catch (error) {
        console.error('Error processing entry:', entry, error);
      }
    });

    stats.totalHours = stats.ordinaryWorkHours + stats.ordinaryTravelHours + 
                      stats.extraWorkHours + stats.extraTravelHours + 
                      stats.standbyWorkHours + stats.standbyTravelHours;

    // 💰 CALCOLO FINALE PERCENTUALE TRATTENUTE
    if (stats.totalEarnings > 0) {
      stats.deductionRate = stats.totalDeductions / stats.totalEarnings;
      
      // Se non abbiamo calcoli individuali del netto, calcoliamo qui  
      if (stats.netTotalEarnings === 0) {
        // Usa fallback diretto se netCalculator non è disponibile
        const quickNet = calculationService.netCalculator?.calculateQuickNet(stats.totalEarnings) || 
                         calculateQuickNet(stats.totalEarnings);
        
        if (quickNet && typeof quickNet.net === 'number' && !isNaN(quickNet.net)) {
          stats.netTotalEarnings = quickNet.net;
          stats.totalDeductions = quickNet.totalDeductions;
          stats.deductionRate = quickNet.deductionRate;
        } else {
          // Fallback manuale con calcolo semplificato
          console.log('⚠️ Fallback a calcolo netto semplificato');
          const estimatedDeductionRate = 0.25; // 25% stima per reddito medio
          stats.totalDeductions = stats.totalEarnings * estimatedDeductionRate;
          stats.netTotalEarnings = stats.totalEarnings - stats.totalDeductions;
          stats.deductionRate = estimatedDeductionRate;
        }
      }
    }

    return stats;
  }, [workEntries, settings, calculationService, selectedMonth, selectedYear]);

  const navigateMonth = (direction) => {
    console.log(`🔍 navigateMonth - direction: ${direction}, current: ${selectedMonth + 1}/${selectedYear}`);
    
    // CLEAR ENTRIES FIRST per evitare stale data
    setWorkEntries([]);
    setIsLoading(true);
    
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
    
    // Il useEffect si triggererà automaticamente e caricherà i nuovi dati
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Header component per navigazione mesi - VERSIONE SICURA SENZA GRADIENTS
  const MonthNavigationHeader = () => (
    <View style={styles.headerGradientFallback}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.monthTitleContainer}>
          <Text style={styles.monthTitle}>
            {monthNames[selectedMonth]}
          </Text>
          <Text style={styles.yearTitle}>
            {selectedYear}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigateMonth('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <Ionicons name="alert-circle" size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Errore</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryButton}>
              <Text style={styles.retryButtonText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (workEntries.length === 0) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <MonthNavigationHeader />
          <View style={[styles.centerContent, { flex: 1 }]}>
            <Ionicons name="calendar-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>Nessun dato</Text>
            <Text style={styles.emptyMessage}>
              Non ci sono orari per {monthNames[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TimeEntry')}
            >
              <Ionicons name="add-circle" size={24} color="white" />
              <Text style={styles.actionButtonText}>Aggiungi Orario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.backgroundGradientFallback}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
        <MonthNavigationHeader />
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >

        {/* 💰 Gross vs Net Earnings Card - Opzione D: Layout Verticale con Icone Grandi */}
        <ModernCard style={styles.salaryCard}>
          {/* Header */}
          <View style={styles.salaryHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={22} color="#1a73e8" />
            <Text style={styles.salaryTitle}>Guadagno Mensile</Text>
          </View>

          {/* Main Content - Layout Verticale */}
          <View style={styles.salaryContent}>
            
            {/* Lordo Section */}
            <View style={styles.salarySection}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="trending-up" size={26} color="#22c55e" />
              </View>
              <Text style={styles.salaryLabel}>Lordo Totale</Text>
              <Text style={styles.salaryValueGross}>{formatSafeAmount(monthlyStats.totalEarnings)}</Text>
            </View>

            {/* Arrow Down */}
            <View style={styles.salaryArrow}>
              <MaterialCommunityIcons name="arrow-down" size={18} color="#94a3b8" />
            </View>

            {/* Deduzioni Section */}
            <View style={styles.salarySection}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="trending-down" size={26} color="#ef4444" />
              </View>
              <Text style={styles.salaryLabel}>Trattenute ({getDeductionPercentage(monthlyStats.totalEarnings, settings)}%)</Text>
              <Text style={styles.salaryValueDeduction}>-{formatSafeAmount(calculateDeductions(monthlyStats.totalEarnings, settings))}</Text>
            </View>

            {/* Arrow Down */}
            <View style={styles.salaryArrow}>
              <MaterialCommunityIcons name="equal" size={18} color="#1a73e8" />
            </View>

            {/* Netto Section - Highlighted */}
            <View style={[styles.salarySection, styles.salarySectionHighlight]}>
              <View style={styles.salaryIconContainer}>
                <MaterialCommunityIcons name="wallet" size={28} color="#1a73e8" />
              </View>
              <Text style={styles.salaryLabelHighlight}>Netto in Busta</Text>
              <Text style={styles.salaryValueNet}>
                {formatSafeAmount(monthlyStats.netTotalEarnings || calculateNetFromGross(monthlyStats.totalEarnings, 
                  settings?.netCalculation || { method: 'irpef', customDeductionRate: 25 }
                ).net)}
              </Text>
              <View style={styles.salaryBadge}>
                <Text style={styles.salaryBadgeText}>FINALE</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.salaryFooter}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#64748b" />
            <Text style={styles.salaryFooterText}>
              CCNL Metalmeccanico PMI - Livello 5
            </Text>
          </View>
        </ModernCard>

        {/* Stats Summary Card - Compact Version */}
        <ModernCard 
          style={styles.statsCard} 
          gradient={false}
        >
          <View style={styles.statsContent}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{monthlyStats.totalDays}</Text>
                <Text style={styles.statLabel}>Giorni Lavorati</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatSafeHours(monthlyStats.totalHours)}</Text>
                <Text style={styles.statLabel}>Ore Totali</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {monthlyStats.totalDays > 0 ? formatSafeAmount(monthlyStats.totalEarnings / monthlyStats.totalDays) : '0,00 €'}
                </Text>
                <Text style={styles.statLabel}>Media Giornaliera</Text>
              </View>
            </View>
            <Text style={styles.statsSubtext}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
          </View>
        </ModernCard>

        {/* Quick Stats Grid - VERSIONE SICURA */}
        <View style={styles.quickStatsGrid}>
          <QuickStat
            icon="calendar-check"
            label="Giorni Totali"
            value={monthlyStats.totalDays.toString()}
            color="#4CAF50"
            backgroundColor="#E8F5E8"
          />
          <QuickStat
            icon="cash-multiple"
            label="Diaria Giornaliera"
            value={monthlyStats.dailyRateDays.toString()}
            color="#2196F3"
            backgroundColor="#E3F2FD"
          />
          <QuickStat
            icon="star"
            label="Weekend/Festivi"
            value={(monthlyStats.weekendDays + monthlyStats.holidayDays).toString()}
            color="#FF9800"
            backgroundColor="#FFF3E0"
          />
          <QuickStat
            icon="clock"
            label="Ore Totali"
            value={formatSafeHours(monthlyStats.totalHours)}
            color="#9C27B0"
            backgroundColor="#F3E5F5"
          />
        </View>

        {/* Hours Detail Section */}
        <DetailSection
          title="Dettaglio Ore"
          icon="clock-outline"
          expanded={expandedSections.hours}
          onToggle={() => toggleSection('hours')}
          totalValue={formatSafeHours(monthlyStats.totalHours)}
          color="#4CAF50"
        >
          <DetailRow
            icon="car"
            label="Ore Viaggio Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryTravelHours)}
          />
          <DetailRow
            icon="car-multiple"
            label="Ore Viaggio Extra"
            value={formatSafeHours(monthlyStats.extraTravelHours)}
          />
          <DetailRow
            icon="briefcase"
            label="Ore Lavoro Ordinarie"
            value={formatSafeHours(monthlyStats.ordinaryWorkHours)}
          />
          <DetailRow
            icon="briefcase-outline"
            label="Ore Lavoro Extra"
            value={formatSafeHours(monthlyStats.extraWorkHours)}
          />
          <DetailRow
            icon="shield-check"
            label="Ore Reperibilità Lavoro"
            value={formatSafeHours(monthlyStats.standbyWorkHours)}
            color="#FF9800"
          />
          <DetailRow
            icon="shield-car"
            label="Ore Reperibilità Viaggio"
            value={formatSafeHours(monthlyStats.standbyTravelHours)}
            color="#FF9800"
          />
        </DetailSection>

        {/* Earnings Detail Section */}
        <DetailSection
          title="Dettaglio Guadagni"
          icon="cash-multiple"
          expanded={expandedSections.earnings}
          onToggle={() => toggleSection('earnings')}
          totalValue={formatSafeAmount(monthlyStats.totalEarnings)}
          color="#2196F3"
        >
          <DetailRow
            icon="briefcase"
            label="Lavoro Ordinario"
            value={formatSafeAmount(monthlyStats.breakdownSummary.ordinary)}
            valueColor="#4CAF50"
          />
          <DetailRow
            icon="shield"
            label="Interventi Reperibilità"
            value={formatSafeAmount(monthlyStats.breakdownSummary.standby)}
            valueColor="#FF9800"
          />
          <DetailRow
            icon="gift"
            label="Indennità"
            value={formatSafeAmount(monthlyStats.breakdownSummary.allowances)}
            valueColor="#9C27B0"
          />
          <DetailRow
            icon="food"
            label="Rimborsi Pasti"
            value={formatSafeAmount(monthlyStats.breakdownSummary.meals)}
            valueColor="#795548"
          />
        </DetailSection>

        {/* Overtime Detail Section */}
        <DetailSection
          title="Maggiorazioni Straordinari"
          icon="clock-fast"
          expanded={expandedSections.overtime}
          onToggle={() => toggleSection('overtime')}
          color="#FF5722"
        >
          {monthlyStats.overtimeBreakdown.day.earnings > 0 && (
            <DetailRow
              icon="weather-sunny"
              label="Straordinario Giorno (+20%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.day.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightUntil22.earnings > 0 && (
            <DetailRow
              icon="weather-night"
              label="Notte fino 22h (+25%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightUntil22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.nightAfter22.earnings > 0 && (
            <DetailRow
              icon="sleep"
              label="Notte dopo 22h (+35%)"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.nightAfter22.earnings)}
              valueColor="#FF5722"
            />
          )}
          {monthlyStats.overtimeBreakdown.saturday.earnings > 0 && (
            <DetailRow
              icon="calendar-weekend"
              label="Bonus Sabato"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.saturday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.sunday.earnings > 0 && (
            <DetailRow
              icon="calendar-star"
              label="Bonus Domenica"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.sunday.earnings)}
              valueColor="#FF9800"
            />
          )}
          {monthlyStats.overtimeBreakdown.holiday.earnings > 0 && (
            <DetailRow
              icon="party-popper"
              label="Bonus Festivo"
              value={formatSafeAmount(monthlyStats.overtimeBreakdown.holiday.earnings)}
              valueColor="#FF9800"
            />
          )}
        </DetailSection>

        {/* Allowances Section */}
        <DetailSection
          title="Indennità"
          icon="gift-outline"
          expanded={expandedSections.allowances}
          onToggle={() => toggleSection('allowances')}
          color="#9C27B0"
        >
          <DetailRow
            icon="airplane"
            label="Giorni Indennità Trasferta"
            value={monthlyStats.travelAllowanceDays.toString()}
            valueColor="#2196F3"
          />
          <DetailRow
            icon="shield-check"
            label="Giorni Indennità Reperibilità"
            value={monthlyStats.standbyAllowanceDays.toString()}
            valueColor="#FF9800"
          />
        </DetailSection>

        {/* Meals Section */}
        <DetailSection
          title="Rimborsi Pasti"
          icon="food"
          expanded={expandedSections.meals}
          onToggle={() => toggleSection('meals')}
          totalValue={formatSafeAmount(monthlyStats.breakdownSummary.meals)}
          color="#795548"
        >
          <DetailRow
            icon="ticket"
            label="Giorni Buoni Pasto"
            value={monthlyStats.mealVoucherDays.toString()}
            valueColor="#4CAF50"
          />
          <DetailRow
            icon="cash"
            label="Giorni Rimborso Contanti"
            value={monthlyStats.mealCashDays.toString()}
            valueColor="#2196F3"
          />
          <View style={styles.mealNote}>
            <MaterialCommunityIcons name="information" size={14} color="#666" />
            <Text style={styles.mealNoteText}>
              Rimborsi non tassabili - Priorità: contanti specifici &gt; impostazioni
            </Text>
          </View>
        </DetailSection>

        {/* Quick Actions - VERSIONE SICURA */}
        <ModernCard style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Azioni Rapide</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity 
              style={[styles.quickActionWrapper, styles.primaryActionFallback]}
              onPress={() => navigation.navigate('TimeEntry')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionButton}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
                <Text style={styles.quickActionText}>Nuovo Orario</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionWrapper, styles.secondaryActionFallback]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionButton}>
                <MaterialCommunityIcons name="cog" size={24} color="white" />
                <Text style={styles.quickActionText}>Impostazioni</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ModernCard>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    flex: 1,
  },
  backgroundGradientFallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 0,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  headerGradient: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerGradientFallback: {
    backgroundColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  navButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  yearTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  
  // Modern UI Components
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  
  gradientCard: {
    borderRadius: 16,
    padding: 0,
    margin: -20,
  },
  
  gradientCardFallback: {
    borderRadius: 16,
    padding: 0,
    margin: -20,
    backgroundColor: 'transparent',
  },
  
  // Hero Card
  heroCard: {
    marginTop: 24,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    padding: 24,
  },
  heroContentFallback: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    margin: -20,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontWeight: '500',
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  
  // Quick Stats Grid
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  
  // Modern Badge
  modernBadge: {
    width: (width - 48) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  
  badgeGradient: {
    borderRadius: 16,
    padding: 16,
  },
  
  badgeContent: {
    alignItems: 'center',
  },
  
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  
  badgeText: {
    alignItems: 'center',
  },
  
  badgeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  
  badgeLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Detail Sections  
  detailSectionCard: {
    marginTop: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  sectionTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  sectionContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  
  // Detail Rows
  detailRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 32,
  },
  detailRowIcon: {
    marginRight: 8,
    width: 16,
  },
  detailRowLabel: {
    flex: 1,
    fontSize: 14,
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Meal Note
  mealNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  mealNoteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  
  // Quick Actions
  quickActionsCard: {
    marginTop: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionWrapper: {
    flex: 0.48,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Bottom spacing
  bottomSpacing: {
    height: 100, // Aumentato per fare spazio al floating button
  },
  
  // Floating Action Button
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    borderRadius: 28,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Fallback styles per azioni senza gradients
  primaryActionFallback: {
    backgroundColor: '#4CAF50',
  },
  
  secondaryActionFallback: {
    backgroundColor: '#2196F3',
  },
  

  
  // � Stili per Salary Card - Opzione D: Layout Verticale con Icone Grandi
  salaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  salaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  
  salaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  
  salaryContent: {
    alignItems: 'center',
  },
  
  salarySection: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  
  salarySectionHighlight: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  
  salaryIconContainer: {
    marginBottom: 6,
  },
  
  salaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  salaryLabelHighlight: {
    fontSize: 14,
    color: '#1a73e8',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '700',
  },
  
  salaryValueGross: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
  },
  
  salaryValueDeduction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  
  salaryValueNet: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  salaryArrow: {
    paddingVertical: 4,
  },
  
  salaryBadge: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  salaryBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  salaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  
  salaryFooterText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // 📊 Stili per Stats Summary Card
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
    marginHorizontal: 16,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default DashboardScreen;