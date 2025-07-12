import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { createWorkEntryFromData, getSafeSettings, calculateItemBreakdown, formatSafeHours } from '../utils/earningsHelper';
import DatabaseService from '../services/DatabaseService';

// Configurazione delle icone corrette per i tipi di giornata/completamento
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

/**
 * Componente riepilogo guadagni mensili
 * Utilizza lo stesso format di dati e lo stesso servizio di calcolo del form di inserimento orario
 */
const MonthlySummary = ({ month, year }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();
  
  // Carica i dati dal database
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Carica tutti gli inserimenti orari del mese usando getWorkEntries
        const data = await DatabaseService.getWorkEntries(year, month);
        setEntries(data || []);
      } catch (error) {
        console.error('Errore nel caricamento dati mensili:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [month, year]);

  // Converte gli inserimenti orari in un formato compatibile con il calcolo
  const convertedEntries = useMemo(() => {
    if (!entries || !settings) return [];
    
    // Usa le funzioni helper per i calcoli, garantendo coerenza con il form
    const safeSettings = getSafeSettings(settings);
    
    return entries.map(entry => {
      // Usa la funzione helper per creare l'oggetto workEntry nello stesso formato del form
      const workEntry = createWorkEntryFromData(entry);
      
      // Calcola il breakdown dei guadagni usando la stessa funzione helper del form
      const breakdown = calculateItemBreakdown(entry, settings);
      
      return {
        id: entry.id,
        date: new Date(entry.date),
        breakdown,
        workEntry
      };
    });
  }, [entries, settings]);

  // Calcola il totale mensile
  const monthlySummary = useMemo(() => {
    if (!convertedEntries.length) return null;
    
    // Calcola i totali per categoria
    let totalOrdinary = 0;
    let totalStandby = 0;
    let totalAllowances = 0;
    let totalMealAllowances = 0;
    let grandTotal = 0;
    
    convertedEntries.forEach(entry => {
      const { breakdown } = entry;
      if (!breakdown) return;
      
      // Somma tutte le categorie
      if (breakdown.ordinary && breakdown.ordinary.earnings) {
        totalOrdinary += 
          (breakdown.ordinary.earnings.giornaliera || 0) + 
          (breakdown.ordinary.earnings.viaggio_extra || 0) +
          (breakdown.ordinary.earnings.lavoro_extra || 0);
      }
      
      if (breakdown.standby) {
        totalStandby += breakdown.standby.total || 0;
      }
      
      if (breakdown.allowances) {
        // Indennità trasferta
        totalAllowances += breakdown.allowances.travel || 0;
        
        // Rimborsi pasti (separati dal totale generale)
        totalMealAllowances += breakdown.allowances.meal || 0;
      }
      
      grandTotal += breakdown.total || 0;
    });
    
    return {
      totalOrdinary,
      totalStandby,
      totalAllowances,
      totalMealAllowances,
      grandTotal
    };
  }, [convertedEntries]);

  // Render un singolo inserimento orario
  const renderEntryItem = ({ item }) => {
    const { date, breakdown, workEntry } = item;
    const day = date.getDate();
    const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
    
    // Determina il tipo di giornata
    let dayType = 'lavorativa';
    if (workEntry.isHoliday) {
      dayType = 'festivo';
    } else if (workEntry.completamentoGiornata !== 'nessuno') {
      dayType = workEntry.completamentoGiornata;
    }
    
    return (
      <TouchableOpacity style={styles.entryItem}>
        <View style={styles.dateHeader}>
          <View style={styles.dateBox}>
            <Text style={styles.dateDay}>{day}</Text>
            <Text style={styles.dateDayName}>{dayName}</Text>
          </View>
          
          <View style={styles.iconContainer}>
            <TypeIcon type={dayType} size={20} color="#333" />
            {workEntry.isStandbyDay ? (
              <MaterialCommunityIcons name="phone-in-talk" size={18} color="#E91E63" style={styles.statusIcon} />
            ) : null}
            {workEntry.travelAllowance ? (
              <MaterialCommunityIcons name="car" size={18} color="#4CAF50" style={styles.statusIcon} />
            ) : null}
          </View>
          
          <View style={styles.dailyTotal}>
            <Text style={styles.dailyTotalLabel}>Totale</Text>
            <Text style={styles.dailyTotalValue}>{formatCurrency(breakdown.total || 0)}</Text>
          </View>
        </View>
        
        <View style={styles.breakdownContainer}>
          {/* Attività ordinarie */}
          {breakdown.ordinary && breakdown.ordinary.total > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionLabel}>Attività ordinarie:</Text>
              <Text style={styles.sectionValue}>{formatCurrency(breakdown.ordinary.total)}</Text>
              
              {breakdown.ordinary.hours.lavoro_giornaliera + breakdown.ordinary.hours.viaggio_giornaliera > 0 && (
                <Text style={styles.breakdownDetail}>
                  Giornaliero: {formatSafeHours(
                    breakdown.ordinary.hours.lavoro_giornaliera + 
                    breakdown.ordinary.hours.viaggio_giornaliera
                  )} ore
                </Text>
              )}
              
              {breakdown.ordinary.hours.lavoro_extra > 0 && (
                <Text style={styles.breakdownDetail}>
                  Lavoro extra: {formatSafeHours(breakdown.ordinary.hours.lavoro_extra)} ore
                </Text>
              )}
              
              {breakdown.ordinary.hours.viaggio_extra > 0 && (
                <Text style={styles.breakdownDetail}>
                  Viaggio extra: {formatSafeHours(breakdown.ordinary.hours.viaggio_extra)} ore
                </Text>
              )}
            </View>
          )}
          
          {/* Reperibilità */}
          {breakdown.standby && breakdown.standby.total > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionLabel}>Reperibilità:</Text>
              <Text style={styles.sectionValue}>{formatCurrency(breakdown.standby.total)}</Text>
              
              {/* Mostra solo se ci sono interventi */}
              {Object.values(breakdown.standby.workHours || {}).some(h => h > 0) && (
                <Text style={styles.breakdownDetail}>
                  Interventi: {formatSafeHours(
                    Object.values(breakdown.standby.workHours).reduce((sum, h) => sum + h, 0)
                  )} ore
                </Text>
              )}
              
              {/* Indennità di reperibilità */}
              {breakdown.allowances.standby > 0 && (
                <Text style={styles.breakdownDetail}>
                  Indennità: {formatCurrency(breakdown.allowances.standby)}
                </Text>
              )}
            </View>
          )}
          
          {/* Indennità */}
          {breakdown.allowances && breakdown.allowances.travel > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionLabel}>Indennità trasferta:</Text>
              <Text style={styles.sectionValue}>{formatCurrency(breakdown.allowances.travel)}</Text>
            </View>
          )}
          
          {/* Rimborsi pasti */}
          {breakdown.allowances && breakdown.allowances.meal > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionLabel}>Rimborsi pasti:</Text>
              <Text style={styles.sectionValue}>{formatCurrency(breakdown.allowances.meal)}</Text>
              <Text style={styles.breakdownDetail}>Non inclusi nel totale (non tassabili)</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Se sta caricando, mostra l'indicatore
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Caricamento riepilogo mensile...</Text>
      </View>
    );
  }

  // Se non ci sono dati, mostra un messaggio
  if (!convertedEntries.length) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="calendar-alert" size={48} color="#999" />
        <Text style={styles.emptyText}>Nessun inserimento per questo mese</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Intestazione mese */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>
          {new Date(year, month - 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      
      {/* Riepilogo mensile */}
      {monthlySummary && (
        <View style={styles.monthlySummary}>
          <Text style={styles.summaryTitle}>Riepilogo del mese</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Attività ordinarie:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlySummary.totalOrdinary)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reperibilità:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlySummary.totalStandby)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Indennità trasferta:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlySummary.totalAllowances)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Rimborsi pasti:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(monthlySummary.totalMealAllowances)}</Text>
            <Text style={styles.summaryNote}>(non inclusi nel totale)</Text>
          </View>
          
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Totale mensile:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(monthlySummary.grandTotal)}</Text>
          </View>
        </View>
      )}
      
      {/* Lista inserimenti del mese */}
      <FlatList
        data={convertedEntries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEntryItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
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
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  monthHeader: {
    backgroundColor: '#0066cc',
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'capitalize',
  },
  monthlySummary: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
    marginLeft: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  listContainer: {
    paddingBottom: 20,
  },
  entryItem: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateBox: {
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateDayName: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  iconContainer: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  statusIcon: {
    marginLeft: 8,
  },
  dailyTotal: {
    alignItems: 'flex-end',
  },
  dailyTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  dailyTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  breakdownContainer: {
    padding: 16,
  },
  breakdownSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default MonthlySummary;
