import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VacationService from '../services/VacationService';

// Componenti riutilizzati dal TimeEntryForm per mantenere coerenza visiva
const ModernCard = ({ children, style }) => (
  <View style={[styles.modernCard, style]}>
    {children}
  </View>
);

const SectionHeader = ({ title, icon, iconColor }) => (
  <View style={styles.sectionHeader}>
    <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
    <Text style={styles.sectionHeaderTitle}>{title}</Text>
  </View>
);

const VacationCard = ({ request, onEdit, onDelete }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#f44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approvata';
      case 'rejected': return 'Rifiutata';
      case 'pending': return 'In attesa';
      default: return 'Sconosciuto';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'vacation': return 'Ferie';
      case 'sick_leave': return 'Malattia';
      case 'personal_leave': return 'Permesso';
      case 'compensatory_leave': return 'Riposo compensativo';
      default: return type;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  };

  return (
    <ModernCard style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestTypeContainer}>
          <MaterialCommunityIcons 
            name={request.type === 'vacation' ? 'beach' : 
                  request.type === 'sick_leave' ? 'medical-bag' :
                  request.type === 'personal_leave' ? 'account-clock' : 'calendar-check'} 
            size={20} 
            color="#2196F3" 
          />
          <Text style={styles.requestType}>{getTypeText(request.type)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <Text style={styles.requestPeriod}>
          {formatDate(request.startDate)} - {formatDate(request.endDate)}
        </Text>
        <Text style={styles.requestDays}>
          {request.totalDays} {request.totalDays === 1 ? 'giorno' : 'giorni'}
        </Text>
        {request.reason && (
          <Text style={styles.requestReason} numberOfLines={2}>
            {request.reason}
          </Text>
        )}
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit(request)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#2196F3" />
          <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>Modifica</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(request)}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#f44336" />
          <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Elimina</Text>
        </TouchableOpacity>
      </View>
    </ModernCard>
  );
};

const VacationManagementScreen = ({ navigation, route }) => {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [requestsList, vacationSummary] = await Promise.all([
        VacationService.getAllRequests(),
        VacationService.getVacationSummary()
      ]);
      setRequests(requestsList);
      setSummary(vacationSummary);
    } catch (error) {
      console.error('Errore nel caricamento dei dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati delle ferie');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Gestisce il refresh quando la schermata riceve focus o parametri di refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (route?.params?.refresh) {
      loadData();
      // Reset del parametro per evitare refresh multipli
      navigation.setParams({ refresh: false });
    }
  }, [route?.params?.refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEdit = (request) => {
    navigation.navigate('VacationRequestForm', {
      isEdit: true,
      requestToEdit: request
    });
  };

  const handleDelete = (request) => {
    Alert.alert(
      'Conferma eliminazione',
      `Sei sicuro di voler eliminare la richiesta di ${request.type === 'vacation' ? 'ferie' : 'permesso'}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await VacationService.deleteRequest(request.id);
              await loadData(); // Ricarica i dati
              Alert.alert('Successo', 'Richiesta eliminata con successo');
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare la richiesta');
            }
          }
        }
      ]
    );
  };

  const handleNewRequest = () => {
    navigation.navigate('VacationRequestForm', {
      isEdit: false
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ferie e Permessi</Text>
          <TouchableOpacity 
            style={styles.configButton}
            onPress={() => navigation.navigate('VacationSettings')}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Riepilogo Annuale */}
        {summary && (
          <ModernCard style={styles.cardSpacing}>
            <SectionHeader 
              title="Riepilogo Annuale" 
              icon="calendar-account" 
              iconColor="#E91E63" 
            />
            
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.availableVacationDays}</Text>
                <Text style={styles.summaryLabel}>Ferie disponibili</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.usedVacationDays}</Text>
                <Text style={styles.summaryLabel}>Ferie utilizzate</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.availablePersonalDays}</Text>
                <Text style={styles.summaryLabel}>Permessi disponibili</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.usedPersonalDays}</Text>
                <Text style={styles.summaryLabel}>Permessi utilizzati</Text>
              </View>
            </View>
          </ModernCard>
        )}

        {/* Azioni Rapide */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Azioni Rapide" 
            icon="lightning-bolt" 
            iconColor="#FF9800" 
          />
          
          <TouchableOpacity 
            style={styles.newRequestButton}
            onPress={handleNewRequest}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
            <Text style={styles.newRequestButtonText}>Nuova Richiesta</Text>
          </TouchableOpacity>
        </ModernCard>

        {/* Lista Richieste */}
        <ModernCard style={styles.cardSpacing}>
          <SectionHeader 
            title="Richieste Recenti" 
            icon="history" 
            iconColor="#2196F3" 
          />
          
          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-remove" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>Nessuna richiesta trovata</Text>
              <Text style={styles.emptyStateSubtext}>
                Tocca "Nuova Richiesta" per iniziare
              </Text>
            </View>
          ) : (
            requests.map((request) => (
              <VacationCard
                key={request.id}
                request={request}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </ModernCard>
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  configButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  cardSpacing: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E91E63',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  newRequestButton: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRequestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E91E63',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  requestDays: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestReason: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#e3f2fd',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default VacationManagementScreen;
