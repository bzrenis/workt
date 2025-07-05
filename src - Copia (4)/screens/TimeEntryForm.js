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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { useSettings } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import CalculationService from '../services/CalculationService';

// Earnings Summary Component
const EarningsSummary = ({ form, settings }) => {
  const [breakdown, setBreakdown] = useState(null);
  
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
      isStandbyDay: form.reperibilita ? 1 : 0, // Questo viene correttamente impostato
      standbyAllowance: form.reperibilita ? 1 : 0, // Aggiunto per compatibilità
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
    
    const result = CalculationService.calculateEarningsBreakdown(workEntry, safeSettings);
    setBreakdown(result);
    // Log dettagliato per debug breakdown
    if (workEntry.date === '2025-07-06') {
      console.log('DEBUG breakdown 06/07/2025:', JSON.stringify(result, null, 2));
    }
  }, [workEntry, settings]);
  
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
                        const multiplier = settings.contract?.overtimeRates?.saturday || 1.15;
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
                            const multiplier = settings.contract?.overtimeRates?.saturday || 1.15;
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
                      overtime = settings.contract?.overtimeRates?.saturday || 1.15;
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
                  `Applicata maggiorazione CCNL sabato (+${((settings.contract?.overtimeRates?.saturday || 1.15) - 1)*100}%)`}
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
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.day || 1.2)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.ordinary)} = {breakdown.standby.workEarnings.ordinary.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro notturno reperibilità */}
          {breakdown.standby.workHours?.night > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro notturno</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.night)}</Text>
              </View>
              {breakdown.standby.workEarnings?.night > 0 && breakdown.standby.workHours.night > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.nightUntil22 || 1.25)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.night)} = {breakdown.standby.workEarnings.night.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Lavoro festivo reperibilità */}
          {breakdown.standby.workHours?.holiday > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lavoro festivo</Text>
                <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.holiday)}</Text>
              </View>
              {breakdown.standby.workEarnings?.holiday > 0 && breakdown.standby.workHours.holiday > 0 && (
                <Text style={styles.rateCalc}>
                  {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.holiday || 1.3)).toFixed(2).replace('.', ',')} € x {formatSafeHours(breakdown.standby.workHours.holiday)} = {breakdown.standby.workEarnings.holiday.toFixed(2).replace('.', ',')} €
                </Text>
              )}
            </View>
          )}
          
          {/* Viaggio reperibilità */}
          {(breakdown.standby.travelHours?.ordinary > 0 || 
            breakdown.standby.travelHours?.night > 0 || 
            breakdown.standby.travelHours?.holiday > 0) && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Viaggio reperibilità</Text>
                <Text style={styles.breakdownValue}>
                  {formatSafeHours(
                    (breakdown.standby.travelHours?.ordinary || 0) + 
                    (breakdown.standby.travelHours?.night || 0) + 
                    (breakdown.standby.travelHours?.holiday || 0)
                  )}
                </Text>
              </View>
              {(breakdown.standby.travelEarnings?.ordinary > 0 || 
                breakdown.standby.travelEarnings?.night > 0 || 
                breakdown.standby.travelEarnings?.holiday > 0) && (
                <Text style={styles.rateCalc}>
                  {(() => {
                    const base = settings.contract?.hourlyRate || 16.41;
                    const travelRate = settings.travelCompensationRate || 1.0;
                    const applyBonus = settings.standbySettings?.travelWithBonus;
                    const nightRate = base * (applyBonus ? (settings.contract?.overtimeRates?.nightUntil22 || 1.25) : 1) * travelRate;
                    const holidayRate = base * (applyBonus ? (settings.contract?.overtimeRates?.holiday || 1.3) : 1) * travelRate;
                    const ordinaryRate = base * travelRate;
                    const ordinaryHours = breakdown.standby.travelHours?.ordinary || 0;
                    const nightHours = breakdown.standby.travelHours?.night || 0;
                    const holidayHours = breakdown.standby.travelHours?.holiday || 0;
                    let parts = [];
                    if (ordinaryHours > 0) parts.push(`${ordinaryRate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(ordinaryHours)}`);
                    if (nightHours > 0) parts.push(`${nightRate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(nightHours)}`);
                    if (holidayHours > 0) parts.push(`${holidayRate.toFixed(2).replace('.', ',')} € x ${formatSafeHours(holidayHours)}`);
                    const total = (breakdown.standby.travelEarnings?.ordinary || 0) +
                                  (breakdown.standby.travelEarnings?.night || 0) +
                                  (breakdown.standby.travelEarnings?.holiday || 0);
                    return `${parts.join(' + ')} = ${total.toFixed(2).replace('.', ',')} €`;
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
                {(form.trasfertaPercent && form.trasfertaPercent < 1) 
                  ? `Mezza giornata (${Math.round(form.trasfertaPercent * 100)}%)` 
                  : 'Giornata intera'}
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
            {`Reperibilità ${formatSafeAmount((breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0))} + `}
            {`Indennità ${formatSafeAmount(breakdown.allowances.travel || 0)}`}
          </Text>
        )}
        {/* Indicatori per maggiorazioni sabato/domenica/festivi e calcolo totale */}
        {breakdown.details?.isSaturday && (
          <Text style={{fontSize: 12, color: '#2e7d32', fontStyle: 'italic', marginTop: 4}}>
            La retribuzione è calcolata con maggiorazione CCNL per sabato (+{((settings.contract?.overtimeRates?.saturday || 1.15) - 1) * 100}%) su tutte le ore.
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
  const today = new Date();
  const { settings } = useSettings();
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
    interventi: [],
    pasti: { pranzo: true, cena: true },
    trasferta: true,
    trasfertaManualOverride: false, // Flag per override manuale indennità trasferta
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
        
        // Funzionalità: Compilazione automatica "ora inizio 1 turno" quando viene inserito "ora arrivo in cantiere"
        if (field === 'arrival_site') {
          // Verifica se "ora inizio 1 turno" è vuoto prima di riempirlo automaticamente
          if (!viaggi[parseInt(idx)]['work_start_1']) {
            console.log(`Auto-compilazione ora inizio 1° turno con: ${timeString}`);
            viaggi[parseInt(idx)]['work_start_1'] = timeString;
          }
        }
        
        // Funzionalità: Compilazione automatica "ora partenza rientro" quando viene inserito "ora fine 2 turno"
        if (field === 'work_end_2') {
          // Verifica se "ora partenza rientro" è vuoto prima di riempirlo automaticamente
          if (!viaggi[parseInt(idx)]['departure_return']) {
            console.log(`Auto-compilazione ora partenza rientro con: ${timeString}`);
            viaggi[parseInt(idx)]['departure_return'] = timeString;
          }
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
    setForm({ ...form, veicolo: value });
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
    setForm({ ...form, reperibilita: !form.reperibilita });
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
    <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
      {/* Data + Tipo giornata in riga */}
      <View style={{flexDirection:'row', alignItems:'center', marginBottom:16, gap:12}}>
        <View style={{flex:1}}>
          <Text style={styles.label}>Data</Text>
          <TouchableOpacity onPress={() => { setDateField('mainDate'); setShowDatePicker(true); setDatePickerMode('date'); }} style={styles.input}>
            <Text style={{fontSize:16}}>{form.date}</Text>
            <Ionicons name="calendar-outline" size={18} color="#2196F3" style={{marginLeft:8}} />
          </TouchableOpacity>
        </View>
        <View style={{flex:1}}>
          <Text style={styles.label}>Tipo giornata</Text>
          <View style={[styles.input, {padding:0, minHeight:44, justifyContent:'center'}]}>
            <Picker
              selectedValue={dayType}
              onValueChange={setDayType}
              style={{width:'100%'}}>
              {dayTypes.map(dt => (
                <Picker.Item key={dt.value} label={dt.label} value={dt.value} color={dt.color} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
      
      {/* Cantiere */}
      <View style={styles.section}>
        <Text style={styles.label}>Nome cantiere</Text>
        <TextInput
          style={styles.input}
          value={form.site_name}
          onChangeText={v => handleChange('site_name', v)}
          placeholder="Facoltativo"
        />
      </View>
      
      {/* Veicolo */}
      <View style={styles.section}>
        <Text style={styles.label}>Veicolo usato</Text>
        <View style={styles.row}>
          {veicoloOptions.map(opt => (
            <TouchableOpacity key={opt.value} style={[styles.veicoloBtn, form.veicolo === opt.value && styles.veicoloBtnActive]} onPress={() => handleVeicoloChange(opt.value)}>
              <Text style={{color: form.veicolo === opt.value ? 'white' : '#1976d2'}}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Viaggi/Lavoro */}
      {form.viaggi.map((v, idx) => renderViaggio(v, idx))}
      <TouchableOpacity style={styles.addBtn} onPress={addViaggio}>
        <Ionicons name="add" size={18} color="#1976d2" />
        <Text style={{color:'#1976d2',marginLeft:4}}>Aggiungi turno viaggio/lavoro</Text>
      </TouchableOpacity>
      
      {/* Reperibilità */}
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Reperibilità</Text>
          <Switch value={form.reperibilita} onValueChange={toggleReperibilita} />
        </View>
        {form.reperibilita && (
          <>
            {form.interventi.map((v, idx) => renderViaggio(v, idx, true))}
            <TouchableOpacity style={styles.addBtn} onPress={addIntervento}>
              <Ionicons name="add" size={18} color="#1976d2" />
              <Text style={{color:'#1976d2',marginLeft:4}}>Aggiungi intervento reperibilità</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      {/* Pasti */}
      <View style={styles.section}>
        <Text style={styles.label}>Rimborso pasti</Text>
        <View style={styles.row}>
          <Text style={{fontSize:15}}>Pranzo</Text>
          <Switch value={form.pasti.pranzo} onValueChange={()=>togglePasto('pranzo')} />
          <Text style={{fontSize:15,marginLeft:16}}>Cena</Text>
          <Switch value={form.pasti.cena} onValueChange={()=>togglePasto('cena')} />
        </View>
        {(settings?.mealAllowances?.lunch?.cashAmount > 0 || settings?.mealAllowances?.lunch?.allowManualCash) && form.pasti.pranzo && (
          <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
            <Text style={{fontSize:15,marginRight:8}}>Cash pranzo</Text>
            <TextInput
              style={[styles.input,{flex:0.5}]}
              value={mealCash.pranzo}
              onChangeText={v => {
                const newValue = v.replace(/[^0-9.,]/g,'');
                setMealCash(c => ({...c, pranzo: newValue}));
                setForm(f => ({...f, mealLunchCash: parseFloat(newValue.replace(',','.')) || 0}));
              }}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <Text style={{marginLeft:4}}>€</Text>
          </View>
        )}
        {(settings?.mealAllowances?.dinner?.cashAmount > 0 || settings?.mealAllowances?.dinner?.allowManualCash) && form.pasti.cena && (
          <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
            <Text style={{fontSize:15,marginRight:8}}>Cash cena</Text>
            <TextInput
              style={[styles.input,{flex:0.5}]}
              value={mealCash.cena}
              onChangeText={v => {
                const newValue = v.replace(/[^0-9.,]/g,'');
                setMealCash(c => ({...c, cena: newValue}));
                setForm(f => ({...f, mealDinnerCash: parseFloat(newValue.replace(',','.')) || 0}));
              }}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <Text style={{marginLeft:4}}>€</Text>
          </View>
        )}
      </View>
      
      {/* Trasferta */}
      <View style={styles.section}>
        <Text style={styles.label}>Indennità trasferta</Text>
        <Switch value={form.trasferta} onValueChange={toggleTrasferta} />
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
                    <TypeIcon
                      type={option.value}
                      size={20}
                      color={form.completamentoGiornata === option.value ? 'white' : option.color}
                    />
                    <Text style={{
                      color: form.completamentoGiornata === option.value ? 'white' : '#333',
                      marginLeft: 6,
                      fontSize: 14,
                      fontWeight: form.completamentoGiornata === option.value ? 'bold' : 'normal'
                    }}>
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
            <View style={styles.section}>
              <Text style={styles.label}>Completamento Giornata</Text>
              <View style={{backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8}}>
                <Text style={{fontSize: 14, color: '#2e7d32'}}>
                  Non è obbligatorio effettuare le 8 ore lavorative nei giorni {isSaturday ? 'di sabato' : (isSunday ? 'di domenica' : 'festivi')}.
                </Text>
                <Text style={{fontSize: 14, color: '#2e7d32', marginTop: 4}}>
                  La retribuzione sarà calcolata con la maggiorazione CCNL per le ore effettivamente lavorate.
                </Text>
              </View>
            </View>
          );
        }
      })()}
      
      {/* Note */}
      <View style={styles.section}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, {height:60}]}
          value={form.note}
          onChangeText={v => handleChange('note', v)}
          placeholder="Aggiungi una nota (opzionale)"
          multiline
        />
      </View>
      
      {/* Riepilogo Guadagni */}
      <EarningsSummary form={form} settings={settings} />
      
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
              // Mappa i campi come in TimeEntryScreen.js
              const viaggi = form.viaggi[0] || {};
              const entry = {
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
                interventi: form.interventi || [], // Salva l'array completo di interventi
                mealLunchVoucher: form.pasti.pranzo && !(mealCash.pranzo && parseFloat(mealCash.pranzo) > 0) ? 1 : 0,
                mealLunchCash: mealCash.pranzo && parseFloat(mealCash.pranzo) > 0 ? parseFloat(mealCash.pranzo.replace(',','.')) : 0,
                mealDinnerVoucher: form.pasti.cena && !(mealCash.cena && parseFloat(mealCash.cena) > 0) ? 1 : 0,
                mealDinnerCash: mealCash.cena && parseFloat(mealCash.cena) > 0 ? parseFloat(mealCash.cena.replace(',','.')) : 0,
                travelAllowance: form.trasferta ? 1 : 0,
                travelAllowancePercent: form.trasfertaPercent || 1.0,
                trasfertaManualOverride: form.trasfertaManualOverride || false, // Aggiungiamo il flag di override manuale al salvataggio
                standbyAllowance: form.reperibilita ? 1 : 0,
                isStandbyDay: form.reperibilita ? 1 : 0,
                completamentoGiornata: form.completamentoGiornata || 'nessuno',
                totalEarnings: 0, // sarà calcolato dopo
                notes: form.note || '',
                dayType,
              };
              // Calcola guadagno reale
              const settingsObj = settings || {};
              const result = CalculationService.calculateEarningsBreakdown(entry, settingsObj);
              entry.totalEarnings = result.totalEarnings || 0;
              
              // Log per debug salvataggio
              console.log("Salvataggio entry con trasferta:", {
                trasferta: entry.travelAllowance === 1,
                trasfertaManualOverride: entry.trasfertaManualOverride,
                isEdit,
                entryId
              });
              // Validazione
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
              // Torna alla TimeEntryScreen e refresh automatico sia TimeEntry che Dashboard
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1976d2', marginBottom: 18, textAlign: 'center' },
  section: { marginBottom: 16 },
  label: { fontSize: 15, color: '#333', marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 10, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0', flexDirection:'row', alignItems:'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  veicoloBtn: { borderWidth:1, borderColor:'#1976d2', borderRadius:8, padding:8, marginRight:8, backgroundColor:'white' },
  veicoloBtnActive: { backgroundColor:'#1976d2' },
  addBtn: { flexDirection:'row', alignItems:'center', marginBottom:10, marginTop:2 },
  viaggioBox: { backgroundColor:'#e3f2fd', borderRadius:8, padding:10, marginBottom:10 },
  viaggioTitle: { fontWeight:'bold', color:'#1976d2', marginBottom:6 },
  timeField: { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'white', borderRadius:8, padding:8, borderWidth:1, borderColor:'#e0e0e0', marginRight:4 },
  timeFieldLabel: { fontSize: 13, color: '#333', flex: 1 },
  timeFieldValue: { fontSize: 15, color: '#1976d2', marginLeft: 8, minWidth: 48, textAlign: 'right' },
  timeFieldActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
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
    color: '#333',
    marginTop: 8,
  }
});

export default TimeEntryForm;