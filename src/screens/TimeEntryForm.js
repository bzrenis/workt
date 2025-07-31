import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { useSettings, useVacationAutoCompile } from '../hooks';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import { useCalculationService } from '../hooks';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import HolidayService from '../services/HolidayService';
import NotificationService from '../services/FixedNotificationService';

const { width } = Dimensions.get('window');

// Componenti moderni per card e sezioni
const ModernCard = ({ children, style, styles }) => (
  <View style={[styles.modernCard, style]}>
    {children}
  </View>
);

const SectionHeader = ({ title, icon, iconColor, onPress, expandable = false, expanded = false, styles }) => (
  <TouchableOpacity
    style={styles.sectionHeader}
    onPress={onPress}
    activeOpacity={expandable ? 0.7 : 1}
    disabled={!expandable}
  >
    <MaterialCommunityIcons name={icon} size={20} color={iconColor || styles.iconSecondary.color} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {expandable && (
      <MaterialCommunityIcons 
        name={expanded ? 'chevron-up' : 'chevron-down'} 
        size={20} 
        color={styles.iconSecondary.color} 
      />
    )}
  </TouchableOpacity>
);

const InputRow = ({ label, children, required = false, styles }) => (
  <View style={styles.inputRow}>
    <Text style={styles.inputLabel}>
      {label}
      {required && <Text style={styles.requiredMark}> *</Text>}
    </Text>
    {children}
  </View>
);

const ModernSwitch = ({ label, value, onValueChange, description, styles }) => (
  <View style={styles.switchRow}>
    <View style={styles.switchContent}>
      <Text style={styles.switchLabel}>{label}</Text>
      {description && <Text style={styles.switchDescription}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: styles.switchTrack.backgroundColor, true: styles.switchTrackActive.backgroundColor }}
      thumbColor={value ? styles.switchThumbActive.backgroundColor : styles.switchThumb.backgroundColor}
    />
  </View>
);

