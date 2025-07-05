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
  const [selectedOption, setSelectedOption] = useState('EXCESS_AS_TRAVEL');

  useEffect(() => {
    if (settings.travelHoursSetting) {
      setSelectedOption(settings.travelHoursSetting);
    }
  }, [settings]);

  const travelOptions = [
    {
      id: 'AS_WORK',
      title: 'Come ore lavorative',
      description: 'Le ore di viaggio vengono considerate come ore lavorative normali',
      example: 'Esempio: 2h viaggio + 6h lavoro = 8h retribuzione giornaliera'
    },
    {
      id: 'EXCESS_AS_TRAVEL',
      title: 'Eccedenza come retribuzione viaggio',
      description: 'Calcolo di 8 ore totali (viaggio + lavoro), le ore eccedenti vengono pagate con retribuzione viaggio',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h retribuzione viaggio'
    },
    {
      id: 'EXCESS_AS_OVERTIME',
      title: 'Eccedenza come straordinario',
      description: 'Calcolo di 8 ore totali (viaggio + lavoro), le ore eccedenti vengono pagate come straordinario',
      example: 'Esempio: 2h viaggio + 8h lavoro = 8h retribuzione giornaliera + 2h straordinario'
    }
  ];

  const handleSave = async () => {
    try {
      await updatePartialSettings({
        travelHoursSetting: selectedOption
      });

      Alert.alert('Successo', 'Impostazioni ore di viaggio salvate correttamente', [
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
        selectedOption === option.id && styles.selectedOption
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
            Le ore di viaggio includono il tempo per raggiungere il cantiere (andata) e il tempo per tornare in azienda (ritorno). 
            Seleziona come vuoi che vengano calcolate nel sistema di retribuzione.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {travelOptions.map(renderOption)}
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
                Straordinari: calcolati in base all'orario di lavoro
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
