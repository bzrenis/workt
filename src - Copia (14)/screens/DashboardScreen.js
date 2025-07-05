import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatCurrency } from '../utils';
import { useSettings, useCalculationService } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { createWorkEntryFromData } from '../utils/earningsHelper';

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

const DashboardScreen = ({ navigation }) => {
  const { settings, isLoading: settingsLoading } = useSettings();
  const calculationService = useCalculationService();
  
  const [currentDate] = useState(new Date());
  const [workEntries, setWorkEntries] = useState([]);
  const [monthlyAggregated, setMonthlyAggregated] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔍 DEBUG SETTINGS CARICAMENTO
  useEffect(() => {
    console.log('🔍 DASHBOARD DEBUG - Settings loading status:', settingsLoading);
    console.log('🔍 DASHBOARD DEBUG - Settings available:', !!settings);
    if (settings) {
      console.log('🔍 DASHBOARD DEBUG - Settings mealAllowances:', JSON.stringify(settings.mealAllowances, null, 2));
      console.log('🔍 DASHBOARD DEBUG - Settings travelAllowance:', JSON.stringify(settings.travelAllowance, null, 2));
    }
  }, [settingsLoading, settings]);

  // Carica dati dal database
  const loadData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const entries = await DatabaseService.getWorkEntries(year, month);
      setWorkEntries(entries);
      
      // Calcola aggregazione mensile
      await calculateMonthlyAggregation(entries);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati.');
    } finally {
      setLoading(false);
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
      console.log('🔧 DASHBOARD DEBUG - Settings non disponibili, attesa...');
      return;
    }

    if (!entries || entries.length === 0) {
      setMonthlyAggregated({
        totalEarnings: 0,
        ordinary: { total: 0, hours: {} },
        standby: { totalEarnings: 0, workHours: {}, travelHours: {} },
        allowances: { travel: 0, meal: 0, standby: 0 },
        meals: { lunch: { voucher: 0, cash: 0, specific: 0 }, dinner: { voucher: 0, cash: 0, specific: 0 } },
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
        workHours: {
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
        workEarnings: {
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
        }
      },
      allowances: {
        travel: 0,
        meal: 0,
        standby: 0
      },
      meals: {
        lunch: { voucher: 0, cash: 0, specific: 0 },
        dinner: { voucher: 0, cash: 0, specific: 0 }
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
          aggregated.analytics.nightWorkHours += (breakdown.standby.workHours.night || 0) + 
                                                 (breakdown.standby.workHours.saturday_night || 0) + 
                                                 (breakdown.standby.workHours.night_holiday || 0);
        }

        // Conta ore di viaggio totali
        const travelHours = Object.values(breakdown.ordinary?.hours || {}).filter((_, index) => 
          ['viaggio_giornaliera', 'viaggio_extra'].includes(Object.keys(breakdown.ordinary.hours)[index])
        ).reduce((a, b) => a + b, 0) + Object.values(breakdown.standby?.travelHours || {}).reduce((a, b) => a + b, 0);
        
        aggregated.analytics.travelHoursTotal += travelHours;

        // Conta interventi reperibilità (usa workEntry parsato invece di entry grezzo)
        if (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0) {
          aggregated.analytics.standbyInterventions += workEntry.interventi.length;
        }

        // Aggrega ore ordinarie
        if (breakdown.ordinary) {
          aggregated.ordinary.total += breakdown.ordinary.total || 0;
          
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
          
          // Ore lavoro reperibilità
          if (breakdown.standby.workHours) {
            Object.keys(breakdown.standby.workHours).forEach(key => {
              if (aggregated.standby.workHours[key] !== undefined) {
                aggregated.standby.workHours[key] += breakdown.standby.workHours[key] || 0;
              }
            });
          }

          // Ore viaggio reperibilità
          if (breakdown.standby.travelHours) {
            Object.keys(breakdown.standby.travelHours).forEach(key => {
              if (aggregated.standby.travelHours[key] !== undefined) {
                aggregated.standby.travelHours[key] += breakdown.standby.travelHours[key] || 0;
              }
            });
          }

          // Guadagni lavoro reperibilità
          if (breakdown.standby.workEarnings) {
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

        // Aggrega indennità
        if (breakdown.allowances) {
          aggregated.allowances.travel += breakdown.allowances.travel || 0;
          aggregated.allowances.standby += breakdown.allowances.standby || 0;
        }

        // Aggrega pasti dettagliati e calcola totale rimborsi
        let mealAllowanceTotal = 0;
        
        if (workEntry.mealLunchVoucher || workEntry.mealLunchCash) {
          console.log('🔧 DASHBOARD DEBUG - Pranzo trovato:', {
            voucher: workEntry.mealLunchVoucher,
            cash: workEntry.mealLunchCash,
            safeSettingsVoucher: safeSettings.mealAllowances?.lunch?.voucherAmount,
            safeSettingsCash: safeSettings.mealAllowances?.lunch?.cashAmount
          });
          if (workEntry.mealLunchCash > 0) {
            aggregated.meals.lunch.specific += workEntry.mealLunchCash;
            mealAllowanceTotal += workEntry.mealLunchCash;
          } else {
            const voucherAmount = safeSettings.mealAllowances?.lunch?.voucherAmount || 0;
            const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
            aggregated.meals.lunch.voucher += voucherAmount;
            aggregated.meals.lunch.cash += cashAmount;
            mealAllowanceTotal += voucherAmount + cashAmount;
          }
        }

        if (workEntry.mealDinnerVoucher || workEntry.mealDinnerCash) {
          if (workEntry.mealDinnerCash > 0) {
            aggregated.meals.dinner.specific += workEntry.mealDinnerCash;
            mealAllowanceTotal += workEntry.mealDinnerCash;
          } else {
            const voucherAmount = safeSettings.mealAllowances?.dinner?.voucherAmount || 0;
            const cashAmount = safeSettings.mealAllowances?.dinner?.cashAmount || 0;
            aggregated.meals.dinner.voucher += voucherAmount;
            aggregated.meals.dinner.cash += cashAmount;
            mealAllowanceTotal += voucherAmount + cashAmount;
          }
        }

        // Aggrega il totale rimborsi pasti
        aggregated.allowances.meal += mealAllowanceTotal;
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

      // Calcola ore straordinarie vs regolari
      const overtimeHours = aggregated.ordinary.hours.lavoro_extra + aggregated.ordinary.hours.viaggio_extra;
      const regularHours = aggregated.totalHours - overtimeHours;
      aggregated.analytics.breakdown.overtimeHours = overtimeHours;
      aggregated.analytics.breakdown.regularHours = regularHours;
      
      if (aggregated.totalHours > 0) {
        aggregated.analytics.overtimePercentage = (overtimeHours / aggregated.totalHours) * 100;
      }

      // Rapporto reperibilità vs ordinario
      if (aggregated.totalEarnings > 0) {
        aggregated.analytics.standbyWorkRatio = (aggregated.standby.totalEarnings / aggregated.totalEarnings) * 100;
        
        // Percentuali di breakdown earnings
        aggregated.analytics.breakdown.ordinaryPercentage = (aggregated.ordinary.total / aggregated.totalEarnings) * 100;
        aggregated.analytics.breakdown.standbyPercentage = (aggregated.standby.totalEarnings / aggregated.totalEarnings) * 100;
        aggregated.analytics.breakdown.allowancesPercentage = ((aggregated.allowances.travel + aggregated.allowances.standby) / aggregated.totalEarnings) * 100;
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

    setMonthlyAggregated(aggregated);
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // ⭐ NUOVO USEEFFECT: Rilancia i calcoli quando le impostazioni sono pronte
  useEffect(() => {
    if (!settingsLoading && settings && workEntries.length > 0) {
      console.log('🔧 DASHBOARD DEBUG - Settings caricate, rilancio calcoli...');
      calculateMonthlyAggregation(workEntries);
    }
  }, [settingsLoading, settings, workEntries]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Verifica se ci sono dati da mostrare
  const hasOrdinaryData = monthlyAggregated.ordinary?.total > 0;
  const hasStandbyData = monthlyAggregated.standby?.totalEarnings > 0 ||
    Object.values(monthlyAggregated.standby?.workHours || {}).some(h => h > 0) ||
    Object.values(monthlyAggregated.standby?.travelHours || {}).some(h => h > 0);
  const hasAllowancesData = (monthlyAggregated.allowances?.travel > 0 || 
                            monthlyAggregated.allowances?.meal > 0 || 
                            monthlyAggregated.allowances?.standby > 0);

  const renderOrdinarySection = () => {
    if (!hasOrdinaryData) return null;

    const ordinary = monthlyAggregated.ordinary;
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Attività Ordinarie</Text>
        
        {/* Ore giornaliere (prime 8h) */}
        {(ordinary.hours.lavoro_giornaliera > 0 || ordinary.hours.viaggio_giornaliera > 0) && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Giornaliero (prime 8h)</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(ordinary.hours.lavoro_giornaliera + ordinary.hours.viaggio_giornaliera)}
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(ordinary.earnings.giornaliera)}
            </Text>
            {ordinary.hours.lavoro_giornaliera > 0 && (
              <Text style={styles.breakdownDetail}>
                - Lavoro: {formatSafeHours(ordinary.hours.lavoro_giornaliera)}
              </Text>
            )}
            {ordinary.hours.viaggio_giornaliera > 0 && (
              <Text style={styles.breakdownDetail}>
                - Viaggio: {formatSafeHours(ordinary.hours.viaggio_giornaliera)}
              </Text>
            )}
          </View>
        )}

        {/* Lavoro extra */}
        {ordinary.hours.lavoro_extra > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Lavoro extra (oltre 8h)</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(ordinary.hours.lavoro_extra)}
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(ordinary.earnings.lavoro_extra)}
            </Text>
          </View>
        )}

        {/* Viaggio extra */}
        {ordinary.hours.viaggio_extra > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Viaggio extra (oltre 8h)</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(ordinary.hours.viaggio_extra)}
              </Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(ordinary.earnings.viaggio_extra)}
            </Text>
          </View>
        )}

        {/* Maggiorazioni CCNL */}
        {(ordinary.earnings.sabato_bonus > 0 || ordinary.earnings.domenica_bonus > 0 || ordinary.earnings.festivo_bonus > 0) && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Maggiorazioni CCNL</Text>
              <Text style={styles.breakdownValue}></Text>
            </View>
            {ordinary.earnings.sabato_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                - Sabato: {formatSafeAmount(ordinary.earnings.sabato_bonus)}
              </Text>
            )}
            {ordinary.earnings.domenica_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                - Domenica: {formatSafeAmount(ordinary.earnings.domenica_bonus)}
              </Text>
            )}
            {ordinary.earnings.festivo_bonus > 0 && (
              <Text style={styles.breakdownDetail}>
                - Festivo: {formatSafeAmount(ordinary.earnings.festivo_bonus)}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.breakdownRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Totale ordinario</Text>
          <Text style={styles.totalAmount}>{formatSafeAmount(ordinary.total)}</Text>
        </View>
      </View>
    );
  };

  const renderStandbySection = () => {
    if (!hasStandbyData) return null;

    const standby = monthlyAggregated.standby;
    
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Interventi Reperibilità</Text>
        
        {/* Lavoro diurno reperibilità */}
        {standby.workHours.ordinary > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Lavoro diurno</Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.ordinary)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.ordinary)}
            </Text>
          </View>
        )}

        {/* Lavoro notturno reperibilità */}
        {standby.workHours.night > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Lavoro notturno (+25%)</Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.workHours.night)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.workEarnings.night)}
            </Text>
          </View>
        )}

        {/* Lavoro festivo reperibilità */}
        {standby.workHours.holiday > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Lavoro festivo (+30%)</Text>
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
              <Text style={styles.breakdownLabel}>Lavoro sabato (+25%)</Text>
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
              <Text style={styles.breakdownLabel}>Lavoro sabato notturno (+50%)</Text>
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
              <Text style={styles.breakdownLabel}>Lavoro festivo notturno (+60%)</Text>
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
              <Text style={styles.breakdownLabel}>Viaggio diurno</Text>
              <Text style={styles.breakdownValue}>{formatSafeHours(standby.travelHours.ordinary)}</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatSafeAmount(standby.travelEarnings.ordinary)}
            </Text>
          </View>
        )}

        {/* Viaggio notturno reperibilità */}
        {standby.travelHours.night > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Viaggio notturno (+25%)</Text>
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
              <Text style={styles.breakdownLabel}>Viaggio sabato (+25%)</Text>
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
              <Text style={styles.breakdownLabel}>Viaggio sabato notturno (+50%)</Text>
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
              <Text style={styles.breakdownLabel}>Viaggio festivo (+30%)</Text>
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
              <Text style={styles.breakdownLabel}>Viaggio festivo notturno (+60%)</Text>
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
            {formatSafeAmount(standby.totalEarnings - (monthlyAggregated.allowances?.standby || 0))}
          </Text>
        </View>
      </View>
    );
  };

  const renderAllowancesSection = () => {
    if (!hasAllowancesData) return null;

    const allowances = monthlyAggregated.allowances;
    const meals = monthlyAggregated.meals;
    
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
          </View>
        )}

        {/* Indennità reperibilità */}
        {allowances.standby > 0 && (
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Indennità reperibilità</Text>
              <Text style={styles.breakdownValue}>{formatSafeAmount(allowances.standby)}</Text>
            </View>
            <Text style={styles.breakdownDetail}>
              Indennità giornaliera da CCNL
            </Text>
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
              Non incluso nel totale giornaliero (voce non tassabile)
            </Text>
            
            {/* Dettaglio pranzi */}
            {(meals.lunch.voucher > 0 || meals.lunch.cash > 0 || meals.lunch.specific > 0) && (
              <View style={styles.mealDetail}>
                <Text style={styles.breakdownDetail}>- Pranzo:</Text>
                {meals.lunch.specific > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.lunch.specific)} (contanti - valore specifico)
                  </Text>
                )}
                {meals.lunch.voucher > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.lunch.voucher)} (buono)
                  </Text>
                )}
                {meals.lunch.cash > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.lunch.cash)} (contanti)
                  </Text>
                )}
              </View>
            )}

            {/* Dettaglio cene */}
            {(meals.dinner.voucher > 0 || meals.dinner.cash > 0 || meals.dinner.specific > 0) && (
              <View style={styles.mealDetail}>
                <Text style={styles.breakdownDetail}>- Cena:</Text>
                {meals.dinner.specific > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.dinner.specific)} (contanti - valore specifico)
                  </Text>
                )}
                {meals.dinner.voucher > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.dinner.voucher)} (buono)
                  </Text>
                )}
                {meals.dinner.cash > 0 && (
                  <Text style={styles.breakdownSubDetail}>
                    {formatSafeAmount(meals.dinner.cash)} (contanti)
                  </Text>
                )}
              </View>
            )}
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
          <Text style={styles.statValue}>{monthlyAggregated.daysWorked || 0}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ore totali</Text>
          <Text style={styles.statValue}>{formatSafeHours(monthlyAggregated.totalHours || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rimborsi pasti</Text>
          <Text style={styles.statValue}>{formatSafeAmount(monthlyAggregated.allowances?.meal || 0)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Indennità</Text>
          <Text style={styles.statValue}>
            {formatSafeAmount((monthlyAggregated.allowances?.travel || 0) + (monthlyAggregated.allowances?.standby || 0))}
          </Text>
        </View>
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Totale Guadagno Mensile</Text>
          <Text style={styles.totalAmount}>{formatSafeAmount(monthlyAggregated.totalEarnings || 0)}</Text>
        </View>
        <Text style={styles.totalSubtext}>
          Include attività ordinarie, interventi in reperibilità e indennità (esclusi rimborsi pasti)
        </Text>
      </View>
    </View>
  );

  const renderAnalyticsSection = () => {
    const analytics = monthlyAggregated.analytics;
    if (!analytics || monthlyAggregated.daysWorked === 0) return null;

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
              • Regolari: {formatSafeHours(analytics.breakdown.regularHours)} 
              ({analytics.breakdown.regularHours > 0 ? ((analytics.breakdown.regularHours / monthlyAggregated.totalHours) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Straordinari: {formatSafeHours(analytics.breakdown.overtimeHours)} 
              ({analytics.overtimePercentage.toFixed(1)}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Viaggi: {formatSafeHours(analytics.travelHoursTotal)} 
              ({analytics.travelHoursTotal > 0 ? ((analytics.travelHoursTotal / monthlyAggregated.totalHours) * 100).toFixed(1) : 0}%)
            </Text>
            <Text style={styles.hoursBreakdownItem}>
              • Notturne: {formatSafeHours(analytics.nightWorkHours)} 
              ({analytics.nightWorkHours > 0 ? ((analytics.nightWorkHours / monthlyAggregated.totalHours) * 100).toFixed(1) : 0}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWorkPatternSection = () => {
    const analytics = monthlyAggregated.analytics;
    if (!analytics || monthlyAggregated.daysWorked === 0) return null;

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
    const analytics = monthlyAggregated.analytics;
    if (!analytics || monthlyAggregated.totalEarnings === 0) return null;

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
                {analytics.breakdown.ordinaryPercentage.toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.earningsItemAmount}>
              {formatSafeAmount(monthlyAggregated.ordinary.total)}
            </Text>
          </View>

          {/* Reperibilità */}
          {monthlyAggregated.standby.totalEarnings > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#e91e63' }]} />
                <Text style={styles.earningsItemLabel}>Interventi Reperibilità</Text>
                <Text style={styles.earningsItemPercentage}>
                  {analytics.breakdown.standbyPercentage.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount(monthlyAggregated.standby.totalEarnings - (monthlyAggregated.allowances?.standby || 0))}
              </Text>
            </View>
          )}

          {/* Indennità */}
          {((monthlyAggregated.allowances?.travel || 0) + (monthlyAggregated.allowances?.standby || 0)) > 0 && (
            <View style={styles.earningsItem}>
              <View style={styles.earningsItemHeader}>
                <View style={[styles.earningsColorBar, { backgroundColor: '#ff9800' }]} />
                <Text style={styles.earningsItemLabel}>Indennità</Text>
                <Text style={styles.earningsItemPercentage}>
                  {analytics.breakdown.allowancesPercentage.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.earningsItemAmount}>
                {formatSafeAmount((monthlyAggregated.allowances?.travel || 0) + (monthlyAggregated.allowances?.standby || 0))}
              </Text>
            </View>
          )}
        </View>

        {/* Rapporto reperibilità */}
        {analytics.standbyWorkRatio > 0 && (
          <View style={styles.standbyRatioSection}>
            <Text style={styles.standbyRatioLabel}>
              Incidenza reperibilità: {analytics.standbyWorkRatio.toFixed(1)}% del totale
            </Text>
            <Text style={styles.standbyRatioSubtext}>
              {analytics.standbyInterventions} interventi su {monthlyAggregated.daysWorked} giorni lavorati
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Aggiunto debug dettagliato per tracciare il problema degli interventi nella dashboard
  console.log('\n🔍 === DEBUG DASHBOARD LIVE - INTERVENTI ===');

  // Per ogni entry, logga i dati cruciali
  for (const entry of workEntries) {
    console.log(`\n📅 Entry ${entry.id} - ${entry.date}:`);
    console.log(`   - Reperibilità DB: ${entry.is_standby_day}`);
    console.log(`   - Interventi raw: ${entry.interventi || 'null'}`);
    
    try {
      const workEntry = createWorkEntryFromData(entry);
      console.log(`   - WorkEntry creato: isStandbyDay=${workEntry.isStandbyDay}, interventi=${workEntry.interventi?.length || 0}`);
      
      if (workEntry.interventi && workEntry.interventi.length > 0) {
        console.log(`   - Primo intervento:`, JSON.stringify(workEntry.interventi[0], null, 2));
      }
      
      const breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
      
      if (breakdown) {
        console.log(`   - Breakdown totale: €${breakdown.totalEarnings?.toFixed(2) || '0.00'}`);
        console.log(`   - Breakdown standby: €${breakdown.standby?.totalEarnings?.toFixed(2) || '0.00'}`);
        console.log(`   - Breakdown allowances.standby: €${breakdown.allowances?.standby?.toFixed(2) || '0.00'}`);
        
        if (breakdown.standby) {
          const hasStandbyWork = Object.values(breakdown.standby.workHours || {}).some(h => h > 0);
          const hasStandbyTravel = Object.values(breakdown.standby.travelHours || {}).some(h => h > 0);
          console.log(`   - Ha ore lavoro standby: ${hasStandbyWork}`);
          console.log(`   - Ha ore viaggio standby: ${hasStandbyTravel}`);
          
          if (hasStandbyWork || hasStandbyTravel) {
            console.log(`   - Ore lavoro standby:`, breakdown.standby.workHours);
            console.log(`   - Ore viaggio standby:`, breakdown.standby.travelHours);
            console.log(`   - Guadagni lavoro standby:`, breakdown.standby.workEarnings);
            console.log(`   - Guadagni viaggio standby:`, breakdown.standby.travelEarnings);
          }
        }
      } else {
        console.log(`   - ❌ BREAKDOWN NULL!`);
      }
      
    } catch (error) {
      console.log(`   - ❌ ERRORE: ${error.message}`);
    }
  }

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
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {monthlyAggregated.daysWorked > 0 ? (
          <>
            {renderSummaryStats()}
            {renderAnalyticsSection()}
            {renderWorkPatternSection()}
            {renderEarningsBreakdownSection()}
            {renderOrdinarySection()}
            {renderStandbySection()}
            {renderAllowancesSection()}
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976d2',
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
});

export default DashboardScreen;
