import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import RealPayslipCalculator from '../services/RealPayslipCalculator';

const NetCalculationSettingsScreen = ({ navigation }) => {
  const { settings, updateSettings } = useSettings();
  const [method, setMethod] = useState(settings?.netCalculation?.method || 'irpef');
  const [customPercentage, setCustomPercentage] = useState(
    String(settings?.netCalculation?.customDeductionRate || 25)
  );
  const [previewAmount] = useState(2839.07); // Esempio per preview

  // Calcola preview in tempo reale
  const getPreviewCalculation = () => {
    const tempSettings = {
      method: method,
      customDeductionRate: parseFloat(customPercentage) || 25
    };
    
    return RealPayslipCalculator.calculateNetFromGross(previewAmount, tempSettings);
  };

  const handleSave = async () => {
    try {
      const customPerc = parseFloat(customPercentage);
      
      if (method === 'custom' && (isNaN(customPerc) || customPerc < 0 || customPerc > 100)) {
        Alert.alert('Errore', 'Inserisci una percentuale valida tra 0 e 100');
        return;
      }

      await updateSettings({
        ...settings,
        netCalculation: {
          method: method,
          customDeductionRate: customPerc || 25
        }
      });

      Alert.alert('Successo', 'Impostazioni salvate correttamente', [
        { 
          text: 'OK', 
          onPress: () => {
            // Naviga indietro e forza refresh della dashboard
            navigation.goBack();
            // Notifica la dashboard che le impostazioni sono cambiate
            if (navigation.state?.routeName !== 'NetCalculationSettings') {
              navigation.navigate('Dashboard', { refreshCalculations: true });
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
      console.error('Error saving net calculation settings:', error);
    }
  };

  const preview = getPreviewCalculation();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Calcolo Netto</Text>
          <View style={{ width: 24 }} />
        </View>

      {/* Descrizione */}
      <View style={styles.section}>
        <Text style={styles.description}>
          Scegli come calcolare il netto dello stipendio nella dashboard
        </Text>
      </View>

      {/* Metodi di calcolo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metodo di Calcolo</Text>
        
        {/* Opzione IRPEF */}
        <TouchableOpacity
          style={[styles.option, method === 'irpef' && styles.selectedOption]}
          onPress={() => setMethod('irpef')}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="calculator" 
                size={24} 
                color={method === 'irpef' ? '#007AFF' : '#666'} 
              />
              <Text style={[styles.optionTitle, method === 'irpef' && styles.selectedText]}>
                Aliquote IRPEF Reali
              </Text>
            </View>
            <Text style={styles.optionDescription}>
              Calcolo basato su aliquote IRPEF 2025, contributi INPS e addizionali regionali/comunali
            </Text>
            <View style={styles.features}>
              <Text style={styles.feature}>• Aliquote IRPEF a scaglioni (23%, 35%, 43%)</Text>
              <Text style={styles.feature}>• Contributi INPS 9.87%</Text>
              <Text style={styles.feature}>• Addizionali regionali/comunali ~2.5%</Text>
              <Text style={styles.feature}>• Detrazioni standard automatiche</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Opzione Personalizzata */}
        <TouchableOpacity
          style={[styles.option, method === 'custom' && styles.selectedOption]}
          onPress={() => setMethod('custom')}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Ionicons 
                name="settings" 
                size={24} 
                color={method === 'custom' ? '#007AFF' : '#666'} 
              />
              <Text style={[styles.optionTitle, method === 'custom' && styles.selectedText]}>
                Percentuale Personalizzata
              </Text>
            </View>
            <Text style={styles.optionDescription}>
              Usa una percentuale fissa di trattenute basata sui tuoi dati reali
            </Text>
          </View>
        </TouchableOpacity>

        {/* Input percentuale personalizzata */}
        {method === 'custom' && (
          <View style={styles.customInput}>
            <Text style={styles.inputLabel}>Percentuale Trattenute (%)</Text>
            <TextInput
              style={styles.textInput}
              value={customPercentage}
              onChangeText={setCustomPercentage}
              keyboardType="numeric"
              placeholder="25"
              maxLength={5}
            />
            <Text style={styles.inputHelp}>
              Esempio: se dal lordo €2,839 ricevi netto €2,122, la percentuale è circa 25%
            </Text>
          </View>
        )}
      </View>

      {/* Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anteprima</Text>
        <View style={styles.preview}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Stipendio Lordo:</Text>
            <Text style={styles.previewValue}>€{previewAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Trattenute:</Text>
            <Text style={styles.previewValue}>
              €{preview.totalDeductions.toFixed(2)} ({(preview.deductionRate * 100).toFixed(1)}%)
            </Text>
          </View>
          <View style={[styles.previewRow, styles.netRow]}>
            <Text style={styles.netLabel}>Stipendio Netto:</Text>
            <Text style={styles.netValue}>€{preview.net.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Info IRPEF */}
      {method === 'irpef' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dettagli Calcolo IRPEF</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Il calcolo utilizza le aliquote IRPEF ufficiali 2025:
            </Text>
            <Text style={styles.bracket}>• 0-28.000€: 23%</Text>
            <Text style={styles.bracket}>• 28.000-50.000€: 35%</Text>
            <Text style={styles.bracket}>• Oltre 50.000€: 43%</Text>
            <Text style={styles.infoText}>
              + Contributi INPS dipendente (9.87%)
            </Text>
            <Text style={styles.infoText}>
              + Addizionali regionali/comunali (~2.5%)
            </Text>
            <Text style={styles.infoText}>
              - Detrazioni lavoro dipendente
            </Text>
          </View>
        </View>
      )}
      </ScrollView>
      
      {/* Pulsante Salva in basso */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  bottomSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  option: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionContent: {
    
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  selectedText: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  features: {
    paddingLeft: 8,
  },
  feature: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },
  customInput: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  inputHelp: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  preview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  netValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bracket: {
    fontSize: 13,
    color: '#007AFF',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
});

export default NetCalculationSettingsScreen;
