import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkEntries, useSettings, useCalculationService } from '../hooks';
import { formatDate, formatTime, formatCurrency, getDayName, formatSafeHours } from '../utils';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/DatabaseService';
import DataUpdateService from '../services/DataUpdateService';
import { PressableAnimated, FadeInCard, CardSkeleton, EnhancedTimeSlot, QuickStat } from '../components/AnimatedComponents';

const { width } = Dimensions.get('window');

const dayTypeLabels = {
  lavorativa: { label: 'Lavoro', color: '#2196F3', icon: 'briefcase' },
  ferie: { label: 'Ferie', color: '#43a047', icon: 'beach' },
  permesso: { label: 'Permesso', color: '#ef6c00', icon: 'clock-outline' },
  malattia: { label: 'Malattia', color: '#d32f2f', icon: 'medical-bag' },
  riposo: { label: 'Riposo compensativo', color: '#757575', icon: 'sleep' },
  festivo: { label: 'Festivo', color: '#9c27b0', icon: 'calendar-star' },
};

const completamentoLabels = {
  nessuno: { label: 'Nessun completamento', color: '#999', icon: 'minus-circle-outline' },
  ferie: { label: 'Completato con Ferie', color: '#43a047', icon: 'beach' },
  permesso: { label: 'Completato con Permesso', color: '#ef6c00', icon: 'clock-outline' },
  malattia: { label: 'Completato con Malattia', color: '#d32f2f', icon: 'medical-bag' },
  riposo: { label: 'Completato con Riposo', color: '#757575', icon: 'sleep' },
  festivo: { label: 'Completato con Festivo', color: '#9c27b0', icon: 'calendar-star' },
};

