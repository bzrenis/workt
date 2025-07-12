import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';

const DEFAULT_ALLOWANCE = 15.00;

const TravelAllowanceSettings = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [enabled, setEnabled] = useState(settings.travelAllowance?.enabled || false);
  const [dailyAmount, setDailyAmount] = useState(settings.travelAllowance?.dailyAmount?.toString() || DEFAULT_ALLOWANCE.toString());
  const [autoActivate, setAutoActivate] = useState(settings.travelAllowance?.autoActivate || false);
  const [applyOnSpecialDays, setApplyOnSpecialDays] = useState(settings.travelAllowance?.applyOnSpecialDays || false);
  // Opzioni di attivazione indennità
  const options = [
    { key: 'WITH_TRAVEL', label: 'Solo se presenti ore di viaggio', group: 'base' },
    { key: 'ALWAYS', label: 'Sempre, anche senza viaggio', group: 'base' },
    { key: 'FULL_DAY_ONLY', label: 'Solo se giornata lavorativa completa', group: 'day' },
    { key: 'ALSO_ON_STANDBY', label: 'Anche nei giorni reperibili non lavorativi con intervento', group: 'extra' },
    { key: 'FULL_ALLOWANCE_HALF_DAY', label: 'Tariffa piena anche con mezza giornata', group: 'amount' },
    { key: 'HALF_ALLOWANCE_HALF_DAY', label: 'Metà indennità se mezza giornata', group: 'amount' },
  ];

  // Permetti selezione multipla, ma solo una per gruppo base e amount
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const initial = settings.travelAllowance?.selectedOptions || ['WITH_TRAVEL'];
    return Array.isArray(initial) ? initial : [initial];
  });

  const handleOptionToggle = (key, group) => {
    setSelectedOptions(prev => {
      let filtered = prev.filter(optKey => {
        // Solo una per gruppo base e amount
        if (group === 'base') return options.find(o => o.key === optKey)?.group !== 'base';
        if (group === 'amount') return options.find(o => o.key === optKey)?.group !== 'amount';
        return true;
      });
      if (!prev.includes(key)) filtered.push(key);
      return filtered;
    });
  };

  useEffect(() => {
    setEnabled(settings.travelAllowance?.enabled || false);
    setDailyAmount(settings.travelAllowance?.dailyAmount?.toString() || DEFAULT_ALLOWANCE.toString());
    setAutoActivate(settings.travelAllowance?.autoActivate || false);
    setApplyOnSpecialDays(settings.travelAllowance?.applyOnSpecialDays || false);
    setSelectedOptions(settings.travelAllowance?.selectedOptions || ['WITH_TRAVEL']);
  }, [settings]);

  const handleSave = async () => {
    try {
      await updatePartialSettings({
        travelAllowance: {
          enabled,
          dailyAmount: parseFloat(dailyAmount) || 0,
          autoActivate,
          applyOnSpecialDays,
          selectedOptions
        }
      });
      Alert.alert('Successo', 'Impostazioni indennità trasferta salvate', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Ionicons name="business" size={28} color="#607D8B" style={{marginRight:8}} />
          <Text style={styles.headerTitle}>Indennità Trasferta</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Attiva indennità trasferta</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#ccc', true: '#607D8B' }}
              thumbColor={enabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          {enabled && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Importo giornaliero</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={dailyAmount}
                    onChangeText={setDailyAmount}
                    placeholder="15.00"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Attivazione automatica</Text>
                <Switch
                  value={autoActivate}
                  onValueChange={setAutoActivate}
                  trackColor={{ false: '#ccc', true: '#607D8B' }}
                  thumbColor={autoActivate ? '#fff' : '#f4f3f4'}
                />
                <Text style={styles.inputHelp}>
                  Se attivo, l'indennità viene applicata automaticamente nei giorni con viaggio.
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Applica nei giorni speciali</Text>
                <Switch
                  value={applyOnSpecialDays}
                  onValueChange={setApplyOnSpecialDays}
                  trackColor={{ false: '#ccc', true: '#607D8B' }}
                  thumbColor={applyOnSpecialDays ? '#fff' : '#f4f3f4'}
                />
                <Text style={styles.inputHelp}>
                  Se attivo, l'indennità viene applicata anche nei giorni speciali (sabato, domenica e festivi).
                  Normalmente secondo CCNL, nei giorni domenicali e festivi l'indennità di trasferta non viene applicata.
                </Text>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Regole di attivazione</Text>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.optionRow, selectedOptions.includes(opt.key) && styles.selectedOption]}
                    onPress={() => handleOptionToggle(opt.key, opt.group)}
                  >
                    <Ionicons name={selectedOptions.includes(opt.key) ? 'checkbox' : 'square-outline'} size={20} color={selectedOptions.includes(opt.key) ? '#607D8B' : '#aaa'} style={{marginRight:8}} />
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#607D8B" style={{marginRight:4}} />
          <Text style={styles.infoText}>
            L'indennità trasferta è un contributo giornaliero previsto dal CCNL o da accordi aziendali. Puoi scegliere quando attivarla: solo con viaggio, sempre, anche nei giorni reperibili con intervento, e se pagare metà o l'intero importo in caso di mezza giornata lavorata.
          </Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Salva Impostazioni</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#607D8B' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, margin: 16, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e3eafc' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#607D8B' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 15, fontWeight: 'bold', color: '#607D8B', marginBottom: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 8 },
  textInput: { flex: 1, height: 40, fontSize: 16, color: '#222' },
  inputSuffix: { fontSize: 16, color: '#607D8B', marginLeft: 4 },
  inputHelp: { fontSize: 12, color: '#888', marginTop: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  selectedOption: { backgroundColor: '#e3eafc', borderRadius: 6 },
  optionLabel: { fontSize: 15, color: '#222' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f0f4ff', borderRadius: 8, padding: 10, margin: 16 },
  infoText: { fontSize: 13, color: '#607D8B', flex: 1 },
  saveButton: { backgroundColor: '#607D8B', borderRadius: 8, padding: 14, margin: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default TravelAllowanceSettings;
