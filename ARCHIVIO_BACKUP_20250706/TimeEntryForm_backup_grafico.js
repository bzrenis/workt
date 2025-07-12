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
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { useSettings } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { useCalculationService } from '../hooks';
import { createWorkEntryFromData } from '../utils/earningsHelper';

// Earnings Summary Component
const EarningsSummary = ({ form, settings, isDateInStandbyCalendar, isStandbyCalendarInitialized, reperibilityManualOverride }) => {
  const [breakdown, setBreakdown] = useState(null);
  const calculationService = useCalculationService();
  
  // Create a work entry object from the form for calculation
  const workEntry = useMemo(() => {
    const viaggi = form.viaggi[0] || {};
    // Log per debug
    console.log("Form reperibilità:", form.reperibilita);
    return {
      date: (() => {
        const [d, m, y] = form.date.split('/');
        return `${y}-${m}-${d}`;
      })(),
      siteName: form.site_name || '',
      vehicleDriven: form.veicolo || '',
      departureCompany: viaggi.departure_company || '',
      arrivalSite: viaggi.arrival_site || '',
      workStart1: viaggi.work_start_1 || '',
      workEnd1: viaggi.work_end_1 || '',
      workStart2: viaggi.work_start_2 || '',
      workEnd2: viaggi.work_end_2 || '',
      departureReturn: viaggi.departure_return || '',
      arrivalCompany: viaggi.arrival_company || '',
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
      completamentoGiornata: form.completamentoGiornata || 'nessuno' // Modalità di completamento giornata
    };
  }, [form]);
  
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
      mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
    };
    
    const result = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
    setBreakdown(result);
    // Log dettagliato per debug breakdown
    if (workEntry.date === '2025-07-06') {
      console.log('DEBUG breakdown 06/07/2025:', JSON.stringify(result, null, 2));
    }
  }, [workEntry, settings]);
  
  // Debug per indennità reperibilità
  useEffect(() => {
    if (breakdown && form.reperibilita) {
      console.log('Debug reperibilità:', {
        isStandbyDay: workEntry.isStandbyDay,
        standbyAllowance: workEntry.standbyAllowance,
        breakdownAllowances: breakdown.allowances,
        standbyInBreakdown: breakdown.allowances?.standby || 0
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
  
  if (!breakdown) return null;
  
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
    if (hours <= 0) return <Text style={styles.rateCalc}>0,00 €</Text>;
    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(hours)} = ${total.toFixed(2).replace('.', ',')} €`;
  };

  // Helper to show bonus label
  const bonusLabel = (isSaturday, isSunday, isHoliday) => {
    if (isHoliday) return ' (Festivo)';
    if (isSunday) return ' (Domenica)';
    if (isSaturday) return ' (Sabato)';
    return '';
  };
  
  // Check if we have any ordinary hours data or standby hours
  const hasOrdinaryHours = breakdown.ordinary?.hours && 
    (breakdown.ordinary.hours.lavoro_giornaliera > 0 || 
     breakdown.ordinary.hours.viaggio_giornaliera > 0 || 
     breakdown.ordinary.hours.lavoro_extra > 0 || 
     breakdown.ordinary.hours.viaggio_extra > 0);
     
  const hasStandbyHours = breakdown.standby?.workHours && 
    (Object.values(breakdown.standby.workHours).some(h => h > 0) || 
     Object.values(breakdown.standby.travelHours).some(h => h > 0));
     
  const hasAllowances = breakdown.allowances && 
    (breakdown.allowances.travel > 0 || 
     breakdown.allowances.meal > 0 || 
     breakdown.allowances.standby > 0);
  
  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.sectionTitle}>Riepilogo Guadagni</Text>
      
      {hasOrdinaryHours && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSubtitle}>Attività Ordinarie</Text>

          {/* Giornaliero/Ordinario - Prime 8 ore (solo giorni feriali) */}
          {(!breakdown.details?.isSaturday && !breakdown.details?.isSunday && !breakdown.details?.isHoliday) &&
            (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Giornaliero (prime 8h)</Text>
                  <Text style={styles.breakdownValue}>{formatSafeHours(
                    (breakdown.ordinary.hours.lavoro_giornaliera || 0) +
                    (breakdown.ordinary.hours.viaggio_giornaliera || 0)
                  )}</Text>
                </View>
                {breakdown.ordinary.earnings.giornaliera > 0 && (
                  <Text style={styles.rateCalc}>
                    {(() => {
                      const totalOrdinaryHours =
                        (breakdown.ordinary.hours.lavoro_giornaliera || 0) +
                        (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                      const standardWorkDayHours = 8;
                      const dailyRate = settings.contract?.dailyRate || 109.19;
                      if (totalOrdinaryHours >= standardWorkDayHours) {
                        return `${dailyRate.toFixed(2).replace('.', ',')} € x 1 giorno = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                      } else {
                        const percentage = (totalOrdinaryHours / standardWorkDayHours * 100).toFixed(0);
                        return `${dailyRate.toFixed(2).replace('.', ',')} € x ${percentage}% (${totalOrdinaryHours.toFixed(2).replace('.', ',')}h / 8h) = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                      }
                    })()}
                  </Text>
                )}
                {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    {`- Lavoro: ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`}
                  </Text>
                )}
                {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                  <Text style={styles.breakdownDetail}>
                    {`- Viaggio: ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`}
                  </Text>
                )}
              </View>
          )}

          {/* Lavoro/Viaggio ordinario sabato/domenica/festivo: breakdown ottimizzato e corretto per breakdown domenica/festivo */}
          {(breakdown.details?.isSaturday || breakdown.details?.isSunday || breakdown.details?.isHoliday) &&
            ((breakdown.ordinary.hours.lavoro_domenica > 0 || breakdown.ordinary.hours.lavoro_festivo > 0 || breakdown.ordinary.hours.lavoro_sabato > 0 || (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) || breakdown.ordinary.hours.viaggio_extra > 0)) && (
              <>
                {/* Lavoro ordinario domenica/festivo/sabato: somma lavoro + viaggio entro 8h */}
                {(breakdown.details?.isSunday && (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario domenica</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.rateCalc}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                        const ore = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                        const total = base * multiplier * ore;
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Maggiorazione Domenica) = ${total.toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {(breakdown.details?.isHoliday && (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario festivo</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.rateCalc}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                        const ore = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Festivo) = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {(breakdown.details?.isSaturday && (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0)) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Lavoro ordinario sabato</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0))}</Text>
                    </View>
                    <Text style={styles.rateCalc}>
                      {(() => {
                        const base = settings.contract?.hourlyRate || 16.41;
                        const multiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                        const ore = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                        return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(ore)} (Sabato) = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                      })()}
                    </Text>
                    {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Lavoro: ${formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}`}</Text>
                    )}
                    {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                      <Text style={styles.breakdownDetail}>{`- Viaggio: ${formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}`}</Text>
                    )}
                  </View>
                )}
                {/* Viaggio extra (oltre 8h) - una sola volta */}
                {(breakdown.ordinary.hours.viaggio_extra > 0) && (
                  <View style={styles.breakdownItem}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Viaggio extra (oltre 8h)</Text>
                      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}</Text>
                    </View>
                    {(breakdown.ordinary.earnings.viaggio_extra > 0) && (
                      <Text style={styles.rateCalc}>
                        {(() => {
                          const base = settings.contract?.hourlyRate || 16.41;
                          // Calcolo con maggiorazione se è un giorno speciale
                          if (breakdown.details?.isSunday || breakdown.details?.isHoliday) {
                            const multiplier = settings.contract?.overtimeRates?.holiday || 1.3;
                            const label = breakdown.details?.isSunday ? 'Maggiorazione Domenica' : 'Maggiorazione Festivo';
                            return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} (${label}) = ${(base * multiplier * breakdown.ordinary.hours.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                          } else if (breakdown.details?.isSaturday) {
                            const multiplier = settings.contract?.overtimeRates?.saturday || 1.25;
                            return `${base.toFixed(2).replace('.', ',')} € x ${multiplier.toFixed(2).replace('.', ',')} x ${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} (Maggiorazione Sabato) = ${(base * multiplier * breakdown.ordinary.hours.viaggio_extra).toFixed(2).replace('.', ',')} €`;
                          } else {
                            return `${base.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} = ${breakdown.ordinary.earnings.viaggio_extra.toFixed(2).replace('.', ',')} €`;
                          }
                        })()}
                      </Text>
                    )}
                  </View>
                )}
              </>
          )}

          {/* Viaggio extra (oltre 8h) - mostrato solo per giorni feriali, per sabato/domenica/festivo è già visualizzato sopra */}
          {breakdown.ordinary.hours.viaggio_extra > 0 && 
           !breakdown.details?.isSaturday && 
           !breakdown.details?.isSunday && 
           !breakdown.details?.isHoliday && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio extra (oltre 8h)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}</Text>
              </View>
              {breakdown.ordinary.earnings.viaggio_extra > 0 && breakdown.ordinary.hours.viaggio_extra > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} = {breakdown.ordinary.earnings.viaggio_extra.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro extra (oltre 8h) */}
          {breakdown.ordinary.hours.lavoro_extra > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro extra (oltre 8h){bonusLabel(breakdown.details?.isSaturday, breakdown.details?.isSunday, breakdown.details?.isHoliday)}</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}</Text>
              </View>
              {breakdown.ordinary.earnings.lavoro_extra > 0 && breakdown.ordinary.hours.lavoro_extra > 0 && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    // Usa la maggiorazione corretta in base al giorno
                    let overtime;
                    if (breakdown.details?.isSaturday) {
                      overtime = settings.contract?.overtimeRates?.saturday || 1.25;
                    } else if (breakdown.details?.isSunday || breakdown.details?.isHoliday) {
                      overtime = settings.contract?.overtimeRates?.holiday || 1.3;
                    } else {
                      overtime = settings.contract?.overtimeRates?.day || 1.2;
                    }
                    const rate = base * overtime;
                    return `${rate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(breakdown.ordinary.hours.lavoro_extra)} = ${breakdown.ordinary.earnings.lavoro_extra.toFixed(2).replace('.', ',')} €`;
                  })()}
                </Text>
              )}
            </View>
          )}

          {/* Bonus sabato/domenica/festivo */}
          {(breakdown.ordinary.earnings.sabato_bonus > 0 || breakdown.ordinary.earnings.domenica_bonus > 0 || breakdown.ordinary.earnings.festivo_bonus > 0) && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Maggiorazioni CCNL</Text>
                <Text style={styles.breakdownValue}></Text>
              </View>
              {breakdown.ordinary.earnings.sabato_bonus > 0 && (
                <Text style={styles.breakdownDetail}>
                  {`- Sabato: ${formatSafeAmount(breakdown.ordinary.earnings.sabato_bonus)}`}
                </Text>
              )}
              {breakdown.ordinary.earnings.domenica_bonus > 0 && (
                <Text style={styles.breakdownDetail}>
                  {`- Domenica: ${formatSafeAmount(breakdown.ordinary.earnings.domenica_bonus)}`}
                </Text>
              )}
              {breakdown.ordinary.earnings.festivo_bonus > 0 && (
                <Text style={styles.breakdownDetail}>
                  {`- Festivo: ${formatSafeAmount(breakdown.ordinary.earnings.festivo_bonus)}`}
                </Text>
              )}
            </View>
          )}

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.breakdownLabel}>Totale ordinario</Text>
            <Text style={styles.breakdownTotal}>{formatSafeAmount(breakdown.ordinary.total || 0)}</Text>
          </View>
          
          {/* Aggiungi una riga di spiegazione per chiarire la maggiorazione CCNL */}
          {(breakdown.details?.isSunday || breakdown.details?.isHoliday || breakdown.details?.isSaturday) && (
            <View style={styles.breakdownDetail}>
              <Text style={{fontSize: 12, color: '#1976d2', fontStyle: 'italic', marginTop: 4}}>
                {breakdown.details?.isSunday ? 
                  `Applicata maggiorazione CCNL domenicale (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                 breakdown.details?.isHoliday ? 
                  `Applicata maggiorazione CCNL festività (+${((settings.contract?.overtimeRates?.holiday || 1.3) - 1)*100}%)` : 
                  `Applicata maggiorazione CCNL sabato (+${((settings.contract?.overtimeRates?.saturday || 1.25) - 1)*100}%)`}
              </Text>
              {(breakdown.details?.isSunday || breakdown.details?.isHoliday) && (
                <>
                  <Text style={{fontSize: 12, color: '#1976d2', fontStyle: 'italic', marginTop: 2}}>
                    La diaria giornaliera non viene applicata nei giorni {breakdown.details?.isSunday ? 'domenicali' : 'festivi'}.
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
      
      {hasStandbyHours && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSubtitle}>Interventi Reperibilità</Text>
          
          {/* Lavoro diurno reperibilità */}
          {breakdown.standby.workHours?.ordinary > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro diurno</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.ordinary)}</Text>
              </View>
              {breakdown.standby.workEarnings?.ordinary > 0 && breakdown.standby.workHours.ordinary > 0 && (
                <Text style={styles.rateCalc}>
                  {(settings.contract?.hourlyRate || 16.41).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.ordinary)} = {breakdown.standby.workEarnings.ordinary.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro notturno reperibilità */}
          {breakdown.standby.workHours?.night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro notturno (+25%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.night)}</Text>
              </View>
              {breakdown.standby.workEarnings?.night > 0 && breakdown.standby.workHours.night > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.25).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.night)} = {breakdown.standby.workEarnings.night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro festivo reperibilità */}
          {breakdown.standby.workHours?.holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro festivo (+30%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.holiday)}</Text>
              </View>
              {breakdown.standby.workEarnings?.holiday > 0 && breakdown.standby.workHours.holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.30).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.holiday)} = {breakdown.standby.workEarnings.holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro sabato reperibilità */}
          {breakdown.standby.workHours?.saturday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro sabato (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.saturday)}</Text>
              </View>
              {breakdown.standby.workEarnings?.saturday > 0 && breakdown.standby.workHours.saturday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.saturday || 1.25)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.saturday)} = {breakdown.standby.workEarnings.saturday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro sabato notturno reperibilità */}
          {breakdown.standby.workHours?.saturday_night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro sabato notturno (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}% + 25%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.saturday_night)}</Text>
              </View>
              {breakdown.standby.workEarnings?.saturday_night > 0 && breakdown.standby.workHours.saturday_night > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.saturday || 1.25) * 1.25).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.saturday_night)} = {breakdown.standby.workEarnings.saturday_night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Lavoro festivo notturno reperibilità */}
          {breakdown.standby.workHours?.night_holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro festivo notturno (+60%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.night_holiday)}</Text>
              </View>
              {breakdown.standby.workEarnings?.night_holiday > 0 && breakdown.standby.workHours.night_holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.60).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.night_holiday)} = {breakdown.standby.workEarnings.night_holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          
          {/* Viaggio diurno reperibilità */}
          {breakdown.standby.travelHours?.ordinary > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio diurno</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.ordinary)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.ordinary > 0 && breakdown.standby.travelHours.ordinary > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.ordinary)} = {breakdown.standby.travelEarnings.ordinary.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Viaggio notturno reperibilità */}
          {breakdown.standby.travelHours?.night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio notturno (+25%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.night)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.night > 0 && breakdown.standby.travelHours.night > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.25 * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.night)} = {breakdown.standby.travelEarnings.night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Viaggio sabato reperibilità */}
          {breakdown.standby.travelHours?.saturday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio sabato (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.saturday)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.saturday > 0 && breakdown.standby.travelHours.saturday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.saturday || 1.25) * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.saturday)} = {breakdown.standby.travelEarnings.saturday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Viaggio sabato notturno reperibilità */}
          {breakdown.standby.travelHours?.saturday_night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio sabato notturno (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}% + 25%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.saturday_night)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.saturday_night > 0 && breakdown.standby.travelHours.saturday_night > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.saturday || 1.25) * 1.25 * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.saturday_night)} = {breakdown.standby.travelEarnings.saturday_night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Viaggio festivo reperibilità */}
          {breakdown.standby.travelHours?.holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio festivo (+30%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.holiday)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.holiday > 0 && breakdown.standby.travelHours.holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.30 * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.holiday)} = {breakdown.standby.travelEarnings.holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}

          {/* Viaggio festivo notturno reperibilità */}
          {breakdown.standby.travelHours?.night_holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio festivo notturno (+60%)</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.night_holiday)}</Text>
              </View>
              {breakdown.standby.travelEarnings?.night_holiday > 0 && breakdown.standby.travelHours.night_holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * 1.60 * (settings.travelCompensationRate || 1.0)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.travelHours.night_holiday)} = {breakdown.standby.travelEarnings.night_holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Nota esplicativa sui calcoli di reperibilità */}
          <View style={[styles.breakdownItem, {marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0'}]}>
            <Text style={[styles.breakdownDetail, {fontStyle: 'italic', color: '#666', fontSize: 12}]}>
              ℹ️ Gli interventi di reperibilità sono retribuiti come ore ordinarie con maggiorazioni per fascia oraria. 
              Nei giorni feriali, se il totale giornaliero (lavoro + reperibilità) supera le 8 ore, 
              le ore di reperibilità eccedenti sono pagate come straordinari secondo CCNL.
            </Text>
          </View>
          
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.breakdownLabel}>Totale reperibilità</Text>
            <Text style={styles.breakdownTotal}>
              {formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))}
            </Text>
          </View>
        </View>
      )}
      
      {/* Mostra sezione reperibilità anche quando è attiva ma senza interventi */}
      {form.reperibilita && !hasStandbyHours && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSubtitle}>Reperibilità</Text>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownDetail}>
              Reperibilità attiva ma nessun intervento registrato.
            </Text>
            <Text style={styles.breakdownDetail}>
              Sarà applicata solo l'indennità giornaliera CCNL (vedi sezione "Indennità e Buoni").
            </Text>
          </View>
        </View>
      )}
      
      {hasAllowances && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSubtitle}>Indennità e Buoni</Text>
          
          {/* Indennità trasferta */}
          {breakdown.allowances.travel > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Indennità trasferta</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown.allowances.travel)}</Text>
              </View>
              <Text style={styles.breakdownDetail}>
                {(() => {
                  // Gestione delle opzioni: supporta sia il nuovo formato selectedOptions che il vecchio formato option
                  const travelAllowanceSettings = settings.travelAllowance || {};
                  const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
                  
                  // Se è attivo il calcolo CCNL proporzionale, mostra la descrizione corretta
                  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
                    const workHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + 
                                     (breakdown.ordinary?.hours?.lavoro_extra || 0);
                    const travelHours = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + 
                                       (breakdown.ordinary?.hours?.viaggio_extra || 0);
                    
                    // Include tutte le ore di reperibilità (lavoro + viaggio) nel calcolo CCNL
                    const standbyWorkHours = breakdown.standby ? 
                      Object.values(breakdown.standby.workHours || {}).reduce((a, b) => a + b, 0) : 0;
                    const standbyTravelHours = breakdown.standby ? 
                      Object.values(breakdown.standby.travelHours || {}).reduce((a, b) => a + b, 0) : 0;
                    const totalStandbyHours = standbyWorkHours + standbyTravelHours;
                    
                    const totalHours = workHours + travelHours + totalStandbyHours;
                    const proportion = Math.min(totalHours / 8, 1.0);
                    
                    if (totalStandbyHours > 0) {
                      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%) - include ${totalStandbyHours.toFixed(1)}h reperibilità`;
                    } else {
                      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%)`;
                    }
                  }
                  
                  // Logica precedente per retrocompatibilità
                  if (form.trasfertaPercent && form.trasfertaPercent < 1) {
                    return `Mezza giornata (${Math.round(form.trasfertaPercent * 100)}%)`;
                  }
                  
                  return 'Giornata intera';
                })()}
              </Text>
              <Text style={styles.breakdownDetail}>
                {(() => {
                  // Verifica come è stata attivata l'indennità
                  const hasTravel = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + 
                                    (breakdown.ordinary?.hours?.viaggio_extra || 0) > 0;
                  const manuallyEnabled = form.trasferta === true;
                  const isManualOverride = form.trasfertaManualOverride === true;
                  const isSpecialDay = breakdown.details?.isSunday || breakdown.details?.isHoliday;
                  
                  if (isSpecialDay && isManualOverride) {
                    return 'Attivata manualmente su giorno speciale (override)';
                  } else if (hasTravel && manuallyEnabled) {
                    return 'Attivata per presenza di viaggio e flag manuale';
                  } else if (hasTravel) {
                    return 'Attivata per presenza di viaggio';
                  } else if (manuallyEnabled) {
                    return 'Attivata manualmente';
                  } else {
                    return 'Attivazione standard';
                  }
                })()}
              </Text>
            </View>
          )}
          
          {/* Indennità reperibilità */}
          {breakdown.allowances.standby > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Indennità reperibilità</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown.allowances.standby)}</Text>
              </View>
              <Text style={styles.breakdownDetail}>
                Indennità giornaliera da CCNL (inclusa nel totale reperibilità)
              </Text>
              <Text style={styles.breakdownDetail}>
                {(() => {
                  if (form.reperibilita && reperibilityManualOverride && !isDateInStandbyCalendar) {
                    return 'Attivata manualmente (non presente nel calendario)';
                  } else if (form.reperibilita && isDateInStandbyCalendar) {
                    return 'Attivata in base al calendario reperibilità';
                  } else if (form.reperibilita) {
                    return 'Attivata manualmente';
                  } else {
                    return 'Attivazione standard';
                  }
                })()}
              </Text>
              {form.reperibilita && (!breakdown.standby?.totalEarnings || breakdown.standby.totalEarnings === 0) && (
                <Text style={styles.breakdownDetail}>
                  Nessun intervento registrato - solo indennità giornaliera
                </Text>
              )}
            </View>
          )}
          
          {/* Rimborso pasti */}
          {breakdown.allowances.meal > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Rimborso pasti</Text>
                <Text style={styles.breakdownValue}>{formatSafeAmount(breakdown.allowances.meal)}</Text>
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
      {breakdown.details?.isPartialDay && (
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSubtitle}>Completamento Giornata</Text>
          
          {/* Ore lavorate/mancanti */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Ore lavorate</Text>
              <Text style={styles.breakdownValue}>
                {formatSafeHours(breakdown.details.totalWorkAndTravelHours)} / 8:00
              </Text>
            </View>
            <Text style={styles.breakdownDetail}>
              {`Mancano ${formatSafeHours(breakdown.details.missingHours)} per completare la giornata`}
            </Text>
          </View>
          
          {/* Modalità completamento */}
          {breakdown.details.completamentoTipo !== 'nessuno' && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Completamento con</Text>
                <Text style={styles.breakdownValue}>
                  {(() => {
                    switch(breakdown.details.completamentoTipo) {
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
                {`${formatSafeHours(breakdown.details.missingHours)} di ${breakdown.details.completamentoTipo} per completare la giornata`}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.totalSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.totalLabel}>Totale Guadagno Giornaliero</Text>
          <Text style={styles.totalAmount}>{formatSafeAmount(breakdown.totalEarnings)}</Text>
        </View>
        <Text style={styles.breakdownDetail}>
          Include attività ordinarie, interventi in reperibilità e indennità di trasferta (esclusi rimborsi pasti)
        </Text>
        {breakdown.details?.isPartialDay && (
          <Text style={styles.breakdownDetail}>
            {breakdown.details?.completamentoTipo !== 'nessuno'
              ? `La giornata è stata completata con: ${breakdown.details.completamentoTipo}`
              : 'La retribuzione è proporzionale alle ore effettivamente lavorate'}
          </Text>
        )}
        {/* Informazioni di dettaglio per giorni speciali */}
        {(breakdown.details?.isSunday || breakdown.details?.isHoliday || breakdown.details?.isSaturday) && (
          <Text style={[styles.breakdownDetail, {marginTop: 8, fontStyle: 'italic', color: '#1976d2'}]}>
            {`Dettaglio calcolo: Ordinario ${formatSafeAmount(breakdown.ordinary.total || 0)} + `}
            {(breakdown.standby?.totalEarnings || 0) > 0 ? 
              `Interventi Reperibilità ${formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))} + ` : ''}
            {breakdown.allowances?.standby > 0 ? 
              `Indennità Reperibilità ${formatSafeAmount(breakdown.allowances.standby || 0)} + ` : ''}
            {breakdown.allowances?.travel > 0 ? 
              `Indennità Trasferta ${formatSafeAmount(breakdown.allowances.travel || 0)}` : 'Nessuna Indennità Trasferta'}
          </Text>
        )}
        {/* Breakdown dettagliato anche per giorni normali se ci sono componenti di reperibilità */}
        {(!breakdown.details?.isSunday && !breakdown.details?.isHoliday && !breakdown.details?.isSaturday) && 
         ((breakdown.standby?.totalEarnings || 0) > 0 || (breakdown.allowances?.standby || 0) > 0 || (breakdown.allowances?.travel || 0) > 0) && (
          <Text style={[styles.breakdownDetail, {marginTop: 8, fontStyle: 'italic', color: '#1976d2'}]}>
            {`Dettaglio calcolo: Ordinario ${formatSafeAmount(breakdown.ordinary.total || 0)}`}
            {(breakdown.standby?.totalEarnings || 0) > 0 ? 
              ` + Interventi Reperibilità ${formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))}` : ''}
            {breakdown.allowances?.standby > 0 ? 
              ` + Indennità Reperibilità ${formatSafeAmount(breakdown.allowances.standby || 0)}` : ''}
            {breakdown.allowances?.travel > 0 ? 
              ` + Indennità Trasferta ${formatSafeAmount(breakdown.allowances.travel || 0)}` : ''}
          </Text>
        )}
        {/* Indicatori per maggiorazioni sabato/domenica/festivi e calcolo totale */}
        {breakdown.details?.isSaturday && (
          <Text style={{fontSize: 12, color: '#2e7d32', fontStyle: 'italic', marginTop: 4}}>
            La retribuzione è calcolata con maggiorazione CCNL per sabato (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}%) su tutte le ore.
          </Text>
        )}
        {(breakdown.details?.isSunday || breakdown.details?.isHoliday) && (
          <Text style={{fontSize: 12, color: '#2e7d32', fontStyle: 'italic', marginTop: 4}}>
            La retribuzione è calcolata con maggiorazione CCNL per {breakdown.details?.isSunday ? 'domenica' : 'festività'} (+{((settings.contract?.overtimeRates?.holiday || 1.3) - 1) * 100}%) su tutte le ore
            {form.trasfertaManualOverride ? ", con indennità di trasferta attivata manualmente." : 
             breakdown.allowances?.travel > 0 ? ", con indennità di trasferta applicata." : 
             ", senza indennità di trasferta."}
          </Text>
        )}
      </View>
    </View>
  );
};

const veicoloOptions = [
  { label: 'Ho guidato andata e ritorno', value: 'andata_ritorno' },
  { label: 'Solo andata', value: 'solo_andata' },
  { label: 'Solo ritorno', value: 'solo_ritorno' },
];

const dayTypes = [
  { label: 'Lavorativa', value: 'lavorativa', color: '#2196F3', icon: 'briefcase-outline' },
  { label: 'Ferie', value: 'ferie', color: '#43a047', icon: 'beach' },
  { label: 'Permesso', value: 'permesso', color: '#ef6c00', icon: 'account-clock-outline' },
  { label: 'Malattia', value: 'malattia', color: '#d32f2f', icon: 'emoticon-sick-outline' },
  { label: 'Riposo compensativo', value: 'riposo', color: '#757575', icon: 'bed' },
];

// Configurazione delle icone corrette per i tipi di completamento giornata
const iconsConfig = {
  nessuno: { name: 'close-circle', component: MaterialCommunityIcons },
  ferie: { name: 'beach', component: MaterialCommunityIcons },
  permesso: { name: 'account-clock-outline', component: MaterialCommunityIcons },
  malattia: { name: 'emoticon-sick-outline', component: MaterialCommunityIcons },
  riposo: { name: 'bed', component: MaterialCommunityIcons },
  lavorativa: { name: 'briefcase-outline', component: MaterialCommunityIcons },
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
    pasti: { pranzo: true, cena: true },
    trasferta: true,
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
        targaVeicolo: entryToEdit.targaVeicolo || entryToEdit.targa_veicolo || '',
        viaggi: [
          {
            departure_company: entryToEdit.departure_company || entryToEdit.departureCompany || '',
            arrival_site: entryToEdit.arrival_site || entryToEdit.arrivalSite || '',
            work_start_1: entryToEdit.work_start_1 || entryToEdit.workStart1 || '',
            work_end_1: entryToEdit.work_end_1 || entryToEdit.workEnd1 || '',
            work_start_2: entryToEdit.work_start_2 || entryToEdit.workStart2 || '',
            work_end_2: entryToEdit.work_end_2 || entryToEdit.workEnd2 || '',
            departure_return: entryToEdit.departure_return || entryToEdit.departureReturn || '',
            arrival_company: entryToEdit.arrival_company || entryToEdit.arrivalCompany || '',
          }
        ],
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

        // Se l’utente cambia “arrivo cantiere”, aggiorna anche “inizio 1° turno” (sempre)
        if (field === 'arrival_site') {
          viaggi[parseInt(idx)]['work_start_1'] = timeString;
        }
        // Se l’utente cambia “fine 2° turno”, aggiorna anche “partenza rientro” (sempre)
        if (field === 'work_end_2') {
          viaggi[parseInt(idx)]['departure_return'] = timeString;
        }

        setForm({ ...form, viaggi });
      } else if (dateField.startsWith('intervento')) {
        const [_, idx, field] = dateField.split('-');
        const interventi = [...form.interventi];
        interventi[parseInt(idx)][field] = timeString;
        
        // Applica la stessa logica anche agli interventi di reperibilità
        if (field === 'arrival_site') {
          // Verifica se "ora inizio 1 turno" è vuoto prima di riempirlo automaticamente
          if (!interventi[parseInt(idx)]['work_start_1']) {
            console.log(`Auto-compilazione ora inizio 1° turno (intervento) con: ${timeString}`);
            interventi[parseInt(idx)]['work_start_1'] = timeString;
          }
        }
        
        // Funzionalità: Compilazione automatica "ora partenza rientro" per interventi quando viene inserito "ora fine 2 turno"
        if (field === 'work_end_2') {
          // Verifica se "ora partenza rientro" è vuoto prima di riempirlo automaticamente
          if (!interventi[parseInt(idx)]['departure_return']) {
            console.log(`Auto-compilazione ora partenza rientro (intervento) con: ${timeString}`);
            interventi[parseInt(idx)]['departure_return'] = timeString;
          }
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
    setForm({ ...form, veicolo: value, targaVeicolo: value === 'nessuno' ? '' : form.targaVeicolo });
  };

  // Gestione cambio targa/numero veicolo
  const handleTargaChange = (text) => {
    setForm({
      ...form,
      targaVeicolo: text,
      veicolo: text ? 'personalizzato' : (form.veicolo === 'personalizzato' ? '' : form.veicolo)
    });
  };

  // Aggiungi viaggio/lavoro
  const addViaggio = () => {
    setForm({ ...form, viaggi: [...form.viaggi, {
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

  // Migliora la selezione tipo giornata e trasferta
  useEffect(() => {
    // Unifica la logica in un solo useEffect per pasti e trasferta
    const viaggiConPausa = form.viaggi.some(v => v.work_end_1 && v.work_start_2);
    const viaggiValidi = form.viaggi.some(v => v.departure_company && v.arrival_site);

    // --- PASTI ---
    if (!viaggiConPausa) {
      if (form.pasti.pranzo) setForm(f => ({ ...f, pasti: { ...f.pasti, pranzo: false } }));
      if (form.pasti.cena) setForm(f => ({ ...f, pasti: { ...f.pasti, cena: false } }));
    } else {
      let autoPranzo = false, autoCena = false;
      form.viaggi.forEach(v => {
        if (v.work_end_1 && v.work_start_2) {
          const [h1,m1] = v.work_end_1.split(':').map(Number);
          const [h2,m2] = v.work_start_2.split(':').map(Number);
          const end1 = h1*60+m1, start2 = h2*60+m2;
          const pausa = start2-end1;
          if (pausa>=30 && h1>=11 && h1<=14 && h2>=12 && h2<=15) autoPranzo = true;
          if (pausa>=30 && h1>=18 && h1<=21 && h2>=19 && h2<=22) autoCena = true;
        }
      });
      if (autoPranzo && !form.pasti.pranzo) setForm(f=>({...f,pasti:{...f.pasti,pranzo:true}}));
      if (autoCena && !form.pasti.cena) setForm(f=>({...f,pasti:{...f.pasti,cena:true}}));
    }

    // --- TRASFERTA ---
    if (!viaggiValidi) {
      if (form.trasferta && !form.trasfertaManualOverride) {
        // Disattiva solo se non c'è un override manuale
        setForm(f => ({ ...f, trasferta: false }));
      }
    } else {
      // Calcolo ore viaggio e lavoro
      let totalWork = 0, totalTravel = 0, maxTravel = 0;
      form.viaggi.forEach(v => {
        // Ore lavoro
        if (v.work_start_1 && v.work_end_1) {
          const [h1, m1] = v.work_start_1.split(':').map(Number);
          const [h2, m2] = v.work_end_1.split(':').map(Number);
          totalWork += ((h2*60+m2)-(h1*60+m1))/60;
        }
        if (v.work_start_2 && v.work_end_2) {
          const [h1, m1] = v.work_start_2.split(':').map(Number);
          const [h2, m2] = v.work_end_2.split(':').map(Number);
          totalWork += ((h2*60+m2)-(h1*60+m1))/60;
        }
        // Ore viaggio
        if (v.departure_company && v.arrival_site) {
          const [h1, m1] = v.departure_company.split(':').map(Number);
          const [h2, m2] = v.arrival_site.split(':').map(Number);
          const travel = ((h2*60+m2)-(h1*60+m1))/60;
          totalTravel += travel;
          if (travel > maxTravel) maxTravel = travel;
        }
        if (v.departure_return && v.arrival_company) {
          const [h1, m1] = v.departure_return.split(':').map(Number);
          const [h2, m2] = v.arrival_company.split(':').map(Number);
          const travel = ((h2*60+m2)-(h1*60+m1))/60;
          totalTravel += travel;
          if (travel > maxTravel) maxTravel = travel;
        }
      });
      // Giornata intera: lavoro+viaggio >=8h oppure viaggio >=8h senza pause
      const giornataIntera = (totalWork + totalTravel) >= 8 || maxTravel >= 8;
      
           
      // Verifica se è un giorno domenicale o festivo
      const dateObj = new Date(form.date.split('/').reverse().join('-'));
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = false; // Questa è una semplificazione, idealmente chiameresti una funzione per verificare se è festivo
      const isSpecialDay = isSunday || isHoliday;
      
      // Controlla se l'indennità di trasferta può essere applicata nei giorni speciali dalle impostazioni
      const canApplyOnSpecialDays = settings?.travelAllowance?.applyOnSpecialDays || false;
      
      // Attiva o disattiva l'indennità di trasferta in base alle condizioni
      // Rispetta trasfertaManualOverride se presente
      if (form.trasfertaManualOverride) {
        // Non fare nulla, il valore è stato impostato manualmente
        console.log("Rispetto override manuale trasferta:", form.trasferta);
      } else if (isSpecialDay && !canApplyOnSpecialDays) {
        // Disattiva l'indennità nei giorni speciali se non è permesso dalle impostazioni
        if (form.trasferta) setForm(f => ({ ...f, trasferta: false }));
      } else if (totalTravel > 0 && !form.trasferta) {
        // Attiva l'indennità se c'è viaggio e non siamo in un giorno speciale (o è permesso applicarla)
        setForm(f => ({ ...f, trasferta: true }));
      }
      
      // Salva la percentuale per CalculationService (es: 1.0 o 0.5)
      // Assicurati di non sovrascrivere trasfertaManualOverride
      setForm(f => ({ 
        ...f, 
        trasfertaPercent: giornataIntera ? 1.0 : 0.5,
        // Mantieni lo stato dell'override manuale
        trasfertaManualOverride: f.trasfertaManualOverride  
      }));
    }
  }, [form.viaggi]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con data e tipo giornata */}
        <View style={styles.headerCard}>
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="calendar" size={20} color="#1976d2" /> Data e Tipo
            </Text>
            <View style={styles.dateTypeRow}>
              <TouchableOpacity 
                onPress={() => { 
                  setDateField('mainDate'); 
                  setShowDatePicker(true); 
                  setDatePickerMode('date'); 
                }} 
                style={[styles.modernInput, styles.dateInput]}
              >
                <Text style={styles.dateText}>{form.date}</Text>
                <MaterialCommunityIcons name="calendar-outline" size={20} color="#1976d2" />
              </TouchableOpacity>
              
              <View style={[styles.modernInput, styles.pickerContainer]}>
                <Picker
                  selectedValue={dayType}
                  onValueChange={setDayType}
                  style={styles.modernPicker}
                >
                  {dayTypes.map(dt => (
                    <Picker.Item key={dt.value} label={dt.label} value={dt.value} color={dt.color} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Cantiere */}
        <View style={styles.modernCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="domain" size={20} color="#1976d2" /> Cantiere
          </Text>
          <TextInput
            style={styles.modernInput}
            value={form.site_name}
            onChangeText={v => handleChange('site_name', v)}
            placeholder="Nome del cantiere (facoltativo)"
            placeholderTextColor="#999"
          />
        </View>

        {/* Veicolo */}
        <View style={styles.modernCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="car" size={20} color="#1976d2" /> Veicolo
          </Text>
          
          <View style={styles.buttonRow}>
            {veicoloOptions.map(opt => (
              <TouchableOpacity 
                key={opt.value} 
                style={[
                  styles.modernButton, 
                  form.veicolo === opt.value && styles.modernButtonActive
                ]} 
                onPress={() => handleVeicoloChange(opt.value)}
              >
                <Text style={[
                  styles.modernButtonText,
                  form.veicolo === opt.value && styles.modernButtonTextActive
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.vehicleInputRow}>
            <TextInput
              style={[styles.modernInput, styles.flexInput]}
              placeholder="Targa o numero veicolo"
              placeholderTextColor="#999"
              value={form.targaVeicolo !== undefined ? form.targaVeicolo : ''}
              onChangeText={handleTargaChange}
              editable={form.veicolo !== 'nessuno'}
            />
            <TouchableOpacity
              style={[
                styles.modernButton,
                styles.noVehicleButton,
                form.veicolo === 'nessuno' && styles.modernButtonActive
              ]}
              onPress={() => setForm({ ...form, veicolo: 'nessuno', targaVeicolo: '' })}
            >
              <Text style={[
                styles.modernButtonText,
                form.veicolo === 'nessuno' && styles.modernButtonTextActive
              ]}>
                Non ho guidato
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Viaggi/Lavoro */}
        <View style={styles.modernCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color="#1976d2" /> Viaggi e Lavoro
          </Text>
          {form.viaggi.map((v, idx) => renderViaggio(v, idx))}
          <TouchableOpacity style={styles.addButton} onPress={addViaggio}>
            <MaterialCommunityIcons name="plus" size={20} color="#1976d2" />
            <Text style={styles.addButtonText}>Aggiungi turno viaggio/lavoro</Text>
          </TouchableOpacity>
        </View>

        {/* Reperibilità */}
        <View style={styles.modernCard}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="phone-alert" size={20} color="#1976d2" /> Reperibilità
            </Text>
            <Switch 
              value={form.reperibilita} 
              onValueChange={toggleReperibilita}
              trackColor={{ false: '#e0e0e0', true: '#1976d2' }}
              thumbColor={form.reperibilita ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          {isStandbyCalendarInitialized && form.reperibilityManualOverride && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#f57c00" />
              <Text style={styles.warningText}>
                {isDateInStandbyCalendar && !form.reperibilita 
                  ? "Questo giorno è segnato come reperibile nel calendario, ma la reperibilità è stata disattivata manualmente." 
                  : !isDateInStandbyCalendar && form.reperibilita 
                    ? "Questo giorno non è segnato come reperibile nel calendario, ma la reperibilità è stata attivata manualmente." 
                    : "Impostazione modificata manualmente rispetto al calendario."}
              </Text>
            </View>
          )}
          
          {form.reperibilita && (
            <>
              {form.interventi.map((v, idx) => renderViaggio(v, idx, true))}
              <TouchableOpacity style={styles.addButton} onPress={addIntervento}>
                <MaterialCommunityIcons name="plus" size={20} color="#1976d2" />
                <Text style={styles.addButtonText}>Aggiungi intervento reperibilità</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Pasti */}
        <View style={styles.modernCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="food" size={20} color="#1976d2" /> Rimborso Pasti
          </Text>
          
          <View style={styles.mealSwitchRow}>
            <View style={styles.mealOption}>
              <Text style={styles.mealLabel}>Pranzo</Text>
              <Switch 
                value={form.pasti.pranzo} 
                onValueChange={() => togglePasto('pranzo')}
                trackColor={{ false: '#e0e0e0', true: '#1976d2' }}
                thumbColor={form.pasti.pranzo ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            <View style={styles.mealOption}>
              <Text style={styles.mealLabel}>Cena</Text>
              <Switch 
                value={form.pasti.cena} 
                onValueChange={() => togglePasto('cena')}
                trackColor={{ false: '#e0e0e0', true: '#1976d2' }}
                thumbColor={form.pasti.cena ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
          
          {(settings?.mealAllowances?.lunch?.cashAmount > 0 || settings?.mealAllowances?.lunch?.allowManualCash) && form.pasti.pranzo && (
            <View style={styles.cashInputRow}>
              <Text style={styles.cashLabel}>Cash pranzo</Text>
              <View style={styles.cashInputContainer}>
                <TextInput
                  style={styles.cashInput}
                  value={mealCash.pranzo}
                  onChangeText={v => {
                    const newValue = v.replace(/[^0-9.,]/g,'');
                    setMealCash(c => ({...c, pranzo: newValue}));
                    setForm(f => ({...f, mealLunchCash: parseFloat(newValue.replace(',','.')) || 0}));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </View>
          )}
          
          {(settings?.mealAllowances?.dinner?.cashAmount > 0 || settings?.mealAllowances?.dinner?.allowManualCash) && form.pasti.cena && (
            <View style={styles.cashInputRow}>
              <Text style={styles.cashLabel}>Cash cena</Text>
              <View style={styles.cashInputContainer}>
                <TextInput
                  style={styles.cashInput}
                  value={mealCash.cena}
                  onChangeText={v => {
                    const newValue = v.replace(/[^0-9.,]/g,'');
                    setMealCash(c => ({...c, cena: newValue}));
                    setForm(f => ({...f, mealDinnerCash: parseFloat(newValue.replace(',','.')) || 0}));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <Text style={styles.currencySymbol}>€</Text>
              </View>
            </View>
          )}
        </View>

        {/* Trasferta */}
        <View style={styles.modernCard}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color="#1976d2" /> Indennità Trasferta
            </Text>
            <Switch 
              value={form.trasferta} 
              onValueChange={toggleTrasferta}
              trackColor={{ false: '#e0e0e0', true: '#1976d2' }}
              thumbColor={form.trasferta ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>
      
        {/* Completamento Giornata - solo per giorni feriali */}
        {(() => {
          // Verifico se il giorno selezionato è un giorno speciale (sabato, domenica o festivo)
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
          
          // Mostra il completamento giornata solo nei giorni feriali (non sabato/domenica/festivi)
          if (!isSaturday && !isSunday && !isHoliday) {
            return (
              <View style={styles.modernCard}>
                <Text style={styles.sectionTitle}>
                  <MaterialCommunityIcons name="clock-check" size={20} color="#1976d2" /> Completamento Giornata
                </Text>
                <View style={styles.buttonRow}>
                  {completamentoOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.modernButton,
                        styles.completamentoButton,
                        form.completamentoGiornata === option.value && styles.modernButtonActive
                      ]}
                      onPress={() => setForm({...form, completamentoGiornata: option.value})}
                    >
                      <MaterialCommunityIcons 
                        name={option.icon} 
                        size={16} 
                        color={form.completamentoGiornata === option.value ? 'white' : option.color}
                        style={styles.buttonIcon}
                      />
                      <Text style={[
                        styles.modernButtonText,
                        form.completamentoGiornata === option.value && styles.modernButtonTextActive
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          }
          return null;
        })()}
            <View style={styles.section}>
              <Text style={styles.label}>Completamento Giornata</Text>
              <Text style={{fontSize: 14, color: '#666', marginBottom: 8}}>
                Se lavori meno di 8 ore, come vuoi completare la giornata?
              </Text>
              <View style={styles.completamentoOptions}>
                {completamentoOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.completamentoOption,
                      form.completamentoGiornata === option.value && { backgroundColor: option.color, borderColor: option.color }
                    ]}
                    onPress={() => setForm(f => ({...f, completamentoGiornata: option.value}))}
                  >
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={16} 
                      color={form.completamentoGiornata === option.value ? 'white' : option.color}
                      style={styles.buttonIcon}
                    />
                    <Text style={[
                      styles.modernButtonText,
                      form.completamentoGiornata === option.value && styles.modernButtonTextActive
                    ]}>
                      {option.label}
                    </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          } else {
            // Per giorni speciali, impostiamo automaticamente "nessuno" e mostriamo un messaggio informativo
            if (form.completamentoGiornata !== 'nessuno') {
              setForm(f => ({...f, completamentoGiornata: 'nessuno'}));
            }
            return (
              <View style={styles.modernCard}>
                <Text style={styles.sectionTitle}>
                  <MaterialCommunityIcons name="information" size={20} color="#1976d2" /> Completamento Giornata
                </Text>
                <View style={styles.infoBox}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoText}>
                      Non è obbligatorio effettuare le 8 ore lavorative nei giorni {isSaturday ? 'di sabato' : (isSunday ? 'di domenica' : 'festivi')}.
                    </Text>
                    <Text style={styles.infoSubtext}>
                      La retribuzione sarà calcolata con la maggiorazione CCNL per le ore effettivamente lavorate.
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
        })()}

        {/* Note */}
        <View style={styles.modernCard}>
          <Text style={styles.sectionTitle}>
            <MaterialCommunityIcons name="note-text" size={20} color="#1976d2" /> Note
          </Text>
          <TextInput
            style={styles.noteInput}
            value={form.note}
            onChangeText={v => handleChange('note', v)}
            placeholder="Aggiungi una nota (opzionale)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        />
      </View>
      
      {/* Riepilogo Guadagni */}
      <EarningsSummary 
        form={form} 
        settings={settings} 
        isDateInStandbyCalendar={isDateInStandbyCalendar} 
        isStandbyCalendarInitialized={isStandbyCalendarInitialized}
        reperibilityManualOverride={form.reperibilityManualOverride}
      />
      
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
      
      {/* Salva/Annulla */}
      <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:20}}>
        <TouchableOpacity style={[styles.saveButton,{backgroundColor:'#BDBDBD'}]} onPress={()=>navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.saveButtonText}>Annulla</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            try {
              // ...existing code...
              const viaggi = form.viaggi[0] || {};
              const entry = {
                date: (() => {
                  const [d, m, y] = form.date.split('/');
                  return `${y}-${m}-${d}`;
                })(),
                siteName: form.site_name || '',
                vehicleDriven: form.veicolo || '',
                targaVeicolo: form.targaVeicolo || '',
                departureCompany: viaggi.departure_company || '',
                arrivalSite: viaggi.arrival_site || '',
                workStart1: viaggi.work_start_1 || '',
                workEnd1: viaggi.work_end_1 || '',
                workStart2: viaggi.work_start_2 || '',
                workEnd2: viaggi.work_end_2 || '',
                departureReturn: viaggi.departure_return || '',
                arrivalCompany: viaggi.arrival_company || '',
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
              };
              const settingsObj = settings || {};
              const result = calculationService.calculateEarningsBreakdown(entry, settingsObj);
              entry.totalEarnings = result.totalEarnings || 0;
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
              navigation.navigate('TimeEntryScreen', { refresh: true, refreshDashboard: true });
            } catch (e) {
              console.error('Save Error:', e);
              Alert.alert('Errore', `Errore durante il salvataggio su database: ${e.message}`)
            }
          }}
        >
          <Ionicons name="save-outline" size={20} color="white" />
          <Text style={styles.saveButtonText}>Salva</Text>
        </TouchableOpacity>
        {/* Bottone Elimina solo in modifica */}
        {isEdit && enableDelete && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#e53935' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.saveButtonText}>Elimina</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* FINE DEL CONTENUTO */}
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
    padding: 16,
    paddingBottom: 100, // Spazio per i pulsanti in basso
  },
  
  // Header e card moderne
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Sezioni
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Data e tipo giornata
  dateSection: {
    flex: 1,
  },
  dateTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerContainer: {
    flex: 1,
    padding: 0,
    justifyContent: 'center',
  },
  modernPicker: {
    width: '100%',
    height: 50,
  },
  
  // Input moderni
  modernInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  flexInput: {
    flex: 1,
    marginRight: 12,
  },
  
  // Bottoni moderni
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modernButton: {
    borderWidth: 2,
    borderColor: '#1976d2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    flex: 1,
    minWidth: 100,
  },
  modernButtonActive: {
    backgroundColor: '#1976d2',
  },
  modernButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modernButtonTextActive: {
    color: 'white',
  },
  noVehicleButton: {
    flex: 0,
    minWidth: 140,
  },
  vehicleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Pulsanti di azione
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    elevation: 2,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  gainBox: { backgroundColor:'#e8f5e9', color:'#388e3c', fontWeight:'bold', fontSize:18, borderRadius:8, padding:12, marginTop:6 },
  saveButton: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, marginTop: 0 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  breakdownSection: {
    marginTop: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  breakdownTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1976d2',
    marginBottom: 8
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#555'
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalSection: {
    marginTop: 16,
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  breakdownItem: {
    marginBottom: 8,
  },
  breakdownDetail: {
    fontSize: 13,
    color: '#777',
    marginLeft: 12,
    marginTop: 1,
  },
  rateCalc: {
    fontSize: 13,
    color: '#1976d2',
    fontStyle: 'italic',
    marginLeft: 12,
    marginTop: 1,
  },
  mealTag: {
    flexDirection:'row',
    alignItems:'center',
    backgroundColor:'#e3f2fd',
    borderRadius:16,
    paddingVertical:4,
    paddingHorizontal:10,
    marginRight:6,
    marginBottom:6
  },
  mealTagText: {
    color:'#1976d2',
    fontWeight:'bold',
    marginLeft: 4
  },
  completamentoOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 6
  },
  completamentoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8
  },
  sectionContainer: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 12,
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 16,
  },
  totalSection: {
    marginTop: 16,
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2e7d32',
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#2e7d32',
  },
  breakdownSubtitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1976d2',
    marginBottom: 8,
  },
  breakdownTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#4CAF50',
  },
  
  // Stili aggiuntivi per riepilogo
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  breakdownItem: {
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#666',
    paddingLeft: 8,
    marginTop: 2,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalSection: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  rateCalc: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Stili aggiuntivi per il nuovo design
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mealOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cashLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  cashInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningText: {
    color: '#f57c00',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  completamentoButton: {
    minWidth: 80,
    paddingHorizontal: 12,
  },
  buttonIcon: {
    marginRight: 6,
  },
  infoBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 13,
    color: '#2e7d32',
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    maxHeight: 120,
    color: '#333',
  },
});

export default TimeEntryForm;