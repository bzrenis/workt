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
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { useSettings, useVacationAutoCompile } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { useCalculationService } from '../hooks';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import HolidayService from '../services/HolidayService';
import NotificationService from '../services/NotificationService';

const { width } = Dimensions.get('window');

// Componenti moderni per card e sezioni
const ModernCard = ({ children, style }) => (
  <View style={[styles.modernCard, style]}>
    {children}
  </View>
);

const SectionHeader = ({ title, icon, iconColor = '#666', onPress, expandable = false, expanded = false }) => (
  <TouchableOpacity
    style={styles.sectionHeader}
    onPress={onPress}
    activeOpacity={expandable ? 0.7 : 1}
    disabled={!expandable}
  >
    <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {expandable && (
      <MaterialCommunityIcons 
        name={expanded ? 'chevron-up' : 'chevron-down'} 
        size={20} 
        color="#666" 
      />
    )}
  </TouchableOpacity>
);

const InputRow = ({ label, children, required = false }) => (
  <View style={styles.inputRow}>
    <Text style={styles.inputLabel}>
      {label}
      {required && <Text style={styles.requiredMark}> *</Text>}
    </Text>
    {children}
  </View>
);

const ModernSwitch = ({ label, value, onValueChange, description }) => (
  <View style={styles.switchRow}>
    <View style={styles.switchContent}>
      <Text style={styles.switchLabel}>{label}</Text>
      {description && <Text style={styles.switchDescription}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E0E0E0', true: '#C8E6C9' }}
      thumbColor={value ? '#4CAF50' : '#f4f3f4'}
    />
  </View>
);

const ModernButton = ({ onPress, title, variant = 'primary', icon, disabled = false, style }) => {
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

const InfoBadge = ({ label, value, color = '#4CAF50', backgroundColor = '#E8F5E9' }) => (
  <View style={[styles.infoBadge, { backgroundColor }]}>
    <Text style={[styles.infoBadgeLabel, { color }]}>{label}</Text>
    {value && <Text style={[styles.infoBadgeValue, { color }]}>{value}</Text>}
  </View>
);

const TimeFieldModern = ({ label, value, icon, onPress, onClear }) => (
  <TouchableOpacity style={styles.modernTimeField} onPress={onPress}>
    <View style={styles.timeFieldHeader}>
      <MaterialCommunityIcons name={icon} size={16} color="#666" />
      <Text style={styles.timeFieldLabel}>{label}</Text>
    </View>
    <View style={styles.timeFieldContent}>
      <Text style={styles.timeFieldValue}>{value || '--:--'}</Text>
      {value && (
        <TouchableOpacity
          style={styles.clearTimeButton}
          onPress={(e) => {
            e.stopPropagation();
            onClear();
          }}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <MaterialCommunityIcons name="close-circle" size={18} color="#f44336" />
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

// Earnings Summary Component
const EarningsSummary = ({ form, settings, isDateInStandbyCalendar, isStandbyCalendarInitialized, reperibilityManualOverride, dayType }) => {
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
      fixedEarnings: form.fixedEarnings || (isFixedDay ? (settings?.contract?.dailyRate || 107.69) : 0),
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
      }
    };
    
    // Merge settings (safe)
    const safeSettings = {
      ...defaultSettings,
      ...(settings || {}),
      contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
      standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
      travelHoursSetting: settings?.travelHoursSetting || 'MULTI_SHIFT_OPTIMIZED' // Modalità viaggio predefinita
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
      const result = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
      setBreakdown(result);
      // Log dettagliato per debug breakdown
      if (workEntry.date === '2025-07-06') {
        console.log('DEBUG breakdown 06/07/2025:', JSON.stringify(result, null, 2));
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
    }
  }, [workEntry, settings]);
  
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
    <ModernCard>
      <SectionHeader 
        title="Riepilogo Guadagni" 
        icon="cash-multiple" 
        iconColor="#4CAF50" 
      />
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="calculator" size={32} color="#ccc" />
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
    <ModernCard style={styles.cardSpacing}>
      <SectionHeader 
        title="Riepilogo Guadagni" 
        icon="cash-multiple" 
        iconColor="#4CAF50" 
      />
      
      {/* Sezione speciale per giorni di ferie/malattia/riposo */}
      {breakdown?.isFixedDay && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <TypeIcon type={breakdown?.dayType} size={16} color="#43a047" />
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
            <Text style={styles.rateCalc}>
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
            <MaterialCommunityIcons name="briefcase-clock" size={16} color="#2196F3" />
            <Text style={styles.breakdownSubtitle}>Attività Ordinarie</Text>
          </View>

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
                {breakdown?.ordinary?.earnings?.giornaliera > 0 && (
                  <Text style={styles.rateCalc}>
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
                )}
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
                    <Text style={styles.rateCalc}>
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
                    <Text style={styles.rateCalc}>
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
                    <Text style={styles.rateCalc}>
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
                      <Text style={styles.rateCalc}>
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
                <Text style={styles.rateCalc}>
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
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.ordinary?.hours?.lavoro_extra)}</Text>
              </View>
              {breakdown?.ordinary?.earnings?.lavoro_extra > 0 && breakdown?.ordinary?.hours?.lavoro_extra > 0 && (
                <Text style={styles.rateCalc}>
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
              <Text style={{fontSize: 12, color: '#4CAF50', fontStyle: 'italic', marginTop: 4}}>
                🎯 Modalità Multi-turno Ottimizzata attiva
              </Text>
              <Text style={{fontSize: 12, color: '#4CAF50', fontStyle: 'italic', marginTop: 2}}>
                • Viaggi tra turni considerati come ore lavorative
              </Text>
              <Text style={{fontSize: 12, color: '#4CAF50', fontStyle: 'italic', marginTop: 2}}>
                • Solo primo viaggio (partenza azienda) e ultimo viaggio (arrivo azienda) pagati come viaggio
              </Text>
            </View>
          )}
          
          {/* Nota maggiorazione CCNL */}
          {(breakdown?.details?.isSunday || breakdown?.details?.isHoliday || breakdown?.details?.isSaturday) && (
            <View style={styles.breakdownDetail}>
              <Text style={{fontSize: 12, color: '#1976d2', fontStyle: 'italic', marginTop: 4}}>
                {breakdown?.details?.isSunday ? 
                  `Applicata maggiorazione CCNL domenicale (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                 breakdown?.details?.isHoliday ? 
                  `Applicata maggiorazione CCNL festività (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                  `Applicata maggiorazione CCNL sabato (+${((settings.contract?.overtimeRates?.saturday || 1.25) - 1)*100}%)`}
              </Text>
              {(breakdown?.details?.isSunday || breakdown?.details?.isHoliday) && (
                <>
                  <Text style={{fontSize: 12, color: '#1976d2', fontStyle: 'italic', marginTop: 2}}>
                    La diaria giornaliera non viene applicata nei giorni {breakdown?.details?.isSunday ? 'domenicali' : 'festivi'}.
                  </Text>
                  <Text style={{fontSize: 12, color: '#1976d2', fontStyle: 'italic', marginTop: 2}}>
                    Tutte le ore sono pagate con la maggiorazione CCNL.
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      )}
      
      {!breakdown?.isFixedDay && hasStandbyHours && (
        <View style={styles.breakdownSection}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialCommunityIcons name="alarm-light" size={16} color="#E91E63" />
            <Text style={styles.breakdownSubtitle}>Interventi Reperibilità</Text>
          </View>
          
          {/* Lavoro diurno reperibilità */}
          {breakdown?.standby?.workHours?.ordinary > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Lavoro diurno {breakdown?.standby?.workEarnings?.ordinary && breakdown?.standby?.workHours?.ordinary > 0 
                    ? (() => {
                        const rate = breakdown.standby.workEarnings.ordinary / breakdown.standby.workHours.ordinary;
                        const baseRate = settings.contract?.hourlyRate || 16.41;
                        const percentage = Math.round((rate / baseRate - 1) * 100);
                        return percentage > 0 ? `(+${percentage}%)` : '';
                      })()
                    : ''
                  }
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.workHours?.ordinary)}</Text>
              </View>
              {breakdown?.standby?.workEarnings?.ordinary > 0 && breakdown?.standby?.workHours?.ordinary > 0 && (
                <Text style={styles.rateCalc}>
                  {(breakdown.standby.workEarnings.ordinary / breakdown.standby.workHours.ordinary).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown?.standby?.workHours?.ordinary)} = {breakdown?.standby?.workEarnings?.ordinary.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro serale reperibilità */}
          {breakdown?.standby?.workHours?.evening > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Lavoro serale {breakdown?.standby?.workEarnings?.evening && breakdown?.standby?.workHours?.evening > 0 
                    ? `(+${Math.round(((breakdown.standby.workEarnings.evening / breakdown.standby.workHours.evening) / (settings.contract?.hourlyRate || 16.41) - 1) * 100)}%)`
                    : '(+25%)'
                  }
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.workHours?.evening)}</Text>
              </View>
              {breakdown?.standby?.workEarnings?.evening > 0 && breakdown?.standby?.workHours?.evening > 0 && (
                <Text style={styles.rateCalc}>
                  {(breakdown.standby.workEarnings.evening / breakdown.standby.workHours.evening).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown?.standby?.workHours?.evening)} = {breakdown?.standby?.workEarnings?.evening.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro notturno reperibilità */}
          {breakdown?.standby?.workHours?.night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Lavoro notturno {breakdown?.standby?.workEarnings?.night && breakdown?.standby?.workHours?.night > 0 
                    ? `(+${Math.round(((breakdown.standby.workEarnings.night / breakdown.standby.workHours.night) / (settings.contract?.hourlyRate || 16.41) - 1) * 100)}%)`
                    : '(+25%)'
                  }
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.workHours?.night)}</Text>
              </View>
              {breakdown?.standby?.workEarnings?.night > 0 && breakdown?.standby?.workHours?.night > 0 && (
                <Text style={styles.rateCalc}>
                  {(breakdown.standby.workEarnings.night / breakdown.standby.workHours.night).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown?.standby?.workHours?.night)} = {breakdown?.standby?.workEarnings?.night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro sabato reperibilità */}
          {breakdown?.standby?.workHours?.saturday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Lavoro sabato {breakdown?.standby?.workEarnings?.saturday && breakdown?.standby?.workHours?.saturday > 0 
                    ? `(+${Math.round(((breakdown.standby.workEarnings.saturday / breakdown.standby.workHours.saturday) / (settings.contract?.hourlyRate || 16.41) - 1) * 100)}%)`
                    : '(+25%)'
                  }
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.workHours?.saturday)}</Text>
              </View>
              {breakdown?.standby?.workEarnings?.saturday > 0 && breakdown?.standby?.workHours?.saturday > 0 && (
                <Text style={styles.rateCalc}>
                  {(breakdown.standby.workEarnings.saturday / breakdown.standby.workHours.saturday).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown?.standby?.workHours?.saturday)} = {breakdown?.standby?.workEarnings?.saturday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro festivo/domenica reperibilità */}
          {breakdown?.standby?.workHours?.holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Lavoro festivo {breakdown?.standby?.workEarnings?.holiday && breakdown?.standby?.workHours?.holiday > 0 
                    ? `(+${Math.round(((breakdown.standby.workEarnings.holiday / breakdown.standby.workHours.holiday) / (settings.contract?.hourlyRate || 16.41) - 1) * 100)}%)`
                    : '(+30%)'
                  }
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.workHours?.holiday)}</Text>
              </View>
              {breakdown?.standby?.workEarnings?.holiday > 0 && breakdown?.standby?.workHours?.holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {(breakdown.standby.workEarnings.holiday / breakdown.standby.workHours.holiday).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown?.standby?.workHours?.holiday)} = {breakdown?.standby?.workEarnings?.holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Viaggi reperibilità */}
          {breakdown?.standby?.travelHours?.ordinary > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {(() => {
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      // Verifica se le ore totali superano 8h per determinare se è straordinario
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      return isOvertime ? 'Straordinario diurno (da viaggio reperibilità)' : 'Viaggio diurno';
                    }
                    return 'Viaggio diurno';
                  })()}
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.travelHours?.ordinary)}</Text>
              </View>
              {breakdown?.standby?.travelEarnings?.ordinary > 0 && breakdown?.standby?.travelHours?.ordinary > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      if (isOvertime) {
                        const overtimeRate = settings.contract?.overtimeRates?.day || 1.2;
                        const rate = base * overtimeRate;
                        return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.ordinary)} (Straordinario +20%) = ${breakdown?.standby?.travelEarnings?.ordinary.toFixed(2).replace('.', ',')} €`;
                      }
                    }
                    // Tariffa viaggio normale
                    const rate = base * (settings.travelCompensationRate || 1.0);
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.ordinary)} (Tariffa viaggio ${Math.round((settings.travelCompensationRate || 1.0) * 100)}%) = ${breakdown?.standby?.travelEarnings?.ordinary.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}
          
          {/* Viaggio serale reperibilità */}
          {breakdown?.standby?.travelHours?.evening > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {(() => {
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      return isOvertime ? 'Straordinario serale (da viaggio reperibilità) (+25%)' : 'Viaggio serale (+25%)';
                    }
                    return 'Viaggio serale (+25%)';
                  })()}
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.travelHours?.evening)}</Text>
              </View>
              {breakdown?.standby?.travelEarnings?.evening > 0 && breakdown?.standby?.travelHours?.evening > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    const nightMultiplier = settings.contract?.overtimeRates?.nightUntil22 || 1.25;
                    
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      if (isOvertime) {
                        const rate = base * nightMultiplier;
                        return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.evening)} (Straordinario serale +25%) = ${breakdown?.standby?.travelEarnings?.evening.toFixed(2).replace('.', ',')} €`;
                      }
                    }
                    // Tariffa viaggio con maggiorazione serale
                    const rate = base * nightMultiplier * (settings.travelCompensationRate || 1.0);
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.evening)} (Viaggio serale +25%) = ${breakdown?.standby?.travelEarnings?.evening.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}
          
          {/* Viaggio notturno reperibilità */}
          {breakdown?.standby?.travelHours?.night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {(() => {
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      return isOvertime ? 'Straordinario notturno (da viaggio reperibilità) (+35%)' : 'Viaggio notturno (+35%)';
                    }
                    return 'Viaggio notturno (+25%)';
                  })()}
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.travelHours?.night)}</Text>
              </View>
              {breakdown?.standby?.travelEarnings?.night > 0 && breakdown?.standby?.travelHours?.night > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    const nightMultiplier = settings.contract?.overtimeRates?.nightAfter22 || 1.35; // Maggiorazione notturna dopo 22:00
                    
                    if (settings?.travelHoursSetting === 'EXCESS_AS_OVERTIME') {
                      const totalOrdinaryHours = (breakdown?.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                                 (breakdown?.ordinary?.hours?.viaggio_giornaliera || 0);
                      const isOvertime = totalOrdinaryHours >= 8;
                      if (isOvertime) {
                        const rate = base * nightMultiplier;
                        return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.night)} (Straordinario notturno +35%) = ${breakdown?.standby?.travelEarnings?.night.toFixed(2).replace('.', ',')} €`;
                      }
                    }
                    // Tariffa viaggio con maggiorazione notturna
                    const rate = base * nightMultiplier * (settings.travelCompensationRate || 1.0);
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.night)} (Viaggio notturno +25%) = ${breakdown?.standby?.travelEarnings?.night.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* Viaggio sabato reperibilità */}
          {breakdown?.standby?.travelHours?.saturday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Viaggio sabato (+25%)
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.travelHours?.saturday)}</Text>
              </View>
              {breakdown?.standby?.travelEarnings?.saturday > 0 && breakdown?.standby?.travelHours?.saturday > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    const saturdayMultiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                    const rate = base * saturdayMultiplier * (settings.travelCompensationRate || 1.0);
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.saturday)} (Viaggio sabato +25%) = ${breakdown?.standby?.travelEarnings?.saturday.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* Viaggio festivo/domenica reperibilità */}
          {breakdown?.standby?.travelHours?.holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Viaggio festivo (+30%)
                </Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown?.standby?.travelHours?.holiday)}</Text>
              </View>
              {breakdown?.standby?.travelEarnings?.holiday > 0 && breakdown?.standby?.travelHours?.holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    const holidayMultiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                    const rate = base * holidayMultiplier * (settings.travelCompensationRate || 1.0);
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown?.standby?.travelHours?.holiday)} (Viaggio festivo +30%) = ${breakdown?.standby?.travelEarnings?.holiday.toFixed(2).replace('.', ',')} €`;
                  })()}
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
            <MaterialCommunityIcons name="phone-alert" size={16} color="#9C27B0" />
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
            <MaterialCommunityIcons name="gift-outline" size={16} color="#FF5722" />
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
            <MaterialCommunityIcons name="clock-check-outline" size={16} color="#795548" />
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
            <MaterialCommunityIcons name="cash-check" size={18} color="#4CAF50" />
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
const TypeIcon = ({ type, size = 20, color = '#2196F3' }) => {
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
  const { settings } = useSettings();
  const calculationService = useCalculationService();
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
    interventi: [],
    pasti: { pranzo: false, cena: false },
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
        // Carica l'array di interventi direttamente dal DB
        interventi: entryToEdit.interventi && Array.isArray(entryToEdit.interventi) ? entryToEdit.interventi : [],
        pasti: {
          pranzo: (entryToEdit.mealLunchVoucher || entryToEdit.meal_lunch_voucher) === 1,
          cena: (entryToEdit.mealDinnerVoucher || entryToEdit.meal_dinner_voucher) === 1,
        },
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
      const ccnlDailyRate = settings?.contract?.dailyRate || 107.69;
      
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
        const interventi = [...form.interventi];
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

  // Gestione toggle pasti
  const togglePasto = (type) => {
    const newValue = !form.pasti[type];
    setForm({ 
      ...form, 
      pasti: { ...form.pasti, [type]: newValue },
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
        const interventi = [...form.interventi];
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
          const interventi = [...form.interventi];
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
          <Ionicons name="time-outline" size={16} color="#2196F3" style={{marginRight: 10}} />
          {value && (
            <TouchableOpacity 
              onPress={(e) => handleTimeClear(e)}
              hitSlop={{top: 10, right: 10, bottom: 10, left: 10}}
              accessible={true}
              accessibilityLabel={`Cancella orario ${label}`}
              accessibilityHint={`Cancella l'orario ${label} impostato a ${value}`}
            >
              <Ionicons name="close-circle" size={18} color="#f44336" />
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
              // Torna alla TimeEntryScreen e refresh automatico sia TimeEntry che Dashboard
              navigation.navigate('TimeEntryScreen', { refresh: true, refreshDashboard: true });
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
    
    // Attiva i pasti solo se identificate le pause e non sono già attivi
    if (autoPranzo && !form.pasti.pranzo) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, pranzo: true } }));
    }
    if (autoCena && !form.pasti.cena) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, cena: true } }));
    }
    
    // Disattiva i pasti se non ci sono più pause valide
    if (!autoPranzo && form.pasti.pranzo) {
      setForm(f => ({ ...f, pasti: { ...f.pasti, pranzo: false } }));
    }
    if (!autoCena && form.pasti.cena) {
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
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
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
            <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifica Inserimento' : 'Nuovo Inserimento'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Messaggio Auto-compilazione */}
        {vacationAutoCompile.autoCompileMessage && (
          <View style={styles.autoCompileNotice}>
            <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
            <Text style={styles.autoCompileMessage}>
              {vacationAutoCompile.autoCompileMessage}
            </Text>
          </View>
        )}

        {/* Data e Tipo Giornata Card */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Data e Tipo Giornata" 
            icon="calendar" 
            iconColor="#2196F3" 
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
                <MaterialCommunityIcons name="calendar-outline" size={20} color="#2196F3" />
                <Text style={styles.dateText}>{form.date}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color="#666" />
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
                color={dayTypes.find(dt => dt.value === dayType)?.color || '#666'} 
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
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Informazioni Sito" 
            icon="map-marker" 
            iconColor="#FF9800" 
          />
          <InputRow label="Nome cantiere">
            <TextInput
              style={styles.modernInput}
              value={form.site_name}
              onChangeText={v => handleChange('site_name', v)}
              placeholder="Facoltativo"
              placeholderTextColor="#999"
            />
          </InputRow>
          
          <InputRow label="Veicolo usato" required>
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
                    color={form.veicolo === opt.value ? 'white' : '#666'} 
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
            <InputRow label="Targa/Numero veicolo" icon="card-text-outline">
              <TextInput
                style={styles.modernInput}
                value={form.targa_veicolo}
                onChangeText={v => handleChange('targa_veicolo', v)}
                placeholder="es. AB123CD o numero aziendale"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
            </InputRow>
          )}
        </ModernCard>

        {/* Orari Viaggio/Lavoro Card */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Orari Viaggio e Lavoro" 
            icon="clock-outline" 
            iconColor="#4CAF50" 
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
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Reperibilità" 
            icon="phone-alert" 
            iconColor="#FF9800" 
          />
          
          <ModernSwitch
            label="Attiva reperibilità"
            value={form.reperibilita}
            onValueChange={toggleReperibilita}
            description="Indica se questo è un giorno di reperibilità"
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
                <Text style={[styles.addButtonText, { color: '#FF9800' }]}>Aggiungi intervento</Text>
              </TouchableOpacity>
            </>
          )}
        </ModernCard>

        {/* Rimborsi Pasti Card */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Rimborsi Pasti" 
            icon="food" 
            iconColor="#4CAF50" 
          />
          
          <View style={styles.mealsContainer}>
            <ModernSwitch
              label="Pranzo"
              value={form.pasti.pranzo}
              onValueChange={() => togglePasto('pranzo')}
              description="Includi rimborso pranzo"
            />
            
            <ModernSwitch
              label="Cena"
              value={form.pasti.cena}
              onValueChange={() => togglePasto('cena')}
              description="Includi rimborso cena"
            />
          </View>

          {/* Cash Pranzo */}
          {(settings?.mealAllowances?.lunch?.cashAmount > 0 || settings?.mealAllowances?.lunch?.allowManualCash) && form.pasti.pranzo && (
            <InputRow label="Importo cash pranzo">
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
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </InputRow>
          )}

          {/* Cash Cena */}
          {(settings?.mealAllowances?.dinner?.cashAmount > 0 || settings?.mealAllowances?.dinner?.allowManualCash) && form.pasti.cena && (
            <InputRow label="Importo cash cena">
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
                  placeholderTextColor="#999"
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
          />
          
          <ModernSwitch
            label="Attiva indennità trasferta"
            value={form.trasferta}
            onValueChange={toggleTrasferta}
            description="Indennità per lavoro fuori sede"
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
            
            // Ore di viaggio
            form.viaggi.forEach(viaggio => {
              if (viaggio.departure_company && viaggio.arrival_site) {
                const dep = new Date(`1970-01-01T${viaggio.departure_company}:00`);
                const arr = new Date(`1970-01-01T${viaggio.arrival_site}:00`);
                totalMinutes += (arr - dep) / (1000 * 60);
              }
              if (viaggio.departure_return && viaggio.arrival_company) {
                const dep = new Date(`1970-01-01T${viaggio.departure_return}:00`);
                const arr = new Date(`1970-01-01T${viaggio.arrival_company}:00`);
                totalMinutes += (arr - dep) / (1000 * 60);
              }
            });
            
            // Ore di lavoro
            form.viaggi.forEach(viaggio => {
              if (viaggio.work_start_1 && viaggio.work_end_1) {
                const start = new Date(`1970-01-01T${viaggio.work_start_1}:00`);
                const end = new Date(`1970-01-01T${viaggio.work_end_1}:00`);
                totalMinutes += (end - start) / (1000 * 60);
              }
              if (viaggio.work_start_2 && viaggio.work_end_2) {
                const start = new Date(`1970-01-01T${viaggio.work_start_2}:00`);
                const end = new Date(`1970-01-01T${viaggio.work_end_2}:00`);
                totalMinutes += (end - start) / (1000 * 60);
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
              <ModernCard style={styles.cardSpacing}>
                <SectionHeader 
                  title="Completamento Giornata" 
                  icon="clock-check" 
                  iconColor="#FF5722" 
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
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Note" 
            icon="note-text" 
            iconColor="#607D8B" 
          />
          <TextInput
            style={styles.notesInput}
            value={form.note}
            onChangeText={v => handleChange('note', v)}
            placeholder="Aggiungi una nota (opzionale)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ModernCard>

        {/* Riepilogo Guadagni */}
        <ModernCard style={styles.cardSpacing}>
          <EarningsSummary 
            form={form} 
            settings={settings} 
            isDateInStandbyCalendar={isDateInStandbyCalendar} 
            isStandbyCalendarInitialized={isStandbyCalendarInitialized}
            reperibilityManualOverride={form.reperibilityManualOverride}
            dayType={form.dayType || dayType}
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
        
        {isEdit && enableDelete && (
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
                fixedEarnings: form.fixedEarnings || ((['ferie', 'malattia', 'riposo', 'permesso'].includes(dayType)) ? (settings?.contract?.dailyRate || 107.69) : 0)
              };
              
              const settingsObj = settings || {};
              
              // Se è un giorno fisso, usa la retribuzione fissa
              if (entry.isFixedDay) {
                entry.totalEarnings = entry.fixedEarnings;
              } else {
                const result = calculationService.calculateEarningsBreakdown(entry, settingsObj);
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
                await DatabaseService.updateWorkEntry(entryId, entry);
                Alert.alert('Aggiornamento', 'Inserimento aggiornato con successo!');
              } else {
                await DatabaseService.insertWorkEntry(entry);
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
              
              navigation.navigate('TimeEntryScreen', { refresh: true, refreshDashboard: true });
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Auto-compile notice styles
  autoCompileNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  autoCompileMessage: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    lineHeight: 18,
  },

  // Modern card styles
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  requiredMark: {
    color: '#f44336',
  },
  modernInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    color: '#333',
    marginBottom: 8,
  },
  dateInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    gap: 6,
    minWidth: 80,
  },
  typeChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayTypeInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  dayTypeInfoText: {
    fontSize: 13,
    color: '#1976d2',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 100,
  },
  vehicleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  vehicleButtonText: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
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

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    color: '#4CAF50',
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
    color: '#333',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  cashInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: '45%',
  },
  completamentoCardActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  completamentoCardText: {
    fontSize: 14,
    color: '#333',
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
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
  },
  specialDayText: {
    fontSize: 14,
    color: '#2e7d32',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  // Notes input
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
  },

  // Modern buttons
  modernButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
    backgroundColor: '#e0e0e0',
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#333',
  },
  dangerButtonText: {
    color: 'white',
  },
  disabledButtonText: {
    color: '#999',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  totalHours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalHoursText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    flex: 1,
    flex: 1,
  },
  detailHours: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    flex: 1,
    flex: 1,
  },
  detailHours: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
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
    color: '#999',
    marginTop: 8,
  },
  modernEarningsTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modernEarningsTotalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernEarningsTotalContent: {
    flex: 1,
  },
  modernEarningsTotalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modernEarningsTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  modernEarningsTotalHours: {
    fontSize: 12,
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
  },
  modernEarningsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernEarningsItemContent: {
    flex: 1,
  },
  modernEarningsItemLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  modernEarningsItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modernEarningsItemDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modernEarningsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  modernEarningsNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
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
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  modernEarningsEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Earnings card improvements
  earningsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1565C0',
    letterSpacing: 0.5,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // Breakdown styles
  breakdownSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  breakdownSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#333',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 60,
    textAlign: 'right',
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  rateCalc: {
    fontSize: 11,
    color: '#1976D2',
    marginTop: 4,
    backgroundColor: '#f3f8ff',
    padding: 6,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  totalRow: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 8,
  },
  breakdownTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalSection: {
    backgroundColor: '#f8fff8',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 50,
  },
  vehicleGridButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  vehicleGridButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  floatingButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});

export default TimeEntryForm;