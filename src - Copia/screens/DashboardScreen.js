import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatCurrency } from '../utils';
import { useSettings, useCalculationService } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import DataUpdateService from '../services/DataUpdateService';
import FixedDaysService from '../services/FixedDaysService';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { RealPayslipCalculator } from '../services/RealPayslipCalculator';

const { width } = Dimensions.get('window');

// Helper functions (identiche al TimeEntryForm)
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

const DashboardScreen = ({ navigation, route }) => {
  const { settings, isLoading: settingsLoading, refreshSettings } = useSettings();
  const calculationService = useCalculationService();
  
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date()); // Data per navigazione mesi
  const [workEntries, setWorkEntries] = useState([]);
  const [monthlyAggregated, setMonthlyAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fixedDaysData, setFixedDaysData] = useState(null);
  const [fixedDaysLoading, setFixedDaysLoading] = useState(true);
  const [completionData, setCompletionData] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(true);
  const [isDailyBreakdownExpanded, setIsDailyBreakdownExpanded] = useState(false);

  // 🔄 Ascolta parametri di navigazione per refresh automatico
  useEffect(() => {
    if (route?.params?.refreshCalculations) {
      console.log('🔄 DASHBOARD - Refresh richiesto dalle impostazioni');
      // Reset del parametro per evitare loop infiniti
      navigation.setParams({ refreshCalculations: false });
      
      // Forza ricaricamento impostazioni e ricalcolo
      const refreshData = async () => {
        await refreshSettings();
        await loadData();
      };
      
      refreshData();
    }
  }, [route?.params?.refreshCalculations, route?.params?.timestamp]);

  // 🔄 Listener per aggiornamenti automatici dei dati dal database
  useEffect(() => {
    const handleWorkEntriesUpdate = (action, data) => {
      console.log('🔄 DASHBOARD - Ricevuto aggiornamento:', action, data);
      
      // Per ripristini completi del backup, ricarica sempre i dati
      if (action === 'BULK_RESTORE') {
        console.log('🔄 DASHBOARD - Ripristino backup completo, ricarico tutti i dati...');
        loadData();
        return;
      }
      
      // Ricarica i dati solo se l'aggiornamento riguarda il mese corrente
      const entryYear = data?.year;
      const entryMonth = data?.month;
      const currentYear = selectedDate.getFullYear();
      const currentMonth = selectedDate.getMonth() + 1;
      
      if (entryYear === currentYear && entryMonth === currentMonth) {
        console.log('🔄 DASHBOARD - Aggiornamento per mese corrente, ricarico dati...');
        loadData();
      }
    };

    DataUpdateService.onWorkEntriesUpdated(handleWorkEntriesUpdate);

    return () => {
      DataUpdateService.removeAllListeners('workEntriesUpdated');
    };
  }, [selectedDate]);

  // 🔄 AGGIORNAMENTO AUTOMATICO: Ricarica dati ogni volta che la Dashboard viene aperta/focalizzata
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 DASHBOARD - Screen focalizzato, ricarico dati automaticamente...');
      loadData();
    }, [selectedDate]) // Dipende da selectedDate per ricaricare quando cambia il mese
  );

  // 🔄 Effetto per ricaricamento automatico quando cambiano le impostazioni
  useEffect(() => {
    if (!settingsLoading && settings) {
      console.log('🔄 DASHBOARD - Impostazioni aggiornate, ricalcolo completo...');
      console.log('🔧 DASHBOARD DEBUG - Travel mode attuale:', settings?.travelHoursSetting);
      console.log('🔧 DASHBOARD DEBUG - Meal settings attuali:', JSON.stringify(settings?.mealAllowances, null, 2));
      calculateMonthlyAggregation(workEntries);
    }
  }, [
    settings?.netCalculation?.method, 
    settings?.netCalculation?.customDeductionRate, 
    settings?.netCalculation?.useActualAmount,
    settings?.travelHoursSetting, // Aggiungi modalità viaggio
    settings?.mealAllowances,     // Aggiungi impostazioni pasti
    settings?.contract?.hourlyRate // Aggiungi tariffe CCNL
  ]);

  // 🔍 DEBUG SETTINGS CARICAMENTO
  useEffect(() => {
    console.log('🔍 DASHBOARD DEBUG - Settings loading status:', settingsLoading);
    console.log('🔍 DASHBOARD DEBUG - Settings available:', !!settings);
    if (settings) {
      console.log('🔍 DASHBOARD DEBUG - Settings mealAllowances:', JSON.stringify(settings.mealAllowances, null, 2));
      console.log('🔍 DASHBOARD DEBUG - Settings travelAllowance:', JSON.stringify(settings.travelAllowance, null, 2));
      console.log('🔍 DASHBOARD DEBUG - Settings travelHoursSetting:', settings.travelHoursSetting);
      console.log('🔍 DASHBOARD DEBUG - Settings travelCompensationRate:', settings.travelCompensationRate);
    }
  }, [settingsLoading, settings]);

  // Carica dati dal database
  const loadData = async () => {
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      
      const entries = await DatabaseService.getWorkEntries(year, month);
      setWorkEntries(entries);
      
      // Calcola aggregazione mensile
      await calculateMonthlyAggregation(entries);
      
      // Carica dati giorni fissi (ferie, permessi, etc.)
      await loadFixedDaysData();
      
      // Carica dati completamento giornata
      await loadCompletionData();
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati.');
    } finally {
      setLoading(false);
    }
  };

  // Carica dati dei giorni fissi (ferie, permessi, malattia, riposo, festivi)
  const loadFixedDaysData = async () => {
    try {
      setFixedDaysLoading(true);
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      // Carica dati giorni fissi usando FixedDaysService
      if (FixedDaysService && typeof FixedDaysService.getFixedDaysSummary === 'function') {
        const data = await FixedDaysService.getFixedDaysSummary(startDate, endDate);
        setFixedDaysData(data);
      } else {
        console.warn('FixedDaysService.getFixedDaysSummary non disponibile, uso dati mock');
        // Dati mock se il servizio non è disponibile
        setFixedDaysData({
          totalDays: 0,
          totalEarnings: 0,
          vacation: { days: 0, earnings: 0 },
          sick: { days: 0, earnings: 0 },
          permit: { days: 0, earnings: 0 },
          compensatory: { days: 0, earnings: 0 },
          holiday: { days: 0, earnings: 0 }
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati giorni fissi:', error);
      setFixedDaysData({
        totalDays: 0,
        totalEarnings: 0,
        vacation: { days: 0, earnings: 0 },
        sick: { days: 0, earnings: 0 },
        permit: { days: 0, earnings: 0 },
        compensatory: { days: 0, earnings: 0 },
        holiday: { days: 0, earnings: 0 }
      });
    } finally {
      setFixedDaysLoading(false);
    }
  };

  // Carica dati dei giorni in completamento
  const loadCompletionData = async () => {
    try {
      setCompletionLoading(true);
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      // Carica dati completamento usando FixedDaysService
      if (FixedDaysService && typeof FixedDaysService.getCompletionStats === 'function') {
        const data = await FixedDaysService.getCompletionStats(startDate, endDate);
        setCompletionData(data);
      } else {
        console.warn('FixedDaysService.getCompletionStats non disponibile');
        setCompletionData({
          totalEntries: 0,
          totalCompletionHours: 0,
          byType: {}
        });
      }
    } catch (error) {
      console.error('Errore nel caricamento dati completamento:', error);
      setCompletionData({
        totalEntries: 0,
        totalCompletionHours: 0,
        byType: {}
      });
    } finally {
      setCompletionLoading(false);
    }
  };

  // Calcola aggregazione mensile fedele al breakdown del TimeEntryForm
  const calculateMonthlyAggregation = async (entries) => {
    // ⭐ CONTROLLO CRITICO: Non calcolare finché le impostazioni non sono caricate
    if (settingsLoading) {
      console.log('🔧 DASHBOARD DEBUG - Settings ancora in caricamento, attesa...');
      return;
    }

    if (!settings) {
      console.log(' DASHBOARD DEBUG - Settings non disponibili, skip...');
      return;
    }

    console.log('🔧 DASHBOARD - Calcolo aggregazione per', entries.length, 'entries');
    console.log('🔧 DASHBOARD DEBUG - Travel mode corrente:', settings?.travelHoursSetting);
    console.log('🔧 DASHBOARD DEBUG - Meal settings correnti:', JSON.stringify(settings?.mealAllowances, null, 2));

    // Definizione di safeSettings (identica al TimeEntryForm)
    const defaultSettings = {
      contract: {
        hourlyRate: 16.15,
        dailyRate: 107.69,
        monthlyGrossSalary: 2800.00,
        normalHours: 40,
        dailyHours: 8,
        saturdayBonus: 0.2,
        nightBonus: 0.25,
        nightBonus2: 0.35,
        overtimeBonus: 0.2,
        overtimeLimit: {
          hours: 8,
          type: 'daily'
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
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) },
      travelHoursSetting: settings?.travelHoursSetting || 'TRAVEL_RATE_EXCESS', // Nuova logica di default
      multiShiftTravelAsWork: settings?.multiShiftTravelAsWork || false // Nuova opzione multi-turno
    };

    console.log('🔧 DASHBOARD DEBUG - settings originali:', JSON.stringify(settings, null, 2));
    console.log('🔧 DASHBOARD DEBUG - safeSettings travelHoursSetting:', safeSettings.travelHoursSetting);
    console.log('🔧 DASHBOARD DEBUG - safeSettings pasti:', JSON.stringify(safeSettings.mealAllowances, null, 2));
    console.log('🔧 DASHBOARD DEBUG - safeSettings trasferta:', JSON.stringify(safeSettings.travelAllowance, null, 2));

    if (!entries || entries.length === 0) {
      setMonthlyAggregated({
        totalEarnings: 0,
        ordinary: { total: 0, hours: {}, days: 0 },
        standby: { totalEarnings: 0, workHours: {}, travelHours: {}, days: 0 },
        allowances: { 
          travel: 0, 
          meal: 0, 
          standby: 0,
          travelDays: 0,
          mealDays: 0,
          standbyDays: 0,
          // Suddivisione indennità trasferta per percentuale
          travelByPercent: {
            '100': { amount: 0, days: 0 },
            '78': { amount: 0, days: 0 },
            '50': { amount: 0, days: 0 },
            'other': { amount: 0, days: 0 }
          }
        },
        meals: { 
          lunch: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          }, 
          dinner: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          // Suddivisione pasti per tipologia e importo
          byType: {
            vouchers: { total: 0, count: 0, days: 0 },
            cashStandard: { total: 0, count: 0, days: 0 },
            cashSpecific: { total: 0, count: 0, days: 0 }
          }
        },
        daysWorked: 0,
        totalHours: 0,
        // Nuove metriche avanzate
        analytics: {
          averageHoursPerDay: 0,
          averageEarningsPerDay: 0,
          averageEarningsPerHour: 0,
          overtimePercentage: 0,
          standbyWorkRatio: 0,
          weekendWorkDays: 0,
          nightWorkHours: 0,
          holidayWorkDays: 0,
          travelHoursTotal: 0,
          maxDailyHours: 0,
          minDailyHours: 0,
          totalWorkingDays: 0,
          efficiency: {
            ordinaryVsStandby: 0,
            workVsTravel: 0,
            productivityScore: 0
          },
          breakdown: {
            ordinaryPercentage: 0,
            standbyPercentage: 0,
            allowancesPercentage: 0,
            overtimeHours: 0,
            extraTravelHours: 0,
            regularHours: 0
          }
        }
      });
      return;
    }

    console.log('🔧 DASHBOARD DEBUG - settings originali:', JSON.stringify(settings, null, 2));
    console.log('🔧 DASHBOARD DEBUG - safeSettings pasti:', JSON.stringify(safeSettings.mealAllowances, null, 2));
    console.log('🔧 DASHBOARD DEBUG - safeSettings trasferta:', JSON.stringify(settings?.travelAllowance, null, 2));

    // Aggrega tutti i breakdown giornalieri
    let aggregated = {
      totalEarnings: 0,
      ordinary: {
        total: 0,
        days: 0,
        hours: {
          lavoro_giornaliera: 0,
          viaggio_giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0
        },
        earnings: {
          giornaliera: 0,
          lavoro_extra: 0,
          viaggio_extra: 0,
          sabato_bonus: 0,
          domenica_bonus: 0,
          festivo_bonus: 0
        }
      },
      standby: {
        totalEarnings: 0,
        days: 0,
        workHours: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelHours: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        workEarnings: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        },
        travelEarnings: {
          ordinary: 0,
          evening: 0,
          night: 0,
          holiday: 0,
          saturday: 0,
          saturday_night: 0,
          night_holiday: 0
        }
      },
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0,
        travelDays: 0,
        mealDays: 0,
        standbyDays: 0,
        // Suddivisione indennità reperibilità per tipo di giorno
        standbyByType: {
          feriale: { amount: 0, days: 0 },
          festivo: { amount: 0, days: 0 },
          sabato: { amount: 0, days: 0 }
        },
        // Suddivisione indennità trasferta per percentuale
        travelByPercent: {
          '100': { amount: 0, days: 0 },
          '78': { amount: 0, days: 0 },
          '50': { amount: 0, days: 0 },
          'other': { amount: 0, days: 0 }
        }
      },        meals: {
          lunch: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          dinner: { 
            voucher: 0, cash: 0, specific: 0,
            voucherDays: 0, cashDays: 0, specificDays: 0
          },
          // Suddivisione pasti per tipologia e importo
          byType: {
            vouchers: { total: 0, count: 0, days: 0 },
            cashStandard: { total: 0, count: 0, days: 0 },
            cashSpecific: { total: 0, count: 0, days: 0 }
          }
        },
      daysWorked: 0,
      totalHours: 0,
      // Nuove metriche avanzate
      analytics: {
        dailyHours: [],
        dailyEarnings: [],
        weekendWorkDays: 0,
        holidayWorkDays: 0,
        nightWorkHours: 0,
        travelHoursTotal: 0,
        totalWorkingDays: 0,
        standbyInterventions: 0,
        maxDailyHours: 0,
        minDailyHours: Infinity,
        averageHoursPerDay: 0,
        averageEarningsPerDay: 0,
        averageEarningsPerHour: 0,
        overtimePercentage: 0,
        standbyWorkRatio: 0,
        efficiency: {
          ordinaryVsStandby: 0,
          workVsTravel: 0,
          productivityScore: 0
        },
        breakdown: {
          ordinaryPercentage: 0,
          standbyPercentage: 0,
          allowancesPercentage: 0,
          overtimeHours: 0,
          regularHours: 0
        }
      }
    };

    // Itera su ogni entry e calcola il breakdown
    for (const entry of entries) {
      try {
        const workEntry = createWorkEntryFromData(entry);
        const breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
        
        if (!breakdown) continue;

        // Aggrega totale
        aggregated.totalEarnings += breakdown.totalEarnings || 0;
        aggregated.daysWorked += 1;

        // Calcola ore giornaliere per analytics
        const dailyHours = Object.values(breakdown.ordinary?.hours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.workHours || {}).reduce((a, b) => a + b, 0) +
                          Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
        
        aggregated.analytics.dailyHours.push(dailyHours);
        aggregated.analytics.dailyEarnings.push(breakdown.totalEarnings || 0);
        
        // Aggiorna min/max ore giornaliere
        if (dailyHours > aggregated.analytics.maxDailyHours) {
          aggregated.analytics.maxDailyHours = dailyHours;
        }
        if (dailyHours < aggregated.analytics.minDailyHours && dailyHours > 0) {
          aggregated.analytics.minDailyHours = dailyHours;
        }

        // Analizza tipo di giornata
        const entryDate = new Date(entry.date);
        const dayOfWeek = entryDate.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Domenica o Sabato
          aggregated.analytics.weekendWorkDays += 1;
        }

        // Conta ore notturne (approssimazione basata sui breakdown)
        if (breakdown.standby?.workHours?.night || breakdown.standby?.workHours?.saturday_night || breakdown.standby?.workHours?.night_holiday) {
          aggregated.analytics.nightWorkHours += (breakdown.standby?.workHours?.night || 0) + 
                                                 (breakdown.standby?.workHours?.saturday_night || 0) + 
                                                 (breakdown.standby?.workHours?.night_holiday || 0);
        }

        // Conta ore di viaggio totali
        const travelHours = Object.values(breakdown.ordinary?.hours || {}).filter((_, index) => 
          ['viaggio_giornaliera', 'viaggio_extra'].includes(Object.keys(breakdown.ordinary.hours)[index])
        ).reduce((a, b) => a + b, 0) + Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
        
        aggregated.analytics.travelHoursTotal += travelHours;

        // Conta interventi reperibilità (usa workEntry parsato invece di entry grezzo)
        if (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0) {
          // Conta solo gli interventi con dati validi (non vuoti)
          const validInterventi = workEntry.interventi.filter(intervento => {
            return intervento.work_start_1 && intervento.work_end_1; // Almeno orario inizio e fine del primo turno
          });
          if (validInterventi.length > 0) {
            console.log(`🔧 DEBUG INTERVENTI - Giorno ${workEntry.date}: ${validInterventi.length} interventi validi su ${workEntry.interventi.length} totali`);
          }
          aggregated.analytics.standbyInterventions += validInterventi.length;
        }

        // Aggrega ore ordinarie
        if (breakdown.ordinary) {
          aggregated.ordinary.total += breakdown.ordinary.total || 0;
          
          // Conta giorni con attività ordinarie (non in reperibilità)
          if (!workEntry.isStandbyDay && (breakdown.ordinary.total || 0) > 0) {
            aggregated.ordinary.days += 1;
            console.log(`🔧 DEBUG ORDINARIO - Giorno ${entry.date}: isStandbyDay=${workEntry.isStandbyDay}, ordinary.total=${breakdown.ordinary.total}, ordinaryDays ora=${aggregated.ordinary.days}`);
          }
          
          // Ore ordinarie
          if (breakdown.ordinary.hours) {
            Object.keys(breakdown.ordinary.hours).forEach(key => {
              if (aggregated.ordinary.hours[key] !== undefined) {
                aggregated.ordinary.hours[key] += breakdown.ordinary.hours[key] || 0;
              }
            });
          }

          // Guadagni ordinari
          if (breakdown.ordinary.earnings) {
            Object.keys(breakdown.ordinary.earnings).forEach(key => {
              if (aggregated.ordinary.earnings[key] !== undefined) {
                aggregated.ordinary.earnings[key] += breakdown.ordinary.earnings[key] || 0;
              }
            });
          }
        }

        // Aggrega reperibilità
        if (breakdown.standby) {
          aggregated.standby.totalEarnings += breakdown.standby.totalEarnings || 0;
          
          // Conta giorni con attività in reperibilità
          if (workEntry.isStandbyDay && (breakdown.standby.totalEarnings || 0) > 0) {
            aggregated.standby.days += 1;
            console.log(`🔧 DEBUG REPERIBILITA - Giorno ${entry.date}: isStandbyDay=${workEntry.isStandbyDay}, standby.totalEarnings=${breakdown.standby.totalEarnings}, standbyDays ora=${aggregated.standby.days}`);
          }
          
          // Ore lavoro reperibilità
          if (breakdown.standby?.workHours) {
            Object.keys(breakdown.standby.workHours).forEach(key => {
              if (aggregated.standby.workHours[key] !== undefined) {
                aggregated.standby.workHours[key] += breakdown.standby.workHours[key] || 0;
              }
            });
          }

          // Ore viaggio reperibilità
          if (breakdown.standby?.travelHours) {
            Object.keys(breakdown.standby.travelHours).forEach(key => {
              if (aggregated.standby.travelHours[key] !== undefined) {
                aggregated.standby.travelHours[key] += breakdown.standby.travelHours[key] || 0;
              }
            });
          }

          // Guadagni lavoro reperibilità
          if (breakdown.standby?.workEarnings) {
            Object.keys(breakdown.standby.workEarnings).forEach(key => {
              if (aggregated.standby.workEarnings[key] !== undefined) {
                aggregated.standby.workEarnings[key] += breakdown.standby.workEarnings[key] || 0;
              }
            });
          }

          // Guadagni viaggio reperibilità
          if (breakdown.standby.travelEarnings) {
            Object.keys(breakdown.standby.travelEarnings).forEach(key => {
              if (aggregated.standby.travelEarnings[key] !== undefined) {
                aggregated.standby.travelEarnings[key] += breakdown.standby.travelEarnings[key] || 0;
              }
            });
          }
        }

        // Aggrega indennità trasferta e suddivide per percentuale EFFETTIVA
        if (breakdown.allowances && breakdown.allowances.travel > 0) {
          const travelAmount = breakdown.allowances.travel;
          aggregated.allowances.travel += travelAmount;
          
          // Calcola la percentuale EFFETTIVA basandosi sull'importo calcolato
          // rispetto all'importo base della trasferta dalle impostazioni
          const dailyTravelAmount = safeSettings.travelAllowance?.dailyAmount || 15.0;
          const effectivePercent = dailyTravelAmount > 0 ? (travelAmount / dailyTravelAmount) : 1.0;
          
          let percentCategory = 'other';
          
          // Categorizza in base alla percentuale EFFETTIVA (con tolleranza per errori di arrotondamento)
          if (Math.abs(effectivePercent - 1.0) < 0.02) {
            percentCategory = '100';
          } else if (Math.abs(effectivePercent - 0.78) < 0.02) {
            percentCategory = '78';
          } else if (Math.abs(effectivePercent - 0.5) < 0.02) {
            percentCategory = '50';
          } else {
            // Per percentuali diverse, usa la percentuale approssimata
            const roundedPercent = Math.round(effectivePercent * 100);
            if (roundedPercent >= 85 && roundedPercent <= 95) {
              percentCategory = 'other'; // Es. 87.5% del calcolo proporzionale CCNL
            }
          }
          
          aggregated.allowances.travelByPercent[percentCategory].amount += travelAmount;
          aggregated.allowances.travelByPercent[percentCategory].days += 1;
          
          console.log(`🔧 DEBUG TRASFERTA CATEGORIZZATA - Giorno ${entry.date}: ${travelAmount.toFixed(2)}€ su ${dailyTravelAmount}€ base = ${(effectivePercent * 100).toFixed(1)}% effettiva (categoria: ${percentCategory}, form: ${workEntry.travelAllowancePercent || 'n/a'})`);
        }
        
        // Aggrega altre indennità
        if (breakdown.allowances) {
          const standbyAmount = breakdown.allowances.standby || 0;
          aggregated.allowances.standby += standbyAmount;
          
          // Se c'è indennità reperibilità, categorizza per tipo di giorno
          if (standbyAmount > 0) {
            const entryDate = new Date(entry.date);
            const isWeekend = entryDate.getDay() === 0 || entryDate.getDay() === 6;
            const isSaturday = entryDate.getDay() === 6;
            const isSunday = entryDate.getDay() === 0;
            const isHoliday = entry.isHoliday || false;
            
            let dayType = 'feriale';
            if (isSaturday) {
              dayType = 'sabato';
            } else if (isSunday || isHoliday) {
              dayType = 'festivo';
            }
            
            aggregated.allowances.standbyByType[dayType].amount += standbyAmount;
            aggregated.allowances.standbyByType[dayType].days += 1;
            
            console.log(`🔧 DEBUG STANDBY TIPO - Giorno ${entry.date} (${dayType}): €${standbyAmount.toFixed(2)}, totale ${dayType}: €${aggregated.allowances.standbyByType[dayType].amount.toFixed(2)} (${aggregated.allowances.standbyByType[dayType].days} giorni)`);
          }
        }
        
        // Conta giorni con indennità basandosi sui dati diretti
        if (workEntry.travelAllowance && (breakdown.allowances?.travel || 0) > 0) {
          aggregated.allowances.travelDays += 1;
          console.log(`🔧 DEBUG TRASFERTA - Giorno ${entry.date}: travelAllowance=${workEntry.travelAllowance}, breakdown.travel=${breakdown.allowances?.travel}, travelDays ora=${aggregated.allowances.travelDays}`);
        }
        if (workEntry.isStandbyDay && (breakdown.allowances?.standby || 0) > 0) {
          aggregated.allowances.standbyDays += 1;
          console.log(`🔧 DEBUG STANDBY - Giorno ${entry.date}: isStandbyDay=${workEntry.isStandbyDay}, breakdown.standby=${breakdown.allowances?.standby}, standbyDays ora=${aggregated.allowances.standbyDays}`);
        }

        // Aggrega pasti dettagliati e calcola totale rimborsi con suddivisione per tipologia
        let mealAllowanceTotal = 0;
        let hasMealToday = false;
        let todayVoucherCount = 0;
        let todayCashStandardCount = 0;
        let todayCashSpecificCount = 0;
        
        if (workEntry.mealLunchVoucher || workEntry.mealLunchCash) {
          console.log('🔧 DASHBOARD DEBUG - Pranzo trovato:', {
            voucher: workEntry.mealLunchVoucher,
            cash: workEntry.mealLunchCash,
            safeSettingsVoucher: safeSettings.mealAllowances?.lunch?.voucherAmount,
            safeSettingsCash: safeSettings.mealAllowances?.lunch?.cashAmount
          });
          
          if (workEntry.mealLunchCash > 0) {
            // Pasto con importo specifico
            aggregated.meals.lunch.specific += workEntry.mealLunchCash;
            aggregated.meals.lunch.specificDays += 1;
            mealAllowanceTotal += workEntry.mealLunchCash;
            aggregated.meals.byType.cashSpecific.total += workEntry.mealLunchCash;
            todayCashSpecificCount += 1;
            hasMealToday = true;
          } else {
            // Pranzo senza cash specifico - aggiungiamo buono e/o contanti standard
            if (workEntry.mealLunchVoucher) {
              // Buono pasto
              const voucherAmount = safeSettings.mealAllowances?.lunch?.voucherAmount || 0;
              aggregated.meals.lunch.voucher += voucherAmount;
              aggregated.meals.lunch.voucherDays += 1;
              mealAllowanceTotal += voucherAmount;
              aggregated.meals.byType.vouchers.total += voucherAmount;
              todayVoucherCount += 1;
              hasMealToday = true;
              
              // Aggiungi anche i contanti standard insieme al buono
              const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
              aggregated.meals.lunch.cash += cashAmount;
              aggregated.meals.lunch.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
            } else {
              // Solo contanti standard (senza buono)
              const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
              aggregated.meals.lunch.cash += cashAmount;
              aggregated.meals.lunch.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
              hasMealToday = true;
            }
          }
        }

        if (workEntry.mealDinnerVoucher || workEntry.mealDinnerCash) {
          if (workEntry.mealDinnerCash > 0) {
            // Pasto con importo specifico
            aggregated.meals.dinner.specific += workEntry.mealDinnerCash;
            aggregated.meals.dinner.specificDays += 1;
            mealAllowanceTotal += workEntry.mealDinnerCash;
            aggregated.meals.byType.cashSpecific.total += workEntry.mealDinnerCash;
            todayCashSpecificCount += 1;
            hasMealToday = true;
          } else {
            // Cena senza cash specifico - aggiungiamo buono e/o contanti standard
            if (workEntry.mealDinnerVoucher) {
              // Buono pasto
              const voucherAmount = safeSettings.mealAllowances?.dinner?.voucherAmount || 0;
              aggregated.meals.dinner.voucher += voucherAmount;
              aggregated.meals.dinner.voucherDays += 1;
              mealAllowanceTotal += voucherAmount;
              aggregated.meals.byType.vouchers.total += voucherAmount;
              todayVoucherCount += 1;
              hasMealToday = true;
              
              // Aggiungi anche i contanti standard insieme al buono
              const cashAmount = safeSettings.mealAllowances?.dinner?.cashAmount || 0;
              aggregated.meals.dinner.cash += cashAmount;
              aggregated.meals.dinner.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
            } else {
              // Solo contanti standard (senza buono)
              const cashAmount = safeSettings.mealAllowances?.dinner?.cashAmount || 0;
              aggregated.meals.dinner.cash += cashAmount;
              aggregated.meals.dinner.cashDays += 1;
              mealAllowanceTotal += cashAmount;
              aggregated.meals.byType.cashStandard.total += cashAmount;
              todayCashStandardCount += 1;
              hasMealToday = true;
            }
          }
        }

        // Conta giorni e pasti per tipologia
        if (hasMealToday) {
          if (todayVoucherCount > 0) {
            aggregated.meals.byType.vouchers.count += todayVoucherCount;
            if (aggregated.meals.byType.vouchers.days === undefined) aggregated.meals.byType.vouchers.days = 0;
            if (todayVoucherCount > 0) aggregated.meals.byType.vouchers.days += 1;
          }
          if (todayCashStandardCount > 0) {
            aggregated.meals.byType.cashStandard.count += todayCashStandardCount;
            if (aggregated.meals.byType.cashStandard.days === undefined) aggregated.meals.byType.cashStandard.days = 0;
            if (todayCashStandardCount > 0) aggregated.meals.byType.cashStandard.days += 1;
          }
          if (todayCashSpecificCount > 0) {
            aggregated.meals.byType.cashSpecific.count += todayCashSpecificCount;
            if (aggregated.meals.byType.cashSpecific.days === undefined) aggregated.meals.byType.cashSpecific.days = 0;
            if (todayCashSpecificCount > 0) aggregated.meals.byType.cashSpecific.days += 1;
          }
        }

        // Aggrega il totale rimborsi pasti
        aggregated.allowances.meal += mealAllowanceTotal;
        if (mealAllowanceTotal > 0) {
          aggregated.allowances.mealDays += 1;
          console.log(`🔧 DEBUG PASTI - Giorno ${entry.date}: mealAllowanceTotal=${mealAllowanceTotal}, mealDays ora=${aggregated.allowances.mealDays}`);
        }
        console.log('🔧 DASHBOARD DEBUG - mealAllowanceTotal aggiunto:', mealAllowanceTotal);

        // Calcola ore totali
        aggregated.totalHours += dailyHours;

      } catch (error) {
        console.error('Errore nel calcolo breakdown per entry:', entry.id, error);
      }
    }

    console.log('🔧 DASHBOARD DEBUG - Totali finali aggregated.allowances:', aggregated.allowances);
    console.log('🔧 DASHBOARD DEBUG - Totali finali aggregated.meals:', aggregated.meals);

    // Calcola metriche analytics finali
    if (aggregated.daysWorked > 0) {
      // Medie
      aggregated.analytics.averageHoursPerDay = aggregated.totalHours / aggregated.daysWorked;
      aggregated.analytics.averageEarningsPerDay = aggregated.totalEarnings / aggregated.daysWorked;
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.averageEarningsPerHour = aggregated.totalEarnings / aggregated.totalHours;
      }

      // Calcola ore straordinarie vs regolari (CORRETTO)
      // Straordinari = solo ore di lavoro oltre l'orario normale (non viaggio)
      const actualOvertimeHours = (aggregated.ordinary.hours.lavoro_extra || 0) + 
                                  Object.values(aggregated.standby.workHours || {}).reduce((a, b) => a + b, 0);
      
      // Ore di viaggio extra (separate dagli straordinari)
      const extraTravelHours = aggregated.ordinary.hours.viaggio_extra || 0;
      
      // Ore regolari = totale - straordinari veri - viaggio extra
      const regularHours = aggregated.totalHours - actualOvertimeHours - extraTravelHours;
      
      aggregated.analytics.breakdown.overtimeHours = actualOvertimeHours;
      aggregated.analytics.breakdown.extraTravelHours = extraTravelHours;
      aggregated.analytics.breakdown.regularHours = regularHours;
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.overtimePercentage = (actualOvertimeHours / aggregated.totalHours) * 100;
      }

      // Rapporto reperibilità vs ordinario
      if (aggregated.totalEarnings > 0) {
        aggregated.analytics.standbyWorkRatio = (aggregated.standby.totalEarnings / aggregated.totalEarnings) * 100;
        
        // CORREZIONE: Usa la somma corretta dei componenti per calcolare le percentuali
        // totalEarnings = ordinary + travel + standby.totalEarnings (che già include standby allowance)
        // Quindi per le percentuali dobbiamo usare: ordinary + standby.totalEarnings + travel + meal
        const totalEarningsForPercentages = aggregated.ordinary.total + 
                                           aggregated.standby.totalEarnings + 
                                           (aggregated.allowances.travel || 0) + 
                                           (aggregated.allowances.meal || 0);
        
        // Percentuali di breakdown earnings
        aggregated.analytics.breakdown.ordinaryPercentage = (aggregated.ordinary.total / totalEarningsForPercentages) * 100;
        aggregated.analytics.breakdown.standbyPercentage = (aggregated.standby.totalEarnings / totalEarningsForPercentages) * 100;
        aggregated.analytics.breakdown.allowancesPercentage = ((aggregated.allowances.travel || 0) / totalEarningsForPercentages) * 100;
      }

      // Efficienza lavoro vs viaggio
      const totalWorkHours = Object.values(aggregated.ordinary.hours).filter((_, index) => 
        ['lavoro_giornaliera', 'lavoro_extra'].includes(Object.keys(aggregated.ordinary.hours)[index])
      ).reduce((a, b) => a + b, 0) + Object.values(aggregated.standby.workHours).reduce((a, b) => a + b, 0);
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.efficiency.workVsTravel = (totalWorkHours / aggregated.totalHours) * 100;
      }

      // Score di produttività (combinazione di vari fattori)
      const baseScore = 50;
      const efficiencyBonus = (aggregated.analytics.efficiency.workVsTravel - 70) * 0.5; // Bonus se lavoro > 70%
      const overtimePenalty = aggregated.analytics.overtimePercentage > 20 ? -10 : 0; // Penalità se troppi straordinari
      const standbyBonus = aggregated.analytics.standbyWorkRatio > 0 ? 10 : 0; // Bonus per reperibilità
      
      aggregated.analytics.efficiency.productivityScore = Math.max(0, Math.min(100, 
        baseScore + efficiencyBonus + overtimePenalty + standbyBonus
      ));

      // Fix per minDailyHours se nessun dato valido
      if (aggregated.analytics.minDailyHours === Infinity) {
        aggregated.analytics.minDailyHours = 0;
      }
    }

    // 🎯 RIEPILOGO CONTATORI GIORNI
    console.log('🔧 CONTATORI FINALI:', {
      ordinaryDays: aggregated.ordinary.days,
      standbyDays: aggregated.standby.days,
      travelDays: aggregated.allowances.travelDays,
      standbyAllowanceDays: aggregated.allowances.standbyDays,
      mealDays: aggregated.allowances.mealDays,
      totalDaysWorked: aggregated.daysWorked
    });

    // Aggiungi le impostazioni per il calcolo delle percentuali nella dashboard
    aggregated.settings = safeSettings;

    setMonthlyAggregated(aggregated);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // ⭐ NUOVO USEEFFECT: Rilancia i calcoli quando le impostazioni sono pronte
  useEffect(() => {
    if (!settingsLoading && settings && workEntries.length > 0) {
      console.log('🔧 DASHBOARD DEBUG - Settings caricate, rilancio calcoli...');
      calculateMonthlyAggregation(workEntries);
    }
  }, [settingsLoading, settings, workEntries]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh sia impostazioni che dati
      await refreshSettings();
      await loadData();
      console.log('🔄 DASHBOARD - Refresh manuale completato');
    } catch (error) {
      console.error('Errore nel refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Navigazione tra i mesi
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
    setLoading(true);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
    setLoading(true);
  };

  const goToCurrentMonth = () => {
    setSelectedDate(new Date());
    setLoading(true);
  };

  // Formatta il mese e anno per il titolo
  const formatMonthYear = (date) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Verifica se ci sono dati da mostrare
  const hasOrdinaryData = monthlyAggregated?.ordinary?.total > 0;
  const hasStandbyData = monthlyAggregated?.standby?.totalEarnings > 0 ||
    Object.values(monthlyAggregated?.standby?.workHours || {}).some(h => h > 0) ||
    Object.values(monthlyAggregated?.standby?.travelHours || {}).some(h => h > 0);
  const hasAllowancesData = (monthlyAggregated?.allowances?.travel > 0 || 
                            monthlyAggregated?.allowances?.meal > 0 || 
                            monthlyAggregated?.allowances?.standby > 0);

  const renderOrdinarySection = () => {
    if (!hasOrdinaryData) return null;

    const ordinary = monthlyAggregated?.ordinary || {};
    const dailyRate = monthlyAggregated?.settings?.contract?.dailyRate || 107.69;
    const hourlyRate = monthlyAggregated?.settings?.contract?.hourlyRate || 16.15;
    
    // Calcola totale ore lavorate e viaggio
    const totalWorkHours = (ordinary.hours.lavoro_giornaliera || 0) + (ordinary.hours.lavoro_extra || 0);
    const totalTravelHours = (ordinary.hours.viaggio_giornaliera || 0) + (ordinary.hours.viaggio_extra || 0);
    const totalHours = totalWorkHours + totalTravelHours;
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Lavoro Ordinario</Text>
        
        {/* Riepilogo giorni e ore */}
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownDetail}>
            {ordinary.days} giorni lavorativi • {formatSafeHours(totalHours)} totali
          </Text>
          <Text style={styles.breakdownDetail}>
            ↳ Lavoro: {formatSafeHours(totalWorkHours)} • Viaggio: {formatSafeHours(totalTravelHours)}
          </Text>
        </View>

        {/* Retribuzione giornaliera base */}
        {ordinary.days > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Retribuzione giornaliera CCNL
              </Text>
              <Text style={styles.breakdownValue}>
                {ordinary.days} giorni
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(dailyRate * ordinary.days)}
            </Text>
            <Text style={styles.breakdownDetail}>
              €{dailyRate.toFixed(2).replace('.', ',')} × {ordinary.days} = €{(dailyRate * ordinary.days).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}

        {/* Straordinari lavoro */}
        {ordinary.hours.lavoro_extra > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Straordinari lavoro (+20%)
              </Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(ordinary.hours.lavoro_extra)}
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(ordinary.earnings.lavoro_extra)}
            </Text>
            <Text style={styles.breakdownDetail}>
              €{hourlyRate.toFixed(2).replace('.', ',')} × 1,20 × {formatSafeHours(ordinary.hours.lavoro_extra)} = €{(hourlyRate * 1.20 * ordinary.hours.lavoro_extra).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}

        {/* Straordinari viaggio */}
        {ordinary.hours.viaggio_extra > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio extra (tariff. viaggio)
              </Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(ordinary.hours.viaggio_extra)}
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(ordinary.earnings.viaggio_extra)}
            </Text>
            <Text style={styles.breakdownDetail}>
              €{hourlyRate.toFixed(2).replace('.', ',')} × {formatSafeHours(ordinary.hours.viaggio_extra)} = €{(hourlyRate * ordinary.hours.viaggio_extra).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}

        {/* Maggiorazioni weekend/festivi */}
        {(ordinary.earnings.sabato_bonus > 0 || ordinary.earnings.domenica_bonus > 0 || ordinary.earnings.festivo_bonus > 0) && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Maggiorazioni weekend/festivi</Text>
              <Text style={styles.breakdownValue}></Text>
            </View>
            {ordinary.earnings.sabato_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                • Sabato (+25%): {formatSafeAmount(ordinary.earnings.sabato_bonus)}
              </Text>
            )}
            {ordinary.earnings.domenica_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                • Domenica (+30%): {formatSafeAmount(ordinary.earnings.domenica_bonus)}
              </Text>
            )}
            {ordinary.earnings.festivo_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                • Festivo (+30%): {formatSafeAmount(ordinary.earnings.festivo_bonus)}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Totale Lavoro Ordinario</Text>
          <Text style={styles.totalAmount}>
            {formatSafeAmount(
              (dailyRate * ordinary.days) + 
              (ordinary.earnings.lavoro_extra || 0) + 
              (ordinary.earnings.viaggio_extra || 0) + 
              (ordinary.earnings.sabato_bonus || 0) + 
              (ordinary.earnings.domenica_bonus || 0) + 
              (ordinary.earnings.festivo_bonus || 0)
            )}
          </Text>
        </View>
      </View>
    );
  };

  const renderStandbySection = () => {
    if (!hasStandbyData) return null;

    const standby = monthlyAggregated?.standby || {};
    
    // Debug log per vedere i dati standby
    console.log('🔍 STANDBY DEBUG - Dati standby ricevuti:', {
      workHours: standby.workHours,
      workEarnings: standby.workEarnings,
      travelHours: standby.travelHours,
      travelEarnings: standby.travelEarnings,
      totalEarnings: standby.totalEarnings
    });
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Interventi Reperibilità</Text>
        {/* Contatore interventi reperibilità */}
        {monthlyAggregated?.analytics?.standbyInterventions > 0 ? (
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownDetail}>
              {monthlyAggregated?.analytics?.standbyInterventions} interventi effettuati in reperibilità
            </Text>
          </View>
        ) : (
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownDetail}>
              Nessun intervento effettuato in reperibilità
            </Text>
          </View>
        )}
        
        {/* Lavoro diurno reperibilità */}
        {(standby.workHours?.ordinary || 0) > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro diurno ({String(
                  (() => {
                    try {
                      if (standby.workEarnings?.ordinary && standby.workHours?.ordinary > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                        const hourlyEarned = standby.workEarnings.ordinary / standby.workHours.ordinary;
                        const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                        const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                        return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                      }
                      return '+20%';
                    } catch (error) {
                      return '+20%';
                    }
                  })() || '+20%'
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours?.ordinary || 0)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings?.ordinary || 0)}
            </Text>
          </View>
        )}

        {/* Lavoro serale reperibilità (18-22h) */}
        {(standby.workHours?.evening || 0) > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro serale ({String(
                  (() => {
                    try {
                      if (standby.workEarnings?.evening && standby.workHours?.evening > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                        const hourlyEarned = standby.workEarnings.evening / standby.workHours.evening;
                        const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                        const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                        return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                      }
                      return '+25%';
                    } catch (error) {
                      return '+25%';
                    }
                  })() || '+25%'
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours?.evening || 0)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings?.evening || 0)}
            </Text>
          </View>
        )}

        {/* Lavoro notturno reperibilità (22-06h) */}
        {(standby.workHours?.night || 0) > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro notturno ({String(
                  (() => {
                    try {
                      if (standby.workEarnings?.night && standby.workHours?.night > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                        const hourlyEarned = standby.workEarnings.night / standby.workHours.night;
                        const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                        const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                        return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                      }
                      return '+25%/+35%';
                    } catch (error) {
                      return '+25%/+35%';
                    }
                  })() || '+25%/+35%'
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours?.night || 0)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings?.night || 0)}
            </Text>
          </View>
        )}

        {/* Lavoro festivo reperibilità */}
        {standby.workHours.holiday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro festivo ({String(
                  (() => {
                    if (standby.workEarnings.holiday && standby.workHours.holiday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.workEarnings.holiday / standby.workHours.holiday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+30%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.holiday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.holiday)}
            </Text>
          </View>
        )}

        {/* Lavoro sabato reperibilità */}
        {standby.workHours.saturday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro sabato ({String(
                  (() => {
                    if (standby.workEarnings.saturday && standby.workHours.saturday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.workEarnings.saturday / standby.workHours.saturday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.saturday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.saturday)}
            </Text>
          </View>
        )}

        {/* Lavoro sabato notturno reperibilità */}
        {standby.workHours.saturday_night > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro sabato notturno ({String(
                  (() => {
                    if (standby.workEarnings.saturday_night && standby.workHours.saturday_night > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.workEarnings.saturday_night / standby.workHours.saturday_night;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+56%/+69%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.saturday_night)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.saturday_night)}
            </Text>
          </View>
        )}

        {/* Lavoro festivo notturno reperibilità */}
        {standby.workHours.night_holiday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Lavoro festivo notturno ({String(
                  (() => {
                    if (standby.workEarnings.night_holiday && standby.workHours.night_holiday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.workEarnings.night_holiday / standby.workHours.night_holiday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+62%/+76%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.night_holiday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.night_holiday)}
            </Text>
          </View>
        )}

        {/* Viaggio diurno reperibilità */}
        {standby.travelHours.ordinary > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio diurno ({String(
                  (() => {
                    if (standby.travelEarnings.ordinary && standby.travelHours.ordinary > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.ordinary / standby.travelHours.ordinary;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return 'tariffa base';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.ordinary)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.ordinary)}
            </Text>
          </View>
        )}

        {/* Viaggio serale reperibilità (18-22h) */}
        {standby.travelHours.evening > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio serale ({String(
                  (() => {
                    if (standby.travelEarnings.evening && standby.travelHours.evening > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.evening / standby.travelHours.evening;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.evening)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.evening)}
            </Text>
          </View>
        )}

        {/* Viaggio notturno reperibilità (22-06h) */}
        {standby.travelHours.night > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio notturno ({String(
                  (() => {
                    if (standby.travelEarnings.night && standby.travelHours.night > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.night / standby.travelHours.night;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.night)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.night)}
            </Text>
          </View>
        )}

        {/* Viaggio sabato reperibilità */}
        {standby.travelHours.saturday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio sabato ({String(
                  (() => {
                    if (standby.travelEarnings.saturday && standby.travelHours.saturday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.saturday / standby.travelHours.saturday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.saturday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.saturday)}
            </Text>
          </View>
        )}

        {/* Viaggio sabato notturno reperibilità */}
        {standby.travelHours.saturday_night > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio sabato notturno ({String(
                  (() => {
                    if (standby.travelEarnings.saturday_night && standby.travelHours.saturday_night > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.saturday_night / standby.travelHours.saturday_night;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.saturday_night)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.saturday_night)}
            </Text>
          </View>
        )}

        {/* Viaggio festivo reperibilità */}
        {standby.travelHours.holiday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio festivo ({String(
                  (() => {
                    if (standby.travelEarnings.holiday && standby.travelHours.holiday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.holiday / standby.travelHours.holiday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+30%';
                  })()
                )})
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.holiday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.holiday)}
            </Text>
          </View>
        )}

        {/* Viaggio festivo notturno reperibilità */}
        {standby.travelHours.night_holiday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Viaggio festivo notturno ({
                  (() => {
                    if (standby.travelEarnings.night_holiday && standby.travelHours.night_holiday > 0 && monthlyAggregated?.settings?.contract?.hourlyRate) {
                      const hourlyEarned = standby.travelEarnings.night_holiday / standby.travelHours.night_holiday;
                      const baseRate = monthlyAggregated.settings.contract.hourlyRate;
                      const percentage = Math.round((hourlyEarned / baseRate - 1) * 100);
                      return `+${percentage}% - ${hourlyEarned.toFixed(2).replace('.', ',')}€/h`;
                    }
                    return '+25%';
                  })()
                })
              </Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.night_holiday)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.night_holiday)}
            </Text>
          </View>
        )}

        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Totale reperibilità</Text>
          <Text style={styles.totalAmount}>
            {formatSafeAmount(standby.totalEarnings - (monthlyAggregated?.allowances?.standby || 0))}
          </Text>
        </View>
      </View>
    );
  };

  const renderAllowancesSection = () => {
    if (!hasAllowancesData) return null;

    const allowances = monthlyAggregated?.allowances || {};
    const meals = monthlyAggregated?.meals || {};
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Indennità e Buoni</Text>
        
        {/* Indennità trasferta */}
        {allowances.travel > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Indennità trasferta</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.travel)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {allowances.travelDays || 0} giorni con indennità trasferta
            </Text>
            
            {/* Dettaglio suddivisione per percentuale */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Suddivisione per percentuale:</Text>
              {allowances.travelByPercent['100'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 100% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '15,00€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['100'].amount)} 
                  ({allowances.travelByPercent['100'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['78'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 78% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount * 0.78;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '11,70€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['78'].amount)} 
                  ({allowances.travelByPercent['78'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['50'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • 50% ({
                    (() => {
                      if (monthlyAggregated?.settings?.travelAllowance?.dailyAmount) {
                        const dailyAmount = monthlyAggregated.settings.travelAllowance.dailyAmount * 0.50;
                        return `${dailyAmount.toFixed(2).replace('.', ',')}€/giorno`;
                      }
                      return '7,50€/giorno';
                    })()
                  }): {formatSafeAmount(allowances.travelByPercent['50'].amount)} 
                  ({allowances.travelByPercent['50'].days} giorni)
                </Text>
              )}
              {allowances.travelByPercent['other'].amount > 0 && (
                <Text style={styles.breakdownSubDetail}>
                  • Altre: {formatSafeAmount(allowances.travelByPercent['other'].amount)} 
                  ({allowances.travelByPercent['other'].days} giorni)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Indennità reperibilità */}
        {allowances.standby > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Indennità reperibilità</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.standby)}</Text>
            </View>
            <View style={styles.breakdownSubItems}>
              {/* Feriale */}
              {allowances.standbyByType?.feriale?.amount > 0 && (
                <Text style={styles.breakdownDetail}>
                  Feriale (7,03€/giorno): €{allowances.standbyByType.feriale.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.feriale.days} gg)
                </Text>
              )}
              
              {/* Sabato */}
              {allowances.standbyByType?.sabato?.amount > 0 && (
                <Text style={styles.breakdownDetail}>
                  Sabato (7,03€/giorno): €{allowances.standbyByType.sabato.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.sabato.days} gg)
                </Text>
              )}
              
              {/* Festivo */}
              {allowances.standbyByType?.festivo?.amount > 0 && (
                <Text style={styles.breakdownDetail}>
                  Festivo (10,63€/giorno): €{allowances.standbyByType.festivo.amount.toFixed(2).replace('.', ',')} ({allowances.standbyByType.festivo.days} gg)
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Rimborso pasti */}
        {allowances.meal > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Rimborso pasti</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.meal)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {allowances.mealDays || 0} giorni con rimborsi pasti (voce non tassabile)
            </Text>
            
            {/* Suddivisione per pranzo e cena */}
            <View style={styles.mealDetail}>
              <Text style={styles.breakdownDetail}>Suddivisione per tipologia:</Text>
              
              {/* Pranzo */}
              {(meals.lunch.voucher > 0 || meals.lunch.cash > 0 || meals.lunch.specific > 0) && (
                <View style={styles.mealSubSection}>
                  <Text style={styles.breakdownSubDetail}>- Pranzo:</Text>
                  {meals.lunch.specific > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.lunch.specific)} (contanti specifici) - {meals.lunch.specificDays} giorni
                    </Text>
                  )}
                  {meals.lunch.voucher > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.lunch.voucher)} (buoni {
                        (() => {
                          if (monthlyAggregated?.settings?.mealAllowances?.lunch?.voucherAmount && meals.lunch.voucherDays > 0) {
                            const unitValue = monthlyAggregated.settings.mealAllowances.lunch.voucherAmount;
                            return `${unitValue.toFixed(2).replace('.', ',')}€/giorno`;
                          }
                          return '8,00€/giorno';
                        })()
                      }) - {meals.lunch.voucherDays} giorni
                    </Text>
                  )}
                  {meals.lunch.cash > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.lunch.cash)} (contanti {
                        (() => {
                          if (monthlyAggregated?.settings?.mealAllowances?.lunch?.cashAmount && meals.lunch.cashDays > 0) {
                            const unitValue = monthlyAggregated.settings.mealAllowances.lunch.cashAmount;
                            return `${unitValue.toFixed(2).replace('.', ',')}€/giorno`;
                          }
                          return '4,00€/giorno';
                        })()
                      }) - {meals.lunch.cashDays} giorni
                    </Text>
                  )}
                </View>
              )}
              
              {/* Cena */}
              {(meals.dinner.voucher > 0 || meals.dinner.cash > 0 || meals.dinner.specific > 0) && (
                <View style={styles.mealSubSection}>
                  <Text style={styles.breakdownSubDetail}>- Cena:</Text>
                  {meals.dinner.specific > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.dinner.specific)} (contanti specifici) - {meals.dinner.specificDays} giorni
                    </Text>
                  )}
                  {meals.dinner.voucher > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.dinner.voucher)} (buoni {
                        (() => {
                          if (monthlyAggregated?.settings?.mealAllowances?.dinner?.voucherAmount && meals.dinner.voucherDays > 0) {
                            const unitValue = monthlyAggregated.settings.mealAllowances.dinner.voucherAmount;
                            return `${unitValue.toFixed(2).replace('.', ',')}€/giorno`;
                          }
                          return '8,00€/giorno';
                        })()
                      }) - {meals.dinner.voucherDays} giorni
                    </Text>
                  )}
                  {meals.dinner.cash > 0 && (
                    <Text style={styles.breakdownSubDetail}>
                      {formatSafeAmount(meals.dinner.cash)} (contanti {
                        (() => {
                          if (monthlyAggregated?.settings?.mealAllowances?.dinner?.cashAmount && meals.dinner.cashDays > 0) {
                            const unitValue = monthlyAggregated.settings.mealAllowances.dinner.cashAmount;
                            return `${unitValue.toFixed(2).replace('.', ',')}€/giorno`;
                          }
                          return '4,00€/giorno';
                        })()
                      }) - {meals.dinner.cashDays} giorni
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSummaryStats = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Riepilogo {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Giorni lavorati</Text>
          <Text style={styles.statValue}>{monthlyAggregated?.daysWorked || 0}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ore totali</Text>
          <Text style={styles.statValue}>{formatSafeHours(monthlyAggregated?.totalHours || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rimborsi pasti</Text>
          <Text style={styles.statValue}>{formatSafeAmount(monthlyAggregated?.allowances?.meal || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Indennità</Text>
          <Text style={styles.statValue}>
            {formatSafeAmount((monthlyAggregated?.allowances?.travel || 0) + (monthlyAggregated?.allowances?.standby || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Totale Guadagno Mensile (Lordo)</Text>
          <Text style={styles.totalAmount}>{formatSafeAmount(monthlyAggregated?.totalEarnings || 0)}</Text>
        </View>
        
        {/* Calcolo netto con trattenute */}
        {(() => {
          const grossAmount = monthlyAggregated?.totalEarnings || 0;
          if (grossAmount > 0) {
            try {
              // 💰 Usa impostazioni salvate dall'utente con default IRPEF
              const payslipSettings = {
                method: settings?.netCalculation?.method || 'irpef', // Default IRPEF
                customDeductionRate: settings?.netCalculation?.customDeductionRate || 32 // Fallback 32% realistico
              };
              
              console.log('🔍 DASHBOARD - Impostazioni per calcolo netto:');
              console.log('- Settings disponibili:', !!settings?.netCalculation);
              console.log('- Metodo utilizzato:', payslipSettings.method);
              console.log('- Percentuale utilizzata:', payslipSettings.customDeductionRate);
              console.log('- Usa cifra presente:', settings?.netCalculation?.useActualAmount ?? false);
              
              // 🎯 Scelta base di calcolo: cifra presente vs stima annuale
              let calculationBase = grossAmount;
              let isEstimated = false;
              
              const useActualAmount = settings?.netCalculation?.useActualAmount ?? false;
              
              console.log('🔧 DASHBOARD DEBUG - Condizioni per stima annuale:');
              console.log(`- useActualAmount: ${useActualAmount}`);
              console.log(`- !useActualAmount: ${!useActualAmount}`);
              console.log(`- contract disponibile: ${!!settings?.contract}`);
              console.log(`- monthlySalary: ${settings?.contract?.monthlySalary}`);
              console.log(`- monthlySalary truthy: ${!!settings?.contract?.monthlySalary}`);
              console.log(`- Condizione IF completa: ${!useActualAmount && settings?.contract?.monthlySalary}`);
              
              // ✅ Se l'utente ha scelto "stima annuale", usa SEMPRE lo stipendio base
              if (!useActualAmount && settings?.contract?.monthlySalary) {
                // Usa lo stipendio base mensile per garantire percentuali consistenti
                calculationBase = settings.contract.monthlySalary;
                isEstimated = true;
                
                console.log('🎯 DASHBOARD - Usando stima annuale (stipendio base):');
                console.log(`- Importo lordo effettivo: €${grossAmount.toFixed(2)}`);
                console.log(`- Base calcolo (stipendio base): €${calculationBase.toFixed(2)}`);
                console.log(`- Percentuale trattenute costante basata su stipendio standard`);
              } else {
                console.log('🎯 DASHBOARD - Usando cifra presente:');
                console.log(`- Importo lordo: €${grossAmount.toFixed(2)}`);
                console.log(`- useActualAmount: ${useActualAmount}`);
              }
              
              const netCalculation = RealPayslipCalculator.calculateNetFromGross(calculationBase, payslipSettings);
              
              return (
                <>
                  <View style={[styles.totalRow, { marginTop: 8 }]}>
                    <Text style={[styles.totalLabel, { color: '#2e7d32' }]}>Totale Netto Stimato</Text>
                    <Text style={[styles.totalAmount, { color: '#2e7d32' }]}>{formatSafeAmount(netCalculation.net)}</Text>
                  </View>
                  <Text style={[styles.totalSubtext, { fontSize: 12, color: '#666' }]}>
                    Trattenute: {formatSafeAmount(netCalculation.totalDeductions)} ({(netCalculation.deductionRate * 100).toFixed(1)}% - {payslipSettings.method === 'custom' ? 'Personalizzato' : 'IRPEF + INPS + Addizionali'})
                  </Text>
                  {isEstimated && (
                    <Text style={[styles.totalSubtext, { fontSize: 11, color: '#999', fontStyle: 'italic' }]}>
                      *Calcolo basato su stipendio standard (€{calculationBase.toFixed(2)}/mese)
                    </Text>
                  )}
                  {!isEstimated && calculationBase === grossAmount && (
                    <Text style={[styles.totalSubtext, { fontSize: 11, color: '#666' }]}>
                      Calcolato sulla cifra presente (€{grossAmount.toFixed(2)})
                    </Text>
                  )}
                </>
              );
            } catch (error) {
              console.warn('Errore calcolo netto:', error);
              return (
                <View style={[styles.totalRow, { marginTop: 8 }]}>
                  <Text style={[styles.totalLabel, { color: '#666' }]}>Totale Netto Stimato</Text>
                  <Text style={[styles.totalAmount, { color: '#666' }]}>Calcolo non disponibile</Text>
                </View>
              );
            }
          }
          return null;
        })()}
        
        <Text style={styles.totalSubtext}>
          Include attività ordinarie, interventi in reperibilità e indennità (esclusi rimborsi pasti)
        </Text>
      </View>
    </View>
  );

  const renderAnalyticsSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📊 Analisi Performance</Text>
        
        {/* Medie e statistiche principali */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Media ore/giorno</Text>
            <Text style={styles.analyticsValue}>{formatSafeHours(analytics.averageHoursPerDay)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Media €/giorno</Text>
            <Text style={styles.analyticsValue}>{formatSafeAmount(analytics.averageEarningsPerDay)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Tariffa media €/h</Text>
            <Text style={styles.analyticsValue}>{formatSafeAmount(analytics.averageEarningsPerHour)}</Text>
          </View>
          
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Score produttività</Text>
            <Text style={[styles.analyticsValue, { 
              color: analytics.efficiency.productivityScore >= 70 ? '#4caf50' : 
                     analytics.efficiency.productivityScore >= 50 ? '#ff9800' : '#f44336' 
            }]}>
              {analytics.efficiency.productivityScore.toFixed(0)}/100
            </Text>
          </View>
        </View>

        {/* Range ore giornaliere */}
        <View style={styles.analyticsDetail}>
          <Text style={styles.analyticsDetailLabel}>Range ore giornaliere</Text>
          <Text style={styles.analyticsDetailValue}>
            {formatSafeHours(analytics.minDailyHours)} - {formatSafeHours(analytics.maxDailyHours)}
          </Text>
        </View>

        {/* Breakdown ore */}
        <View style={styles.analyticsDetail}>
          <Text style={styles.analyticsDetailLabel}>Composizione ore</Text>
          <View style={styles.hoursBreakdown}>
            <Text style={styles.hoursBreakdownItem}>
              • Regolari: {formatSafeHours(analytics?.breakdown?.regularHours || 0)} 
              ({(analytics?.breakdown?.regularHours || 0) > 0 ? (((analytics?.breakdown?.regularHours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Straordinari: {formatSafeHours(analytics?.breakdown?.overtimeHours || 0)} 
              ({(analytics?.overtimePercentage || 0).toFixed(1)}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Viaggio Extra: {formatSafeHours(analytics?.breakdown?.extraTravelHours || 0)} 
              ({(analytics?.breakdown?.extraTravelHours || 0) > 0 ? (((analytics?.breakdown?.extraTravelHours || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Viaggi: {formatSafeHours(analytics?.travelHoursTotal || 0)} 
              ({(analytics?.travelHoursTotal || 0) > 0 ? (((analytics?.travelHoursTotal || 0) / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Notturne: {formatSafeHours(analytics.nightWorkHours)} 
              ({analytics.nightWorkHours > 0 ? ((analytics.nightWorkHours / (monthlyAggregated?.totalHours || 1)) * 100).toFixed(1) : 0}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWorkPatternSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔄 Pattern Lavorativo</Text>
        
        <View style={styles.patternGrid}>
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-weekend" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni weekend</Text>
            <Text style={styles.patternValue}>{analytics.weekendWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="phone-alert" size={20} color="#e91e63" />
            <Text style={styles.patternLabel}>Interventi reperibilità</Text>
            <Text style={styles.patternValue}>{analytics.standbyInterventions}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="weather-night" size={20} color="#3f51b5" />
            <Text style={styles.patternLabel}>Ore notturne</Text>
            <Text style={styles.patternValue}>{formatSafeHours(analytics.nightWorkHours)}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="car" size={20} color="#795548" />
            <Text style={styles.patternLabel}>Ore viaggio</Text>
            <Text style={styles.patternValue}>{formatSafeHours(analytics.travelHoursTotal)}</Text>
          </View>
        </View>

        {/* Efficienza lavoro vs viaggio */}
        <View style={styles.efficiencySection}>
          <Text style={styles.efficiencyTitle}>Efficienza Lavoro/Viaggio</Text>
          <View style={styles.efficiencyBar}>
            <View 
              style={[
                styles.efficiencyFill, 
                { 
                  width: `${analytics.efficiency.workVsTravel}%`,
                  backgroundColor: analytics.efficiency.workVsTravel >= 70 ? '#4caf50' : 
                                  analytics.efficiency.workVsTravel >= 50 ? '#ff9800' : '#f44336'
                }
              ]} 
            />
          </View>
          <Text style={styles.efficiencyLabel}>
            {analytics.efficiency.workVsTravel.toFixed(1)}% tempo dedicato al lavoro effettivo
          </Text>
        </View>
      </View>
    );
  };

  const renderEarningsBreakdownSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.totalEarnings || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💰 Composizione Guadagni</Text>
        
        <View style={styles.earningsBreakdown}>
          {/* Attività ordinarie */}
          <View style={styles.earningsItem}>
            <View style={styles.earningsItemHeader}>
              <View style={[styles.earningsColorBar, { backgroundColor: '#1976d2' }]} />
              <Text style={styles.earningsItemLabel}>Attività Ordinarie</Text>
              <Text style={styles.earningsItemPercentage}>
                {(analytics?.breakdown?.ordinaryPercentage || 0).toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.earningsItemAmount}>
              {formatSafeAmount(monthlyAggregated?.ordinary?.total)}
            </Text>
          </View>

          {/* Reperibilità */}
          {(monthlyAggregated?.standby?.totalEarnings || 0) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#e91e63' }]} />
                <Text style={styles.earningsItemLabel}>Interventi Reperibilità</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(analytics?.breakdown?.standbyPercentage || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated?.standby?.totalEarnings || 0)}
              </Text>
            </View>
          )}

          {/* Indennità (solo trasferte) */}
          {(monthlyAggregated?.allowances?.travel || 0) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#ff9800' }]} />
                <Text style={styles.earningsItemLabel}>Indennità Trasferta</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(analytics?.breakdown?.allowancesPercentage || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated?.allowances?.travel || 0)}
              </Text>
            </View>
          )}

          {/* Rimborsi pasti */}
          {(monthlyAggregated?.allowances?.meal || 0) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.earningsItemLabel}>Rimborsi Pasti</Text>
                <Text style={styles.earningsItemPercentage}>
                  {(() => {
                    // Calcola la percentuale usando la stessa logica del calcolo principale
                    const totalForPercentages = monthlyAggregated.ordinary.total + 
                                               monthlyAggregated.standby.totalEarnings + 
                                               (monthlyAggregated.allowances?.travel || 0) + 
                                               (monthlyAggregated.allowances?.meal || 0);
                    return totalForPercentages > 0 ? ((monthlyAggregated.allowances?.meal || 0) / totalForPercentages * 100).toFixed(1) : '0.0';
                  })()}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated?.allowances?.meal || 0)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Renderizza il riepilogo giornaliero collassabile
  const renderDailyBreakdown = () => {
    if (!workEntries || workEntries.length === 0) {
      return null;
    }

    try {
      // Calcola statistiche per il mini-riepilogo usando i dati reali degli entries
      const standbyOnlyDays = workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return workEntry?.isStandbyDay && !workEntry?.workStart1 && !workEntry?.workStart2;
        } catch (error) {
          console.error('Errore nel filtrare standbyOnlyDays:', error);
          return false;
        }
      }).length;
      
      const workAndStandbyDays = workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2);
        } catch (error) {
          console.error('Errore nel filtrare workAndStandbyDays:', error);
          return false;
        }
      }).length;

      const workOnlyDays = workEntries.filter(entry => {
        try {
          const workEntry = createWorkEntryFromData(entry);
          return !workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2 || workEntry?.isFixedDay);
        } catch (error) {
          console.error('Errore nel filtrare workOnlyDays:', error);
          return false;
        }
      }).length;

      // Crea array con i dati reali degli entries
      const dailyData = workEntries
        .map(entry => {
          try {
            const workEntry = createWorkEntryFromData(entry);
            if (!workEntry || !entry?.date) {
              return null; // Skip invalid entries
            }
            
            const dateObj = new Date(entry.date);
            if (isNaN(dateObj.getTime())) {
              return null; // Skip invalid dates
            }
            
            const dayOfMonth = dateObj.getDate() || 0;
            
            // Calcola ore e guadagni per questo entry con fallback sicuro
            const breakdown = calculationService?.calculateEarningsBreakdown?.(workEntry, monthlyAggregated?.settings || {}) || {};
            const dailyHours = (Object.values(breakdown?.ordinary?.hours || {}).reduce((a, b) => (a || 0) + (b || 0), 0) || 0) +
                              (Object.values(breakdown?.standby?.workHours || {}).reduce((a, b) => (a || 0) + (b || 0), 0) || 0) +
                              (Object.values(breakdown?.standby?.travelHours || {}).reduce((a, b) => (a || 0) + (b || 0), 0) || 0);
            const earnings = breakdown?.totalEarnings || 0;
          
          // Determina il tipo di giornata basandosi sui dati reali
          let dayType = 'rest';
          let typeLabel = 'Riposo';
          let typeIcon = '⭕';
          let backgroundColor = '#f8f9fa';
          
          if (workEntry?.isFixedDay) {
            // Giorni fissi (ferie, malattia, riposo compensativo, etc.)
            if (workEntry?.siteName && String(workEntry.siteName).toLowerCase().includes('ferie')) {
              dayType = 'vacation';
              typeLabel = 'Ferie';
              typeIcon = '🏖️';
              backgroundColor = '#e8f5e8';
            } else if (workEntry?.siteName && String(workEntry.siteName).toLowerCase().includes('riposo')) {
              dayType = 'compensatory';
              typeLabel = 'Riposo Compensativo';
              typeIcon = '🛏️';
              backgroundColor = '#f0f0f0';
            } else {
              dayType = 'fixed';
              typeLabel = 'Giorno Fisso';
              typeIcon = '📅';
              backgroundColor = '#e8f5e8';
            }
          } else if (workEntry?.isStandbyDay && !workEntry?.workStart1 && !workEntry?.workStart2) {
            // Solo reperibilità senza lavoro
            dayType = 'standby-only';
            typeLabel = 'Solo Reperibilità';
            typeIcon = '🟡';
            backgroundColor = '#fff3cd';
          } else if (workEntry?.isStandbyDay && (workEntry?.workStart1 || workEntry?.workStart2)) {
            // Lavoro + reperibilità
            dayType = 'work-standby';
            typeLabel = 'Lavoro + Reperibilità';
            typeIcon = '🟠';
            backgroundColor = '#ffeaa7';
          } else if (workEntry?.workStart1 || workEntry?.workStart2) {
            // Solo lavoro ordinario
            dayType = 'work';
            typeLabel = 'Lavoro Ordinario';
            typeIcon = '🔵';
            backgroundColor = '#d1ecf1';
          }
          
          return {
            dayOfMonth: dayOfMonth || 0,
            dateObj,
            hours: dailyHours || 0,
            earnings: earnings || 0,
            entryData: entry,
            workEntry,
            dayType: dayType || 'rest',
            typeLabel: typeLabel || 'N/A',
            typeIcon: typeIcon || '⭕',
            backgroundColor: backgroundColor || '#f8f9fa'
          };
          
          } catch (error) {
            console.error('Errore nel processare entry:', entry?.id, error);
            return null; // Skip entries che causano errori
          }
        })
        .filter(day => day !== null) // Rimuovi entries invalide
        .sort((a, b) => (b?.dateObj || new Date()) - (a?.dateObj || new Date())); // Ordina dal più recente al più vecchio

      return (
        <View style={styles.sectionCard}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setIsDailyBreakdownExpanded(!isDailyBreakdownExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleHeaderContent}>
              <MaterialCommunityIcons name="calendar-today" size={20} color="#2196f3" />
              <Text style={styles.collapsibleTitle}>Riepilogo Giornaliero</Text>
              <MaterialCommunityIcons 
                name={isDailyBreakdownExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#666" 
              />
            </View>
            
            <View style={styles.miniSummary}>
              <Text style={styles.miniSummaryText}>
                {workEntries?.length || 0} giorni registrati • {formatSafeHours(dailyData.reduce((total, day) => total + (day?.hours || 0), 0))} totali
              </Text>
              <Text style={styles.miniSummaryText}>
                {formatSafeAmount(dailyData.reduce((total, day) => total + (day?.earnings || 0), 0))} guadagno totale
              </Text>
              {(standbyOnlyDays || 0) > 0 && (
                <Text style={styles.miniSummaryText}>
                  🟡 {standbyOnlyDays || 0} giorni solo reperibilità
                </Text>
              )}
              {(workAndStandbyDays || 0) > 0 && (
                <Text style={styles.miniSummaryText}>
                  🟠 {workAndStandbyDays || 0} giorni lavoro + reperibilità
                </Text>
              )}
              {(workOnlyDays || 0) > 0 && (
                <Text style={styles.miniSummaryText}>
                  🔵 {workOnlyDays || 0} giorni lavoro ordinario
                </Text>
              )}
            </View>
          </TouchableOpacity>
          
          {isDailyBreakdownExpanded && (
            <View style={styles.collapsibleContent}>
              {dailyData.map((day, index) => (
                <TouchableOpacity 
                  key={`${day?.dateObj?.getTime() || index}-${index}`} 
                  style={[styles.dailyListItem, { backgroundColor: day?.backgroundColor || '#f8f9fa' }]}
                  onPress={() => navigation.navigate('TimeEntry', { 
                    screen: 'TimeEntryForm', 
                    params: { 
                      isEdit: true, 
                      entry: day?.entryData,
                      enableDelete: true 
                    } 
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.dailyListHeader}>
                    <View style={styles.dailyListDate}>
                      <Text style={styles.dailyListDay}>{String(day?.dayOfMonth || 0)}</Text>
                      <Text style={styles.dailyListDateText}>
                        {day?.dateObj?.toLocaleDateString?.('it-IT', { weekday: 'short' }) || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.dailyListType}>
                      <Text style={styles.dailyListTypeIcon}>{String(day?.typeIcon || '⭕')}</Text>
                      <Text style={styles.dailyListTypeText}>{String(day?.typeLabel || 'N/A')}</Text>
                    </View>
                    <View style={styles.dailyListStats}>
                      <Text style={styles.dailyListHours}>{formatSafeHours(day?.hours || 0)}</Text>
                      <Text style={styles.dailyListEarnings}>{formatSafeAmount(day?.earnings || 0)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.dailyListDetails}>
                    {/* Solo informazioni essenziali come richiesto */}
                    {day?.workEntry?.isStandbyDay && (
                      <Text style={styles.dailyListDetail}>🟡 Reperibilità</Text>
                    )}
                    {day?.workEntry?.completamentoGiornata && day.workEntry.completamentoGiornata !== 'nessuno' && (
                      <Text style={styles.dailyListDetail}>
                        Giornata completata con: {String(day.workEntry.completamentoGiornata || '')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              
              {(dailyData?.length || 0) === 0 && (
                <View style={styles.emptyDailyList}>
                  <Text style={styles.emptyDailyText}>Nessuna attività registrata questo mese</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    } catch (error) {
      console.error('Errore nella renderizzazione del riepilogo giornaliero:', error);
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Riepilogo Giornaliero</Text>
          <Text style={styles.errorText}>Errore nel caricamento dei dati</Text>
        </View>
      );
    }
  };



  const renderWorkPatternsSection = () => {
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔄 Pattern Lavorativo</Text>
        
        <View style={styles.patternGrid}>
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="calendar-weekend" size={20} color="#ff9800" />
            <Text style={styles.patternLabel}>Giorni weekend</Text>
            <Text style={styles.patternValue}>{analytics.weekendWorkDays}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="phone-alert" size={20} color="#e91e63" />
            <Text style={styles.patternLabel}>Interventi reperibilità</Text>
            <Text style={styles.patternValue}>{analytics?.standbyInterventions || 0}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="weather-night" size={20} color="#3f51b5" />
            <Text style={styles.patternLabel}>Ore notturne</Text>
            <Text style={styles.patternValue}>{formatSafeHours(analytics?.nightWorkHours || 0)}</Text>
          </View>
          
          <View style={styles.patternItem}>
            <MaterialCommunityIcons name="car" size={20} color="#795548" />
            <Text style={styles.patternLabel}>
              Incidenza reperibilità: {(analytics?.standbyWorkRatio || 0).toFixed(1)}% del totale
            </Text>
            <Text style={styles.standbyRatioSubtext}>
              {analytics?.standbyInterventions || 0} interventi su {monthlyAggregated?.daysWorked || 0} giorni lavorati
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFixedDaysSection = () => {
    if (fixedDaysLoading || !fixedDaysData || fixedDaysData.totalDays === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🏖️ Ferie e Permessi</Text>
        
        <View style={styles.fixedDaysGrid}>
          {fixedDaysData.vacation.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="beach" size={20} color="#4caf50" />
              <Text style={styles.fixedDayLabel}>Ferie</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.vacation.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{typeof fixedDaysData.vacation.earnings === 'string' ? fixedDaysData.vacation.earnings : formatSafeAmount(fixedDaysData.vacation.earnings)}</Text>
            </View>
          )}
          
          {fixedDaysData.sick.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="medical-bag" size={20} color="#ff9800" />
              <Text style={styles.fixedDayLabel}>Malattia</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.sick.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{typeof fixedDaysData.sick.earnings === 'string' ? fixedDaysData.sick.earnings : formatSafeAmount(fixedDaysData.sick.earnings)}</Text>
            </View>
          )}
          
          {fixedDaysData.permit.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#2196f3" />
              <Text style={styles.fixedDayLabel}>Permesso</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.permit.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{typeof fixedDaysData.permit.earnings === 'string' ? fixedDaysData.permit.earnings : formatSafeAmount(fixedDaysData.permit.earnings)}</Text>
            </View>
          )}
          
          {fixedDaysData.compensatory.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="clock-time-eight" size={20} color="#9c27b0" />
              <Text style={styles.fixedDayLabel}>Riposo Comp.</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.compensatory.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{typeof fixedDaysData.compensatory.earnings === 'string' ? fixedDaysData.compensatory.earnings : formatSafeAmount(fixedDaysData.compensatory.earnings)}</Text>
            </View>
          )}
          
          {fixedDaysData.holiday.days > 0 && (
            <View style={styles.fixedDayItem}>
              <MaterialCommunityIcons name="calendar-star" size={20} color="#ff5722" />
              <Text style={styles.fixedDayLabel}>Festivi</Text>
              <Text style={styles.fixedDayValue}>{fixedDaysData.holiday.days} giorni</Text>
              <Text style={styles.fixedDayAmount}>{typeof fixedDaysData.holiday.earnings === 'string' ? fixedDaysData.holiday.earnings : formatSafeAmount(fixedDaysData.holiday.earnings)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.fixedDaysSummary}>
          <Text style={styles.fixedDaysSummaryText}>
            Totale: {fixedDaysData.totalDays} giorni - {formatSafeAmount(fixedDaysData.totalEarnings)}
          </Text>
        </View>
      </View>
    );
  };

  const renderCompletionSection = () => {
    if (completionLoading || !completionData || completionData.totalEntries === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📋 Giorni in Completamento</Text>
        
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Totale giorni</Text>
            <Text style={styles.breakdownValue}>{completionData.totalEntries}</Text>
          </View>
          <Text style={styles.breakdownDetail}>
            {completionData.totalCompletionHours.toFixed(1)} ore totali in completamento
          </Text>
        </View>
        
        {Object.entries(completionData.byType || {}).map(([tipo, data]) => (
          <View key={tipo} style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {tipo === 'ferie' ? '🏖️ Ferie' : 
                 tipo === 'malattia' ? '🏥 Malattia' : 
                 tipo === 'permesso' ? '📅 Permesso' : 
                 tipo === 'recupero' ? '⏰ Recupero' : tipo}
              </Text>
              <Text style={styles.breakdownValue}>{data.count} giorni</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {data.totalHours.toFixed(1)} ore ({(data.totalHours / 8).toFixed(1)} giornate equivalenti)
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Debug rimosso per evitare errori di scope con safeSettings

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Caricamento dati...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        
        <View style={styles.monthNavigation}>
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToPreviousMonth}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1976d2" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.monthTitleContainer} onPress={goToCurrentMonth}>
            <Text style={styles.monthTitle}>
              {formatMonthYear(selectedDate)}
            </Text>
            {selectedDate.getMonth() !== currentDate.getMonth() || 
             selectedDate.getFullYear() !== currentDate.getFullYear() ? (
              <Text style={styles.currentMonthIndicator}>Tocca per tornare al mese corrente</Text>
            ) : null}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToNextMonth}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color="#1976d2" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {monthlyAggregated?.daysWorked > 0 ? (
          <>
            {renderSummaryStats()}
            {renderAnalyticsSection()}
            {renderWorkPatternSection()}
            {renderEarningsBreakdownSection()}
            {renderOrdinarySection()}
            {renderStandbySection()}
            {renderAllowancesSection()}
            {renderFixedDaysSection()}
            {renderCompletionSection()}
            {renderDailyBreakdown()}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nessun dato per questo mese</Text>
            <Text style={styles.emptySubtitle}>
              Usa il pulsante + per aggiungere il tuo primo orario di lavoro
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Pulsante flottante per aggiungere nuovo orario */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TimeEntry', { 
          screen: 'TimeEntryForm' 
        })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  currentMonthIndicator: {
    fontSize: 12,
    color: '#1976d2',
    marginTop: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  totalSubtext: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  breakdownDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginTop: 2,
  },
  breakdownSubItems: {
    marginLeft: 8,
    marginTop: 4,
  },
  breakdownSubDetail: {
    fontSize: 13,
    color: '#888',
    marginLeft: 16,
    marginTop: 1,
  },
  mealDetail: {
    marginLeft: 8,
    marginTop: 4,
  },
  mealSubSection: {
    marginLeft: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
    paddingTop: 12,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#1976d2',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Nuovi stili per le sezioni analytics
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
  },
  analyticsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  analyticsDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  analyticsDetailLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  analyticsDetailValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  hoursBreakdown: {
    marginTop: 8,
  },
  hoursBreakdownItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  // Stili per la sezione pattern lavorativo
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  patternItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  patternLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  patternValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  efficiencySection: {
    marginTop: 8,
  },
  efficiencyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  efficiencyBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: 4,
  },
  efficiencyLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  // Stili per la sezione breakdown guadagni
  earningsBreakdown: {
    marginBottom: 16,
  },
  earningsItem: {
    marginBottom: 12,
  },
  earningsItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  earningsItemLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  earningsItemPercentage: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  earningsItemAmount: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  standbyRatioSection: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e91e63',
  },
  standbyRatioLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  standbyRatioSubtext: {
    fontSize: 12,
    color: '#666',
  },
  fixedDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fixedDayItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  fixedDayLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
  },
  fixedDayValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  fixedDayAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  fixedDaysSummary: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fixedDaysSummaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  
  // Stili per il riepilogo giornaliero collassabile
  collapsibleHeader: {
    flexDirection: 'column',
    padding: 16,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  collapsibleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  miniSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  miniSummaryText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  collapsibleContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  // Nuovi stili per lista verticale
  dailyListItem: {
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dailyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyListDate: {
    flex: 1,
    alignItems: 'center',
  },
  dailyListDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyListDateText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  dailyListType: {
    flex: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dailyListTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dailyListTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dailyListStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dailyListHours: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '600',
  },
  dailyListEarnings: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
  },
  dailyListDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dailyListDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    paddingLeft: 4,
  },
  emptyDailyList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDailyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  // Vecchi stili mantenuti per compatibilità 
  dailyScrollView: {
    maxHeight: 120,
    marginTop: 12,
  },
  dailyScrollContent: {
    paddingHorizontal: 4,
  },
  dailyItem: {
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 2,
  },
  dailyDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dailyHours: {
    fontSize: 11,
    color: '#2196f3',
    fontWeight: '600',
    marginBottom: 2,
  },
  dailyEarnings: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '500',
  },
  dailyLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});

export default DashboardScreen;
