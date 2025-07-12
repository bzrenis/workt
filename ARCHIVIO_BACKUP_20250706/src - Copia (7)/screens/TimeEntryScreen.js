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
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkEntries, useSettings, useCalculationService } from '../hooks';
import { formatDate, formatTime, formatCurrency, getDayName, formatSafeHours } from '../utils';
import { createWorkEntryFromData } from '../utils/earningsHelper';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/DatabaseService';

const dayTypeLabels = {
  lavorativa: { label: 'Lavoro', color: '#2196F3' },
  ferie: { label: 'Ferie', color: '#43a047' },
  permesso: { label: 'Permesso', color: '#ef6c00' },
  malattia: { label: 'Malattia', color: '#d32f2f' },
  riposo: { label: 'Riposo compensativo', color: '#757575' },
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
  const { entries, isLoading, refreshEntries } = useWorkEntries(selectedYear, selectedMonth, true);
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
    }
  }, [selectedYear, selectedMonth, settings, calculationService]);

  // Debug del caricamento delle entries
  useEffect(() => {
    console.log('TimeEntryScreen - Entries loaded:', {
      entriesCount: entries?.length || 0,
      standbyDaysCount: standbyAllowances.length,
      year: selectedYear,
      month: selectedMonth,
      isLoading
    });
  }, [entries, standbyAllowances, selectedYear, selectedMonth, isLoading]);

  const handleLongPress = useCallback((entry) => {
    console.log('Long press detected for entry:', entry.id);
    setSelectedEntry(entry);
    setShowActionMenu(true);
  }, []);

  // Funzione per il rendering di un singolo inserimento
  const renderWorkEntry = useCallback(({ item }) => {
    const isStandbyOnly = item.type === 'standby_only';
    const workEntry = isStandbyOnly ? item : createWorkEntryFromData(item, calculationService);
    let breakdown = { totalEarnings: 0 };
    
    try {
      breakdown = isStandbyOnly ? 
        { totalEarnings: item.standbyAllowance } : 
        calculationService.calculateEarningsBreakdown(workEntry, settings);
    } catch (error) {
      console.error('Errore nel calcolo del guadagno:', error);
      breakdown = { totalEarnings: 0 };
    }

    // Se è un giorno di sola reperibilità, mostra una card semplificata
    if (isStandbyOnly) {
      return (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#E8F5E9' }]}
          onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <View style={styles.cardHeader}>
            <View style={styles.dateContainer}>
              <Text style={styles.dayName}>
                {getDayName(workEntry.date)}
              </Text>
              <Text style={styles.date}>{formatDate(workEntry.date)}</Text>
            </View>
            <View style={[styles.earningsContainer, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.earningsText}>
                {formatCurrency(breakdown.totalEarnings)}
              </Text>
            </View>
          </View>
          
          <View style={styles.cardBody}>
            <View style={styles.badgesContainer}>
              <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="phone-in-talk" size={16} color="#4CAF50" />
                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Solo Reperibilità</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Altrimenti continua con il rendering normale
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
      return details.length > 0 ? details.join(' • ') : null;
    };

    const isStandbyDay = workEntry.isStandbyDay === 1;
    const hasTravel = workEntry.travelAllowance === 1;
    const hasMeals = workEntry.mealLunchVoucher === 1 || workEntry.mealDinnerVoucher === 1 || 
                     workEntry.mealLunchCash > 0 || workEntry.mealDinnerCash > 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          item.day_type !== 'lavorativa' && {
            borderLeftWidth: 4,
            borderLeftColor: dayTypeLabels[item.day_type]?.color || '#2196F3'
          }
        ]}
        onPress={() => navigation.navigate('TimeEntryForm', { entry: item, isEdit: true })}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
      >
        {/* Header con data e guadagno */}
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dayName}>
              {getDayName(workEntry.date)}
            </Text>
            <Text style={styles.date}>{formatDate(workEntry.date)}</Text>
          </View>
          <View style={styles.earningsContainer}>
            <Text style={styles.earningsText}>
              {formatCurrency(breakdown.totalEarnings)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Dettagli del luogo e veicolo */}
          {item.site_name && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
              <Text style={styles.siteText}>{item.site_name}</Text>
              {item.vehicle_driven && (
                <Text style={styles.vehicleText}>
                  • {item.vehicle_driven === 'andata_ritorno' ? 'A/R' : item.vehicle_driven}
                </Text>
              )}
            </View>
          )}

          {/* Orari completi */}
          <View style={styles.timesContainer}>
            {/* Viaggio di andata */}
            {workEntry.departureCompany && workEntry.arrivalSite && (
              <View style={styles.timeRow}>
                <MaterialCommunityIcons name="car" size={16} color="#666" />
                <Text style={styles.timeLabel}>Viaggio A:</Text>
                <Text style={styles.timeText}>
                  {formatTime(workEntry.departureCompany)} - {formatTime(workEntry.arrivalSite)}
                </Text>
              </View>
            )}
            
            {/* Primo turno */}
            {workEntry.workStart1 && workEntry.workEnd1 && (
              <View style={styles.timeRow}>
                <MaterialCommunityIcons name="clock" size={16} color="#666" />
                <Text style={styles.timeLabel}>1° Turno:</Text>
                <Text style={styles.timeText}>
                  {formatTime(workEntry.workStart1)} - {formatTime(workEntry.workEnd1)}
                </Text>
              </View>
            )}
            
            {/* Secondo turno */}
            {workEntry.workStart2 && workEntry.workEnd2 && (
              <View style={styles.timeRow}>
                <MaterialCommunityIcons name="clock" size={16} color="#666" />
                <Text style={styles.timeLabel}>2° Turno:</Text>
                <Text style={styles.timeText}>
                  {formatTime(workEntry.workStart2)} - {formatTime(workEntry.workEnd2)}
                </Text>
              </View>
            )}
            
            {/* Viaggio di ritorno */}
            {workEntry.departureReturn && workEntry.arrivalCompany && (
              <View style={styles.timeRow}>
                <MaterialCommunityIcons name="car-back" size={16} color="#666" />
                <Text style={styles.timeLabel}>Viaggio R:</Text>
                <Text style={styles.timeText}>
                  {formatTime(workEntry.departureReturn)} - {formatTime(workEntry.arrivalCompany)}
                </Text>
              </View>
            )}
          </View>

          {/* Badge e info aggiuntive */}
          <View style={styles.badgesContainer}>
            {/* Badge per reperibilità */}
            {isStandbyDay && (
              <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="phone-in-talk" size={16} color="#4CAF50" />
                <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Reperibilità</Text>
              </View>
            )}
            
            {/* Badge per trasferta */}
            {hasTravel && (
              <View style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="car" size={16} color="#2196F3" />
                <Text style={[styles.badgeText, { color: '#2196F3' }]}>
                  Trasferta {workEntry.trasfertaManualOverride ? '(manuale)' : ''}
                  {workEntry.travelAllowancePercent !== 1 ? ` ${workEntry.travelAllowancePercent * 100}%` : ''}
                </Text>
              </View>
            )}

            {/* Dettagli pasti */}
            {hasMeals && (
              <View style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="food" size={16} color="#FF9800" />
                <Text style={[styles.badgeText, { color: '#FF9800' }]}>
                  {renderMealDetails()}
                </Text>
              </View>
            )}
          </View>

          {/* Note */}
          {item.notes && (
            <View style={styles.notesContainer}>
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
    
    // Aggiungi prima tutte le entries normali
    entries?.forEach(entry => {
      const monthYear = getMonthLabel(entry.date);
      if (!entriesByMonth[monthYear]) entriesByMonth[monthYear] = [];
      entriesByMonth[monthYear].push({
        ...entry,
        type: 'work_entry'
      });
    });

    // Aggiungi le indennità di reperibilità per i giorni senza inserimenti
    standbyAllowances?.forEach(standby => {
      const monthYear = getMonthLabel(standby.date);
      if (!entriesByMonth[monthYear]) entriesByMonth[monthYear] = [];
      
      // Controlla se esiste già un inserimento per questa data
      const existingEntry = entriesByMonth[monthYear].find(
        e => e.date === standby.date
      );
      
      if (!existingEntry) {
        // Se non c'è un inserimento, crea un entry virtuale per la reperibilità
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

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} inserimenti</Text>
    </View>
  );

  if (isLoading && (!entries || entries.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Caricamento inserimenti...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inserimenti Ore</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={60} color="#bdbdbd" />
          <Text style={styles.emptyTitle}>Nessun inserimento</Text>
          <Text style={styles.emptyText}>
            Non hai ancora inserito nessuna giornata lavorativa.
            Premi il pulsante "+" per registrare il primo inserimento.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderWorkEntry}
          renderSectionHeader={renderSectionHeader}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshEntries}
              colors={['#2196F3']}
            />
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('TimeEntryForm')}
      >
        <Ionicons name="add-circle-outline" size={24} color="white" />
        <Text style={styles.fabText}>Nuovo Inserimento</Text>
      </TouchableOpacity>

      <ActionMenu 
        visible={showActionMenu}
        entry={selectedEntry}
        onClose={() => {
          setShowActionMenu(false);
          setSelectedEntry(null);
        }}
        onDeleted={refreshEntries}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    padding: 15,
  },
  sectionHeader: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1b5e20',
  },
  sectionCount: {
    color: '#388e3c',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 8,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardPressed: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'column',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  earningsContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    padding: 4,
  },
  earningsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardBody: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  timesContainer: {
    marginVertical: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    width: 70,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: 14,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  notesText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  fab: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 12,
    marginHorizontal: 15,
  },
  fabText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    width: '80%',
    maxWidth: 300,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
});

export default TimeEntryScreen;