// Componente per il badge informativo migliorato
const InfoBadge = ({ icon, label, value, color, backgroundColor, onPress }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
    onPress && onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.modernBadge, { backgroundColor }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={[styles.modernBadgeLabel, { color }]}>{label}</Text>
        {value && <Text style={[styles.modernBadgeValue, { color }]}>{value}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Componente per gli orari migliorato
const TimeSlot = ({ icon, label, startTime, endTime, duration, color = '#666' }) => {
  if (!startTime || !endTime) return null;
  
  return (
    <View style={styles.timeSlotContainer}>
      <View style={styles.timeSlotHeader}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
        <Text style={[styles.timeSlotLabel, { color }]}>{label}</Text>
        {duration && (
          <Text style={styles.timeSlotDuration}>
            ({formatSafeHours(duration)})
          </Text>
        )}
      </View>
      <Text style={styles.timeSlotTime}>
        {formatTime(startTime)} → {formatTime(endTime)}
      </Text>
    </View>
  );
};

// Componente per il breakdown guadagni
const EarningsBreakdown = ({ breakdown, onPress }) => {
  const [expanded, setExpanded] = useState(false);

  const components = [];
  if (breakdown.ordinary?.total > 0) {
    components.push({ label: 'Ordinario', value: breakdown.ordinary.total, color: '#2196F3' });
  }
  if (breakdown.standby?.totalEarnings > 0) {
    const interventions = breakdown.standby.totalEarnings - (breakdown.standby.dailyIndemnity || 0);
    components.push({ label: 'Interventi', value: interventions, color: '#FF9800' });
  }
  if (breakdown.allowances?.standby > 0) {
    components.push({ label: 'Ind. Reperibilità', value: breakdown.allowances.standby, color: '#4CAF50' });
  }
  if (breakdown.allowances?.travel > 0) {
    components.push({ label: 'Ind. Trasferta', value: breakdown.allowances.travel, color: '#9C27B0' });
  }

  return (
    <TouchableOpacity 
      style={styles.earningsBreakdownContainer}
      onPress={() => {
        setExpanded(!expanded);
        onPress && onPress();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.earningsHeader}>
        <Text style={styles.earningsTotal}>
          {formatCurrency(breakdown.totalEarnings)}
        </Text>
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </View>
      
      {expanded && components.length > 0 && (
        <View style={styles.earningsComponents}>
          {components.map((comp, index) => (
            <View key={index} style={styles.earningsComponent}>
              <View style={[styles.componentDot, { backgroundColor: comp.color }]} />
              <Text style={styles.componentLabel}>{comp.label}</Text>
              <Text style={styles.componentValue}>{formatCurrency(comp.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const ActionMenu = ({ visible, entry, onClose, onDeleted }) => {
  const date = entry ? formatDate(entry.date) : '';
  const navigation = useNavigation();

  const handleEdit = () => {
    onClose();
    navigation.navigate('TimeEntryForm', { entry, isEdit: true });
  };

  const handleDelete = () => {
    Alert.alert(
      'Conferma eliminazione',
      `Sei sicuro di voler eliminare l'inserimento del ${date}?`,
      [
        {
          text: 'Annulla',
          style: 'cancel',
          onPress: onClose
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteWorkEntry(entry.id);
              onClose();
              onDeleted();
              Alert.alert('Successo', 'Inserimento eliminato con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare l\'inserimento');
            }
          }
        }
      ]
    );
  };

  if (!visible || !entry) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.actionMenu}>
          <TouchableOpacity style={styles.actionMenuItem} onPress={handleEdit}>
            <MaterialCommunityIcons name="pencil" size={24} color="#2196F3" />
            <Text style={styles.actionMenuText}>Modifica</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionMenuItem} onPress={handleDelete}>
            <MaterialCommunityIcons name="delete" size={24} color="#F44336" />
            <Text style={[styles.actionMenuText, { color: '#F44336' }]}>Elimina</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

// Componente DetailSection per sezioni organizzate come nel form
const DetailSection = ({ title, icon, iconColor, children, isLast = false, expanded = false, onToggle }) => (
  <View style={[styles.detailSection, isLast && styles.lastDetailSection]}>
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={onToggle}
      activeOpacity={onToggle ? 0.7 : 1}
    >
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {onToggle && (
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={18} 
          color="#666" 
        />
      )}
    </TouchableOpacity>
    {(!onToggle || expanded) && (
      <View style={styles.sectionContent}>
        {children}
      </View>
    )}
  </View>
);

// Componente DetailRow per singole righe di dettaglio
const DetailRow = ({ label, value, duration, highlight = false, isSubitem = false, calculation }) => (
  <View style={[styles.detailRow, isSubitem && styles.subDetailRow]}>
    <Text style={[styles.detailLabel, isSubitem && styles.subDetailLabel]}>{label}</Text>
    <View style={styles.detailValueContainer}>
      <Text style={[
        styles.detailValue, 
        highlight && styles.highlightValue,
        isSubitem && styles.subDetailValue
      ]}>
        {value}
      </Text>
      {duration && (
        <Text style={styles.durationText}>({duration})</Text>
      )}
    </View>
    {calculation && (
      <Text style={styles.calculationText}>{calculation}</Text>
    )}
  </View>
);

// Componente per breakdown avanzato degli orari
const AdvancedHoursBreakdown = ({ breakdown, settings }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!breakdown || !breakdown.ordinary) return null;

  const formatSafeAmount = (amount) => {
    if (amount === undefined || amount === null) return '0,00 €';
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  const formatRateCalc = (hours, rate, total) => {
    if (hours <= 0) return '0,00 €';
    return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(hours)} = ${total.toFixed(2).replace('.', ',')} €`;
  };

  const hasOrdinaryHours = breakdown.ordinary?.hours && 
    (breakdown.ordinary.hours.lavoro_giornaliera > 0 || 
     breakdown.ordinary.hours.viaggio_giornaliera > 0 || 
     breakdown.ordinary.hours.lavoro_extra > 0 || 
     breakdown.ordinary.hours.viaggio_extra > 0);

  const hasStandbyHours = breakdown.standby?.workHours && 
    (Object.values(breakdown.standby.workHours).some(h => h > 0) || 
     Object.values(breakdown.standby.travelHours).some(h => h > 0));

  if (!hasOrdinaryHours && !hasStandbyHours) return null;

  return (
    <DetailSection
      title="Breakdown Dettagliato Orari"
      icon="chart-timeline-variant"
      iconColor="#FF5722"
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {/* Attività Ordinarie */}
      {hasOrdinaryHours && (
        <>
          <Text style={styles.breakdownSubtitle}>Attività Ordinarie</Text>
          
          {/* Prime 8 ore giorni feriali */}
          {(!breakdown.details?.isSaturday && !breakdown.details?.isSunday && !breakdown.details?.isHoliday) &&
            (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) && (
              <View style={styles.breakdownItemContainer}>
                <DetailRow 
                  label="Giornaliero (prime 8h)" 
                  value={formatSafeHours(
                    (breakdown.ordinary.hours.lavoro_giornaliera || 0) +
                    (breakdown.ordinary.hours.viaggio_giornaliera || 0)
                  )}
                  calculation={(() => {
                    const totalOrdinaryHours = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                                             (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                    const dailyRate = settings.contract?.dailyRate || 109.19;
                    if (totalOrdinaryHours >= 8) {
                      return `${dailyRate.toFixed(2).replace('.', ',')} € × 1 giorno = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                    } else {
                      const percentage = (totalOrdinaryHours / 8 * 100).toFixed(0);
                      return `${dailyRate.toFixed(2).replace('.', ',')} € × ${percentage}% = ${breakdown.ordinary.earnings.giornaliera.toFixed(2).replace('.', ',')} €`;
                    }
                  })()}
                />
                {breakdown.ordinary.hours.lavoro_giornaliera > 0 && (
                  <DetailRow 
                    label="- Lavoro" 
                    value={formatSafeHours(breakdown.ordinary.hours.lavoro_giornaliera)}
                    isSubitem={true}
                  />
                )}
                {breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                  <DetailRow 
                    label="- Viaggio" 
                    value={formatSafeHours(breakdown.ordinary.hours.viaggio_giornaliera)}
                    isSubitem={true}
                  />
                )}
              </View>
          )}

          {/* Lavoro/Viaggio weekend/festivi */}
          {(breakdown.details?.isSaturday || breakdown.details?.isSunday || breakdown.details?.isHoliday) &&
            (breakdown.ordinary.hours.lavoro_giornaliera > 0 || breakdown.ordinary.hours.viaggio_giornaliera > 0) && (
              <DetailRow 
                label={`Lavoro ordinario ${breakdown.details?.isSunday ? 'domenica' : 
                       breakdown.details?.isHoliday ? 'festivo' : 'sabato'}`}
                value={formatSafeHours((breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                                      (breakdown.ordinary.hours.viaggio_giornaliera || 0))}
                calculation={(() => {
                  const base = settings.contract?.hourlyRate || 16.41;
                  const multiplier = breakdown.details?.isSunday || breakdown.details?.isHoliday 
                    ? settings.contract?.overtimeRates?.holiday || 1.3
                    : settings.contract?.overtimeRates?.saturday || 1.25;
                  const ore = (breakdown.ordinary.hours.lavoro_giornaliera || 0) + 
                            (breakdown.ordinary.hours.viaggio_giornaliera || 0);
                  return `${base.toFixed(2).replace('.', ',')} € × ${multiplier.toFixed(2).replace('.', ',')} × ${formatSafeHours(ore)} = ${(base * multiplier * ore).toFixed(2).replace('.', ',')} €`;
                })()}
              />
          )}

          {/* Ore extra */}
          {breakdown.ordinary.hours.lavoro_extra > 0 && (
            <DetailRow 
              label={`Lavoro extra (oltre 8h)${breakdown.details?.isSaturday ? ' (Sabato)' : 
                     breakdown.details?.isSunday ? ' (Domenica)' : 
                     breakdown.details?.isHoliday ? ' (Festivo)' : ''}`}
              value={formatSafeHours(breakdown.ordinary.hours.lavoro_extra)}
              calculation={(() => {
                const base = settings.contract?.hourlyRate || 16.41;
                let overtime;
                if (breakdown.details?.isSaturday) {
                  overtime = settings.contract?.overtimeRates?.saturday || 1.25;
                } else if (breakdown.details?.isSunday || breakdown.details?.isHoliday) {
                  overtime = settings.contract?.overtimeRates?.holiday || 1.3;
                } else {
                  overtime = settings.contract?.overtimeRates?.day || 1.2;
                }
                const rate = base * overtime;
                return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(breakdown.ordinary.hours.lavoro_extra)} = ${breakdown.ordinary.earnings.lavoro_extra.toFixed(2).replace('.', ',')} €`;
              })()}
            />
          )}

          {breakdown.ordinary.hours.viaggio_extra > 0 && (
            <DetailRow 
              label="Viaggio extra (oltre 8h)"
              value={formatSafeHours(breakdown.ordinary.hours.viaggio_extra)}
              calculation={(() => {
                const base = settings.contract?.hourlyRate || 16.41;
                const rate = base * (settings.travelCompensationRate || 1.0);
                return `${rate.toFixed(2).replace('.', ',')} € × ${formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} = ${breakdown.ordinary.earnings.viaggio_extra.toFixed(2).replace('.', ',')} €`;
              })()}
            />
          )}

          <DetailRow 
            label="Totale ordinario" 
            value={formatSafeAmount(breakdown.ordinary.total || 0)}
            highlight={true}
          />
        </>
      )}

      {/* Interventi Reperibilità */}
      {hasStandbyHours && (
        <>
          <Text style={styles.breakdownSubtitle}>Interventi Reperibilità</Text>
          
          {breakdown.standby.workHours?.ordinary > 0 && (
            <DetailRow 
              label="Lavoro diurno"
              value={formatSafeHours(breakdown.standby.workHours.ordinary)}
              calculation={formatRateCalc(
                breakdown.standby.workHours.ordinary,
                settings.contract?.hourlyRate || 16.41,
                breakdown.standby.workEarnings?.ordinary || 0
              )}
            />
          )}
          
          {breakdown.standby.workHours?.night > 0 && (
            <DetailRow 
              label="Lavoro notturno (+25%)"
              value={formatSafeHours(breakdown.standby.workHours.night)}
              calculation={formatRateCalc(
                breakdown.standby.workHours.night,
                (settings.contract?.hourlyRate || 16.41) * 1.25,
                breakdown.standby.workEarnings?.night || 0
              )}
            />
          )}
          
          {breakdown.standby.travelHours?.ordinary > 0 && (
            <DetailRow 
              label="Viaggio diurno"
              value={formatSafeHours(breakdown.standby.travelHours.ordinary)}
              duration={`Durata: ${formatSafeHours(breakdown.standby.travelHours.ordinary)}`}
              calculation={formatRateCalc(
                breakdown.standby.travelHours.ordinary,
                (settings.contract?.hourlyRate || 16.41) * (settings.travelCompensationRate || 1.0),
                breakdown.standby.travelEarnings?.ordinary || 0
              )}
            />
          )}
          
          {breakdown.standby.travelHours?.night > 0 && (
            <DetailRow 
              label="Viaggio notturno (+25%)"
              value={formatSafeHours(breakdown.standby.travelHours.night)}
              duration={`Durata: ${formatSafeHours(breakdown.standby.travelHours.night)}`}
              calculation={formatRateCalc(
                breakdown.standby.travelHours.night,
                (settings.contract?.hourlyRate || 16.41) * 1.25 * (settings.travelCompensationRate || 1.0),
                breakdown.standby.travelEarnings?.night || 0
              )}
            />
          )}

          {/* Totale reperibilità (lavoro + viaggi interventi) */}
          {(() => {
            const totalStandbyWork = Object.values(breakdown.standby.workHours || {}).reduce((sum, h) => sum + h, 0);
            const totalStandbyTravel = Object.values(breakdown.standby.travelHours || {}).reduce((sum, h) => sum + h, 0);
            const totalStandbyHours = totalStandbyWork + totalStandbyTravel;
            const totalStandbyEarnings = (breakdown.standby?.totalEarnings || 0) - (breakdown.standby?.dailyIndemnity || 0);
            
            return (
              <DetailRow 
                label={`Totale reperibilità (${formatSafeHours(totalStandbyHours)})`}
                value={formatSafeAmount(totalStandbyEarnings)}
                highlight={true}
              />
            );
          })()}
        </>
      )}
    </DetailSection>
  );
};

const TimeEntryScreen = () => {
  const navigation = useNavigation();
  const currentDate = new Date();
  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth] = useState(currentDate.getMonth() + 1);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [standbyAllowances, setStandbyAllowances] = useState([]);

  const { entries, isLoading, error, refreshEntries, canRetry } = useWorkEntries(selectedYear, selectedMonth, true);
  const { settings } = useSettings();
  const calculationService = useCalculationService();

  // Carica le indennità di reperibilità quando cambiano anno/mese o settings
  useEffect(() => {
    if (settings?.standbySettings?.enabled) {
      const allowances = calculationService.calculateMonthlyStandbyAllowances(
        selectedYear,
        selectedMonth,
        settings
      );
      setStandbyAllowances(allowances);
    } else {
      setStandbyAllowances([]);
    }
  }, [selectedYear, selectedMonth, settings, calculationService]);

  // 🔄 Listener per aggiornamenti automatici dei dati dal database
  useEffect(() => {
    const handleWorkEntriesUpdate = (action, data) => {
      console.log('🔄 TIMEENTRY - Ricevuto aggiornamento:', action, data);
      
      // Per ripristini completi del backup, ricarica sempre i dati
      if (action === 'BULK_RESTORE') {
        console.log('🔄 TIMEENTRY - Ripristino backup completo, ricarico tutti i dati...');
        refreshEntries();
        return;
      }
      
      // Ricarica i dati solo se l'aggiornamento riguarda il mese corrente
      const entryYear = data?.year;
      const entryMonth = data?.month;
      
      if (entryYear === selectedYear && entryMonth === selectedMonth) {
        console.log('🔄 TIMEENTRY - Aggiornamento per mese corrente, ricarico dati...');
        refreshEntries();
      }
    };

    DataUpdateService.onWorkEntriesUpdated(handleWorkEntriesUpdate);

    return () => {
      DataUpdateService.removeAllListeners('workEntriesUpdated');
    };
  }, [selectedYear, selectedMonth, refreshEntries]);

  // Array dei mesi in italiano
  const mesiItaliani = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Funzione per determinare il nome del mese dall'entry
  const getMonthLabel = (dateString) => {
    const entryDate = new Date(dateString);
    return `${mesiItaliani[entryDate.getMonth()]} ${entryDate.getFullYear()}`;
  };

  const handleLongPress = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowActionMenu(true);
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'standby_only') {
      // Card semplificata per solo reperibilità - esattamente come nella foto
      return (
        <View style={[styles.detailedCard, styles.standbyOnlyCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <Text style={styles.dayName}>{getDayName(item.date)}</Text>
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.standbyBadge}>
              <MaterialCommunityIcons name="phone-in-talk" size={16} color="#4CAF50" />
              <Text style={styles.standbyBadgeText}>Solo Reperibilità</Text>
            </View>
          </View>
          
          <View style={styles.standbySimpleContent}>
            <Text style={styles.standbySimpleAmount}>
              Indennità: {formatCurrency(item.standbyAllowance || 0)}
            </Text>
          </View>
        </View>
      );
    }

    // Card dettagliata simile al form per inserimenti normali
    const workEntry = createWorkEntryFromData(item, calculationService);
    const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
    
    const dayTypeInfo = dayTypeLabels[item.day_type] || dayTypeLabels.lavorativa;
    const isSpecialDay = item.day_type !== 'lavorativa';

    return (
      <TouchableOpacity
        style={[
          styles.detailedCard,
          isSpecialDay && {
            borderLeftWidth: 4,
            borderLeftColor: dayTypeInfo.color
          }
        ]}
        onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.95}
      >
        {/* Header con data e tipo giornata */}
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dayName}>{getDayName(workEntry.date)}</Text>
            <Text style={styles.dateText}>{formatDate(workEntry.date)}</Text>
          </View>
          
          <View style={styles.headerRight}>
            {isSpecialDay && (
              <View style={[styles.dayTypeBadge, { backgroundColor: dayTypeInfo.color }]}>
                <MaterialCommunityIcons name={dayTypeInfo.icon} size={14} color="white" />
                <Text style={styles.dayTypeBadgeText}>{dayTypeInfo.label}</Text>
              </View>
            )}
            <Text style={styles.totalEarnings}>{formatCurrency(breakdown.totalEarnings)}</Text>
          </View>
        </View>

        {/* Sezione Sito e Veicolo */}
        {(item.site_name || item.vehicle_driven || item.targa_veicolo || item.vehiclePlate) && (
          <DetailSection
            title="Informazioni Lavoro"
            icon="briefcase"
            iconColor="#2196F3"
          >
            {item.site_name && (
              <DetailRow label="Sito" value={item.site_name} />
            )}
            {item.vehicle_driven && (
              <DetailRow 
                label="Veicolo" 
                value={item.vehicle_driven === 'andata_ritorno' ? 'Andata/Ritorno' : item.vehicle_driven} 
              />
            )}
            {(item.targa_veicolo || item.vehiclePlate) && (
              <DetailRow 
                label="Targa Veicolo" 
                value={item.targa_veicolo || item.vehiclePlate} 
              />
            )}
          </DetailSection>
        )}

        {/* Sezione Orari di Lavoro */}
        <DetailSection
          title="Orari Turni"
          icon="clock"
          iconColor="#2196F3"
        >
          {workEntry.workStart1 && workEntry.workEnd1 && (
            <DetailRow 
              label="Turno 1" 
              value={`${workEntry.workStart1} - ${workEntry.workEnd1}`}
              duration={(() => {
                if (!calculationService.calculateWorkHours) return null;
                const start1 = new Date(`2000-01-01T${workEntry.workStart1}`);
                const end1 = new Date(`2000-01-01T${workEntry.workEnd1}`);
                const duration1 = (end1 - start1) / (1000 * 60 * 60);
                return formatSafeHours(duration1);
              })()}
            />
          )}
          {workEntry.workStart2 && workEntry.workEnd2 && (
            <DetailRow 
              label="Turno 2" 
              value={`${workEntry.workStart2} - ${workEntry.workEnd2}`}
              duration={(() => {
                const start2 = new Date(`2000-01-01T${workEntry.workStart2}`);
                const end2 = new Date(`2000-01-01T${workEntry.workEnd2}`);
                const duration2 = (end2 - start2) / (1000 * 60 * 60);
                return formatSafeHours(duration2);
              })()}
            />
          )}
          {/* 🚀 MULTI-TURNO: Mostra turni aggiuntivi */}
          {workEntry.viaggi && Array.isArray(workEntry.viaggi) && (() => {
            let turnoNumber = 3; // Inizia dal turno 3
            return workEntry.viaggi.map((viaggio, index) => (
              <React.Fragment key={`viaggio-${index}`}>
                {viaggio.work_start_1 && viaggio.work_end_1 && (
                  <DetailRow 
                    label={`Turno ${turnoNumber++}`} 
                    value={`${viaggio.work_start_1} - ${viaggio.work_end_1}`}
                    duration={(() => {
                      const start = new Date(`2000-01-01T${viaggio.work_start_1}`);
                      const end = new Date(`2000-01-01T${viaggio.work_end_1}`);
                      const duration = (end - start) / (1000 * 60 * 60);
                      return formatSafeHours(duration);
                    })()}
                  />
                )}
                {viaggio.work_start_2 && viaggio.work_end_2 && (
                  <DetailRow 
                    label={`Turno ${turnoNumber++}`} 
                    value={`${viaggio.work_start_2} - ${viaggio.work_end_2}`}
                    duration={(() => {
                      const start = new Date(`2000-01-01T${viaggio.work_start_2}`);
                      const end = new Date(`2000-01-01T${viaggio.work_end_2}`);
                      const duration = (end - start) / (1000 * 60 * 60);
                      return formatSafeHours(duration);
                    })()}
                  />
                )}
              </React.Fragment>
            ));
          })()}
          {calculationService.calculateWorkHours && (
            <DetailRow 
              label="Totale Ore Lavoro" 
              value={formatSafeHours(calculationService.calculateWorkHours(workEntry))}
              highlight={true}
            />
          )}
        </DetailSection>

        {/* Sezione Viaggi */}
        {(workEntry.departureCompany || workEntry.departureReturn || (workEntry.viaggi && Array.isArray(workEntry.viaggi) && workEntry.viaggi.length > 0)) && (
          <DetailSection
            title="Viaggi"
            icon="car"
            iconColor="#FF9800"
          >
            {workEntry.departureCompany && workEntry.arrivalSite && (
              <DetailRow 
                label="Andata" 
                value={`${workEntry.departureCompany} - ${workEntry.arrivalSite}`}
                duration={(() => {
                  if (!calculationService.calculateTimeDifference) return null;
                  // Calcolo preciso della durata dell'andata
                  const andataMinutes = calculationService.calculateTimeDifference(
                    workEntry.departureCompany, 
                    workEntry.arrivalSite
                  );
                  return formatSafeHours(calculationService.minutesToHours(andataMinutes));
                })()}
              />
            )}
            {workEntry.departureReturn && workEntry.arrivalCompany && (
              <DetailRow 
                label="Ritorno" 
                value={`${workEntry.departureReturn} - ${workEntry.arrivalCompany}`}
                duration={(() => {
                  if (!calculationService.calculateTimeDifference) return null;
                  // Calcolo preciso della durata del ritorno
                  const ritornoMinutes = calculationService.calculateTimeDifference(
                    workEntry.departureReturn, 
                    workEntry.arrivalCompany
                  );
                  return formatSafeHours(calculationService.minutesToHours(ritornoMinutes));
                })()}
              />
            )}
            {/* 🚀 MULTI-TURNO: Mostra viaggi aggiuntivi */}
            {workEntry.viaggi && Array.isArray(workEntry.viaggi) && (() => {
              let viaggioNumber = 2; // Inizia dal viaggio 2 (dopo andata/ritorno principale)
              return workEntry.viaggi.map((viaggio, index) => (
                <React.Fragment key={`viaggio-travel-${index}`}>
                  {viaggio.departure_company && viaggio.arrival_site && (
                    <DetailRow 
                      label={`Viaggio ${viaggioNumber} - Andata`} 
                      value={`${viaggio.departure_company} - ${viaggio.arrival_site}`}
                      duration={(() => {
                        const start = new Date(`2000-01-01T${viaggio.departure_company}`);
                        const end = new Date(`2000-01-01T${viaggio.arrival_site}`);
                        const duration = (end - start) / (1000 * 60 * 60);
                        return formatSafeHours(duration);
                      })()}
                    />
                  )}
                  {viaggio.departure_return && viaggio.arrival_company && (
                    <DetailRow 
                      label={`Viaggio ${viaggioNumber++} - Ritorno`} 
                      value={`${viaggio.departure_return} - ${viaggio.arrival_company}`}
                      duration={(() => {
                        const start = new Date(`2000-01-01T${viaggio.departure_return}`);
                        const end = new Date(`2000-01-01T${viaggio.arrival_company}`);
                        const duration = (end - start) / (1000 * 60 * 60);
                        return formatSafeHours(duration);
                      })()}
                    />
                  )}
                  {!viaggio.departure_return && !viaggio.arrival_company && viaggioNumber++}
                </React.Fragment>
              ));
            })()}
            {calculationService.calculateTravelHours && (
              <DetailRow 
                label="Totale Viaggio" 
                value={formatSafeHours(calculationService.calculateTravelHours(workEntry))}
                highlight={true}
              />
            )}
          </DetailSection>
        )}

        {/* Sezione Reperibilità (se presente) */}
        {(workEntry.isStandbyDay === 1 || (workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0)) && (
          <DetailSection
            title="Reperibilità"
            icon="phone-in-talk"
            iconColor="#4CAF50"
          >
            {workEntry.interventi && Array.isArray(workEntry.interventi) && workEntry.interventi.length > 0 && (
              <>
                {workEntry.interventi.map((intervento, index) => (
                  <View key={index} style={styles.interventoContainer}>
                    <Text style={styles.interventoTitle}>Intervento {index + 1}</Text>
                    {intervento.departure_company && intervento.arrival_site && (
                      <DetailRow 
                        label="Viaggio A" 
                        value={`${intervento.departure_company} - ${intervento.arrival_site} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                      />
                    )}
                    {intervento.work_start_1 && intervento.work_end_1 && (
                      <DetailRow 
                        label="Lavoro" 
                        value={`${intervento.work_start_1} - ${intervento.work_end_1} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                      />
                    )}
                    {intervento.work_start_2 && intervento.work_end_2 && (
                      <DetailRow 
                        label="Lavoro 2" 
                        value={`${intervento.work_start_2} - ${intervento.work_end_2} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                      />
                    )}
                    {intervento.departure_return && intervento.arrival_company && (
                      <DetailRow 
                        label="Viaggio R" 
                        value={`${intervento.departure_return} - ${intervento.arrival_company} (${(() => {
                          const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
                          const durationHours = calculationService.minutesToHours(durationMinutes);
                          return formatSafeHours(durationHours);
                        })()})`}
                        isSubitem={true}
                      />
                    )}
                  </View>
                ))}
                {/* Totale complessivo interventi - sempre visibile e in evidenza */}
                {(() => {
                  const numInterventi = workEntry.interventi ? workEntry.interventi.length : 0;
                  
                  // Calcola il totale di tutti gli interventi (lavoro + viaggi)
                  let totalAllInterventiHours = 0;
                  
                  if (workEntry.interventi && Array.isArray(workEntry.interventi)) {
                    workEntry.interventi.forEach(intervento => {
                    // Ore lavoro
                    if (intervento.work_start_1 && intervento.work_end_1) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_1, intervento.work_end_1);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    if (intervento.work_start_2 && intervento.work_end_2) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.work_start_2, intervento.work_end_2);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    // Ore viaggio andata
                    if (intervento.departure_company && intervento.arrival_site) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_company, intervento.arrival_site);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                    // Ore viaggio ritorno
                    if (intervento.departure_return && intervento.arrival_company) {
                      const durationMinutes = calculationService.calculateTimeDifference(intervento.departure_return, intervento.arrival_company);
                      totalAllInterventiHours += calculationService.minutesToHours(durationMinutes);
                    }
                  });
                  }
                  
                  if (totalAllInterventiHours > 0) {
                    const label = numInterventi > 1 ? "Totale Tutti Interventi (lavoro+viaggi)" : "Totale Intervento (lavoro+viaggi)";
                    return (
                      <DetailRow 
                        label={label}
                        value={formatSafeHours(totalAllInterventiHours)}
                        highlight={true}
                      />
                    );
                  }
                  return null;
                })()}
                {calculationService.calculateStandbyTravelHours && (
                  <DetailRow 
                    label="Totale Ore Viaggio Interventi" 
                    value={formatSafeHours(calculationService.calculateStandbyTravelHours(workEntry))}
                    highlight={true}
                  />
                )}
              </>
            )}
          </DetailSection>
        )}

        {/* Riepilogo Guadagni dettagliato come nel form */}
        <DetailSection
          title="Riepilogo Guadagni"
          icon="calculator"
          iconColor="#4CAF50"
        >
          {/* Breakdown componenti principali */}
          {breakdown.ordinary?.total > 0 && (
            <DetailRow 
              label="Attività Ordinarie" 
              value={formatCurrency(breakdown.ordinary.total)}
            />
          )}
          
          {breakdown.standby && breakdown.standby.totalEarnings > 0 && (
            <>
              <DetailRow 
                label="Interventi Reperibilità" 
                value={formatCurrency((breakdown.standby.totalEarnings || 0) - (breakdown.standby.dailyIndemnity || 0))}
              />
              {breakdown.allowances?.standby > 0 && (
                <DetailRow 
                  label="Indennità Reperibilità" 
                  value={formatCurrency(breakdown.allowances.standby)}
                />
              )}
            </>
          )}
          
          {!breakdown.standby?.totalEarnings && breakdown.allowances?.standby > 0 && (
            <DetailRow 
              label="Indennità Reperibilità" 
              value={formatCurrency(breakdown.allowances.standby)}
            />
          )}
          
          {breakdown.allowances?.travel > 0 && (
            <DetailRow 
              label="Indennità Trasferta" 
              value={formatCurrency(breakdown.allowances.travel)}
            />
          )}
          
          {/* Totale ore giornata completo */}
          {(() => {
            const ordinaryHours = breakdown.ordinary?.hours ? 
              Object.values(breakdown.ordinary.hours).reduce((sum, h) => sum + h, 0) : 0;
            const standbyHours = breakdown.standby ? 
              (Object.values(breakdown.standby.workHours || {}).reduce((sum, h) => sum + h, 0) +
               Object.values(breakdown.standby.travelHours || {}).reduce((sum, h) => sum + h, 0)) : 0;
            const totalDayHours = ordinaryHours + standbyHours;
            
            if (totalDayHours > 0) {
              return (
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursLabel}>TOTALE ORE GIORNATA</Text>
                  <Text style={styles.hoursValue}>{formatSafeHours(totalDayHours)}</Text>
                </View>
              );
            }
            return null;
          })()}
          
          {/* Visualizzazione Completamento Giornata */}
          {item.completamento_giornata && item.completamento_giornata !== 'nessuno' && (
            <View style={[styles.completamentoContainer, {
              borderLeftColor: completamentoLabels[item.completamento_giornata]?.color || '#666'
            }]}>
              <MaterialCommunityIcons 
                name={completamentoLabels[item.completamento_giornata]?.icon || 'information-outline'} 
                size={16} 
                color={completamentoLabels[item.completamento_giornata]?.color || '#666'} 
              />
              <Text style={[styles.completamentoText, { 
                color: completamentoLabels[item.completamento_giornata]?.color || '#666' 
              }]}>
                {completamentoLabels[item.completamento_giornata]?.label || 'Completamento non riconosciuto'}
              </Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTALE GIORNATA</Text>
            <Text style={styles.totalValue}>{formatCurrency(breakdown.totalEarnings)}</Text>
          </View>
          
          {/* Rimborsi Pasti sotto il totale con dettaglio cash/buono */}
          {breakdown.allowances?.meal > 0 && (
            <>
              <View style={styles.mealSeparator} />
              <DetailRow 
                label="Rimborsi Pasti (non tassabili)" 
                value={formatCurrency(breakdown.allowances.meal)}
              />
              {/* Dettaglio composizione rimborsi pasti con logica uguale al form */}
              {(workEntry.mealLunchVoucher || workEntry.mealLunchCash > 0) && (
                <DetailRow 
                  label="- Pranzo" 
                  value={(() => {
                    // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
                    if (workEntry.mealLunchCash > 0) {
                      return `${formatCurrency(workEntry.mealLunchCash)} (contanti - valore specifico)`;
                    }
                    
                    // Altrimenti usa i valori dalle impostazioni (standard)
                    const voucher = parseFloat(settings?.mealAllowances?.lunch?.voucherAmount) || 0;
                    const cash = parseFloat(settings?.mealAllowances?.lunch?.cashAmount) || 0;
                    
                    if (voucher > 0 && cash > 0) {
                      return `${formatCurrency(voucher)} (buono) + ${formatCurrency(cash)} (contanti)`;
                    } else if (voucher > 0) {
                      return `${formatCurrency(voucher)} (buono)`;
                    } else if (cash > 0) {
                      return `${formatCurrency(cash)} (contanti)`;
                    } else {
                      return "Valore non impostato";
                    }
                  })()}
                  isSubitem={true}
                />
              )}
              
              {(workEntry.mealDinnerVoucher || workEntry.mealDinnerCash > 0) && (
                <DetailRow 
                  label="- Cena" 
                  value={(() => {
                    // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
                    if (workEntry.mealDinnerCash > 0) {
                      return `${formatCurrency(workEntry.mealDinnerCash)} (contanti - valore specifico)`;
                    }
                    
                    // Altrimenti usa i valori dalle impostazioni (standard)
                    const voucher = parseFloat(settings?.mealAllowances?.dinner?.voucherAmount) || 0;
                    const cash = parseFloat(settings?.mealAllowances?.dinner?.cashAmount) || 0;
                    
                    if (voucher > 0 && cash > 0) {
                      return `${formatCurrency(voucher)} (buono) + ${formatCurrency(cash)} (contanti)`;
                    } else if (voucher > 0) {
                      return `${formatCurrency(voucher)} (buono)`;
                    } else if (cash > 0) {
                      return `${formatCurrency(cash)} (contanti)`;
                    } else {
                      return "Valore non impostato";
                    }
                  })()}
                  isSubitem={true}
                />
              )}
            </>
          )}
          
          {/* Nota informativa per giorni speciali */}
          {(breakdown.details?.isSaturday || breakdown.details?.isSunday || breakdown.details?.isHoliday) && (
            <Text style={styles.specialDayNote}>
              {breakdown.details?.isSunday ? 'Maggiorazione domenicale' : 
               breakdown.details?.isHoliday ? 'Maggiorazione festiva' : 
               'Maggiorazione sabato'} applicata secondo CCNL
            </Text>
          )}
        </DetailSection>

        {/* Breakdown avanzato degli orari */}
        <AdvancedHoursBreakdown breakdown={breakdown} settings={settings} />

        {/* Note se presenti */}
        {item.notes && (
          <DetailSection
            title="Note"
            icon="note-text"
            iconColor="#666"
            isLast={true}
          >
            <Text style={styles.notesText}>{item.notes}</Text>
          </DetailSection>
        )}
      </TouchableOpacity>
    );
  }, [settings, navigation, handleLongPress, calculationService]);

  // Raggruppamento entries per mese
  const sections = useMemo(() => {
    const entriesByMonth = {};
    
    entries?.forEach(entry => {
      const monthYear = getMonthLabel(entry.date);
      if (!entriesByMonth[monthYear]) entriesByMonth[monthYear] = [];
      entriesByMonth[monthYear].push({
        ...entry,
        type: 'work_entry'
      });
    });

    standbyAllowances?.forEach(standby => {
      const monthYear = getMonthLabel(standby.date);
      if (!entriesByMonth[monthYear]) entriesByMonth[monthYear] = [];
      
      const existingEntry = entriesByMonth[monthYear].find(
        e => e.date === standby.date
      );
      
      if (!existingEntry) {
        entriesByMonth[monthYear].push({
          id: `standby-${standby.date}`,
          date: standby.date,
          type: 'standby_only',
          standbyAllowance: standby.allowance,
          isStandbyDay: true
        });
      }
    });

    return Object.keys(entriesByMonth)
      .sort((a, b) => {
        const dateA = new Date(entriesByMonth[a][0].date);
        const dateB = new Date(entriesByMonth[b][0].date);
        return dateB - dateA;
      })
      .map(month => ({
        title: month,
        data: entriesByMonth[month].sort((a, b) => new Date(b.date) - new Date(a.date))
      }));
  }, [entries, standbyAllowances, getMonthLabel]);

  // Calcolo delle statistiche del mese per l'header sezione
  const getSectionStats = (data) => {
    const totalEarnings = data.reduce((sum, item) => {
      if (item.type === 'standby_only') {
        return sum + (item.standbyAllowance || 0);
      }
      const workEntry = createWorkEntryFromData(item, calculationService);
      const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
      return sum + breakdown.totalEarnings;
    }, 0);

    const workDays = data.filter(item => item.type !== 'standby_only').length;
    const standbyDays = data.filter(item => 
      item.type === 'standby_only' || item.isStandbyDay === 1
    ).length;

    return { totalEarnings, workDays, standbyDays };
  };

  // Funzione per calcolare le statistiche dettagliate di una giornata
  const getDetailedStats = (workEntry) => {
    const workHours = calculationService.calculateWorkHours(workEntry);
    const travelHours = calculationService.calculateTravelHours(workEntry);
    const standbyWorkHours = calculationService.calculateStandbyWorkHours(workEntry);
    
    const totalHours = workHours + travelHours;
    const isFullDay = totalHours >= 8;
    const isOvertime = totalHours > 8;
    const overtimeHours = isOvertime ? totalHours - 8 : 0;
    
    return {
      workHours,
      travelHours,
      standbyWorkHours,
      totalHours,
      isFullDay,
      isOvertime,
      overtimeHours
    };
  };

  // Funzione per determinare l'efficienza della giornata
  const getDayEfficiency = (stats, breakdown) => {
    const hourlyRate = 16.41; // Tariffa oraria base
    const expectedEarningsForHours = stats.totalHours * hourlyRate;
    const actualEarnings = breakdown.totalEarnings;
    const efficiency = actualEarnings / expectedEarningsForHours;
    
    if (efficiency >= 1.5) return { level: 'excellent', color: '#4CAF50', label: 'Eccellente' };
    if (efficiency >= 1.2) return { level: 'good', color: '#2196F3', label: 'Buona' };
    if (efficiency >= 1.0) return { level: 'normal', color: '#FF9800', label: 'Normale' };
    return { level: 'low', color: '#F44336', label: 'Bassa' };
  };

  // Funzione per formattare gli orari con contesto
  const formatTimeWithContext = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const duration = (end - start) / (1000 * 60 * 60);
    
    let contextInfo = '';
    if (start.getHours() < 6) contextInfo = ' (molto presto)';
    else if (start.getHours() < 8) contextInfo = ' (presto)';
    else if (end.getHours() > 20) contextInfo = ' (tardivo)';
    else if (end.getHours() > 18) contextInfo = ' (serale)';
    
    return {
      start: startTime,
      end: endTime,
      duration: duration.toFixed(1),
      context: contextInfo
    };
  };

  const renderSectionHeader = ({ section }) => {
    const stats = getSectionStats(section.data);
    
    return (
      <View style={styles.modernSectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <Text style={styles.modernSectionTitle}>{section.title}</Text>
          <View style={styles.sectionStats}>
            <Text style={styles.sectionStatsText}>
              {section.data.length} giorni • {formatCurrency(stats.totalEarnings)}
            </Text>
            {stats.standbyDays > 0 && (
              <Text style={styles.sectionStatsSubtext}>
                {stats.standbyDays} giorni reperibilità
              </Text>
            )}
          </View>
        </View>
        <MaterialCommunityIcons name="calendar-month" size={24} color="#4CAF50" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Caricamento inserimenti...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
          <Text style={styles.errorTitle}>Errore</Text>
          <Text style={styles.errorText}>Impossibile caricare gli inserimenti</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshEntries}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id?.toString() || `${item.date}-${item.type}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshEntries} colors={['#4CAF50']} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-plus" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Nessun inserimento trovato</Text>
            <Text style={styles.emptyText}>
              Tocca il pulsante "+" per aggiungere il tuo primo inserimento lavorativo
            </Text>
          </View>
        )}
      />

      {/* FAB moderno */}
      <TouchableOpacity
        style={styles.modernFab}
        onPress={() => navigation.navigate('TimeEntryForm')}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="plus" size={24} color="white" />
        <Text style={styles.fabText}>Nuovo Inserimento</Text>
      </TouchableOpacity>

      <ActionMenu
        visible={showActionMenu}
        entry={selectedEntry}
        onClose={() => setShowActionMenu(false)}
        onDeleted={refreshEntries}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 0,
    marginBottom: -45, // Riduce ulteriormente lo spazio con la tab bar
  },
  
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  list: {
    flex: 1,
    marginTop: -55, // Riduce ulteriormente lo spazio sopra la lista
  },
  listContent: {
    padding: 6,
    paddingBottom: 90, // Spazio per il FAB ripristinato
  },

  // Stili per le sezioni moderne
  modernSectionHeader: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  modernSectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#1b5e20',
    marginBottom: 4,
  },
  sectionStats: {
    flexDirection: 'column',
  },
  sectionStatsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionStatsSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },

  // Stili per le card moderne
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 3, // Ridotto da 6 a 3 per alzare la visuale
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  standbyOnlyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f8fff9',
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateSection: {
    flex: 1,
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernDayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayTypeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Stili per il breakdown guadagni
  earningsBreakdownContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  earningsComponents: {
    marginTop: 12,
    width: '100%',
  },
  earningsComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  componentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  componentLabel: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  componentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  // Stili per le sezioni dettagliate (come nel form)
  detailSection: {
    marginBottom: 16,
  },
  lastDetailSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sectionContent: {
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    minHeight: 32,
  },
  subDetailRow: {
    paddingLeft: 16,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  subDetailLabel: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  subDetailValue: {
    fontSize: 13,
    color: '#555',
  },
  highlightValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  calculationText: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
    width: '100%',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
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
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  standbyTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  standbyTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  standbyTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  standbyTotalEarnings: {
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  specialDayNote: {
    fontSize: 12,
    color: '#2e7d32',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // Stili per breakdown avanzato
  breakdownSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
    marginTop: 4,
  },
  breakdownItemContainer: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e3f2fd',
  },

  // Stili per interventi
  interventoContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  interventoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },

  // Stili per reperibilità only
  standbyEarningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
  },
  standbyEarningsText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  standbyInfoContainer: {
    marginTop: 12,
  },

  // Stili per il body delle card
  modernCardBody: {
    gap: 16,
  },

  // Stili per le informazioni del sito
  siteInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  siteDetails: {
    marginLeft: 12,
    flex: 1,
  },
  siteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },

  // Stili per gli slot temporali
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlotContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeSlotLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  timeSlotDuration: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  timeSlotTime: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 26,
  },

  // Stili per l'indicatore di efficienza
  efficiencyIndicator: {
    marginBottom: 12,
  },
  efficiencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  efficiencyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  efficiencyDetails: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },

  // Stili per le statistiche rapide
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  // Stili per i badge moderni
  modernBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  // Stili per le note
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  notesText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },

  // Stili per il FAB moderno
  modernFab: {
    position: 'absolute',
    bottom: 70, // Spostato più in alto
    right: 20,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Stili per il modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    width: '80%',
    maxWidth: 300,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333',
    fontWeight: '500',
  },

  // Stili per le righe di dettaglio
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subDetailRow: {
    backgroundColor: '#f9f9f9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#333',
  },
  subDetailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  highlightValue: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  durationText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },

  // Stili per le sezioni di dettaglio
  detailSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  lastDetailSection: {
    marginBottom: 90, // Spazio per il FAB
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  sectionContent: {
    paddingLeft: 26,
  },

  // Stili per le info di reperibilità
  interventoContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f8e9',
  },
  interventoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
    marginBottom: 4,
  },

  // Stili per le card moderne dettagliate
  detailedCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 8,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dayTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  dayTypeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  completamentoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  completamentoText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  totalEarnings: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  standbyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  standbyBadgeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  standbyDetails: {
    marginTop: 16,
  },
  standbyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  
  // Stile semplificato per card reperibilità come nella foto
  standbySimpleContent: {
    marginTop: 12,
    marginBottom: 8,
  },
  standbySimpleAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  
  // Stile per separatore rimborsi pasti
  mealSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  
  // Stile per nota informativa interventi
  interventoNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    lineHeight: 16,
  },
});

export default TimeEntryScreen;
