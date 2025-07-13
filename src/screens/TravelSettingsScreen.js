import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';

const TravelSettingsScreen = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [selectedOption, setSelectedOption] = useState('TRAVEL_RATE_EXCESS');
  const [multiShiftTravelAsWork, setMultiShiftTravelAsWork] = useState(false);

  useEffect(() => {
    if (settings.travelHoursSetting) {
      setSelectedOption(settings.travelHoursSetting);
    }
    if (settings.multiShiftTravelAsWork !== undefined) {
      setMultiShiftTravelAsWork(settings.multiShiftTravelAsWork);
    }
  }, [settings]);

  const travelOptions = [
    {
      id: 'TRAVEL_RATE_EXCESS',
      title: '🚗 Viaggio eccedente con tariffa viaggio',
      description: 'Le prime 8 ore (lavoro + viaggio) sono retribuite con tariffa giornaliera. Le ore di viaggio eccedenti le 8h totali sono pagate con tariffa viaggio.',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h retribuzione viaggio',
      isRecommended: true
    },
    {
      id: 'TRAVEL_RATE_ALL',
      title: '🛣️ Viaggio sempre con tariffa viaggio',
      description: 'Tutte le ore di viaggio sono sempre pagate con tariffa viaggio specifica, indipendentemente dalle ore totali.',
      example: 'Esempio: 2h viaggio + 6h lavoro = 6h retribuzione giornaliera + 2h retribuzione viaggio'
    },
    {
      id: 'OVERTIME_EXCESS',
      title: '⏰ Viaggio eccedente come straordinario',
      description: 'Le prime 8 ore (lavoro + viaggio) sono retribuite con tariffa giornaliera. Le ore di viaggio eccedenti le 8h totali sono pagate come straordinari.',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h straordinario (+20%)'
    }
  ];

  const handleSave = async () => {
    try {
      console.log('🚀 TravelSettingsScreen - Salvando nuove impostazioni viaggio:', {
        travelHoursSetting: selectedOption,
        multiShiftTravelAsWork: multiShiftTravelAsWork,
        settingsCorrente: settings.travelHoursSetting
      });
      
      await updatePartialSettings({
        travelHoursSetting: selectedOption,
        multiShiftTravelAsWork: multiShiftTravelAsWork
      });

      console.log('✅ TravelSettingsScreen - Nuove impostazioni salvate con successo');

      Alert.alert('Successo', 'Impostazioni ore di viaggio aggiornate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving travel settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  const renderOption = (option) => (
    <TouchableOpacity
      key={option.id}
      style={[
        styles.optionCard,
        selectedOption === option.id && styles.selectedOption,
        option.isRecommended && styles.recommendedOption
      ]}
      onPress={() => setSelectedOption(option.id)}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionRadio}>
          {selectedOption === option.id && (
            <View style={styles.optionRadioSelected} />
          )}
        </View>
        <Text style={styles.optionTitle}>{option.title}</Text>
        {option.isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>CONSIGLIATA</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.optionDescription}>{option.description}</Text>
      
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleLabel}>Esempio:</Text>
        <Text style={styles.exampleText}>{option.example}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ore di Viaggio</Text>
          <Text style={styles.headerSubtitle}>
            Scegli come vengono calcolate e retribuite le ore di viaggio
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoTitle}>Come funziona</Text>
          </View>
          <Text style={styles.infoText}>
            Le ore di viaggio includono gli spostamenti per raggiungere i cantieri. 
            Seleziona la logica di calcolo più adatta al tuo contratto e tipo di lavoro.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Logica di Calcolo</Text>
          {travelOptions.map(renderOption)}
        </View>

        {/* Sezione Opzioni Multi-turno */}
        <View style={styles.multiShiftContainer}>
          <Text style={styles.sectionTitle}>Opzioni Multi-turno</Text>
          <TouchableOpacity
            style={[
              styles.multiShiftCard,
              multiShiftTravelAsWork && styles.selectedMultiShift
            ]}
            onPress={() => setMultiShiftTravelAsWork(!multiShiftTravelAsWork)}
          >
            <View style={styles.multiShiftHeader}>
              <View style={[
                styles.multiShiftCheckbox,
                multiShiftTravelAsWork && styles.multiShiftCheckboxSelected
              ]}>
                {multiShiftTravelAsWork && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.multiShiftTitle}>
                🔄 Viaggi multi-turno come ore lavoro
              </Text>
            </View>
            <Text style={styles.multiShiftDescription}>
              Gli spostamenti tra cantieri durante la stessa giornata lavorativa 
              sono considerati ore di lavoro invece che viaggi. Solo andata/ritorno 
              dall'azienda vengono calcolati come viaggi.
            </Text>
            <View style={styles.exampleContainer}>
              <Text style={styles.exampleLabel}>Esempio:</Text>
              <Text style={styles.exampleText}>
                Azienda → Cantiere A (viaggio) → Cantiere B (lavoro) → Cantiere C (lavoro) → Azienda (viaggio)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Dettagli Calcolo</Text>
          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color="#666" />
              <Text style={styles.detailText}>
                Giornata lavorativa standard: 8 ore
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calculator" size={20} color="#666" />
              <Text style={styles.detailText}>
                Retribuzione viaggio: {Math.round((settings.travelCompensationRate || 1) * 100)}% della retribuzione oraria
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="trending-up" size={20} color="#666" />
              <Text style={styles.detailText}>
                Straordinari: +20% retribuzione oraria (giorno), +25% (sera), +35% (notte)
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="card" size={20} color="#666" />
              <Text style={styles.detailText}>
                Retribuzione giornaliera: €{(settings.contract?.dailyRate || 107.69).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionsContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    marginTop: 5,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#2196F3',
    backgroundColor: '#f3f9ff',
  },
  recommendedOption: {
    borderColor: '#4CAF50',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Stili Multi-turno
  multiShiftContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  multiShiftCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedMultiShift: {
    borderColor: '#FF9800',
    backgroundColor: '#fff8f0',
  },
  multiShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  multiShiftCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: 'transparent',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiShiftCheckboxSelected: {
    backgroundColor: '#FF9800',
  },
  multiShiftTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  multiShiftDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  exampleContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  exampleText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
  },
  detailsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  detailsContent: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TravelSettingsScreen;