const ModernButton = ({ onPress, title, variant = 'primary', icon, disabled = false, style, styles }) => {
  const buttonStyle = [
    styles.modernButton,
    variant === 'secondary' && styles.secondaryButton,
    variant === 'danger' && styles.dangerButton,
    disabled && styles.disabledButton,
    style
  ];
  
  const textStyle = [
    styles.modernButtonText,
    variant === 'secondary' && styles.secondaryButtonText,
    variant === 'danger' && styles.dangerButtonText,
    disabled && styles.disabledButtonText
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {icon && <MaterialCommunityIcons name={icon} size={20} color={textStyle[0].color} />}
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const InfoBadge = ({ label, value, color, backgroundColor, styles }) => (
  <View style={[styles.infoBadge, { backgroundColor: backgroundColor || styles.infoBadgeDefault.backgroundColor }]}>
    <Text style={[styles.infoBadgeLabel, { color: color || styles.infoBadgeDefault.color }]}>{label}</Text>
    {value && <Text style={[styles.infoBadgeValue, { color: color || styles.infoBadgeDefault.color }]}>{value}</Text>}
  </View>
);

const TimeFieldModern = ({ label, value, icon, onPress, onClear, styles }) => {
  // Stili di fallback se styles non è definito
  const fallbackStyles = {
    modernTimeField: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    timeFieldHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      justifyContent: 'center',
    },
    timeFieldLabel: {
      fontSize: 12,
      color: '#666',
      marginLeft: 6,
      flex: 1,
      textAlign: 'center',
    },
    timeFieldContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeFieldValue: {
      fontSize: 16,
      color: '#333',
      fontWeight: '500',
      textAlign: 'center',
      minWidth: 50,
    },
    clearTimeButton: {
      marginLeft: 8,
    },
  };

  const currentStyles = styles || fallbackStyles;
  
  return (
    <TouchableOpacity style={currentStyles.modernTimeField} onPress={onPress}>
      <View style={currentStyles.timeFieldHeader}>
        <MaterialCommunityIcons name={icon} size={16} color={styles?.iconSecondary?.color || '#666'} />
        <Text style={currentStyles.timeFieldLabel}>{label}</Text>
      </View>
      <View style={currentStyles.timeFieldContent}>
        <Text style={currentStyles.timeFieldValue}>{value || '--:--'}</Text>
        {value && (
          <TouchableOpacity
            style={currentStyles.clearTimeButton}
            onPress={(e) => {
              e.stopPropagation();
              onClear();
            }}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={styles?.iconError?.color || '#f44336'} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Earnings Summary Component
const EarningsSummary = ({ form, settings, isDateInStandbyCalendar, isStandbyCalendarInitialized, reperibilityManualOverride, dayType, styles }) => {
  const [breakdown, setBreakdown] = useState(null);
  const calculationService = useCalculationService();
  
  // Create a work entry object from the form for calculation
  const workEntry = useMemo(() => {
    const primaryShift = form.viaggi[0] || {};
    const additionalShifts = form.viaggi.slice(1) || []; // Turni aggiuntivi (dall'indice 1 in poi)
    
    // Log per debug viaggi
    console.log("🔥 MULTI-TURNO DEBUG - Form structure:", {
      primaryShift,
      additionalShifts,
      viaggiCount: form.viaggi.length,
      totalViaggi: form.viaggi,
      willCreateWorkEntry: {
        mainFields: `${primaryShift.work_start_1}-${primaryShift.work_end_1}`,
        additionalShiftsCount: additionalShifts.length,
        additionalShiftsDetails: additionalShifts.map((s, i) => `Turno ${i+2}: ${s.work_start_1}-${s.work_end_1}`)
      }
    });
    
    // Log per debug
    console.log("Form reperibilità:", form.reperibilita);
    
    // Controlla se è un giorno di ferie/malattia/riposo/permesso/festivo
    const isFixedDay = form.isFixedDay || dayType === 'ferie' || dayType === 'malattia' || dayType === 'riposo' || dayType === 'permesso' || dayType === 'festivo';
    
    return {
      date: (() => {
        const [d, m, y] = form.date.split('/');
        return `${y}-${m}-${d}`;
      })(),
      siteName: form.site_name || '',
      vehicleDriven: form.veicolo || '',
      // 🔥 TURNO PRINCIPALE - da form.viaggi[0]
      departureCompany: primaryShift.departure_company || '',
      arrivalSite: primaryShift.arrival_site || '',
      workStart1: primaryShift.work_start_1 || '',
      workEnd1: primaryShift.work_end_1 || '',
      workStart2: primaryShift.work_start_2 || '',
      workEnd2: primaryShift.work_end_2 || '',
      departureReturn: primaryShift.departure_return || '',
      arrivalCompany: primaryShift.arrival_company || '',
      // 🚀 TURNI AGGIUNTIVI - da form.viaggi[1+] per multi-turno ordinario
      viaggi: additionalShifts, // Solo i turni aggiuntivi (non include il primo)
      interventi: form.interventi || [],
      mealLunchVoucher: form.pasti.pranzo ? 1 : 0,
      mealLunchCash: form.mealLunchCash || 0, // Accesso corretto alla proprietà
      mealDinnerVoucher: form.pasti.cena ? 1 : 0,
      mealDinnerCash: form.mealDinnerCash || 0, // Accesso corretto alla proprietà
      travelAllowance: form.trasferta ? 1 : 0,
      travelAllowancePercent: form.trasfertaPercent || 1.0,
      trasfertaManualOverride: form.trasfertaManualOverride || false, // Nuovo flag per override manuale
      isStandbyDay: form.reperibilita ? 1 : 0, // Flag per indicare giorno di reperibilità
      standbyAllowance: form.reperibilita ? 1 : 0, // Flag per calcolare indennità di reperibilità
      completamentoGiornata: form.completamentoGiornata || 'nessuno', // Modalità di completamento giornata
      // Nuovi campi per gestione giorni fissi
      isFixedDay: isFixedDay,
      fixedEarnings: form.fixedEarnings || (isFixedDay ? (settings?.contract?.dailyRate || 109.19) : 0),
      dayType: form.dayType || dayType
    };
  }, [form, dayType]);

  // Log del workEntry creato per debug multi-turno
  useEffect(() => {
    console.log("🔥 WORKENTRY CREATED FOR TIMECALCULATOR:", {
      mainShift: `${workEntry.workStart1}-${workEntry.workEnd1} + ${workEntry.workStart2}-${workEntry.workEnd2}`,
      viaggiArray: workEntry.viaggi,
      viaggiCount: workEntry.viaggi?.length || 0,
      viaggiDetails: workEntry.viaggi?.map((v, i) => ({
        index: i,
        shift1: `${v.work_start_1}-${v.work_end_1}`,
        shift2: `${v.work_start_2}-${v.work_end_2}`,
        travel: `${v.departure_company}-${v.arrival_site} / ${v.departure_return}-${v.arrival_company}`
      })) || [],
      expectedTotalShifts: (workEntry.workStart1 ? 1 : 0) + (workEntry.workStart2 ? 1 : 0) + (workEntry.viaggi?.length || 0),
      formViaggiLength: form.viaggi?.length || 0
    });
  }, [workEntry, form.viaggi?.length]);
  
  // Calculate earnings breakdown when form changes
  useEffect(() => {
    // Assicurati che settings includa tutte le proprietà necessarie
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
      travelHoursSetting: 'MULTI_SHIFT_OPTIMIZED', // Modalità di calcolo viaggio predefinita
      standbySettings: {
        dailyAllowance: 7.5,
        dailyIndemnity: 7.5,
        travelWithBonus: false // Opzione: viaggio reperibilità con maggiorazione
      },
      mealAllowances: {
        lunch: { voucherAmount: 5.29 },
        dinner: { voucherAmount: 5.29 }
      },
      // 🔥 FORZA refresh per impostazioni giorni speciali
      specialDayTravelSettings: settings?.specialDayTravelSettings || null
    };
    
    // Merge settings (safe)
    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
      travelHoursSetting: settings?.travelHoursSetting || 'MULTI_SHIFT_OPTIMIZED', // Modalità viaggio predefinita
      // 🔥 INCLUDI esplicitamente le impostazioni giorni speciali
      specialDayTravelSettings: settings?.specialDayTravelSettings || defaultSettings.specialDayTravelSettings
    };
    
    // Se è un giorno di ferie/malattia/riposo, calcola la retribuzione fissa
    if (workEntry.isFixedDay) {
      const fixedEarnings = workEntry.fixedEarnings || safeSettings.contract.dailyRate;
      setBreakdown({
        isFixedDay: true,
        dayType: workEntry.dayType,
        fixedEarnings: fixedEarnings,
        totalEarnings: fixedEarnings,
        ordinary: { total: 0 },
        standby: null,
        allowances: { travel: 0, meal: 0, standby: 0 },
        details: {
          isPartialDay: false,
          completamentoTipo: 'nessuno'
        }
      });
    } else {
      // Usa async/await per il nuovo sistema
      const calculateAsync = async () => {
        try {
          // 🔍 DEBUG: Verifica che le impostazioni giorni speciali siano presenti
          console.log('🔍 EarningsSummary - DEBUG impostazioni:', {
            hasSettings: !!settings,
            hasSpecialDaySettings: !!settings?.specialDayTravelSettings,
            specialDaySettings: settings?.specialDayTravelSettings,
            safeSpecialSettings: safeSettings?.specialDayTravelSettings,
            workEntryDate: workEntry.date
          });
          
          const result = await calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
          setBreakdown(result);
          
          // Log dettagliato per debug breakdown
          if (workEntry.date === '2025-07-06') {
            console.log('DEBUG breakdown 06/07/2025:', JSON.stringify(result, null, 2));
          }
          
          // 🕐 Log del sistema multi-fascia se attivo
          if (result.details?.hourlyRatesBreakdown) {
            console.log('🕐 SISTEMA MULTI-FASCIA ATTIVO:', {
              method: result.details.hourlyRatesMethod,
              totalFasce: result.details.hourlyRatesBreakdown.length,
              breakdown: result.details.hourlyRatesBreakdown.map(item => ({
                fascia: item.name,
                ore: item.hours?.toFixed(2),
                tariffa: `€${item.hourlyRate?.toFixed(2)}`,
                guadagno: `€${item.earnings?.toFixed(2)}`
              }))
            });
          }
          
          // 📊 Log del sistema tariffa giornaliera se attivo
          if (result.details?.calculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS') {
            console.log('📊 SISTEMA TARIFFA GIORNALIERA ATTIVO:', {
              method: result.details.calculationMethod,
              isWeekday: result.details.dailyRateBreakdown?.isWeekday,
              dailyRate: `€${result.details.dailyRateBreakdown?.dailyRate?.toFixed(2) || 0}`,
              supplements: `€${result.details.dailyRateBreakdown?.supplements?.toFixed(2) || 0}`,
              overtime: `€${result.details.dailyRateBreakdown?.totalOvertimeEarnings?.toFixed(2) || 0}`,
              total: `€${result.details.dailyRateBreakdown?.totalEarnings?.toFixed(2) || 0}`,
              regularBreakdown: result.details.dailyRateBreakdown?.regularBreakdown?.length || 0,
              overtimeBreakdown: result.details.dailyRateBreakdown?.overtimeBreakdown?.length || 0
            });
          }
          
          // Log delle impostazioni viaggio per debug
          console.log('🚀 DEBUG MODALITÀ VIAGGIO ATTIVA:', {
            modalitaSelezionata: safeSettings.travelHoursSetting,
            descrizione: safeSettings.travelHoursSetting === 'AS_WORK' ? 'Come ore lavorative' :
                         safeSettings.travelHoursSetting === 'TRAVEL_SEPARATE' ? 'Viaggio con tariffa separata' :
                         safeSettings.travelHoursSetting === 'EXCESS_AS_TRAVEL' ? 'Eccedenza come retribuzione viaggio' :
                         safeSettings.travelHoursSetting === 'EXCESS_AS_OVERTIME' ? 'Eccedenza come straordinario' : 
                         safeSettings.travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED' ? 'Multi-turno ottimizzato (viaggi interni = lavoro)' : 'Sconosciuta',
            settingsOriginali: settings?.travelHoursSetting,
            travelCompensationRate: safeSettings.travelCompensationRate,
            workHours: calculationService.calculateWorkHours(workEntry),
            travelHours: calculationService.calculateTravelHours(workEntry)
          });
        } catch (error) {
          console.error('❌ Errore calcolo breakdown:', error);
          // Fallback per errori
          setBreakdown({
            ordinary: { total: 0 },
            standby: null,
            allowances: { travel: 0, meal: 0, standby: 0 },
            totalEarnings: 0,
            details: { error: error.message }
          });
        }
      };
      
      calculateAsync();
    }
  }, [workEntry, settings, settings?.specialDayTravelSettings]);
  
  // Debug per indennità reperibilità
  useEffect(() => {
    if (breakdown && form.reperibilita) {
      console.log('Debug reperibilità:', {
        isStandbyDay: workEntry.isStandbyDay,
        standbyAllowance: workEntry.standbyAllowance,
        breakdownAllowances: breakdown?.allowances,
        standbyInBreakdown: breakdown?.allowances?.standby || 0
      });
    }
  }, [breakdown, form.reperibilita]);
  
  // La verifica del calendario viene ora gestita nel componente principale TimeEntryForm
  useEffect(() => {
    try {
      console.log('EarningsSummary - Verifico lo stato della reperibilità');
      
      // Log di debug
      if (form.reperibilita) {
        console.log('Reperibilità attivata manualmente nel form');
      } else if (isDateInStandbyCalendar) {
        console.log('Data presente nel calendario reperibilità');
      } else {
        console.log('Reperibilità non attiva per questa giornata');
      }
    } catch (error) {
      console.error('Errore nella verifica del calendario reperibilità (EarningsSummary):', error);
    }
  }, [form.reperibilita, isDateInStandbyCalendar]);
  
  // Helper function to safely format hours
  const formatSafeHours = (hours) => {
    if (hours === undefined || hours === null) return '0:00';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  };
  
  // Helper function to safely format currency
  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };
  
  // Helper to render meal breakdown with both voucher and cash amounts if applicable
  const renderMealBreakdown = (isActive, cashAmountFromForm, voucherAmountFromSettings, cashAmountFromSettings) => {
    if (!isActive) return "Non attivo";
    
    // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
    // ignorando i valori configurati nelle impostazioni
    if (cashAmountFromForm > 0) {
      return `${formatSafeAmount(cashAmountFromForm)} (contanti - valore specifico)`;
    }
    
    // Altrimenti usa i valori dalle impostazioni (standard)
    const voucher = parseFloat(voucherAmountFromSettings) || 0;
    const cash = parseFloat(cashAmountFromSettings) || 0;
    
    if (voucher > 0 && cash > 0) {
      return `${formatSafeAmount(voucher)} (buono) + ${formatSafeAmount(cash)} (contanti)`;
    } else if (voucher > 0) {
      return `${formatSafeAmount(voucher)} (buono)`;
    } else if (cash > 0) {
      return `${formatSafeAmount(cash)} (contanti)`;
    } else {
      return "Valore non impostato";
    }
  };
  
  // Helper to show rate calculations
  const formatRateCalc = (hours, rate, total) => {
    if (hours <= 0) return "0,00 €";
    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(hours)} = ${total.toFixed(2).replace('.', ',')} €`;
  };

  // Helper to show bonus label
  const bonusLabel = (isSaturday, isSunday, isHoliday) => {
    if (isHoliday) return ' (Festivo)';
    if (isSunday) return ' (Domenica)';
    if (isSaturday) return ' (Sabato)';
    return '';
  };
  
  // Return loading state if breakdown is not ready
  if (!breakdown) return (
    <ModernCard styles={styles}>
      <SectionHeader 
        title="Riepilogo Guadagni" 
        icon="cash-multiple" 
        iconColor={styles.infoText.color} 
        styles={styles}
      />
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="calculator" size={32} color={styles.iconSecondary.color} />
        <Text style={styles.loadingText}>Calcolo in corso...</Text>
      </View>
    </ModernCard>
  );
  
  // Check if we have any ordinary hours data or standby hours
  const hasOrdinaryHours = breakdown?.ordinary?.hours && 
    (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || 
     breakdown?.ordinary?.hours?.viaggio_giornaliera > 0 || 
     breakdown?.ordinary?.hours?.lavoro_extra > 0 || 
     breakdown?.ordinary?.hours?.viaggio_extra > 0);
     
  const hasStandbyHours = breakdown?.standby && 
    (Object.values(breakdown?.standby?.workHours || {}).some(h => h > 0) || 
     Object.values(breakdown?.standby?.travelHours || {}).some(h => h > 0));
     
  const hasAllowances = breakdown?.allowances && 
    (breakdown?.allowances?.travel > 0 || 
     breakdown?.allowances?.meal > 0 || 
     breakdown?.allowances?.standby > 0);
  
  return (
    <ModernCard style={styles.cardSpacing} styles={styles}>
      <SectionHeader 
        title="Riepilogo Guadagni" 
        icon="cash-multiple" 
        iconColor={styles.infoText.color} 
        styles={styles}
      />
      
      {/* Sezione speciale per giorni di ferie/malattia/riposo */}
      {breakdown?.isFixedDay && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <TypeIcon type={breakdown?.dayType} size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>
              {breakdown?.dayType === 'ferie' ? 'Giornata di Ferie' :
               breakdown?.dayType === 'malattia' ? 'Giornata di Malattia' :
               breakdown?.dayType === 'permesso' ? 'Giornata di Permesso' :
               breakdown?.dayType === 'riposo' ? 'Riposo Compensativo' :
               breakdown?.dayType === 'festivo' ? 'Giorno Festivo' :
               'Giornata Non Lavorativa'}
            </Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Retribuzione CCNL</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown?.fixedEarnings)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              Retribuzione giornaliera secondo contratto CCNL Metalmeccanico PMI Level 5
            </Text>
            <Text style={styles.breakdownDetail}>
              ✅ La retribuzione per {breakdown?.dayType === 'ferie' ? 'ferie' : 
                                      breakdown?.dayType === 'malattia' ? 'malattia' : 
                                      breakdown?.dayType === 'permesso' ? 'permesso' :
                                      breakdown?.dayType === 'festivo' ? 'giorni festivi' :
                                      'riposo compensativo'} è fissa e non dipende dalle ore inserite
            </Text>
          </View>
          
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.breakdownLabel}>Totale giornata</Text>
            <Text style={styles.breakdownTotal}>{formatSafeAmount(breakdown?.fixedEarnings)}</Text>
          </View>
        </View>
      )}
      
      {!breakdown?.isFixedDay && hasOrdinaryHours && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="briefcase-clock" size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>Attività Ordinarie</Text>
          </View>

          {/* 🕐 NUOVO: Breakdown fasce orarie se sistema PURE_HOURLY_WITH_MULTIPLIERS attivo */}
          {breakdown?.details?.hourlyRatesBreakdown && breakdown?.details?.hourlyRatesBreakdown.length > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>
                  🕐 Sistema Multi-Fascia Attivo
                </Text>
                <Text style={styles.breakdownValue}>
                  {breakdown?.details?.hourlyRatesMethod === 'hourly_rates_service' ? 'CCNL' : 'Legacy'}
                </Text>
              </View>
              <Text style={styles.breakdownDetail}>
                Calcolo automatico basato su fasce orarie personalizzate secondo CCNL
              </Text>

              {/* Prime 8 ore cronologiche per sistema multi-fascia */}
              <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8, backgroundColor: '#f8f9fa', padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Prime 8 ore cronologiche</Text>
                  <Text style={[styles.breakdownValue, { color: '#1976d2' }]}>
                    {formatSafeHours(Math.min(8, (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0)))}
                  </Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Usa sempre il fallback semplice per chiarezza
                    let details = [];
                    if (breakdown.ordinary?.hours?.lavoro_giornaliera > 0) {
                      details.push(`Lavoro ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`);
                    }
                    if (breakdown.ordinary?.hours?.viaggio_giornaliera > 0) {
                      details.push(`Viaggio ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`);
                    }
                    return details.length > 0 ? details.join(' + ') : 'Prime 8 ore lavorative';
                  })()}
                </Text>
              </View>
              
              {/* Dettaglio fasce orarie */}
              {breakdown.details.hourlyRatesBreakdown.map((fascia, index) => (
                <View key={index} style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8 }]}>
                  <View style={styles.breakdownRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View 
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: fascia.color || '#2196F3',
                          marginRight: 8
                        }}
                      />
                      <Text style={styles.breakdownLabel}>
                        {fascia.name} {fascia.periodLabel ? `(${fascia.periodLabel})` : ''}
                      </Text>
                    </View>
                    <Text style={styles.breakdownValue}>
                      {formatSafeHours(fascia.hours)}
                    </Text>
                  </View>
                  <Text style={styles.breakdownDetail}>
                    €{fascia.hourlyRate?.toFixed(2).replace('.', ',')} x {formatSafeHours(fascia.hours)} = €{fascia.earnings?.toFixed(2).replace('.', ',')}
                    {fascia.rate !== 1.0 && ` (${Math.round((fascia.rate - 1) * 100)}% maggiorazione)`}
                  </Text>
                </View>
              ))}
              
              <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
                <Text style={styles.breakdownLabel}>Totale Multi-Fascia</Text>
                <Text style={styles.breakdownTotal}>
                  {formatSafeAmount(breakdown?.ordinary?.total || 0)}
                </Text>
              </View>
            </View>
          )}

          {/* 📊 NUOVO: Breakdown tariffa giornaliera se metodo DAILY_RATE_WITH_SUPPLEMENTS attivo */}
          {breakdown?.details?.calculationMethod === 'DAILY_RATE_WITH_SUPPLEMENTS' && breakdown?.details?.dailyRateBreakdown && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>
                  📊 Tariffa Giornaliera + Maggiorazioni CCNL
                </Text>
                <Text style={styles.breakdownValue}>
                  {breakdown.details.dailyRateBreakdown.isWeekday ? 'Feriale' : 'Festivo'}
                </Text>
              </View>
              <Text style={styles.breakdownDetail}>
                {breakdown.details.dailyRateBreakdown.isWeekday ? 
                  'Conforme CCNL: tariffa giornaliera + supplementi per fasce nelle prime 8h' :
                  'Giorni festivi: calcolo orario con maggiorazioni speciali'
                }
              </Text>
              
              {/* Solo per giorni feriali: tariffa giornaliera base */}
              {breakdown.details.dailyRateBreakdown.isWeekday && breakdown.details.dailyRateBreakdown.dailyRate > 0 && (
                <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8 }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tariffa Giornaliera Base (prime 8h)</Text>
                    <Text style={styles.breakdownValue}>
                      €{breakdown.details.dailyRateBreakdown.dailyRate.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <Text style={styles.breakdownDetail}>
                    {(() => {
                      // Usa sempre il fallback semplice per chiarezza
                      let details = [];
                      if (breakdown.ordinary?.hours?.lavoro_giornaliera > 0) {
                        details.push(`Lavoro ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`);
                      }
                      if (breakdown.ordinary?.hours?.viaggio_giornaliera > 0) {
                        details.push(`Viaggio ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`);
                      }
                      return details.length > 0 ? details.join(' + ') : 'Prime 8 ore lavorative';
                    })()}
                  </Text>
                </View>
              )}
              
              {/* Supplementi per fasce diverse nelle prime 8h */}
              {breakdown.details.dailyRateBreakdown.regularBreakdown && 
               breakdown.details.dailyRateBreakdown.regularBreakdown.length > 0 && 
               breakdown.details.dailyRateBreakdown.supplements > 0 && (
                <>
                  <Text style={[styles.breakdownLabel, { marginTop: 12, marginLeft: 10, fontWeight: 'bold' }]}>
                    Supplementi Prime 8 Ore per Fascia:
                  </Text>
                  {breakdown.details.dailyRateBreakdown.regularBreakdown.map((regular, index) => (
                    <View key={index} style={[styles.breakdownItem, { marginLeft: 20, marginTop: 8 }]}>
                      <View style={styles.breakdownRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View 
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: regular.period && regular.period.includes('Notturno') ? '#9C27B0' : 
                                             regular.period && regular.period.includes('Serale') ? '#FF9800' : '#4CAF50',
                              marginRight: 8
                            }}
                          />
                          <Text style={styles.breakdownLabel}>
                            {regular.timeRange || regular.period || 'Periodo di lavoro'}
                          </Text>
                        </View>
                        <Text style={styles.breakdownValue}>
                          {formatSafeHours(regular.totalHours || regular.hours)}
                        </Text>
                      </View>
                      
                      {/* Nuova struttura: mostra sub-breakdown se presente */}
                      {regular.breakdown && regular.breakdown.length > 0 ? (
                        <View style={{ marginTop: 4 }}>
                          {regular.breakdown.map((subItem, subIndex) => (
                            <Text key={subIndex} style={[styles.breakdownDetail, { fontSize: 11, marginLeft: 20, marginTop: 2 }]}>
                              {subItem.type}: {formatSafeHours(subItem.hours)} {subItem.rate > 0 ? 
                                `(+${Math.round(subItem.rate * 100)}%) = €${subItem.amount.toFixed(2).replace('.', ',')}` :
                                '(nessun supplemento)'
                              }
                            </Text>
                          ))}
                        </View>
                      ) : (
                        /* Struttura legacy */
                        <Text style={styles.breakdownDetail}>
                          {regular.timeRange || regular.period} • {regular.supplementAmount > 0 ? 
                            `Supplemento: €${regular.supplementAmount.toFixed(2).replace('.', ',')} (+${Math.round(regular.supplement * 100)}%)` :
                            'Nessun supplemento (fascia diurna)'
                          }
                        </Text>
                      )}
                    </View>
                  ))}
                  
                  {/* Totale supplementi se presenti */}
                  {breakdown.details.dailyRateBreakdown.supplements > 0 && (
                    <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8, backgroundColor: '#f0f8ff', padding: 8, borderRadius: 4 }]}>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Supplementi Prime 8h</Text>
                        <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: '#1976d2' }]}>
                          +€{breakdown.details.dailyRateBreakdown.supplements.toFixed(2).replace('.', ',')}
                        </Text>
                      </View>
                      <Text style={styles.breakdownDetail}>
                        Supplementi aggiuntivi alle prime 8 ore lavorative
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {/* Breakdown dettagliato straordinari per fascia oraria */}
              {breakdown.details.dailyRateBreakdown.overtimeBreakdown && 
               breakdown.details.dailyRateBreakdown.overtimeBreakdown.length > 0 && 
               breakdown.details.dailyRateBreakdown.overtimeHours > 0 && (
                <>
                  <Text style={[styles.breakdownLabel, { marginTop: 12, marginLeft: 10, fontWeight: 'bold' }]}>Straordinari (oltre 8h) per Fascia:</Text>
                  {breakdown.details.dailyRateBreakdown.overtimeBreakdown.map((overtime, index) => (
                    <View key={index} style={[styles.breakdownItem, { marginLeft: 20, marginTop: 8 }]}> 
                      <View style={styles.breakdownRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View 
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: overtime.period && overtime.period.includes('Notturno') ? '#9C27B0' : 
                                             overtime.period && overtime.period.includes('Serale') ? '#FF9800' : '#4CAF50',
                              marginRight: 8
                            }}
                          />
                          <Text style={styles.breakdownLabel}>
                            {overtime.timeRange || overtime.period || 'Periodo straordinario'}
                          </Text>
                        </View>
                        <Text style={styles.breakdownValue}>
                          {(() => {
                            console.log('🚀 DEBUG OVERTIME PERIOD - overtime object:', overtime);
                            console.log('🚀 DEBUG OVERTIME PERIOD - overtime.hours:', overtime.hours);
                            const totalHours = overtime.breakdown 
                              ? overtime.breakdown.reduce((sum, item) => sum + (item.hours || 0), 0)
                              : overtime.hours;
                            console.log('🚀 DEBUG OVERTIME PERIOD - calculated total:', totalHours);
                            return formatSafeHours(totalHours);
                          })()}
                        </Text>
                      </View>
                      {/* Breakdown per fascia */}
                      {overtime.breakdown && overtime.breakdown.length > 0 ? (
                        overtime.breakdown.map((sub, subIdx) => (
                          <Text key={subIdx} style={[styles.breakdownDetail, { fontSize: 11, marginLeft: 20, marginTop: 2 }]}> 
                            {sub.type}: {formatSafeHours(sub.hours)} {sub.percent ? `${sub.percent}` : '--'}
                            {sub.details && (sub.details.basePercent || sub.details.eveningPercent || sub.details.nightPercent) ?
                              ` = ${sub.percent} (${[sub.details.basePercent, sub.details.eveningPercent, sub.details.nightPercent].filter(Boolean).join(' + ')})` :
                              ` = ${sub.percent}`
                            }
                            {Number.isFinite(sub.amount) ? ` = €${sub.amount.toFixed(2).replace('.', ',')}` : ' = 0,00 €'}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.breakdownDetail}>
                          {overtime.timeRange} • €{Number.isFinite(overtime.hourlyRate) ? overtime.hourlyRate.toFixed(2).replace('.', ',') : '--'} x {formatSafeHours(overtime.hours)} = {Number.isFinite(overtime.earnings) ? `€${overtime.earnings.toFixed(2).replace('.', ',')}` : '0,00 €'}
                          {' '}(+{Number.isFinite(overtime.rate) ? Math.round((overtime.rate - 1) * 100) : '--'}% CCNL)
                        </Text>
                      )}
                    </View>
                  ))}
                  
                  {/* Totale straordinario nel formato standard */}
                  {breakdown.details.dailyRateBreakdown.overtimeHours > 0 && (
                    <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8, backgroundColor: '#f0f8ff', padding: 8, borderRadius: 4 }]}>
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale straordinario</Text>
                        <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: '#1976d2' }]}>+€{breakdown.details.dailyRateBreakdown.totalOvertimeEarnings.toFixed(2).replace('.', ',')}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
              
              {/* Straordinari semplificati se non c'è breakdown dettagliato */}
              {/* DEBUG LOG per vedere cosa riceve il UI */}
              {(() => {
                console.log(`[TimeEntryForm] 🚀 UI DEBUG - breakdown.details.dailyRateBreakdown.overtimeHours:`, breakdown.details.dailyRateBreakdown.overtimeHours);
                console.log(`[TimeEntryForm] 🚀 UI DEBUG - Full dailyRateBreakdown:`, JSON.stringify(breakdown.details.dailyRateBreakdown, null, 2));
                return null;
              })()}
              {breakdown.details.dailyRateBreakdown.overtimeHours > 0 && 
               (!breakdown.details.dailyRateBreakdown.overtimeBreakdown || breakdown.details.dailyRateBreakdown.overtimeBreakdown.length === 0) && (
                <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8 }]}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Straordinario CCNL</Text>
                    <Text style={styles.breakdownValue}>
                      {formatSafeHours(breakdown.details.dailyRateBreakdown.overtimeHours)}
                    </Text>
                  </View>
                </View>
              )}

            {/* Breakdown viaggio dettagliato */}
            {breakdown.details.dailyRateBreakdown.travelBreakdown && breakdown.details.dailyRateBreakdown.travelBreakdown.length > 0 && (
              <>
                <Text style={[styles.breakdownLabel, { marginTop: 12, marginLeft: 10, fontWeight: 'bold' }]}>Viaggio compensato:</Text>
                {breakdown.details.dailyRateBreakdown.travelBreakdown.map((travel, index) => (
                  <View key={index} style={[styles.breakdownItem, { marginLeft: 20, marginTop: 8 }]}>  
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{travel.type}</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours(travel.hours)}</Text>
                    </View>
                    {travel.hours > 0 && (
                      <Text style={styles.breakdownDetail}>
                        €{(settings.contract?.hourlyRate || 16.41).toFixed(2).replace('.', ',')} × {travel.hours.toFixed(2).replace('.', ',') || '0,00'}h 
                        {' '}× {Math.round((settings.travelCompensationRate || 1.0) * 100)}% = €{((settings.contract?.hourlyRate || 16.41) * travel.hours * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')}
                      </Text>
                    )}
                  </View>
                ))}
                {breakdown.details.dailyRateBreakdown.travelEarnings > 0 && (
                  <View style={[styles.breakdownItem, { marginLeft: 10, marginTop: 8, backgroundColor: '#e3f2fd', padding: 8, borderRadius: 4 }]}>  
                    <View style={styles.breakdownRow}>
                      <Text style={[styles.breakdownLabel, { fontWeight: 'bold' }]}>Totale Viaggio Compensato</Text>
                      <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: '#1976d2' }]}>+€{breakdown.details.dailyRateBreakdown.travelEarnings.toFixed(2).replace('.', ',')}</Text>
                    </View>
                  </View>
                )}
              </>
            )}
              
              <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0' }]}>
                <Text style={styles.breakdownLabel}>Totale Tariffa Giornaliera</Text>
                <Text style={styles.breakdownTotal}>
                  {formatSafeAmount(breakdown?.ordinary?.total || 0)}
                </Text>
              </View>
            </View>
          )}

          {/* Visualizzazione standard quando nessun sistema specifico è attivo */}
          {(!breakdown?.details?.hourlyRatesBreakdown || breakdown?.details?.hourlyRatesBreakdown.length === 0) && 
           breakdown?.details?.calculationMethod !== 'DAILY_RATE_WITH_SUPPLEMENTS' && (
            <>
              {/* Giornaliero/Ordinario - Prime 8 ore (solo giorni feriali) */}
              {(!breakdown?.details?.isSaturday && !breakdown?.details?.isSunday && !breakdown?.details?.isHoliday) &&
                (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || breakdown?.ordinary?.hours?.viaggio_giornaliera > 0) && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Giornaliero (prime 8h)</Text>
                  <Text style={styles.breakdownValue}>{formatSafeHours(
                    (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) +
                    (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0)
                  )}</Text>
                </View>
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    const totalOrdinaryHours =
                      (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) +
                      (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                    const standardWorkDayHours = 8;
                    const dailyRate = settings.contract?.dailyRate || 109.19;
                    if (totalOrdinaryHours >= standardWorkDayHours) {
                      return `${dailyRate.toFixed(2).replace('.', ',')} € x 1 giorno = ${breakdown?.ordinary?.earnings?.giornaliera.toFixed(2).replace('.', ',')} €`;
                    } else {
                      const percentage = (totalOrdinaryHours / standardWorkDayHours * 100).toFixed(0);
                      return `${dailyRate.toFixed(2).replace('.', ',')} € x ${percentage}% (${totalOrdinaryHours.toFixed(2).replace('.', ',')}h / 8h) = ${breakdown?.ordinary?.earnings?.giornaliera.toFixed(2).replace('.', ',')} €`;
                    }
                  })()}
                </Text>
                {breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    {`- Lavoro: ${formatSafeHours(breakdown?.ordinary?.hours?.lavoro_giornaliera)}`}
                  </Text>
                )}
                {breakdown?.ordinary?.hours?.viaggio_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    {`- Viaggio: ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_giornaliera)}`}
                  </Text>
                )}
              </View>
          )}

          {/* Lavoro/Viaggio ordinario sabato/domenica/festivo */}
          {(breakdown?.details?.isSaturday || breakdown?.details?.isSunday || breakdown?.details?.isHoliday) &&
            ((breakdown?.ordinary?.hours?.lavoro_domenica > 0 || breakdown?.ordinary?.hours?.lavoro_festivo > 0 || breakdown?.ordinary?.hours?.lavoro_sabato > 0 || (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || breakdown?.ordinary?.hours?.viaggio_giornaliera > 0) || breakdown?.ordinary?.hours?.viaggio_extra > 0)) && (
              <>
                {/* Lavoro ordinario domenica/festivo/sabato */}
                {(breakdown?.details?.isSunday && (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || breakdown?.ordinary?.hours?.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario domenica</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.breakdownDetail}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                        const ore = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                        const total = base * multiplier * ore;
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Maggiorazione Domenica) = ${total.toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown?.ordinary?.hours?.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown?.ordinary?.hours?.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {(breakdown?.details?.isHoliday && (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || breakdown?.ordinary?.hours?.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario festivo</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.breakdownDetail}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                        const ore = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Festivo) = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown?.ordinary?.hours?.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown?.ordinary?.hours?.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {(breakdown?.details?.isSaturday && (breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 || breakdown?.ordinary?.hours?.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario sabato</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.breakdownDetail}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                        const ore = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Sabato) = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown?.ordinary?.hours?.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown?.ordinary?.hours?.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown?.ordinary?.hours?.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {/* Viaggio extra (oltre 8h) - una sola volta */}
                {(breakdown?.ordinary?.hours?.viaggio_extra > 0) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        {settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME' 
                          ? 'Straordinario (da eccedenza viaggio)' 
                          : settings?.travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED'
                          ? 'Viaggio esterno (primo/ultimo)'
                          : 'Viaggio extra (oltre 8h)'}
                      </Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)}</Text>
                    </View>
                    {(breakdown?.ordinary?.earnings?.viaggio_extra > 0) && (
                      <Text style={styles.breakdownDetail}>
                        {(() => {
                          const base = settings.contract?.hourlyRate || 16.41;
                          
                          if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                            // Calcolo con maggiorazione straordinario se è un giorno speciale
                            if (breakdown?.details?.isSunday || breakdown?.details?.isHoliday) {
                              const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                              const label = breakdown?.details?.isSunday ? 'Straordinario Domenica' : 'Straordinario Festivo';
                              return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (${label}) = ${(base * multiplier * breakdown?.ordinary?.hours?.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                            } else if (breakdown?.details?.isSaturday) {
                              const multiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                              return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Straordinario Sabato) = ${(base * multiplier * breakdown?.ordinary?.hours?.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                            } else {
                              const multiplier = settings.contract?.overtimeRates?.day || 1.2;
                              return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Straordinario +20%) = ${(base * multiplier * breakdown?.ordinary?.hours?.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                            }
                          } else {
                            // Calcolo con maggiorazione viaggio se è un giorno speciale
                            if (breakdown?.details?.isSunday || breakdown?.details?.isHoliday) {
                              const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                              const label = breakdown?.details?.isSunday ? 'Maggiorazione Domenica' : 'Maggiorazione Festivo';
                              return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (${label}) = ${(base * multiplier * breakdown?.ordinary?.hours?.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                            } else if (breakdown?.details?.isSaturday) {
                              const multiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                              return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Maggiorazione Sabato) = ${(base * multiplier * breakdown?.ordinary?.hours?.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                            } else {
                              const rate = base * (settings.travelCompensationRate || 1.0);
                              return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Tariffa viaggio ${Math.round((settings.travelCompensationRate || 1.0) * 100)}%) = ${breakdown?.ordinary?.earnings?.viaggio_extra.toFixed(2).replace('.', ',')} €`;
                            }
                          }
                        })()}
                      </Text>
                    )}
                  </View>
                )}
              </>
          )}

          {/* Viaggio extra (oltre 8h) - mostrato solo per giorni feriali */}
          {breakdown?.ordinary?.hours?.viaggio_extra > 0 && 
           !breakdown?.details?.isSaturday && 
           !breakdown?.details?.isSunday && 
           !breakdown?.details?.isHoliday && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME' 
                    ? 'Straordinario (da eccedenza viaggio)' 
                    : settings?.travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED'
                    ? 'Viaggio esterno (primo/ultimo)'
                    : 'Viaggio extra (oltre 8h)'}
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)}</Text>
              </View>
              {breakdown?.ordinary?.earnings?.viaggio_extra > 0 && breakdown?.ordinary?.hours?.viaggio_extra > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      // Mostra come straordinario con tariffa maggiorata
                      const base = settings.contract?.hourlyRate || 16.41;
                      const overtime = settings.contract?.overtimeRates?.day || 1.2;
                      const rate = base * overtime;
                      return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Straordinario +20%) = ${breakdown?.ordinary?.earnings?.viaggio_extra.toFixed(2).replace('.', ',')} €`;
                    } else {
                      // Mostra come viaggio con tariffa ridotta
                      const rate = (settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0);
                      return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.ordinary?.hours?.viaggio_extra)} (Tariffa viaggio ${Math.round((settings.travelCompensationRate || 1.0) * 100)}%) = ${breakdown?.ordinary?.earnings?.viaggio_extra.toFixed(2).replace('.', ',')} €`;
                    }
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* Lavoro extra (oltre 8h) */}
          {breakdown?.ordinary?.hours?.lavoro_extra > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro extra (oltre 8h){bonusLabel(breakdown?.details?.isSaturday, breakdown?.details?.isSunday, breakdown?.details?.isHoliday)}</Text>
                <Text style={styles.breakdownValue}>{(() => {
                  console.log('🚀 UI DEBUG - breakdown.ordinary.hours.lavoro_extra:', breakdown?.ordinary?.hours?.lavoro_extra);
                  console.log('🚀 UI DEBUG - formatSafeHours result:', formatSafeHours(breakdown?.ordinary?.hours?.lavoro_extra));
                  return formatSafeHours(breakdown?.ordinary?.hours?.lavoro_extra);
                })()}</Text>
              </View>
              {breakdown?.ordinary?.earnings?.lavoro_extra > 0 && breakdown?.ordinary?.hours?.lavoro_extra > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    // Usa la maggiorazione corretta in base al giorno
                    let overtime;
                    if (breakdown?.details?.isSaturday) {
                      overtime = settings.contract?.overtimeRates?.saturday || 1.25;
                    } else if (breakdown?.details?.isSunday || breakdown?.details?.isHoliday) {
                      overtime = settings.contract?.overtimeRates?.holiday || 1.3;
                    } else {
                      overtime = settings.contract?.overtimeRates?.day || 1.2;
                    }
                    const rate = base * overtime;
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.ordinary?.hours?.lavoro_extra)} = ${breakdown?.ordinary?.earnings?.lavoro_extra.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.breakdownLabel}>Totale ordinario</Text>
            <Text style={styles.breakdownTotal}>{formatSafeAmount(breakdown?.ordinary?.total || 0)}</Text>
          </View>
          
          {/* Nota modalità MULTI_SHIFT_OPTIMIZED */}
          {settings?.travelHoursSetting === 'MULTI_SHIFT_OPTIMIZED' && (
            <View style={styles.breakdownDetail}>
              <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 4}]}>
                🎯 Modalità Multi-turno Ottimizzata attiva
              </Text>
              <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 2}]}>
                • Viaggi tra turni considerati come ore lavorative
              </Text>
              <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 2}]}>
                • Solo primo viaggio (partenza azienda) e ultimo viaggio (arrivo azienda) pagati come viaggio
              </Text>
              
              {/* Prime 8 ore cronologiche per multi-turno */}
              <View style={[styles.breakdownItem, { marginTop: 8, backgroundColor: '#fff3e0', padding: 8, borderRadius: 4 }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { fontWeight: 'bold', fontSize: 12 }]}>🎯 Prime 8 ore Multi-turno</Text>
                  <Text style={[styles.breakdownValue, { color: '#f57c00', fontSize: 12 }]}>
                    {formatSafeHours(Math.min(8, (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + (breakdown.ordinary?.hours?.viaggio_giornaliera || 0)))}
                  </Text>
                </View>
                <Text style={[styles.breakdownDetail, { fontSize: 11 }]}>
                  {(() => {
                    // Usa sempre il fallback semplice per chiarezza
                    let details = [];
                    if (breakdown.ordinary?.hours?.lavoro_giornaliera > 0) {
                      details.push(`Lavoro ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`);
                    }
                    if (breakdown.ordinary?.hours?.viaggio_giornaliera > 0) {
                      details.push(`Viaggio ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`);
                    }
                    return details.length > 0 ? details.join(' + ') : 'Prime 8 ore lavorative';
                  })()}
                </Text>
              </View>
            </View>
          )}
          
          {/* Nota maggiorazione CCNL */}
          {(breakdown?.details?.isSunday || breakdown?.details?.isHoliday || breakdown?.details?.isSaturday) && (
            <View style={styles.breakdownDetail}>
              <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 4}]}>
                {breakdown?.details?.isSunday ? 
                  `Applicata maggiorazione CCNL domenicale (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                 breakdown?.details?.isHoliday ? 
                  `Applicata maggiorazione CCNL festività (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                  `Applicata maggiorazione CCNL sabato (+${((settings.contract?.overtimeRates?.saturday || 1.25) - 1)*100}%)`}
              </Text>
              {(breakdown?.details?.isSunday || breakdown?.details?.isHoliday) && (
                <>
                  <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 2}]}>
                    La diaria giornaliera non viene applicata nei giorni {breakdown?.details?.isSunday ? 'domenicali' : 'festivi'}.
                  </Text>
                  <Text style={[styles.infoText, {fontSize: 12, fontStyle: 'italic', marginTop: 2}]}>
                    Tutte le ore sono pagate con la maggiorazione CCNL.
                  </Text>
                </>
              )}
            </View>
          )}
            </>
          )}
        </View>
      )}
      
      {!breakdown?.isFixedDay && hasStandbyHours && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="alarm-light" size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>Interventi Reperibilità per Fascia</Text>
          </View>
          
          {/* Fascia Diurna */}
          {(breakdown?.standby?.workHours?.ordinary > 0 || breakdown?.standby?.travelHours?.ordinary > 0) && (
            <View style={styles.breakdownItem}>
              {/* Header fascia con emoji e totale ore */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  🟢 Fascia Diurna
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours((breakdown?.standby?.workHours?.ordinary || 0) + (breakdown?.standby?.travelHours?.ordinary || 0))}
                </Text>
              </View>
              
              {/* Dettaglio Lavoro */}
              {breakdown?.standby?.workHours?.ordinary > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore corrette per la fascia diurna usando la nuova logica
                    const calculateSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let ordinaryMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia diurna (6:00-20:00)
                        if (hour >= 6 && hour < 20) {
                          ordinaryMinutes++;
                        }
                      }
                      
                      return Math.round((ordinaryMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi nella fascia diurna
                    const calculateTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inDiurno = hour >= 6 && hour < 20;
                        
                        if (inDiurno && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inDiurno && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno ore nella fascia diurna e calcola gli orari reali per fascia
                    const diurnaInterventions = form.interventi?.filter(intervento => {
                      let hasDiurnaHours = false;
                      
                      // Controlla primo turno lavoro
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) hasDiurnaHours = true;
                      }
                      
                      // Controlla secondo turno lavoro
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) hasDiurnaHours = true;
                      }
                      
                      return hasDiurnaHours;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari che cadono nella fascia diurna
                      const segments = [];
                      
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_1, intervento.work_end_1);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_2, intervento.work_end_2);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orari = diurnaInterventions.length > 0 
                      ? ` (${diurnaInterventions.join(', ')})`
                      : '';
                    
                    const isOvertime = breakdown?.standby?.isOvertimeApplied;
                    const rate = breakdown?.standby?.workEarnings?.ordinary && breakdown?.standby?.workHours?.ordinary > 0 
                      ? breakdown.standby.workEarnings.ordinary / breakdown.standby.workHours.ordinary
                      : (settings.contract?.hourlyRate || 16.41);
                    const baseRate = settings.contract?.hourlyRate || 16.41;
                    const percentage = Math.round((rate / baseRate - 1) * 100);
                    const percentageText = percentage > 0 ? ` (+${percentage}%)` : '';
                    
                    const labelText = isOvertime ? `Straordinario diurno` : `Lavoro diurno`;
                    const earnings = breakdown?.standby?.workEarnings?.ordinary || 0;
                    
                    return `   ${labelText}${orari}${percentageText}: ${formatSafeHours(breakdown?.standby?.workHours?.ordinary)} = €${earnings.toFixed(2).replace('.', ',')}`;
                  })()}
                </Text>
              )}
              
              {/* Dettaglio Viaggio */}
              {breakdown?.standby?.travelHours?.ordinary > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore e orari viaggio per la fascia diurna
                    const calculateTravelSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let ordinaryMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia diurna (6:00-20:00)
                        if (hour >= 6 && hour < 20) {
                          ordinaryMinutes++;
                        }
                      }
                      
                      return Math.round((ordinaryMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi viaggio nella fascia diurna
                    const calculateTravelTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inDiurno = hour >= 6 && hour < 20;
                        
                        if (inDiurno && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inDiurno && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno viaggi nella fascia diurna
                    const viaggiDiurni = form.interventi?.filter(intervento => {
                      let hasDiurnoTravel = false;
                      
                      // Controlla viaggio andata
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) hasDiurnoTravel = true;
                      }
                      
                      // Controlla viaggio ritorno
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) hasDiurnoTravel = true;
                      }
                      
                      return hasDiurnoTravel;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari viaggio che cadono nella fascia diurna
                      const segments = [];
                      
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_company, intervento.arrival_site);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_return, intervento.arrival_company);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orariViaggio = viaggiDiurni.length > 0 
                      ? ` (${viaggiDiurni.join(', ')})`
                      : '';
                    
                    return `   Viaggio diurno${orariViaggio}: ${formatSafeHours(breakdown?.standby?.travelHours?.ordinary)} = €${breakdown?.standby?.travelEarnings?.ordinary?.toFixed(2)?.replace('.', ',')}`;
                  })()}
                </Text>
              )}
            </View>
          )}
          
          {/* Fascia Serale */}
          {(breakdown?.standby?.workHours?.evening > 0 || breakdown?.standby?.travelHours?.evening > 0) && (
            <View style={styles.breakdownItem}>
              {/* Header fascia con emoji e totale ore */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  🟢 Fascia Serale
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours((breakdown?.standby?.workHours?.evening || 0) + (breakdown?.standby?.travelHours?.evening || 0))}
                </Text>
              </View>
              
              {/* Dettaglio Lavoro */}
              {breakdown?.standby?.workHours?.evening > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore corrette per la fascia serale usando la nuova logica
                    const calculateSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let eveningMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia serale (20:00-22:00)
                        if (hour >= 20 && hour < 22) {
                          eveningMinutes++;
                        }
                      }
                      
                      return Math.round((eveningMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi nella fascia serale
                    const calculateTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inSerale = hour >= 20 && hour < 22;
                        
                        if (inSerale && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inSerale && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno ore nella fascia serale e calcola gli orari reali per fascia
                    const seraleInterventions = form.interventi?.filter(intervento => {
                      let hasSeraleHours = false;
                      
                      // Controlla primo turno lavoro
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) hasSeraleHours = true;
                      }
                      
                      // Controlla secondo turno lavoro
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) hasSeraleHours = true;
                      }
                      
                      return hasSeraleHours;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari che cadono nella fascia serale
                      const segments = [];
                      
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_1, intervento.work_end_1);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_2, intervento.work_end_2);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orari = seraleInterventions.length > 0 
                      ? ` (${seraleInterventions.join(', ')})`
                      : '';
                    
                    const isOvertime = breakdown?.standby?.isOvertimeApplied;
                    const rate = breakdown?.standby?.workEarnings?.evening && breakdown?.standby?.workHours?.evening > 0 
                      ? breakdown.standby.workEarnings.evening / breakdown.standby.workHours.evening
                      : (settings.contract?.hourlyRate || 16.41);
                    const baseRate = settings.contract?.hourlyRate || 16.41;
                    const percentage = Math.round((rate / baseRate - 1) * 100);
                    const percentageText = percentage > 0 ? ` (+${percentage}%)` : '';
                    
                    const labelText = isOvertime ? `Straordinario serale` : `Lavoro serale`;
                    const earnings = breakdown?.standby?.workEarnings?.evening || 0;
                    
                    return `   ${labelText}${orari}${percentageText}: ${formatSafeHours(breakdown?.standby?.workHours?.evening)} = €${earnings.toFixed(2).replace('.', ',')}`;
                  })()}
                </Text>
              )}
              
              {/* Dettaglio Viaggio */}
              {breakdown?.standby?.travelHours?.evening > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore e orari viaggio per la fascia serale
                    const calculateTravelSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let seraleMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia serale (20:00-22:00)
                        if (hour >= 20 && hour < 22) {
                          seraleMinutes++;
                        }
                      }
                      
                      return Math.round((seraleMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi viaggio nella fascia serale
                    const calculateTravelTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inSerale = hour >= 20 && hour < 22;
                        
                        if (inSerale && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inSerale && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno viaggi nella fascia serale
                    const viaggiSerali = form.interventi?.filter(intervento => {
                      let hasSeraleTravel = false;
                      
                      // Controlla viaggio andata
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) hasSeraleTravel = true;
                      }
                      
                      // Controlla viaggio ritorno
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) hasSeraleTravel = true;
                      }
                      
                      return hasSeraleTravel;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari viaggio che cadono nella fascia serale
                      const segments = [];
                      
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_company, intervento.arrival_site);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_return, intervento.arrival_company);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orariViaggio = viaggiSerali.length > 0 
                      ? ` (${viaggiSerali.join(', ')})`
                      : '';
                    
                    return `   Viaggio serale${orariViaggio}: ${formatSafeHours(breakdown?.standby?.travelHours?.evening)} = €${breakdown?.standby?.travelEarnings?.evening?.toFixed(2)?.replace('.', ',')}`;
                  })()}
                </Text>
              )}
            </View>
          )}
          
          {/* Fascia Notturna */}
          {(breakdown?.standby?.workHours?.night > 0 || breakdown?.standby?.travelHours?.night > 0) && (
            <View style={styles.breakdownItem}>
              {/* Header fascia con emoji e totale ore */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  🌙 Fascia Notturna
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours((breakdown?.standby?.workHours?.night || 0) + (breakdown?.standby?.travelHours?.night || 0))}
                </Text>
              </View>
              
              {/* Dettaglio Lavoro */}
              {breakdown?.standby?.workHours?.night > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore corrette per la fascia notturna usando la nuova logica
                    const calculateSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let nightMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia notturna (22:00-06:00)
                        if (hour >= 22 || hour < 6) {
                          nightMinutes++;
                        }
                      }
                      
                      return Math.round((nightMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi nella fascia notturna
                    const calculateTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inNotturno = hour >= 22 || hour < 6;
                        
                        if (inNotturno && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inNotturno && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno ore nella fascia notturna e calcola gli orari reali per fascia
                    const notturnaInterventions = form.interventi?.filter(intervento => {
                      let hasNotturnaHours = false;
                      
                      // Controlla primo turno lavoro
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) hasNotturnaHours = true;
                      }
                      
                      // Controlla secondo turno lavoro
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) hasNotturnaHours = true;
                      }
                      
                      return hasNotturnaHours;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari che cadono nella fascia notturna
                      const segments = [];
                      
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_1, intervento.work_end_1);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_1, intervento.work_end_1);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        const hours = calculateSegmentHoursByTimeSlot(intervento.work_start_2, intervento.work_end_2);
                        if (hours > 0) {
                          const ranges = calculateTimeSlotRanges(intervento.work_start_2, intervento.work_end_2);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orari = notturnaInterventions.length > 0 
                      ? ` (${notturnaInterventions.join(', ')})`
                      : '';
                    
                    const isOvertime = breakdown?.standby?.isOvertimeApplied;
                    const rate = breakdown?.standby?.workEarnings?.night && breakdown?.standby?.workHours?.night > 0 
                      ? breakdown.standby.workEarnings.night / breakdown.standby.workHours.night
                      : (settings.contract?.hourlyRate || 16.41);
                    const baseRate = settings.contract?.hourlyRate || 16.41;
                    const percentage = Math.round((rate / baseRate - 1) * 100);
                    const percentageText = percentage > 0 ? ` (+${percentage}%)` : '';
                    
                    const labelText = isOvertime ? `Straordinario notturno` : `Lavoro notturno`;
                    const earnings = breakdown?.standby?.workEarnings?.night || 0;
                    
                    return `   ${labelText}${orari}${percentageText}: ${formatSafeHours(breakdown?.standby?.workHours?.night)} = €${earnings.toFixed(2).replace('.', ',')}`;
                  })()}
                </Text>
              )}
              
              {/* Dettaglio Viaggio */}
              {breakdown?.standby?.travelHours?.night > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Calcola ore e orari viaggio per la fascia notturna
                    const calculateTravelSegmentHoursByTimeSlot = (start, end) => {
                      if (!start || !end) return {};
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      
                      const calculateTimeDifference = (startTime, endTime) => {
                        const start = parseTime(startTime);
                        const end = parseTime(endTime);
                        return end >= start ? end - start : (1440 - start) + end;
                      };
                      
                      const startMinutes = parseTime(start);
                      const duration = calculateTimeDifference(start, end);
                      
                      let notturnoMinutes = 0;
                      
                      for (let i = 0; i < duration; i++) {
                        const currentMinute = (startMinutes + i) % 1440;
                        const hour = Math.floor(currentMinute / 60);
                        
                        // Verifica se questo minuto è nella fascia notturna (22:00-06:00)
                        if (hour >= 22 || hour < 6) {
                          notturnoMinutes++;
                        }
                      }
                      
                      return Math.round((notturnoMinutes / 60) * 100) / 100;
                    };

                    // Funzione per calcolare gli orari effettivi viaggio nella fascia notturna
                    const calculateTravelTimeSlotRanges = (start, end) => {
                      if (!start || !end) return [];
                      
                      const parseTime = (timeString) => {
                        const [hours, minutes] = timeString.split(':').map(Number);
                        return { hours, minutes, totalMinutes: hours * 60 + minutes };
                      };
                      
                      const formatTime = (minutes) => {
                        const h = Math.floor(minutes / 60);
                        const m = minutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };
                      
                      const startTime = parseTime(start);
                      const endTime = parseTime(end);
                      let currentMinutes = startTime.totalMinutes;
                      const endMinutes = endTime.totalMinutes >= startTime.totalMinutes ? 
                        endTime.totalMinutes : endTime.totalMinutes + 1440;
                      
                      const ranges = [];
                      let rangeStart = null;
                      
                      while (currentMinutes < endMinutes) {
                        const hour = Math.floor((currentMinutes % 1440) / 60);
                        const inNotturno = hour >= 22 || hour < 6;
                        
                        if (inNotturno && rangeStart === null) {
                          rangeStart = currentMinutes % 1440;
                        } else if (!inNotturno && rangeStart !== null) {
                          ranges.push(`${formatTime(rangeStart)}-${formatTime(currentMinutes % 1440)}`);
                          rangeStart = null;
                        }
                        
                        currentMinutes++;
                      }
                      
                      // Chiudi l'ultimo range se necessario
                      if (rangeStart !== null) {
                        ranges.push(`${formatTime(rangeStart)}-${formatTime(endMinutes % 1440)}`);
                      }
                      
                      return ranges;
                    };

                    // Trova gli interventi che hanno viaggi nella fascia notturna
                    const viaggiNotturni = form.interventi?.filter(intervento => {
                      let hasNotturnoTravel = false;
                      
                      // Controlla viaggio andata
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) hasNotturnoTravel = true;
                      }
                      
                      // Controlla viaggio ritorno
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) hasNotturnoTravel = true;
                      }
                      
                      return hasNotturnoTravel;
                    }).map(intervento => {
                      // Crea una rappresentazione degli orari viaggio che cadono nella fascia notturna
                      const segments = [];
                      
                      if (intervento.departure_company && intervento.arrival_site) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_company, intervento.arrival_site);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_company, intervento.arrival_site);
                          segments.push(...ranges);
                        }
                      }
                      
                      if (intervento.departure_return && intervento.arrival_company) {
                        const hours = calculateTravelSegmentHoursByTimeSlot(intervento.departure_return, intervento.arrival_company);
                        if (hours > 0) {
                          const ranges = calculateTravelTimeSlotRanges(intervento.departure_return, intervento.arrival_company);
                          segments.push(...ranges);
                        }
                      }
                      
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orariViaggio = viaggiNotturni.length > 0 
                      ? ` (${viaggiNotturni.join(', ')})`
                      : '';
                    
                    return `   Viaggio notturno${orariViaggio}: ${formatSafeHours(breakdown?.standby?.travelHours?.night)} = €${breakdown?.standby?.travelEarnings?.night?.toFixed(2)?.replace('.', ',')}`;
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* Fascia Sabato */}
          {(breakdown?.standby?.workHours?.saturday > 0 || breakdown?.standby?.travelHours?.saturday > 0) && (
            <View style={styles.breakdownItem}>
              {/* Header fascia con emoji e totale ore */}
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  📅 Fascia Sabato
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours((breakdown?.standby?.workHours?.saturday || 0) + (breakdown?.standby?.travelHours?.saturday || 0))}
                </Text>
              </View>
              
              {/* Dettaglio Lavoro */}
              {breakdown?.standby?.workHours?.saturday > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Per il sabato, tutti gli interventi nella giornata di sabato appartengono a questa fascia
                    // Non c'è bisogno di calcolare ore per fasce orarie specifiche
                    const workDate = new Date(form.date);
                    const isSaturday = workDate.getDay() === 6;
                    
                    if (!isSaturday) return '';
                    
                    const sabatoInterventions = form.interventi?.filter(intervento => {
                      // Filtra interventi che hanno lavoro
                      return (intervento.work_start_1 && intervento.work_end_1) || 
                             (intervento.work_start_2 && intervento.work_end_2);
                    }).map(intervento => {
                      const segments = [];
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        segments.push(`${intervento.work_start_1}-${intervento.work_end_1}`);
                      }
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        segments.push(`${intervento.work_start_2}-${intervento.work_end_2}`);
                      }
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orari = sabatoInterventions.length > 0 
                      ? ` (${sabatoInterventions.join(', ')})`
                      : '';
                    
                    const rate = breakdown?.standby?.workEarnings?.saturday && breakdown?.standby?.workHours?.saturday > 0 
                      ? breakdown.standby.workEarnings.saturday / breakdown.standby.workHours.saturday
                      : (settings.contract?.hourlyRate || 16.41);
                    const baseRate = settings.contract?.hourlyRate || 16.41;
                    const percentage = Math.round((rate / baseRate - 1) * 100);
                    const percentageText = percentage > 0 ? ` (+${percentage}%)` : '';
                    const earnings = breakdown?.standby?.workEarnings?.saturday || 0;
                    
                    return `   Lavoro sabato${orari}${percentageText}: ${formatSafeHours(breakdown?.standby?.workHours?.saturday)} = €${earnings.toFixed(2).replace('.', ',')}`;
                  })()}
                </Text>
              )}
              
              {/* Dettaglio Viaggio */}
              {breakdown?.standby?.travelHours?.saturday > 0 && (
                <Text style={styles.breakdownDetail}>
                  {'   '}Viaggio sabato: {formatSafeHours(breakdown?.standby?.travelHours?.saturday)} = €{breakdown?.standby?.travelEarnings?.saturday?.toFixed(2)?.replace('.', ',')}
                </Text>
              )}
            </View>
          )}

          {/* Fascia Festiva */}
          {((breakdown?.standby?.workHours?.holiday || 0) > 0 || (breakdown?.standby?.travelHours?.holiday || 0) > 0) && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  🎉 Fascia Festiva
                </Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours((breakdown?.standby?.workHours?.holiday || 0) + (breakdown?.standby?.travelHours?.holiday || 0))}
                </Text>
              </View>
              
              {/* Lavoro festivo reperibilità */}
              {breakdown?.standby?.workHours?.holiday > 0 && (
                <Text style={styles.breakdownDetail}>
                  {(() => {
                    // Per i giorni festivi, tutti gli interventi nella giornata festiva appartengono a questa fascia
                    // Non c'è bisogno di calcolare ore per fasce orarie specifiche
                    const workDate = new Date(form.date);
                    const isSunday = workDate.getDay() === 0;
                    // TODO: Qui dovresti aggiungere la logica per i giorni festivi italiani
                    const isHoliday = isSunday; // Per ora solo domenica
                    
                    if (!isHoliday) return '';
                    
                    const festivaInterventions = form.interventi?.filter(intervento => {
                      // Filtra interventi che hanno lavoro
                      return (intervento.work_start_1 && intervento.work_end_1) || 
                             (intervento.work_start_2 && intervento.work_end_2);
                    }).map(intervento => {
                      const segments = [];
                      if (intervento.work_start_1 && intervento.work_end_1) {
                        segments.push(`${intervento.work_start_1}-${intervento.work_end_1}`);
                      }
                      if (intervento.work_start_2 && intervento.work_end_2) {
                        segments.push(`${intervento.work_start_2}-${intervento.work_end_2}`);
                      }
                      return segments.join(', ');
                    }).filter(segment => segment) || [];
                    
                    const orari = festivaInterventions.length > 0 
                      ? ` (${festivaInterventions.join(', ')})`
                      : '';
                    
                    const isOvertime = breakdown?.standby?.isOvertimeApplied;
                    const rate = breakdown?.standby?.workEarnings?.holiday && breakdown?.standby?.workHours?.holiday > 0 
                      ? breakdown.standby.workEarnings.holiday / breakdown.standby.workHours.holiday
                      : (settings.contract?.hourlyRate || 16.41) * (isOvertime ? 1.35 : 1.30);
                    const baseRate = settings.contract?.hourlyRate || 16.41;
                    const percentage = Math.round((rate / baseRate - 1) * 100);
                    const percentageText = percentage > 0 ? ` (+${percentage}%)` : '';
                    const earnings = breakdown?.standby?.workEarnings?.holiday || 0;
                    
                    const labelText = isOvertime ? `Straordinario festivo` : `Lavoro festivo`;
                    
                    return `   ${labelText}${orari}${percentageText}: ${formatSafeHours(breakdown?.standby?.workHours?.holiday)} = €${earnings.toFixed(2).replace('.', ',')}`;
                  })()}
                </Text>
              )}
              
              {/* Viaggio festivo reperibilità */}
              {breakdown?.standby?.travelHours?.holiday > 0 && (
                <Text style={styles.breakdownDetail}>
                  {'   '}Viaggio festivo: {formatSafeHours(breakdown?.standby?.travelHours?.holiday)} = €{breakdown?.standby?.travelEarnings?.holiday?.toFixed(2)?.replace('.', ',')}
                </Text>
              )}
            </View>
          )}
          

          

          





          
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.breakdownLabel}>Totale reperibilità</Text>
            <Text style={styles.breakdownTotal}>
              {formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))}
            </Text>
          </View>
        </View>
      )}
      
      {/* Mostra sezione reperibilità anche quando è attiva ma senza interventi */}
      {!breakdown.isFixedDay && form.reperibilita && !hasStandbyHours && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="phone-alert" size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>Reperibilità</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownDetail}>
              Reperibilità attiva ma nessun intervento registrato.
            </Text>
            <Text style={styles.breakdownDetail}>
              Sarà applicata solo l'indennità giornaliera CCNL.
            </Text>
          </View>
        </View>
      )}
      
      {!breakdown?.isFixedDay && hasAllowances && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="gift-outline" size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>Indennità e Buoni</Text>
          </View>
          
          {/* Indennità trasferta */}
          {breakdown?.allowances?.travel > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Indennità trasferta</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown?.allowances?.travel)}</Text>
              </View>
              <Text style={styles.breakdownDetail}>
                {(() => {
                  const travelAllowanceSettings = settings.travelAllowance || {};
                  const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
                  
                  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
                    const workHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                     (breakdown.ordinary?.hours?.lavoro_extra || 0);
                    const travelHours = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + 
                                       (breakdown.ordinary?.hours?.viaggio_extra || 0);
                    
                    const standbyWorkHours = breakdown.standby ? 
                      Object.values(breakdown?.standby?.workHours || {}).reduce((a, b) => a + b, 0) : 0;
                    const standbyTravelHours = breakdown.standby ? 
                      Object.values(breakdown?.standby?.travelHours || {}).reduce((a, b) => a + b, 0) : 0;
                    const totalStandbyHours = standbyWorkHours + standbyTravelHours;
                    
                    const totalHours = workHours + travelHours + totalStandbyHours;
                    const proportion = Math.min(totalHours / 8, 1.0);
                    
                    if (totalStandbyHours > 0) {
                      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%) - include ${totalStandbyHours.toFixed(1)}h reperibilità`;
                    } else {
                      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%)`;
                    }
                  }
                  
                  if (form.trasfertaPercent && form.trasfertaPercent < 1) {
                    return `Mezza giornata (${Math.round(form.trasfertaPercent * 100)}%)`;
                  }
                  
                  return 'Giornata intera';
                })()}
              </Text>
            </View>
          )}
          
          {/* Indennità reperibilità */}
          {breakdown?.allowances?.standby > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Indennità reperibilità</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown?.allowances?.standby)}</Text>
              </View>
              <Text style={styles.breakdownDetail}>
                Indennità giornaliera da CCNL
              </Text>
            </View>
          )}
          
          {/* Rimborso pasti */}
          {breakdown?.allowances?.meal > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Rimborso pasti</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown?.allowances?.meal)}</Text>
              </View>
              <Text style={styles.breakdownDetail}>
                Non incluso nel totale giornaliero (voce non tassabile)
              </Text>
              {form.pasti.pranzo && (
                <Text style={styles.breakdownDetail}>
                  - Pranzo: {renderMealBreakdown(
                    form.pasti.pranzo, 
                    workEntry.mealLunchCash, 
                    settings.mealAllowances?.lunch?.voucherAmount,
                    settings.mealAllowances?.lunch?.cashAmount
                  )}
                </Text>
              )}
              {form.pasti.cena && (
                <Text style={styles.breakdownDetail}>
                  - Cena: {renderMealBreakdown(
                    form.pasti.cena, 
                    workEntry.mealDinnerCash, 
                    settings.mealAllowances?.dinner?.voucherAmount,
                    settings.mealAllowances?.dinner?.cashAmount
                  )}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
      
      {/* Sezione completamento giornata se la giornata è parziale */}
      {!breakdown?.isFixedDay && breakdown?.details?.isPartialDay && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="clock-check-outline" size={16} color={styles.infoText.color} />
            <Text style={styles.breakdownSubtitle}>Completamento Giornata</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Ore lavorate</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(breakdown?.details?.totalOrdinaryHours)} / 8:00
              </Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {`Mancano ${formatSafeHours(breakdown?.details?.missingHours)} per completare la giornata`}
            </Text>
          </View>
          
          {breakdown?.details?.completamentoTipo !== 'nessuno' && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Completamento con</Text>
                <Text style={styles.breakdownValue}>
                  {(() => {
                    switch(breakdown?.details?.completamentoTipo) {
                      case 'ferie': return 'Ferie';
                      case 'permesso': return 'Permesso';
                      case 'malattia': return 'Malattia';
                      case 'riposo': return 'Riposo compensativo';
                      default: return 'Non specificato';
                    }
                  })()}
                </Text>
              </View>
              <Text style={styles.breakdownDetail}>
                {`${formatSafeHours(breakdown?.details?.missingHours)} di ${breakdown?.details?.completamentoTipo} per completare la giornata`}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.totalSection}>
        <View style={styles.breakdownRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="cash-check" size={18} color={styles.infoText.color} />
            <Text style={[styles.totalLabel, { marginLeft: 6 }]}>
              {breakdown?.isFixedDay ? 'Totale Retribuzione Giornaliera' : 'Totale Guadagno Giornaliero'}
            </Text>
          </View>
          <Text style={styles.totalAmount}>{formatSafeAmount(breakdown?.totalEarnings)}</Text>
        </View>
        <Text style={styles.breakdownDetail}>        {breakdown?.isFixedDay 
          ? `Retribuzione fissa secondo CCNL per giornata di ${breakdown?.dayType === 'ferie' ? 'ferie' : 
                                                               breakdown?.dayType === 'malattia' ? 'malattia' : 
                                                               breakdown?.dayType === 'permesso' ? 'permesso' :
                                                               breakdown?.dayType === 'festivo' ? 'festivo' :
                                                               'riposo compensativo'}`
          : 'Include attività ordinarie, interventi in reperibilità e indennità di trasferta (esclusi rimborsi pasti)'
        }
        </Text>
        {!breakdown.isFixedDay && breakdown?.details?.isPartialDay && (
          <Text style={styles.breakdownDetail}>
            {breakdown?.details?.completamentoTipo !== 'nessuno'
              ? `La giornata è stata completata con: ${breakdown?.details?.completamentoTipo}`
              : 'La retribuzione è proporzionale alle ore effettivamente lavorate'}
          </Text>
        )}
      </View>
    </ModernCard>
  );
};

const veicoloOptions = [
  { label: 'Andata e ritorno', value: 'andata_ritorno', icon: 'car' },
  { label: 'Solo andata', value: 'solo_andata', icon: 'car-arrow-right' },
  { label: 'Solo ritorno', value: 'solo_ritorno', icon: 'car-arrow-left' },
  { label: 'Non ho guidato', value: 'non_guidato', icon: 'account-off' },
];

const dayTypes = [
  { label: 'Lavorativa', value: 'lavorativa', color: '#2196F3', icon: 'briefcase-outline' },
  { label: 'Ferie', value: 'ferie', color: '#43a047', icon: 'beach' },
  { label: 'Permesso', value: 'permesso', color: '#ef6c00', icon: 'account-clock-outline' },
  { label: 'Malattia', value: 'malattia', color: '#d32f2f', icon: 'emoticon-sick-outline' },
  { label: 'Riposo compensativo', value: 'riposo', color: '#757575', icon: 'bed' },
  { label: 'Festivo', value: 'festivo', color: '#9c27b0', icon: 'calendar-star' },
];

// Configurazione delle icone corrette per i tipi di completamento giornata
const iconsConfig = {
  nessuno: { name: 'close-circle', component: MaterialCommunityIcons },
  ferie: { name: 'beach', component: MaterialCommunityIcons },
  permesso: { name: 'account-clock-outline', component: MaterialCommunityIcons },
  malattia: { name: 'emoticon-sick-outline', component: MaterialCommunityIcons },
  riposo: { name: 'bed', component: MaterialCommunityIcons },
  lavorativa: { name: 'briefcase-outline', component: MaterialCommunityIcons },
  festivo: { name: 'calendar-star', component: MaterialCommunityIcons },
};

// Componente per mostrare l'icona corretta in base al tipo
const TypeIcon = ({ type, size = 20, color }) => {
  const iconConfig = iconsConfig[type] || iconsConfig.lavorativa;
  const IconComponent = iconConfig.component;
  
  return (
    <IconComponent name={iconConfig.name} size={size} color={color} />
  );
};

const completamentoOptions = [
  { label: 'Nessuno', value: 'nessuno', color: '#2196F3', icon: 'close-circle' },
  { label: 'Ferie', value: 'ferie', color: '#43a047', icon: 'beach' },
  { label: 'Permesso', value: 'permesso', color: '#ef6c00', icon: 'account-clock-outline' },
  { label: 'Malattia', value: 'malattia', color: '#d32f2f', icon: 'emoticon-sick-outline' },
  { label: 'Riposo compensativo', value: 'riposo', color: '#757575', icon: 'bed' },
];

const categoryLabels = {
  ordinary: 'Ordinarie Diurne',
  ordinary_night: 'Ordinarie Notturne',
  ordinary_holiday: 'Ordinarie Festive',
  ordinary_night_holiday: 'Ordinarie Notturne Festive',
  overtime: 'Straordinario Diurno',
  overtime_night: 'Straordinario Notturno',
  overtime_holiday: 'Straordinario Festivo',
  overtime_night_holiday: 'Straordinario Notturno Festivo',
  travel: 'Viaggio',
  standby_ordinary: 'Intervento Ordinario',
  standby_ordinary_night: 'Intervento Notturno',
  standby_ordinary_holiday: 'Intervento Festivo',
  standby_overtime: 'Intervento Straordinario',
  standby_overtime_night: 'Intervento Straordinario Notturno',
  standby_travel: 'Viaggio (Reperibilità)',
};

const TimeEntryForm = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const calculationService = useCalculationService();
  
  // 🔍 DEBUG: Log delle impostazioni ricevute
  useEffect(() => {
    console.log('🔍 TimeEntryForm - Settings ricevute:', {
      hasSettings: !!settings,
      hasSpecialDayTravelSettings: !!settings?.specialDayTravelSettings,
      specialDayTravelSettings: settings?.specialDayTravelSettings,
      keysInSettings: settings ? Object.keys(settings) : 'null'
    });
  }, [settings]);
  
  // Crea stili dinamici basati sul tema
  const styles = createStyles(theme);
  
  const today = new Date();
  const [form, setForm] = useState({
    date: formatDate(today),
    site_name: '',
    veicolo: 'andata_ritorno',
    targa_veicolo: '', // Campo per targa/numero veicolo
    viaggi: [
      {
        departure_company: '',
        arrival_site: '',
        work_start_1: '',
        work_end_1: '',
        work_start_2: '',
        work_end_2: '',
        departure_return: '',
        arrival_company: '',
      }
    ],
    extraTurns: [],
    reperibilita: false,
    reperibilityManualOverride: false, // Nuovo flag per tracciare override manuale
    standbyAllowance: false, // Flag per indennità di reperibilità
    interventi: [],
    pasti: { pranzo: false, cena: false },
    pastipranzoManualOverride: false, // Flag per override manuale pranzo
    pasticenaManualOverride: false, // Flag per override manuale cena
    trasferta: false,
    trasfertaManualOverride: false, // Flag per override manuale indennità trasferta
    trasfertaPercent: 1.0,
    note: '',
    completamentoGiornata: 'nessuno', // Valore predefinito: nessuno
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState(null);
  const [datePickerMode, setDatePickerMode] = useState('date');
  const [viaggioIndex, setViaggioIndex] = useState(0);
  const [interventoIndex, setInterventoIndex] = useState(0);
  const [dayType, setDayType] = useState('lavorativa');
  const [mealCash, setMealCash] = useState({ pranzo: '', cena: '' });
  
  // Hook per auto-compilazione ferie/malattia/riposo
  const vacationAutoCompile = useVacationAutoCompile(form.date, dayType, settings);
  
  // Stati per la gestione della reperibilità da calendario
  const [isDateInStandbyCalendar, setIsDateInStandbyCalendar] = useState(false);
  const [isStandbyCalendarInitialized, setIsStandbyCalendarInitialized] = useState(false);
  const [reperibilityManualOverride, setReperibilityManualOverride] = useState(false);

  // Estrai parametri per modalità modifica/cancellazione
  const isEdit = route?.params?.isEdit;
  const enableDelete = route?.params?.enableDelete;
  const entryToEdit = route?.params?.entry;
  const entryId = entryToEdit?.id;

  // Precarica i dati in modalità modifica
  useEffect(() => {
    if (isEdit && entryToEdit) {
      // Log per debug caricamento
      console.log("Caricamento entry esistente:", {
        id: entryToEdit.id,
        trasferta: (entryToEdit.travelAllowance || entryToEdit.travel_allowance) === 1,
        trasfertaManualOverride: entryToEdit.trasfertaManualOverride,
        trasfertas_manual_override: entryToEdit.trasfertas_manual_override,
        trasferta_manual_override: entryToEdit.trasferta_manual_override
      });
      
      // Determina correttamente lo stato dell'override manuale
      const hasManualOverride = entryToEdit.trasfertaManualOverride === true || 
                              entryToEdit.trasfertas_manual_override === true || 
                              entryToEdit.trasferta_manual_override === true ||
                              entryToEdit.trasferta_manual_override === 1;
      
      console.log("Rispetto override manuale trasferta:", hasManualOverride);
      
      // Mappa i dati DB -> form
      setForm(prev => ({
        ...prev,
        date: entryToEdit.date ? (() => {
          // accetta sia yyyy-mm-dd che dd/MM/yyyy
          if (entryToEdit.date.includes('-')) {
            const [y, m, d] = entryToEdit.date.split('-');
            return `${d}/${m}/${y}`;
          }
          return entryToEdit.date;
        })() : prev.date,
        site_name: entryToEdit.site_name || entryToEdit.siteName || '',
        veicolo: entryToEdit.veicolo || entryToEdit.vehicleDriven || 'andata_ritorno',
        targa_veicolo: entryToEdit.targa_veicolo || entryToEdit.vehiclePlate || '',
        // 🚀 MULTI-TURNO: Ricostruisci array viaggi completo
        viaggi: (() => {
          // Turno principale dai campi del database
          const primaryShift = {
            departure_company: entryToEdit.departure_company || entryToEdit.departureCompany || '',
            arrival_site: entryToEdit.arrival_site || entryToEdit.arrivalSite || '',
            work_start_1: entryToEdit.work_start_1 || entryToEdit.workStart1 || '',
            work_end_1: entryToEdit.work_end_1 || entryToEdit.workEnd1 || '',
            work_start_2: entryToEdit.work_start_2 || entryToEdit.workStart2 || '',
            work_end_2: entryToEdit.work_end_2 || entryToEdit.workEnd2 || '',
            departure_return: entryToEdit.departure_return || entryToEdit.departureReturn || '',
            arrival_company: entryToEdit.arrival_company || entryToEdit.arrivalCompany || '',
          };
          
          // Turni aggiuntivi dal campo viaggi del database  
          console.log("🔥 CARICAMENTO FORM: Debug campo viaggi dal DB:", {
            viaggiRaw: entryToEdit.viaggi,
            viaggiType: typeof entryToEdit.viaggi,
            viaggiIsArray: Array.isArray(entryToEdit.viaggi),
            viaggiLength: entryToEdit.viaggi?.length,
            entryId: entryToEdit.id
          });
          
          // 🚀 Parse viaggi dal database (può essere stringa JSON o array)
          let additionalShifts = [];
          if (entryToEdit.viaggi) {
            if (typeof entryToEdit.viaggi === 'string') {
              try {
                additionalShifts = JSON.parse(entryToEdit.viaggi);
                console.log("🔥 CARICAMENTO FORM: Viaggi parsati da stringa JSON:", additionalShifts);
              } catch (error) {
                console.warn("🔥 CARICAMENTO FORM: Errore parsing viaggi JSON:", error);
                additionalShifts = [];
              }
            } else if (Array.isArray(entryToEdit.viaggi)) {
              additionalShifts = entryToEdit.viaggi;
              console.log("🔥 CARICAMENTO FORM: Viaggi già array:", additionalShifts);
            }
          }
          
          console.log("🔥 CARICAMENTO FORM: Ricostruendo viaggi da DB:", {
            primaryShift,
            additionalShifts,
            additionalShiftsLength: additionalShifts.length,
            totalShifts: 1 + additionalShifts.length
          });
          
          // Combina turno principale + turni aggiuntivi
          return [primaryShift, ...additionalShifts];
        })(),
        reperibilita: entryToEdit.is_standby_day === 1 || entryToEdit.isStandbyDay === 1,
        reperibilityManualOverride: entryToEdit.reperibilityManualOverride === true || false,
        standbyAllowance: entryToEdit.standby_allowance === 1 || entryToEdit.standbyAllowance === 1,
        // Carica l'array di interventi direttamente dal DB
        interventi: entryToEdit.interventi && Array.isArray(entryToEdit.interventi) ? entryToEdit.interventi : [],
        pasti: {
          pranzo: (entryToEdit.mealLunchVoucher || entryToEdit.meal_lunch_voucher) === 1,
          cena: (entryToEdit.mealDinnerVoucher || entryToEdit.meal_dinner_voucher) === 1,
        },
        // Flag override manuale pasti: se erano attivi, significa che erano stati selezionati manualmente
        pastipranzoManualOverride: (entryToEdit.mealLunchVoucher || entryToEdit.meal_lunch_voucher) === 1,
        pasticenaManualOverride: (entryToEdit.mealDinnerVoucher || entryToEdit.meal_dinner_voucher) === 1,
        mealLunchVoucher: (entryToEdit.mealLunchVoucher || entryToEdit.meal_lunch_voucher) === 1 ? 1 : 0,
        mealDinnerVoucher: (entryToEdit.mealDinnerVoucher || entryToEdit.meal_dinner_voucher) === 1 ? 1 : 0,
        mealLunchCash: entryToEdit.mealLunchCash || entryToEdit.meal_lunch_cash || 0,
        mealDinnerCash: entryToEdit.mealDinnerCash || entryToEdit.meal_dinner_cash || 0,
        trasferta: (entryToEdit.travelAllowance || entryToEdit.travel_allowance) === 1,
        trasfertaManualOverride: entryToEdit.trasfertaManualOverride === true || 
                               entryToEdit.trasfertas_manual_override === true || 
                               entryToEdit.trasferta_manual_override === true ||
                               entryToEdit.trasferta_manual_override === 1 || // Supporta anche formato numerico
                               false,
        trasfertaPercent: entryToEdit.travelAllowancePercent || entryToEdit.travel_allowance_percent || 1.0,
        travelAllowancePercent: entryToEdit.travelAllowancePercent || 1.0,
        completamentoGiornata: entryToEdit.completamento_giornata || entryToEdit.completamentoGiornata || 'nessuno', // ← AGGIUNTO!
        note: entryToEdit.note || entryToEdit.notes || '',
      }));
      // Precarica dayType in modifica
      setDayType(entryToEdit.day_type || entryToEdit.dayType || 'lavorativa');
      setMealCash({
        pranzo: entryToEdit.mealLunchCash?.toString() || entryToEdit.meal_lunch_cash?.toString() || '',
        cena: entryToEdit.mealDinnerCash?.toString() || entryToEdit.meal_dinner_cash?.toString() || '',
      });
    }
  }, [isEdit, entryToEdit]);

  // Auto-compilazione per ferie/malattia/riposo
  useEffect(() => {
    if (!isEdit && ['ferie', 'malattia', 'riposo', 'permesso'].includes(dayType)) {
      console.log('Auto-compilazione attivata per:', dayType);
      
      // Calcola la retribuzione giornaliera secondo CCNL
      const ccnlDailyRate = settings?.contract?.dailyRate || 109.19;
      
      // Applica i dati di auto-compilazione sempre per giorni di ferie/malattia/riposo/permesso
      setForm(prev => ({
        ...prev,
        // Applica auto-compilazione per giornate non lavorative
        veicolo: 'non_guidato',
        targa_veicolo: '',
        viaggi: [{
          departure_company: '',
          arrival_site: '',
          work_start_1: '',
          work_end_1: '',
          work_start_2: '',
          work_end_2: '',
          departure_return: '',
          arrival_company: '',
        }],
        interventi: [],
        pasti: { pranzo: false, cena: false },
        pastipranzoManualOverride: false,
        pasticenaManualOverride: false,
        trasferta: false,
        reperibilita: false,
        completamentoGiornata: 'nessuno',
        // Mantieni i campi già impostati dall'utente
        date: prev.date,
        site_name: prev.site_name || (dayType === 'malattia' ? 'Malattia' : 
                                       dayType === 'ferie' ? 'Ferie' : 
                                       dayType === 'permesso' ? 'Permesso' :
                                       dayType === 'riposo' ? 'Riposo compensativo' : prev.site_name),
        note: `Giornata di ${dayType === 'ferie' ? 'ferie' : 
                             dayType === 'malattia' ? 'malattia' : 
                             dayType === 'permesso' ? 'permesso' :
                             'riposo compensativo'} - Retribuzione secondo CCNL (€${ccnlDailyRate.toFixed(2)})`,
        // Flag per identificare giorni con retribuzione fissa
        isFixedDay: true,
        fixedEarnings: ccnlDailyRate,
        dayType: dayType
      }));
    } else if (!isEdit && dayType === 'lavorativa') {
      // Verifica se è un giorno festivo feriale
      const holidayInfo = HolidayService.isWeekdayHoliday(form.date);
      if (holidayInfo) {
        console.log('Rilevato giorno festivo feriale:', holidayInfo.name);
        
        // Calcola la retribuzione per il giorno festivo
        const holidayPay = HolidayService.calculateHolidayPay(settings);
        
        // Auto-compila come giorno festivo
        setForm(prev => ({
          ...prev,
          veicolo: 'non_guidato',
          targa_veicolo: '',
          viaggi: [{
            departure_company: '',
            arrival_site: '',
            work_start_1: '',
            work_end_1: '',
            work_start_2: '',
            work_end_2: '',
            departure_return: '',
            arrival_company: '',
          }],
          interventi: [],
          pasti: { pranzo: false, cena: false },
          trasferta: false,
          reperibilita: false,
          completamentoGiornata: 'nessuno',
          site_name: prev.site_name || holidayInfo.name,
          note: `${holidayInfo.name} - Giorno festivo retribuito secondo CCNL (€${holidayPay.toFixed(2)})`,
          isFixedDay: true,
          fixedEarnings: holidayPay,
          dayType: 'festivo'
        }));
        
        // Forza il dayType a festivo per visualizzazione corretta
        setDayType('festivo');
      } else {
        // Reset per giorni lavorativi normali
        setForm(prev => ({
          ...prev,
          isFixedDay: false,
          fixedEarnings: 0,
          dayType: 'lavorativa',
          // Ripristina valori di default per giornata lavorativa - SENZA auto-attivazione
          veicolo: 'andata_ritorno',
          pasti: { pranzo: false, cena: false },
          trasferta: false,
        }));
      }
    }
  }, [dayType, isEdit, settings?.contract?.dailyRate]);

  // Effetto aggiuntivo per verificare giorni festivi al cambio data
  useEffect(() => {
    if (!isEdit && dayType === 'lavorativa') {
      const holidayInfo = HolidayService.isWeekdayHoliday(form.date);
      if (holidayInfo && (!form.isFixedDay || form.dayType !== 'festivo')) {
        console.log('Cambio data: rilevato giorno festivo feriale:', holidayInfo.name);
        
        const holidayPay = HolidayService.calculateHolidayPay(settings);
        
        setForm(prev => ({
          ...prev,
          veicolo: 'non_guidato',
          targa_veicolo: '',
          viaggi: [{
            departure_company: '',
            arrival_site: '',
            work_start_1: '',
            work_end_1: '',
            work_start_2: '',
            work_end_2: '',
            departure_return: '',
            arrival_company: '',
          }],
          interventi: [],
          pasti: { pranzo: false, cena: false },
          trasferta: false,
          reperibilita: false,
          completamentoGiornata: 'nessuno',
          site_name: holidayInfo.name,
          note: `${holidayInfo.name} - Giorno festivo retribuito secondo CCNL (€${holidayPay.toFixed(2)})`,
          isFixedDay: true,
          fixedEarnings: holidayPay,
          dayType: 'festivo'
        }));
        
        setDayType('festivo');
      } else if (!holidayInfo && form.dayType === 'festivo') {
        // Se cambia da festivo a non festivo, reset
        console.log('Cambio data: non più giorno festivo, reset');
        setForm(prev => ({
          ...prev,
          isFixedDay: false,
          fixedEarnings: 0,
          dayType: 'lavorativa',
          veicolo: 'andata_ritorno',
          pasti: { pranzo: false, cena: false },
          trasferta: false,
          site_name: '',
          note: ''
        }));
        setDayType('lavorativa');
      }
    }
  }, [form.date, isEdit, dayType, settings?.contract?.dailyRate]);

  // Verifica se la data selezionata è impostata come reperibile nel calendario
  useEffect(() => {
    try {
      console.log('TimeEntryForm - Verifico data reperibilità nel calendario - avvio');
      
      // Formato data: dd/MM/yyyy -> yyyy-MM-dd
      const dateStr = (() => {
        if (!form.date) return null;
        const [d, m, y] = form.date.split('/');
        return `${y}-${m}-${d}`;
      })();
      
      if (!dateStr) {
        console.log('Data non disponibile per la verifica reperibilità');
        setIsDateInStandbyCalendar(false);
        setIsStandbyCalendarInitialized(true);
        return;
      }
      
      // Log per debug
      console.log('Verifica reperibilità nel calendario:', {
        dateStr,
        enabled: settings?.standbySettings?.enabled,
        hasDays: !!settings?.standbySettings?.standbyDays,
        hasDate: !!settings?.standbySettings?.standbyDays?.[dateStr],
        isSelected: settings?.standbySettings?.standbyDays?.[dateStr]?.selected
      });
      
      const isInStandbyCalendar = settings?.standbySettings?.enabled && 
          settings?.standbySettings?.standbyDays && 
          settings?.standbySettings?.standbyDays[dateStr] &&
          settings?.standbySettings?.standbyDays[dateStr].selected === true;
          
      // Imposta flag se è nel calendario
      setIsDateInStandbyCalendar(isInStandbyCalendar);
      
      // All'inizializzazione o al cambio data, e SOLO SE non c'è stato un override manuale,
      // imposta la reperibilità in base al calendario
      if (!isEdit && !form.reperibilityManualOverride) {
        console.log(`Impostazione automatica reperibilità da calendario: ${isInStandbyCalendar ? 'ATTIVATA' : 'DISATTIVATA'}`);
        setForm(prevForm => ({
          ...prevForm,
          reperibilita: isInStandbyCalendar,
          reperibilityManualOverride: false // Reset dell'override al cambio data
        }));
      }
      
      // Imposta il flag di inizializzazione a true dopo la verifica
      setIsStandbyCalendarInitialized(true);
    } catch (error) {
      console.error('Errore nella verifica del calendario reperibilità:', error);
      setIsDateInStandbyCalendar(false);
      setIsStandbyCalendarInitialized(true);
    }
  }, [form.date, settings?.standbySettings, isEdit]);

  // Gestione cambio data
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && dateField === 'mainDate') {
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      setForm({ ...form, date: `${day}/${month}/${year}` });
    } else if (selectedDate && dateField) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      if (dateField.startsWith('viaggio')) {
        const [_, idx, field] = dateField.split('-');
        const viaggi = [...form.viaggi];
        viaggi[parseInt(idx)][field] = timeString;
        
        // Auto-compilazione orari specifici - sempre attiva
        if (field === 'arrival_site') {
          // Quando inserisci "ora arrivo cantiere", auto-compila sempre "ora inizio 1° turno"
          viaggi[parseInt(idx)].work_start_1 = timeString;
        } else if (field === 'work_end_2') {
          // Quando inserisci "ora fine 2° turno", auto-compila sempre "ora partenza rientro"
          viaggi[parseInt(idx)].departure_return = timeString;
        }
        
        setForm({ ...form, viaggi });
      } else if (dateField.startsWith('intervento')) {
        const [_, idx, field] = dateField.split('-');
        const interventi = form.interventi.map(i => ({...i}));
        interventi[parseInt(idx)][field] = timeString;
        
        // Auto-compilazione orari specifici per interventi - sempre attiva
        if (field === 'arrival_site') {
          // Quando inserisci "ora arrivo cantiere", auto-compila sempre "ora inizio 1° turno"
          interventi[parseInt(idx)].work_start_1 = timeString;
        } else if (field === 'work_end_2') {
          // Quando inserisci "ora fine 2° turno", auto-compila sempre "ora partenza rientro"
          interventi[parseInt(idx)].departure_return = timeString;
        }
        
        setForm({ ...form, interventi });
      }
    }
    setDateField(null);
  };

  // Gestione cambio testo
  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  // Gestione cambio veicolo
  const handleVeicoloChange = (value) => {
    setForm({ ...form, veicolo: value });
  };

  // Aggiungi viaggio/lavoro
  const addViaggio = () => {
    const newViaggio = {
      departure_company: '',
      arrival_site: '',
      work_start_1: '',
      work_end_1: '',
      work_start_2: '',
      work_end_2: '',
      departure_return: '',
      arrival_company: '',
    };
    
    const newViaggi = [...form.viaggi, newViaggio];
    
    console.log("🚀 MULTI-TURNO: Aggiunto nuovo turno:", {
      viaggiPrima: form.viaggi.length,
      viaggiDopo: newViaggi.length,
      nuovoViaggio: newViaggio,
      tuttiIViaggi: newViaggi
    });
    
    setForm({ ...form, viaggi: newViaggi });
  };

  // Aggiungi intervento reperibilità
  const addIntervento = () => {
    setForm({ ...form, interventi: [...form.interventi, {
      departure_company: '',
      arrival_site: '',
      work_start_1: '',
      work_end_1: '',
      work_start_2: '',
      work_end_2: '',
      departure_return: '',
      arrival_company: '',
    }] });
  };

  // Gestione toggle pasti con override manuale
  const togglePasto = (type) => {
    const newValue = !form.pasti[type];
    setForm({ 
      ...form, 
      pasti: { ...form.pasti, [type]: newValue },
      // Segna come override manuale per impedire auto-gestione
      [`pasti${type}ManualOverride`]: true,
      ...(type === 'pranzo' ? { mealLunchVoucher: newValue ? 1 : 0 } : {}),
      ...(type === 'cena' ? { mealDinnerVoucher: newValue ? 1 : 0 } : {}),
    });
  };

  // Gestione toggle trasferta
  const toggleTrasferta = () => {
    // Verifica se è un giorno domenicale o festivo
    const dateObj = new Date(form.date.split('/').reverse().join('-'));
    const isSunday = dateObj.getDay() === 0;
    
    // Verifica se è un giorno festivo
    const isHoliday = (() => {
      try {
        const { isItalianHoliday } = require('../constants/holidays');
        return isItalianHoliday(dateObj);
      } catch (e) {
        return false;
      }
    })();
    
    const isSpecialDay = isSunday || isHoliday;
    
    // Controlla se l'indennità di trasferta può essere applicata nei giorni speciali dalle impostazioni
    const canApplyOnSpecialDays = settings?.travelAllowance?.applyOnSpecialDays || false;
    
    // Se l'utente attiva la trasferta, determina se serve un override manuale
    const nuovoValore = !form.trasferta;
    const manualOverride = form.trasfertaManualOverride || (isSpecialDay && nuovoValore);
    
    console.log("Toggle trasferta:", { 
      isSpecialDay, 
      canApplyOnSpecialDays, 
      manualOverride,
      nuovoValore
    });
    
    // Se è un giorno speciale e non è permesso applicare l'indennità, mostra un avviso
    if (isSpecialDay && !canApplyOnSpecialDays && nuovoValore) {
      Alert.alert(
        "Avviso",
        "Nei giorni domenicali e festivi l'indennità di trasferta non viene applicata secondo il CCNL standard.\n\nStai attivando manualmente l'indennità per questa giornata.",
        [
          { 
            text: "Annulla", 
            style: "cancel"
          },
          { 
            text: "Attiva comunque", 
            onPress: () => {
              // Attiva con flag di override manuale
              setForm({ 
                ...form, 
                trasferta: true,
                trasfertaManualOverride: true // Aggiunge un flag di override manuale
              });
              console.log("Applicato override manuale trasferta su giorno speciale");
            }
          }
        ]
      );
    } else {
      // Comportamento normale per i giorni non speciali o quando è già permesso
      // Logica migliorata per gestire l'override manuale
      setForm({ 
        ...form, 
        trasferta: nuovoValore,
        trasfertaManualOverride: manualOverride
      });
      
      // Log per debug
      console.log("Toggle trasferta:", {
        nuovoValore: !form.trasferta, 
        isSpecialDay,
        canApplyOnSpecialDays,
        manualOverride: (form.trasfertaManualOverride || (isSpecialDay && !form.trasferta))
      });
    }
  };

  // Gestione toggle reperibilità
  const toggleReperibilita = () => {
    const nuovoValore = !form.reperibilita;
    
    // Se stai attivando la reperibilità quando dovrebbe essere disattivata secondo il calendario,
    // o disattivando quando dovrebbe essere attiva, è una modifica manuale
    const isOverride = nuovoValore !== isDateInStandbyCalendar;
    
    console.log('Toggle reperibilità manuale:', {
      nuovoValore,
      isDateInStandbyCalendar,
      isOverride
    });
    
    setForm({ 
      ...form, 
      reperibilita: nuovoValore,
      reperibilityManualOverride: isOverride // Flag per indicare override manuale
    });
  };

  // UI per orari viaggio/lavoro
  const renderViaggio = (v, idx, isIntervento = false) => {
    // Crea una funzione per gestire la cancellazione di un campo orario specifico
    const handleClearTime = (field) => {
      const key = `${isIntervento ? 'intervento' : 'viaggio'}-${idx}-${field}`;
      if (isIntervento) {
        const interventi = form.interventi.map(i => ({...i}));
        interventi[idx][field] = '';
        setForm({...form, interventi});
      } else {
        const viaggi = [...form.viaggi];
        viaggi[idx][field] = '';
        setForm({...form, viaggi});
      }
    };

    return (
      <View key={idx} style={styles.viaggioBox}>
        <Text style={styles.viaggioTitle}>{isIntervento ? `Intervento reperibilità #${idx+1}` : `Turno viaggio/lavoro #${idx+1}`}</Text>
        <View style={styles.row}>
          <TimeField 
            label="Partenza azienda" 
            value={v.departure_company} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-departure_company`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('departure_company')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-departure_company`}
          />
          <TimeField 
            label="Arrivo cantiere" 
            value={v.arrival_site} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-arrival_site`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('arrival_site')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-arrival_site`}
          />
        </View>
        <View style={styles.row}>
          <TimeField 
            label="Inizio 1° turno" 
            value={v.work_start_1} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-work_start_1`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('work_start_1')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-work_start_1`}
          />
          <TimeField 
            label="Fine 1° turno" 
            value={v.work_end_1} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-work_end_1`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('work_end_1')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-work_end_1`}
          />
        </View>
        <View style={styles.row}>
          <TimeField 
            label="Inizio 2° turno" 
            value={v.work_start_2} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-work_start_2`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('work_start_2')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-work_start_2`}
          />
          <TimeField 
            label="Fine 2° turno" 
            value={v.work_end_2} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-work_end_2`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('work_end_2')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-work_end_2`}
          />
        </View>
        <View style={styles.row}>
          <TimeField 
            label="Partenza rientro" 
            value={v.departure_return} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-departure_return`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('departure_return')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-departure_return`}
          />
          <TimeField 
            label="Arrivo azienda" 
            value={v.arrival_company} 
            onPress={() => { 
              setDateField(`${isIntervento?'intervento':'viaggio'}-${idx}-arrival_company`); 
              setShowDatePicker(true); 
              setDatePickerMode('time'); 
            }}
            onClear={() => handleClearTime('arrival_company')}
            fieldId={`${isIntervento?'intervento':'viaggio'}-${idx}-arrival_company`}
          />
        </View>
      </View>
    );
  };

  // Campo orario con possibilità di cancellazione
  const TimeField = ({ label, value, onPress, fieldId, onClear }) => {
    // Funzione per cancellare l'orario
    const handleTimeClear = (e) => {
      e.stopPropagation(); // Evita che il click si propaghi al TouchableOpacity contenitore
      
      // Se è stata fornita una funzione onClear specifica, usala
      if (onClear && typeof onClear === 'function') {
        onClear();
      }
      // Altrimenti usa la logica basata sul fieldId
      else if (fieldId) {
        if (fieldId.startsWith('viaggio')) {
          const [type, idx, field] = fieldId.split('-');
          const viaggi = [...form.viaggi];
          viaggi[parseInt(idx)][field] = '';
          setForm({ ...form, viaggi });
        } else if (fieldId.startsWith('intervento')) {
          const [type, idx, field] = fieldId.split('-');
          const interventi = form.interventi.map(i => ({...i}));
          interventi[parseInt(idx)][field] = '';
          setForm({ ...form, interventi });
        }
      }
      
      // Reset del dateField
      setDateField(null);
    };
    
    return (
      <TouchableOpacity 
        style={styles.timeField} 
        onPress={() => {
          onPress();
        }}
      >
        <Text style={styles.timeFieldLabel}>{label}</Text>
        <Text style={styles.timeFieldValue}>{value || '--:--'}</Text>
        <View style={styles.timeFieldActions}>
          <Ionicons name="time-outline" size={16} color={styles.infoText.color} style={{marginRight: 10}} />
          {value && (
            <TouchableOpacity 
              onPress={(e) => handleTimeClear(e)}
              hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              accessible={true}
              accessibilityLabel={`Cancella orario ${label}`}
              accessibilityHint={`Cancella l'orario ${label} impostato a ${value}`}
            >
              <Ionicons name="close-circle" size={18} color={styles.iconError.color} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Funzione per cancellare l'inserimento
  const handleDelete = async () => {
    if (!entryId) return;
    Alert.alert(
      'Conferma eliminazione',
      'Sei sicuro di voler eliminare questo inserimento? L\'operazione non è reversibile.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
            try {
              await DatabaseService.deleteWorkEntry(entryId);
              Alert.alert('Eliminato', 'Inserimento eliminato con successo.');
              // Torna alla schermata precedente con refresh
              navigation.navigate('TimeEntryScreen', { refreshFromForm: true });
            } catch (e) {
              Alert.alert('Errore', 'Errore durante la cancellazione dal database.');
            }
          }
        }
      ]
    );
  };

  // Auto-regole basate sugli orari inseriti dall'utente
  useEffect(() => {
    // Verifica se ci sono orari effettivamente inseriti nei turni o negli interventi
    const hasTimeInputs = form.viaggi.some(v => 
      v.departure_company || v.arrival_site || v.work_start_1 || v.work_end_1 || 
      v.work_start_2 || v.work_end_2 || v.departure_return || v.arrival_company
    ) || form.interventi.some(v => 
      v.departure_company || v.arrival_site || v.work_start_1 || v.work_end_1 || 
      v.work_start_2 || v.work_end_2 || v.departure_return || v.arrival_company
    );

    // Solo se l'utente ha inserito degli orari, applica le regole automatiche
    if (!hasTimeInputs) {
      // Nessun orario inserito - non attivare automaticamente nulla
      return;
    }

    // Logica per i pasti - basata su pause orarie reali tra fine 1° turno e prossimo orario
    let autoPranzo = false, autoCena = false;
    
    // Analizza tutti i turni: viaggi principali + interventi reperibilità
    const allShifts = [...form.viaggi, ...form.interventi];
    
    allShifts.forEach((v, index) => {
      const shiftType = index < form.viaggi.length ? 'turno' : 'intervento';
      const shiftNumber = index < form.viaggi.length ? index + 1 : index - form.viaggi.length + 1;
      
      if (v.work_end_1) {
        // Trova il prossimo orario inserito dopo la fine del 1° turno
        const nextTimeSlots = [
          { field: 'work_start_2', time: v.work_start_2, source: `${shiftType} #${shiftNumber}` },
          { field: 'departure_return', time: v.departure_return, source: `${shiftType} #${shiftNumber}` },
          { field: 'arrival_company', time: v.arrival_company, source: `${shiftType} #${shiftNumber}` }
        ].filter(slot => slot.time); // Solo orari effettivamente inseriti
        
        // Se non ci sono orari nel turno corrente, cerca nel turno successivo
        if (nextTimeSlots.length === 0 && index < allShifts.length - 1) {
          for (let nextIndex = index + 1; nextIndex < allShifts.length; nextIndex++) {
            const nextShift = allShifts[nextIndex];
            const nextShiftType = nextIndex < form.viaggi.length ? 'turno' : 'intervento';
            const nextShiftNumber = nextIndex < form.viaggi.length ? nextIndex + 1 : nextIndex - form.viaggi.length + 1;
            
            if (nextShift.departure_company || nextShift.arrival_site || nextShift.work_start_1) {
              // Prendi il primo orario disponibile del turno successivo
              const firstAvailableTime = nextShift.departure_company || nextShift.arrival_site || nextShift.work_start_1;
              nextTimeSlots.push({ 
                field: 'next_shift_start', 
                time: firstAvailableTime, 
                source: `${nextShiftType} #${nextShiftNumber}` 
              });
              break;
            }
          }
        }
        
        if (nextTimeSlots.length > 0) {
          // Prendi il primo orario inserito dopo fine 1° turno
          const nextTime = nextTimeSlots[0].time;
          const nextSource = nextTimeSlots[0].source;
          
          const [h1, m1] = v.work_end_1.split(':').map(Number);
          const [h2, m2] = nextTime.split(':').map(Number);
          const end1 = h1 * 60 + m1;
          const start2 = h2 * 60 + m2;
          const pausa = start2 - end1;
          
          console.log(`Analisi pausa ${shiftType} #${shiftNumber}: Fine 1° turno ${v.work_end_1} → Prossimo orario ${nextTime} (da ${nextSource}) = ${pausa} min`);
          
          // Pausa pranzo (11:00-15:00, minimo 30 min)
          if (pausa >= 30 && h1 >= 11 && h1 <= 14 && h2 >= 12 && h2 <= 15) {
            autoPranzo = true;
            console.log(`✅ Rilevata pausa pranzo automatica da ${shiftType} #${shiftNumber} → ${nextSource}`);
          }
          // Pausa cena (18:00-22:00, minimo 30 min)
          if (pausa >= 30 && h1 >= 18 && h1 <= 21 && h2 >= 19 && h2 <= 22) {
            autoCena = true;
            console.log(`✅ Rilevata pausa cena automatica da ${shiftType} #${shiftNumber} → ${nextSource}`);
          }
        } else {
          console.log(`Nessun orario successivo inserito dopo fine 1° turno ${shiftType} #${shiftNumber} - nessun rimborso automatico`);
        }
      }
    });
    
    // Attiva i pasti solo se identificate le pause e non sono già attivi E non c'è override manuale
    if (autoPranzo && !form.pasti.pranzo && !form.pastipranzoManualOverride) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, pranzo: true } }));
    }
    if (autoCena && !form.pasti.cena && !form.pasticenaManualOverride) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, cena: true } }));
    }
    
    // Disattiva i pasti se non ci sono più pause valide E non c'è override manuale
    if (!autoPranzo && form.pasti.pranzo && !form.pastipranzoManualOverride) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, pranzo: false } }));
    }
    if (!autoCena && form.pasti.cena && !form.pasticenaManualOverride) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, cena: false } }));
    }

    // Logica per la trasferta - solo se ci sono viaggi validi E non c'è override manuale
    const viaggiValidi = form.viaggi.some(v => v.departure_company && v.arrival_site);
    
    if (viaggiValidi && !form.trasfertaManualOverride) {
      // Calcolo ore viaggio e lavoro
      let totalWork = 0, totalTravel = 0, maxTravel = 0;
      
      form.viaggi.forEach(v => {
        // Ore lavoro
        if (v.work_start_1 && v.work_end_1) {
          const [h1, m1] = v.work_start_1.split(':').map(Number);
          const [h2, m2] = v.work_end_1.split(':').map(Number);
          totalWork += ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        }
        if (v.work_start_2 && v.work_end_2) {
          const [h1, m1] = v.work_start_2.split(':').map(Number);
          const [h2, m2] = v.work_end_2.split(':').map(Number);
          totalWork += ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
        }
        
        // Ore viaggio
        if (v.departure_company && v.arrival_site) {
          const [h1, m1] = v.departure_company.split(':').map(Number);
          const [h2, m2] = v.arrival_site.split(':').map(Number);
          const travel = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
          totalTravel += travel;
          if (travel > maxTravel) maxTravel = travel;
        }
        if (v.departure_return && v.arrival_company) {
          const [h1, m1] = v.departure_return.split(':').map(Number);
          const [h2, m2] = v.arrival_company.split(':').map(Number);
          const travel = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
          totalTravel += travel;
          if (travel > maxTravel) maxTravel = travel;
        }
      });
      
      // Giornata intera: lavoro+viaggio >=8h oppure viaggio >=8h
      const giornataIntera = (totalWork + totalTravel) >= 8 || maxTravel >= 8;
      
      // Verifica se è un giorno domenicale o festivo
      const dateObj = new Date(form.date.split('/').reverse().join('-'));
      const isSunday = dateObj.getDay() === 0;
      const isSpecialDay = isSunday; // Semplificato per ora
      
      // Controlla le impostazioni per giorni speciali
      const canApplyOnSpecialDays = settings?.travelAllowance?.applyOnSpecialDays || false;
      
      // Attiva trasferta solo se appropriato e se c'è effettivamente del viaggio
      if (totalTravel > 0 && (!isSpecialDay || canApplyOnSpecialDays)) {
        if (!form.trasferta) {
          setForm(f => ({ 
            ...f, 
            trasferta: true,
            trasfertaPercent: giornataIntera ? 1.0 : 0.5
          }));
        } else {
          // Aggiorna solo la percentuale se già attiva
          setForm(f => ({ 
            ...f, 
            trasfertaPercent: giornataIntera ? 1.0 : 0.5
          }));
        }
      }
    }
  }, [form.viaggi, form.interventi, form.trasfertaManualOverride, form.pasti, settings]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={styles.headerIcon.color} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifica Inserimento' : 'Nuovo Inserimento'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messaggio Auto-compilazione */}
        {vacationAutoCompile.autoCompileMessage && (
          <View style={styles.autoCompileNotice}>
            <MaterialCommunityIcons name="information" size={20} color={styles.infoText.color} />
            <Text style={styles.autoCompileMessage}>
              {vacationAutoCompile.autoCompileMessage}
            </Text>
          </View>
        )}

        {/* Data e Tipo Giornata Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Data e Tipo Giornata" 
            icon="calendar" 
            iconColor={styles.infoText.color} 
            styles={styles}
          />
          
          <View style={styles.dateTypeContainer}>
            {/* Campo Data */}
            <View style={styles.dateFieldContainer}>
              <Text style={styles.fieldLabel}>
                Data <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TouchableOpacity 
                style={styles.dateInputField}
                onPress={() => { setDateField('mainDate'); setShowDatePicker(true); setDatePickerMode('date'); }}
              >
                <MaterialCommunityIcons name="calendar-outline" size={20} color={styles.infoText.color} />
                <Text style={styles.dateText}>{form.date}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={styles.iconSecondary.color} />
              </TouchableOpacity>
            </View>

            {/* Campo Tipo Giornata */}
            <View style={styles.typeFieldContainer}>
              <Text style={styles.fieldLabel}>
                Tipo giornata <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.typeContainer}>
                {dayTypes.map(dt => {
                  const isSelected = dayType === dt.value;
                  return (
                    <TouchableOpacity
                      key={dt.value}
                      style={[
                        styles.typeChip,
                        isSelected && { backgroundColor: dt.color, borderColor: dt.color }
                      ]}
                      onPress={() => setDayType(dt.value)}
                    >
                      <MaterialCommunityIcons 
                        name={dt.icon} 
                        size={16} 
                        color={isSelected ? 'white' : dt.color} 
                      />
                      <Text style={[
                        styles.typeChipText,
                        isSelected && { color: 'white', fontWeight: '600' }
                      ]}>
                        {dt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Badge informativo del tipo selezionato */}
          {dayType !== 'lavorativa' && (
            <View style={styles.dayTypeInfo}>
              <MaterialCommunityIcons 
                name="information" 
                size={16} 
                color={dayTypes.find(dt => dt.value === dayType)?.color || styles.iconSecondary.color} 
              />
              <Text style={styles.dayTypeInfoText}>
                {dayType === 'ferie' && 'Giornata di ferie - Retribuzione fissa secondo CCNL'}
                {dayType === 'permesso' && 'Permesso retribuito - Retribuzione fissa secondo CCNL'}
                {dayType === 'malattia' && 'Giornata di malattia - Gestione secondo normativa'}
                {dayType === 'riposo' && 'Riposo compensativo - Recupero ore straordinarie'}
              </Text>
            </View>
          )}
        </ModernCard>

        {/* Informazioni Sito Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Informazioni Sito" 
            icon="map-marker" 
            iconColor="#FF9800" 
            styles={styles}
          />
          <InputRow label="Nome cantiere" styles={styles}>
            <TextInput
              style={styles.modernInput}
              value={form.site_name}
              onChangeText={v => handleChange('site_name', v)}
              placeholder="Facoltativo"
              placeholderTextColor={styles.inputText.color}
            />
          </InputRow>
          
          <InputRow label="Veicolo usato" required styles={styles}>
            <View style={styles.vehicleGrid}>
              {veicoloOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.vehicleGridButton,
                    form.veicolo === opt.value && styles.vehicleGridButtonActive
                  ]}
                  onPress={() => handleChange('veicolo', opt.value)}
                >
                  <MaterialCommunityIcons 
                    name={opt.icon} 
                    size={20} 
                    color={form.veicolo === opt.value ? 'white' : styles.iconSecondary.color} 
                  />
                  <Text style={[
                    styles.vehicleGridButtonText,
                    form.veicolo === opt.value && styles.vehicleGridButtonTextActive
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </InputRow>
          
          {/* Campo targa/numero veicolo - mostra solo se ha guidato */}
          {form.veicolo !== 'non_guidato' && (
            <InputRow label="Targa/Numero veicolo" icon="card-text-outline" styles={styles}>
              <TextInput
                style={styles.modernInput}
                value={form.targa_veicolo}
                onChangeText={v => handleChange('targa_veicolo', v)}
                placeholder="es. AB123CD o numero aziendale"
                placeholderTextColor={styles.inputText.color}
                autoCapitalize="characters"
              />
            </InputRow>
          )}
        </ModernCard>

        {/* Orari Viaggio/Lavoro Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Orari Viaggio e Lavoro" 
            icon="clock-outline" 
            iconColor="#4CAF50" 
            styles={styles}
          />
          {form.viaggi.map((v, idx) => (
            <View key={idx} style={styles.timeShiftContainer}>
              <View style={styles.shiftHeader}>
                <MaterialCommunityIcons name="briefcase-outline" size={18} color="#4CAF50" />
                <Text style={styles.shiftTitle}>Turno #{idx + 1}</Text>
                <TouchableOpacity
                  style={styles.removeShiftButton}
                  onPress={() => {
                    const newViaggi = form.viaggi.filter((_, i) => i !== idx);
                    // Se rimane solo un turno vuoto, mantienilo, altrimenti se rimangono 0 turni, crea un turno vuoto
                    const finalViaggi = newViaggi.length === 0 ? [{
                      departure_company: '',
                      arrival_site: '',
                      work_start_1: '',
                      work_end_1: '',
                      work_start_2: '',
                      work_end_2: '',
                      departure_return: '',
                      arrival_company: '',
                    }] : newViaggi;
                    setForm({ ...form, viaggi: finalViaggi });
                  }}
                >
                  <MaterialCommunityIcons name="close" size={16} color="#f44336" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeFieldsGrid}>
                <TimeFieldModern 
                  label="Partenza azienda" 
                  value={v.departure_company}
                  icon="office-building"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-departure_company`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].departure_company = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Arrivo cantiere" 
                  value={v.arrival_site}
                  icon="map-marker"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-arrival_site`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].arrival_site = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Inizio 1° turno" 
                  value={v.work_start_1}
                  icon="play"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-work_start_1`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].work_start_1 = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Fine 1° turno" 
                  value={v.work_end_1}
                  icon="stop"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-work_end_1`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].work_end_1 = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Inizio 2° turno" 
                  value={v.work_start_2}
                  icon="play"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-work_start_2`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].work_start_2 = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Fine 2° turno" 
                  value={v.work_end_2}
                  icon="stop"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-work_end_2`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].work_end_2 = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Partenza rientro" 
                  value={v.departure_return}
                  icon="map-marker-radius"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-departure_return`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].departure_return = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
                <TimeFieldModern 
                  label="Arrivo azienda" 
                  value={v.arrival_company}
                  icon="office-building"
                  onPress={() => { 
                    setDateField(`viaggio-${idx}-arrival_company`); 
                    setShowDatePicker(true); 
                    setDatePickerMode('time'); 
                  }}
                  onClear={() => {
                    const viaggi = [...form.viaggi];
                    viaggi[idx].arrival_company = '';
                    setForm({...form, viaggi});
                  }}
                  styles={styles}
                />
              </View>
            </View>
          ))}
          
          <TouchableOpacity style={styles.addButton} onPress={addViaggio}>
            <MaterialCommunityIcons name="plus" size={20} color="#4CAF50" />
            <Text style={styles.addButtonText}>Aggiungi turno</Text>
          </TouchableOpacity>
        </ModernCard>

        {/* Reperibilità Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Reperibilità" 
            icon="phone-alert" 
            iconColor="#FF9800" 
            styles={styles}
          />
          
          <ModernSwitch
            label="Attiva reperibilità"
            value={form.reperibilita}
            onValueChange={toggleReperibilita}
            description="Indica se questo è un giorno di reperibilità"
            styles={styles}
          />

          {isStandbyCalendarInitialized && form.reperibilityManualOverride && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert" size={16} color="#FF9800" />
              <Text style={styles.warningText}>
                {isDateInStandbyCalendar && !form.reperibilita 
                  ? "Reperibilità disattivata manualmente (prevista da calendario)" 
                  : !isDateInStandbyCalendar && form.reperibilita 
                    ? "Reperibilità attivata manualmente (non prevista da calendario)" 
                    : "Impostazione modificata manualmente"}
              </Text>
            </View>
          )}

          {form.reperibilita && (
            <>
              <Text style={styles.subsectionTitle}>Interventi di Reperibilità</Text>
              {form.interventi.map((v, idx) => (
                <View key={idx} style={styles.interventoContainer}>
                  <View style={styles.interventoHeader}>
                    <MaterialCommunityIcons name="phone-ring" size={16} color="#FF9800" />
                    <Text style={styles.interventoTitle}>Intervento #{idx + 1}</Text>
                    <TouchableOpacity
                      style={styles.removeInterventoButton}
                      onPress={() => {
                        const newInterventi = form.interventi.filter((_, i) => i !== idx);
                        setForm({ ...form, interventi: newInterventi });
                      }}
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.timeFieldsGrid}>
                    <TimeFieldModern 
                      label="Partenza azienda" 
                      value={v.departure_company}
                      icon="office-building"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-departure_company`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].departure_company = '';
                        setForm({...form, interventi});
                      }}
                      styles={styles}
                    />
                    <TimeFieldModern 
                      label="Arrivo cantiere" 
                      value={v.arrival_site}
                      icon="map-marker"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-arrival_site`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].arrival_site = '';
                        setForm({...form, interventi});
                      }}
                      styles={styles}
                    />
                    <TimeFieldModern 
                      label="Inizio 1° turno" 
                      value={v.work_start_1}
                      icon="play"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-work_start_1`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].work_start_1 = '';
                        setForm({...form, interventi});
                      }}
                      styles={styles}
                    />
                    <TimeFieldModern 
                      label="Fine 1° turno" 
                      value={v.work_end_1}
                      icon="stop"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-work_end_1`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].work_end_1 = '';
                        interventi[idx].work_end_1 = '';
                        setForm({...form, interventi});
                      }}
                    />
                    <TimeFieldModern 
                      label="Inizio 2° turno" 
                      value={v.work_start_2}
                      icon="play"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-work_start_2`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].work_start_2 = '';
                        setForm({...form, interventi});
                      }}
                    />
                    <TimeFieldModern 
                      label="Fine 2° turno" 
                      value={v.work_end_2}
                      icon="stop"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-work_end_2`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].work_end_2 = '';
                        setForm({...form, interventi});
                      }}
                    />
                    <TimeFieldModern 
                      label="Partenza rientro" 
                      value={v.departure_return}
                      icon="map-marker-radius"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-departure_return`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].departure_return = '';
                        setForm({...form, interventi});
                      }}
                    />
                    <TimeFieldModern 
                      label="Arrivo azienda" 
                      value={v.arrival_company}
                      icon="office-building"
                      onPress={() => { 
                        setDateField(`intervento-${idx}-arrival_company`); 
                        setShowDatePicker(true); 
                        setDatePickerMode('time'); 
                      }}
                      onClear={() => {
                        const interventi = [...form.interventi];
                        interventi[idx].arrival_company = '';
                        setForm({...form, interventi});
                      }}
                    />
                  </View>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addButton} onPress={addIntervento}>
                <MaterialCommunityIcons name="plus" size={20} color="#FF9800" />
                <Text style={[styles.addButtonText, { color: theme.colors.warning }]}>Aggiungi intervento</Text>
              </TouchableOpacity>
            </>
          )}
        </ModernCard>

        {/* Rimborsi Pasti Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Rimborsi Pasti" 
            icon="food" 
            iconColor="#4CAF50" 
            styles={styles}
          />
          
          <View style={styles.mealsContainer}>
            <ModernSwitch
              label="Pranzo"
              value={form.pasti.pranzo}
              onValueChange={() => togglePasto('pranzo')}
              description="Includi rimborso pranzo"
              styles={styles}
            />
            
            <ModernSwitch
              label="Cena"
              value={form.pasti.cena}
              onValueChange={() => togglePasto('cena')}
              description="Includi rimborso cena"
              styles={styles}
            />
          </View>

          {/* Cash Pranzo */}
          {(settings?.mealAllowances?.lunch?.cashAmount > 0 || settings?.mealAllowances?.lunch?.allowManualCash) && form.pasti.pranzo && (
            <InputRow label="Importo cash pranzo" styles={styles}>
              <View style={styles.cashInputContainer}>
                <TextInput
                  style={styles.cashInput}
                  value={mealCash.pranzo}
                  onChangeText={v => {
                    const newValue = v.replace(/[^0-9.,]/g,'');
                    setMealCash(c => ({...c, pranzo: newValue}));
                    setForm(f => ({...f, mealLunchCash: parseFloat(newValue.replace(',','.')) || 0}));
                  }}
                  placeholder="0,00"
                  keyboardType="numeric"
                  placeholderTextColor={styles.currencySymbol.color}
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </InputRow>
          )}

          {/* Cash Cena */}
          {(settings?.mealAllowances?.dinner?.cashAmount > 0 || settings?.mealAllowances?.dinner?.allowManualCash) && form.pasti.cena && (
            <InputRow label="Importo cash cena" styles={styles}>
              <View style={styles.cashInputContainer}>
                <TextInput
                  style={styles.cashInput}
                  value={mealCash.cena}
                  onChangeText={v => {
                    const newValue = v.replace(/[^0-9.,]/g,'');
                    setMealCash(c => ({...c, cena: newValue}));
                    setForm(f => ({...f, mealDinnerCash: parseFloat(newValue.replace(',','.')) || 0}));
                  }}
                  placeholder="0,00"
                  keyboardType="numeric"
                  placeholderTextColor={styles.currencySymbol.color}
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </InputRow>
          )}

          {/* Trasferta Card */}
          <SectionHeader 
            title="Indennità Trasferta" 
            icon="map-marker-distance" 
            iconColor="#9C27B0" 
            styles={styles}
          />
          
          <ModernSwitch
            label="Attiva indennità trasferta"
            value={form.trasferta}
            onValueChange={toggleTrasferta}
            description="Indennità per lavoro fuori sede"
            styles={styles}
          />
        </ModernCard>

        {/* Completamento Giornata Card */}
        {(() => {
          const selectedDate = form.date ? new Date(form.date.split('/').reverse().join('-')) : new Date();
          const isSaturday = selectedDate.getDay() === 6;
          const isSunday = selectedDate.getDay() === 0;
          const isHoliday = (() => {
            try {
              const { isItalianHoliday } = require('../constants/holidays');
              return isItalianHoliday(selectedDate);
            } catch (e) {
              return false;
            }
          })();
          
          // Calcola le ore totali lavorate (viaggio + lavoro)
          const calculateTotalHours = () => {
            let totalMinutes = 0;
            
            // Funzione helper per calcolare la differenza di tempo considerando i turni notturni
            const getTimeDifferenceInMinutes = (startTime, endTime) => {
              if (!startTime || !endTime) return 0;
              
              const start = new Date(`1970-01-01T${startTime}:00`);
              let end = new Date(`1970-01-01T${endTime}:00`);
              
              // Se l'orario di fine è minore di quello di inizio, aggiungi un giorno (turno notturno)
              if (end <= start) {
                end = new Date(`1970-01-02T${endTime}:00`);
              }
              
              return (end - start) / (1000 * 60);
            };
            
            // Ore di viaggio
            form.viaggi.forEach(viaggio => {
              if (viaggio.departure_company && viaggio.arrival_site) {
                totalMinutes += getTimeDifferenceInMinutes(viaggio.departure_company, viaggio.arrival_site);
              }
              if (viaggio.departure_return && viaggio.arrival_company) {
                totalMinutes += getTimeDifferenceInMinutes(viaggio.departure_return, viaggio.arrival_company);
              }
            });
            
            // Ore di lavoro
            form.viaggi.forEach(viaggio => {
              if (viaggio.work_start_1 && viaggio.work_end_1) {
                totalMinutes += getTimeDifferenceInMinutes(viaggio.work_start_1, viaggio.work_end_1);
              }
              if (viaggio.work_start_2 && viaggio.work_end_2) {
                totalMinutes += getTimeDifferenceInMinutes(viaggio.work_start_2, viaggio.work_end_2);
              }
            });
            
            return totalMinutes / 60; // Converti in ore
          };
          
          const totalHours = calculateTotalHours();
          const hasEightHours = totalHours >= 8;
          
          // Verifica se sabato è lavorativo dalle impostazioni
          const isSaturdayWorking = settings?.saturdayWorking === true;
          const isWeekday = !isSunday && !isHoliday && (!isSaturday || isSaturdayWorking);
          
          // Mostra la card solo per giorni feriali/sabato lavorativo quando mancano le 8 ore
          if (isWeekday && !hasEightHours) {
            return (
              <ModernCard style={styles.cardSpacing} styles={styles}>
                <SectionHeader 
                  title="Completamento Giornata" 
                  icon="clock-check" 
                  iconColor="#FF5722" 
                  styles={styles}
                />
                <Text style={styles.sectionDescription}>
                  Hai lavorato {totalHours.toFixed(1)} ore su 8 richieste. Come vuoi completare la giornata?
                </Text>
                
                <View style={styles.completamentoGrid}>
                  {completamentoOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.completamentoCard,
                        form.completamentoGiornata === option.value && styles.completamentoCardActive
                      ]}
                      onPress={() => setForm(f => ({...f, completamentoGiornata: option.value}))}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={24}
                        color={form.completamentoGiornata === option.value ? 'white' : option.color}
                      />
                      <Text style={[
                        styles.completamentoCardText,
                        form.completamentoGiornata === option.value && styles.completamentoCardTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ModernCard>
            );
          } else {
            if (form.completamentoGiornata !== 'nessuno') {
              setForm(f => ({...f, completamentoGiornata: 'nessuno'}));
            }
            return null; // Non mostrare la card se non necessaria
          }
        })()}

        {/* Note Card */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <SectionHeader 
            title="Note" 
            icon="note-text" 
            iconColor="#607D8B" 
            styles={styles}
          />
          <TextInput
            style={styles.notesInput}
            value={form.note}
            onChangeText={v => handleChange('note', v)}
            placeholder="Aggiungi una nota (opzionale)"
            placeholderTextColor={styles.notesInput.color}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ModernCard>

        {/* Riepilogo Guadagni */}
        <ModernCard style={styles.cardSpacing} styles={styles}>
          <EarningsSummary 
            form={form} 
            settings={settings} 
            isDateInStandbyCalendar={isDateInStandbyCalendar} 
            isStandbyCalendarInitialized={isStandbyCalendarInitialized}
            reperibilityManualOverride={form.reperibilityManualOverride}
            dayType={form.dayType || dayType}
            styles={styles}
          />
        </ModernCard>
      </ScrollView>

      {/* Pulsanti Fluttuanti */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.floatingButton, styles.cancelButton]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Annulla</Text>
        </TouchableOpacity>
        
        {isEdit && (
          <TouchableOpacity
            style={[styles.floatingButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="delete" size={24} color="white" />
            <Text style={styles.floatingButtonText}>Elimina</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.floatingButton, styles.saveButton]}
          onPress={async () => {
            try {
              const viaggi = form.viaggi[0] || {};
              
              // 🚀 MULTI-TURNO: Estrai turni aggiuntivi per salvataggio
              const additionalShifts = form.viaggi.slice(1) || [];
              console.log("🔥 SALVATAGGIO MULTI-TURNO:", {
                totalViaggi: form.viaggi.length,
                primaryShift: viaggi,
                additionalShifts: additionalShifts,
                willSaveAdditionalShifts: additionalShifts.length > 0
              });
              
              const entry = {
                date: (() => {
                  const [d, m, y] = form.date.split('/');
                  return `${y}-${m}-${d}`;
                })(),
                siteName: form.site_name || '',
                vehicleDriven: form.veicolo || '',                targaVeicolo: form.targa_veicolo || '',
                departureCompany: viaggi.departure_company || '',
                arrivalSite: viaggi.arrival_site || '',
                workStart1: viaggi.work_start_1 || '',
                workEnd1: viaggi.work_end_1 || '',
                workStart2: viaggi.work_start_2 || '',
                workEnd2: viaggi.work_end_2 || '',
                departureReturn: viaggi.departure_return || '',
                arrivalCompany: viaggi.arrival_company || '',
                // 🚀 MULTI-TURNO: Salva turni aggiuntivi
                viaggi: additionalShifts,
                interventi: form.interventi || [],
                mealLunchVoucher: form.pasti.pranzo && !(mealCash.pranzo && parseFloat(mealCash.pranzo) > 0) ? 1 : 0,
                mealLunchCash: mealCash.pranzo && parseFloat(mealCash.pranzo) > 0 ? parseFloat(mealCash.pranzo.replace(',','.')) : 0,
                mealDinnerVoucher: form.pasti.cena && !(mealCash.cena && parseFloat(mealCash.cena) > 0) ? 1 : 0,
                mealDinnerCash: mealCash.cena && parseFloat(mealCash.cena) > 0 ? parseFloat(mealCash.cena.replace(',','.')) : 0,
                travelAllowance: form.trasferta ? 1 : 0,
                travelAllowancePercent: form.trasfertaPercent || 1.0,
                trasfertaManualOverride: form.trasfertaManualOverride || false,
                standbyAllowance: form.reperibilita ? 1 : 0,
                isStandbyDay: form.reperibilita ? 1 : 0,
                reperibilityManualOverride: form.reperibilityManualOverride || false,
                completamentoGiornata: form.completamentoGiornata || 'nessuno',
                totalEarnings: 0,
                notes: form.note || '',
                dayType,
                // Nuovi campi per giorni fissi
                isFixedDay: form.isFixedDay || ['ferie', 'malattia', 'riposo', 'permesso'].includes(dayType),
                fixedEarnings: form.fixedEarnings || ((['ferie', 'malattia', 'riposo', 'permesso'].includes(dayType)) ? (settings?.contract?.dailyRate || 109.19) : 0)
              };
              
              const settingsObj = settings || {};
              
              // Se è un giorno fisso, usa la retribuzione fissa
              if (entry.isFixedDay) {
                entry.totalEarnings = entry.fixedEarnings;
              } else {
                const result = await calculationService.calculateEarningsBreakdown(entry, settingsObj);
                entry.totalEarnings = result.totalEarnings || 0;
              }
              
              const { validateWorkEntry } = require('../utils');
              const { isValid, errors } = validateWorkEntry(entry);
              if (!isValid) {
                const firstError = Object.values(errors)[0];
                Alert.alert('Errore', firstError || 'Dati non validi');
                return;
              }
              
              if (isEdit) {
                console.log('🔥 FORM: Aggiornando entry esistente ID:', entryId);
                await DatabaseService.updateWorkEntry(entryId, entry);
                Alert.alert('Aggiornamento', 'Inserimento aggiornato con successo!');
              } else {
                console.log('🔥 FORM: Inserendo nuovo entry nel database:', {
                  date: entry.date,
                  siteName: entry.siteName,
                  totalEarnings: entry.totalEarnings,
                  formComplete: true
                });
                const insertResult = await DatabaseService.insertWorkEntry(entry);
                console.log('🔥 FORM: Risultato inserimento:', insertResult);
                Alert.alert('Salvataggio', 'Inserimento salvato su database!');
              }
              
              // Controllo notifica straordinario (solo per giornate lavorative)
              if (!['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(dayType)) {
                try {
                  // Calcola le ore totali di lavoro (esclusi viaggi)
                  const totalWorkHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                        (breakdown?.ordinary?.hours?.lavoro_extra || 0) +
                                        (breakdown?.standby ? Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) : 0);
                  
                  if (totalWorkHours > 0) {
                    await NotificationService.checkOvertimeAlert(totalWorkHours);
                  }
                } catch (notificationError) {
                  console.log('Info: Errore nel controllo notifica straordinario (non critico):', notificationError.message);
                }
              }
              
              // Torna alla schermata precedente con refresh
              navigation.navigate('TimeEntryScreen', { refreshFromForm: true });
            } catch (e) {
              console.error('Save Error:', e);
              Alert.alert('Errore', `Errore durante il salvataggio su database: ${e.message}`)
            }
          }}
        >
          <MaterialCommunityIcons name="content-save" size={24} color="white" />
          <Text style={styles.floatingButtonText}>Salva</Text>
        </TouchableOpacity>
      </View>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode={datePickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.colors.cardElevation,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Auto-compile notice styles
  autoCompileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.info + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  autoCompileMessage: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.info,
    marginLeft: 8,
    lineHeight: 18,
  },

  // Modern card styles
  modernCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    ...theme.colors.cardElevation,
  },
  cardSpacing: {
    marginBottom: 16,
  },

  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 16,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },

  // Input row styles
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  requiredMark: {
    color: theme.colors.error,
  },
  modernInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: theme.colors.text,
  },
  inputText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modernPicker: {
    height: 50,
  },

  // Date and type row
  dateTypeContainer: {
    gap: 16,
  },
  dateFieldContainer: {
    flex: 1,
  },
  typeFieldContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  dateInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    fontWeight: '500',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    gap: 6,
    minWidth: 80,
  },
  typeChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dayTypeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.info + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  dayTypeInfoText: {
    fontSize: 13,
    color: theme.colors.info,
    flex: 1,
    lineHeight: 18,
  },

  // Vehicle buttons
  vehicleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 100,
  },
  vehicleButtonActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  vehicleButtonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    textAlign: 'center',
  },
  vehicleButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // Time fields
  timeShiftContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.success,
    marginLeft: 8,
    flex: 1,
  },
  removeShiftButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernTimeField: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'center',
  },
  timeFieldLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    textAlign: 'center',
  },
  timeFieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeFieldValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 50,
  },
  clearTimeButton: {
    marginLeft: 8,
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Standby/Intervento styles
  interventoContainer: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  interventoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  interventoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
    flex: 1,
  },
  removeInterventoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Switch styles
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchContent: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 13,
    color: '#f57c00',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  // Meals container
  mealsContainer: {
    gap: 8,
  },

  // Cash input
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
  },
  cashInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Completamento giornata
  completamentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  completamentoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minWidth: '45%',
  },
  completamentoCardActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  completamentoCardText: {
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  completamentoCardTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  // Special day info
  specialDayInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.success + '20',
    borderRadius: 12,
    padding: 16,
  },
  specialDayText: {
    fontSize: 14,
    color: theme.colors.success,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Notes input
  notesInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 80,
    color: theme.colors.text,
  },

  // Modern buttons
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...theme.colors.cardElevation,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: theme.colors.text,
  },
  dangerButtonText: {
    color: 'white',
  },
  disabledButtonText: {
    color: theme.colors.primary,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
  },

  // Info badge
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  infoBadgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBadgeValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Modern Earnings Summary styles
  earningsContent: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  totalHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalHoursText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sectionGroup: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  detailHours: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  notesSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textDisabled,
    marginTop: 8,
  },
  modernEarningsContainer: {
    // Usa già gli stili di modernCard
  },
  modernEarningsLoading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  modernEarningsLoadingText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 8,
  },
  modernEarningsTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modernEarningsTotalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernEarningsTotalContent: {
    flex: 1,
  },
  modernEarningsTotalLabel: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  modernEarningsTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  modernEarningsTotalHours: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  modernEarningsBreakdown: {
    marginBottom: 16,
  },
  modernEarningsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modernEarningsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernEarningsItemContent: {
    flex: 1,
  },
  modernEarningsItemLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  modernEarningsItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modernEarningsItemDetail: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  modernEarningsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.info + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  modernEarningsNoteText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.info,
    marginLeft: 8,
    lineHeight: 16,
  },
  modernEarningsEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  modernEarningsEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  modernEarningsEmptyText: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Earnings card improvements
  earningsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...theme.colors.cardElevation,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBadge: {
    backgroundColor: theme.colors.info + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.info,
    letterSpacing: 0.5,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  // Breakdown styles
  breakdownSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 6,
  },
  breakdownSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
    minWidth: 60,
    textAlign: 'right',
  },
  breakdownDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  rateCalc: {
    fontSize: 11,
    color: theme.colors.info,
    marginTop: 4,
    backgroundColor: theme.colors.info + '10',
    padding: 6,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  totalRow: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 8,
    paddingTop: 8,
  },
  breakdownTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  totalSection: {
    backgroundColor: theme.colors.success + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.success + '20',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  // Nuovi stili per griglia veicolo 2x2
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  vehicleGridButton: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 50,
  },
  vehicleGridButtonActive: {
    backgroundColor: theme.colors.info,
    borderColor: theme.colors.info,
  },
  vehicleGridButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  vehicleGridButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  // Stili per pulsanti fluttuanti
  floatingButtons: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    ...theme.colors.cardElevation,
    minWidth: 100,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  saveButton: {
    backgroundColor: theme.colors.success,
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  // Nuovi stili per dark mode
  iconSecondary: {
    color: theme.colors.primary,
  },
  iconError: {
    color: theme.colors.error,
  },
  infoText: {
    color: theme.colors.info,
  },
  switchTrack: {
    backgroundColor: theme.colors.border,
  },
  switchTrackActive: {
    backgroundColor: theme.colors.info + '40',
  },
  switchThumb: {
    backgroundColor: theme.colors.surface,
  },
  switchThumbActive: {
    backgroundColor: theme.colors.info,
  },
  infoBadgeDefault: {
    backgroundColor: theme.colors.info + '20',
    color: theme.colors.info,
  },
  headerIcon: {
    color: theme.colors.text,
  },
});

export default TimeEntryForm;
