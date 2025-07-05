import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';

const MealSettingsScreen = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    lunch: {
      voucherAmount: '',
      cashAmount: '',
      autoActivate: true,
      startHour: '12:00', // nuovo campo orario inizio pranzo
      endHour: '14:00',   // nuovo campo orario fine pranzo
    },
    dinner: {
      voucherAmount: '',
      cashAmount: '',
      autoActivate: false,
      startHour: '19:00', // nuovo campo orario inizio cena
      endHour: '21:00',   // nuovo campo orario fine cena
      allowManualCash: false, // toggle per inserimento manuale cash cena
    }
  });

  useEffect(() => {
    if (settings.mealAllowances) {
      setFormData({
        lunch: {
          voucherAmount: settings.mealAllowances.lunch?.voucherAmount?.toString() || '',
          cashAmount: settings.mealAllowances.lunch?.cashAmount?.toString() || '',
          autoActivate: settings.mealAllowances.lunch?.autoActivate !== false,
          startHour: settings.mealAllowances.lunch?.startHour || '12:00',
          endHour: settings.mealAllowances.lunch?.endHour || '14:00',
        },
        dinner: {
          voucherAmount: settings.mealAllowances.dinner?.voucherAmount?.toString() || '',
          cashAmount: settings.mealAllowances.dinner?.cashAmount?.toString() || '',
          autoActivate: settings.mealAllowances.dinner?.autoActivate === true,
          startHour: settings.mealAllowances.dinner?.startHour || '19:00',
          endHour: settings.mealAllowances.dinner?.endHour || '21:00',
          allowManualCash: settings.mealAllowances.dinner?.allowManualCash === true,
        }
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const updatedMealAllowances = {
        lunch: {
          voucherAmount: parseFloat(formData.lunch.voucherAmount) || 0,
          cashAmount: parseFloat(formData.lunch.cashAmount) || 0,
          autoActivate: formData.lunch.autoActivate,
          startHour: formData.lunch.startHour,
          endHour: formData.lunch.endHour,
        },
        dinner: {
          voucherAmount: parseFloat(formData.dinner.voucherAmount) || 0,
          cashAmount: parseFloat(formData.dinner.cashAmount) || 0,
          autoActivate: formData.dinner.autoActivate,
          startHour: formData.dinner.startHour,
          endHour: formData.dinner.endHour,
          allowManualCash: formData.dinner.allowManualCash,
        }
      };

      await updatePartialSettings({
        mealAllowances: updatedMealAllowances
      });

      Alert.alert('Successo', 'Impostazioni rimborsi pasti salvate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving meal settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  const renderMealSection = (type, title, timeRange) => (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Ionicons 
          name={type === 'lunch' ? 'sunny' : 'moon'} 
          size={24} 
          color={type === 'lunch' ? '#FF9800' : '#3F51B5'} 
        />
        <Text style={styles.mealTitle}>{title}</Text>
        {/* Orari personalizzabili */}
        <View style={{flexDirection:'row',alignItems:'center',marginLeft:8}}>
          <Text style={{fontSize:13,color:'#666'}}>Orario:</Text>
          <TextInput
            style={[styles.textInput,{width:60,marginHorizontal:4,padding:4,fontSize:13}]}
            value={formData[type].startHour}
            onChangeText={value => setFormData(prev => ({...prev,[type]:{...prev[type],startHour:value}}))}
            placeholder={type==='lunch'?'12:00':'19:00'}
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={{fontSize:13,color:'#666'}}> - </Text>
          <TextInput
            style={[styles.textInput,{width:60,marginHorizontal:4,padding:4,fontSize:13}]}
            value={formData[type].endHour}
            onChangeText={value => setFormData(prev => ({...prev,[type]:{...prev[type],endHour:value}}))}
            placeholder={type==='lunch'?'14:00':'21:00'}
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountGroup}>
          <Text style={styles.amountLabel}>Buono Pasto</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={formData[type].voucherAmount}
              onChangeText={(value) => setFormData(prev => ({
                ...prev,
                [type]: { ...prev[type], voucherAmount: value }
              }))}
              placeholder="0.00"
              keyboardType="numeric"
              returnKeyType="next"
            />
            <Text style={styles.inputSuffix}>€</Text>
          </View>
        </View>

        <View style={styles.amountGroup}>
          <Text style={styles.amountLabel}>Rimborso Cash</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={formData[type].cashAmount}
              onChangeText={(value) => setFormData(prev => ({
                ...prev,
                [type]: { ...prev[type], cashAmount: value }
              }))}
              placeholder="0.00"
              keyboardType="numeric"
              returnKeyType="next"
            />
            <Text style={styles.inputSuffix}>€</Text>
          </View>
        </View>
      </View>

      <View style={styles.autoActivateRow}>
        <Text style={styles.autoActivateLabel}>Attivazione Automatica</Text>
        <Switch
          value={formData[type].autoActivate}
          onValueChange={(value) => setFormData(prev => ({
            ...prev,
            [type]: { ...prev[type], autoActivate: value }
          }))}
          trackColor={{ false: '#ccc', true: '#2196F3' }}
          thumbColor={formData[type].autoActivate ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Toggle inserimento manuale cash solo per cena */}
      {type === 'dinner' && (
        <View style={{flexDirection:'row',alignItems:'center',marginBottom:8}}>
          <Text style={{fontSize:15,color:'#333',flex:1}}>Permetti inserimento manuale rimborso cash</Text>
          <Switch
            value={formData.dinner.allowManualCash}
            onValueChange={value => setFormData(prev => ({...prev,dinner:{...prev.dinner,allowManualCash:value}}))}
            trackColor={{ false: '#ccc', true: '#2196F3' }}
            thumbColor={formData.dinner.allowManualCash ? '#fff' : '#f4f3f4'}
          />
        </View>
      )}

      <Text style={styles.autoActivateHelp}>
        {type === 'lunch' 
          ? 'Si attiva automaticamente se c\'è una pausa tra i turni in orario di pranzo'
          : 'Si attiva automaticamente se il lavoro si protrae in orario di cena'
        }
      </Text>
    </View>
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
          <Text style={styles.headerTitle}>Rimborsi Pasti</Text>
          <Text style={styles.headerSubtitle}>
            Configura buoni pasto e rimborsi per pranzo e cena
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoTitle}>Come funziona</Text>
          </View>
          <Text style={styles.infoText}>
            • I rimborsi pasti sono separati dal calcolo delle retribuzioni{'\n'}
            • Possono essere attivati automaticamente in base agli orari di lavoro{'\n'}
            • È possibile utilizzare sia buoni pasto che rimborsi in contanti
          </Text>
        </View>

        <View style={styles.formContainer}>
          {renderMealSection('lunch', 'Pranzo', '12:00 - 14:00')}
          
          <View style={styles.divider} />
          
          {renderMealSection('dinner', 'Cena', '19:00 - 21:00')}
        </View>

        <View style={styles.exampleContainer}>
          <Text style={styles.exampleTitle}>Esempi di Attivazione</Text>
          
          <View style={styles.exampleItem}>
            <Text style={styles.exampleLabel}>Pranzo:</Text>
            <Text style={styles.exampleText}>
              Lavoro 08:00-12:00, pausa 12:00-13:00, lavoro 13:00-17:00
            </Text>
          </View>
          
          <View style={styles.exampleItem}>
            <Text style={styles.exampleLabel}>Cena:</Text>
            <Text style={styles.exampleText}>
              Lavoro prolungato oltre le 19:00 o turno serale
            </Text>
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
  formContainer: {
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
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  mealTime: {
    fontSize: 14,
    color: '#666',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  amountGroup: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputSuffix: {
    paddingRight: 12,
    fontSize: 16,
    color: '#666',
  },
  autoActivateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoActivateLabel: {
    fontSize: 16,
    color: '#333',
  },
  autoActivateHelp: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  exampleContainer: {
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
  exampleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  exampleItem: {
    marginBottom: 12,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
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

export default MealSettingsScreen;
