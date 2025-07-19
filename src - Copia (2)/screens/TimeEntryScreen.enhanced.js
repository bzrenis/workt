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

const { width } = Dimensions.get('window');

const dayTypeLabels = {
  lavorativa: { label: 'Lavoro', color: '#2196F3', icon: 'briefcase' },
  ferie: { label: 'Ferie', color: '#43a047', icon: 'beach' },
  permesso: { label: 'Permesso', color: '#ef6c00', icon: 'clock-outline' },
  malattia: { label: 'Malattia', color: '#d32f2f', icon: 'medical-bag' },
  riposo: { label: 'Riposo compensativo', color: '#757575', icon: 'sleep' },
  festivo: { label: 'Festivo', color: '#9c27b0', icon: 'calendar-star' },
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

const TimeEntryScreen = () => {
  const navigation = useNavigation();
  const currentDate = new Date();
  const [selectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth] = useState(currentDate.getMonth() + 1);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [standbyAllowances, setStandbyAllowances] = useState([]);

  const { entries, loading, error, refetch } = useWorkEntries();
  const { settings } = useSettings();
  const { calculationService } = useCalculationService();

  const handleLongPress = useCallback((entry) => {
    setSelectedEntry(entry);
    setShowActionMenu(true);
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'standby_only') {
      // Card semplificata per solo reperibilità con nuovo design
      return (
        <TouchableOpacity
          style={[styles.modernCard, styles.standbyOnlyCard]}
          onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <View style={styles.modernCardHeader}>
            <View style={styles.dateSection}>
              <Text style={styles.modernDayName}>
                {getDayName(item.date)}
              </Text>
              <Text style={styles.modernDate}>{formatDate(item.date)}</Text>
            </View>
            
            <View style={styles.standbyEarningsContainer}>
              <MaterialCommunityIcons name="phone-in-talk" size={20} color="#4CAF50" />
              <Text style={styles.standbyEarningsText}>
                {formatCurrency(item.standbyAllowance || 0)}
              </Text>
            </View>
          </View>
          
          <View style={styles.standbyInfoContainer}>
            <InfoBadge
              icon="phone-in-talk"
              label="Solo Reperibilità"
              color="#4CAF50"
              backgroundColor="#E8F5E9"
            />
          </View>
        </TouchableOpacity>
      );
    }

    // Card normale migliorata
    const workEntry = createWorkEntryFromData(item);
    const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
    
    // Calcolo ore per i dettagli
    const workHours = calculationService.calculateWorkHours(workEntry);
    const travelHours = calculationService.calculateTravelHours(workEntry);
    const standbyWorkHours = calculationService.calculateStandbyWorkHours(workEntry);

    const renderMealDetails = () => {
      const details = [];
      if (workEntry.mealLunchVoucher || workEntry.mealLunchCash > 0) {
        const cashValue = workEntry.mealLunchCash > 0 
          ? `${formatCurrency(workEntry.mealLunchCash)} (contanti)` 
          : `${formatCurrency(settings?.mealAllowances?.lunch?.voucherAmount || 0)} (buono)`;
        details.push(`Pranzo: ${cashValue}`);
      }
      if (workEntry.mealDinnerVoucher || workEntry.mealDinnerCash > 0) {
        const cashValue = workEntry.mealDinnerCash > 0
          ? `${formatCurrency(workEntry.mealDinnerCash)} (contanti)`
          : `${formatCurrency(settings?.mealAllowances?.dinner?.voucherAmount || 0)} (buono)`;
        details.push(`Cena: ${cashValue}`);
      }
      return details;
    };

    const isStandbyDay = workEntry.isStandbyDay === 1;
    const hasTravel = workEntry.travelAllowance === 1;
    const hasMeals = workEntry.mealLunchVoucher === 1 || workEntry.mealDinnerVoucher === 1 || 
                     workEntry.mealLunchCash > 0 || workEntry.mealDinnerCash > 0;

    const dayTypeInfo = dayTypeLabels[item.day_type] || dayTypeLabels.lavorativa;

    return (
      <TouchableOpacity
        style={[
          styles.modernCard,
          item.day_type !== 'lavorativa' && {
            borderLeftWidth: 4,
            borderLeftColor: dayTypeInfo.color
          }
        ]}
        onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.95}
      >
        {/* Header moderno con data e guadagno */}
        <View style={styles.modernCardHeader}>
          <View style={styles.dateSection}>
            <View style={styles.dayContainer}>
              <Text style={styles.modernDayName}>
                {getDayName(workEntry.date)}
              </Text>
              {item.day_type !== 'lavorativa' && (
                <View style={[styles.dayTypeBadge, { backgroundColor: dayTypeInfo.color }]}>
                  <MaterialCommunityIcons name={dayTypeInfo.icon} size={12} color="white" />
                </View>
              )}
            </View>
            <Text style={styles.modernDate}>{formatDate(workEntry.date)}</Text>
          </View>
          
          <EarningsBreakdown 
            breakdown={breakdown}
            onPress={() => console.log('Breakdown pressed')}
          />
        </View>

        <View style={styles.modernCardBody}>
          {/* Informazioni del sito con design migliorato */}
          {item.site_name && (
            <View style={styles.siteInfoContainer}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#2196F3" />
              <View style={styles.siteDetails}>
                <Text style={styles.siteName}>{item.site_name}</Text>
                {item.vehicle_driven && (
                  <Text style={styles.vehicleInfo}>
                    Veicolo: {item.vehicle_driven === 'andata_ritorno' ? 'Andata/Ritorno' : item.vehicle_driven}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Sezione orari migliorata */}
          <View style={styles.timeSlotsContainer}>
            <TimeSlot
              icon="car"
              label="Viaggio A"
              startTime={workEntry.departureCompany}
              endTime={workEntry.arrivalSite}
              duration={travelHours > 0 ? travelHours / 2 : 0}
              color="#FF9800"
            />
            
            <TimeSlot
              icon="briefcase-outline"
              label="1° Turno"
              startTime={workEntry.workStart1}
              endTime={workEntry.workEnd1}
              duration={workHours}
              color="#2196F3"
            />
            
            <TimeSlot
              icon="briefcase"
              label="2° Turno"
              startTime={workEntry.workStart2}
              endTime={workEntry.workEnd2}
              color="#2196F3"
            />
            
            <TimeSlot
              icon="car-back"
              label="Viaggio R"
              startTime={workEntry.departureReturn}
              endTime={workEntry.arrivalCompany}
              duration={travelHours > 0 ? travelHours / 2 : 0}
              color="#FF9800"
            />

            {/* Interventi reperibilità */}
            {standbyWorkHours > 0 && (
              <TimeSlot
                icon="phone-in-talk"
                label="Reperibilità"
                startTime={workEntry.standbyWorkStart1}
                endTime={workEntry.standbyWorkEnd1}
                duration={standbyWorkHours}
                color="#4CAF50"
              />
            )}
          </View>

          {/* Badge informativi moderni */}
          <View style={styles.modernBadgesContainer}>
            {isStandbyDay && (
              <InfoBadge
                icon="phone-in-talk"
                label="Reperibilità"
                value={breakdown.allowances?.standby > 0 ? formatCurrency(breakdown.allowances.standby) : null}
                color="#4CAF50"
                backgroundColor="#E8F5E9"
              />
            )}
            
            {hasTravel && (
              <InfoBadge
                icon="car"
                label="Trasferta"
                value={breakdown.allowances?.travel > 0 ? formatCurrency(breakdown.allowances.travel) : null}
                color="#2196F3"
                backgroundColor="#E3F2FD"
              />
            )}

            {hasMeals && (
              <InfoBadge
                icon="food"
                label="Pasti"
                value={renderMealDetails().length > 0 ? `${renderMealDetails().length} pasti` : null}
                color="#FF9800"
                backgroundColor="#FFF3E0"
              />
            )}

            {workEntry.isNight && (
              <InfoBadge
                icon="weather-night"
                label="Notturno"
                color="#673AB7"
                backgroundColor="#F3E5F5"
              />
            )}
          </View>

          {/* Note con design migliorato */}
          {item.notes && (
            <View style={styles.notesSection}>
              <MaterialCommunityIcons name="note-text" size={16} color="#666" />
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [settings, navigation, handleLongPress, calculationService]);

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
      const workEntry = createWorkEntryFromData(item);
      const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);
      return sum + breakdown.totalEarnings;
    }, 0);

    const workDays = data.filter(item => item.type !== 'standby_only').length;
    const standbyDays = data.filter(item => 
      item.type === 'standby_only' || item.isStandbyDay === 1
    ).length;

    return { totalEarnings, workDays, standbyDays };
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

  if (loading) {
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
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
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
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#4CAF50']} />
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
        onDeleted={refetch}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  },
  listContent: {
    padding: 12,
    paddingBottom: 90, // Spazio per il FAB
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
    marginVertical: 6,
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

  // Stili per i badge moderni
  modernBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  modernBadgeLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  modernBadgeValue: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
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
    bottom: 20,
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
});

export default TimeEntryScreen;
