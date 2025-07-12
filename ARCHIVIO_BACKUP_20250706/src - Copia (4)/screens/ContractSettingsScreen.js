import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../hooks';
import { CCNL_CONTRACTS } from '../constants';
import { formatCurrency } from '../utils';
import { FIXED_HOLIDAYS, getEasterHolidays, isItalianHoliday } from '../constants/holidays';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';

const CONTRACT_OPTIONS = [
  { key: 'METALMECCANICO_PMI_L5', label: 'Metalmeccanico PMI Livello 5', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L5 },
  { key: 'METALMECCANICO_PMI_L3', label: 'Metalmeccanico PMI Livello 3', contract: CCNL_CONTRACTS.METALMECCANICO_PMI_L3 },
  // Aggiungi qui altri contratti se disponibili
];

// URL di esempio per download contratti CCNL
const DEFAULT_CONTRACT_URLS = [
  // Vuoto: nessun URL fasullo, l'utente può aggiungere i propri
];

const ContractSettingsScreen = ({ navigation }) => {
  const { settings, updatePartialSettings, isLoading } = useSettings();
  const [formData, setFormData] = useState({
    monthlySalary: '',
    travelCompensationRate: '',
  });
  const [calculatedRates, setCalculatedRates] = useState(null);

  // Mostra elenco festivi nazionali
  const [holidays, setHolidays] = useState([]);
  useEffect(() => {
    const year = new Date().getFullYear();
    const easter = getEasterHolidays(year);
    setHolidays([
      ...FIXED_HOLIDAYS.map(d => `${year}-${d}`),
      ...easter
    ]);
  }, []);

  const [selectedContractKey, setSelectedContractKey] = useState(settings.contract?.key || 'METALMECCANICO_PMI_L5');
  const [contractError, setContractError] = useState(null);
  const [showHolidays, setShowHolidays] = useState(false);

  // Funzione di normalizzazione salary
  const getSafeSalary = (salary) => {
    const parsed = typeof salary === 'string' ? parseFloat(salary) : salary;
    return (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0)
      ? parsed
      : CCNL_CONTRACTS.METALMECCANICO_PMI_L5.monthlySalary;
  };

  // In fase di inizializzazione, normalizza sempre e fallback sicuro
  useEffect(() => {
    let contract = settings.contract;
    if (!validateContract(contract)) {
      setContractError('Contratto CCNL non valido o corrotto. Verrà usato il contratto di default.');
      contract = CCNL_CONTRACTS.METALMECCANICO_PMI_L5;
    } else {
      setContractError(null);
    }
    const salary = getSafeSalary(contract.monthlySalary);
    setFormData({
      monthlySalary: salary.toString(),
      travelCompensationRate: (settings.travelCompensationRate * 100).toString(),
      saturdayBonus: contract.overtimeRates?.saturday ? ((contract.overtimeRates.saturday * 100 - 100).toString()) : '15',
    });
    calculateRates(salary);
  }, [settings]);
  const calculateRates = (monthlySalary) => {
    const monthly = parseFloat(monthlySalary);
    if (isNaN(monthly) || monthly <= 0) {
      setCalculatedRates(null);
      return;
    }

    // Calcoli CCNL ufficiali
    const dailyRate = monthly / 26; // 26 giorni lavorativi standard
    const officialHourlyRate = monthly / 173; // 173 ore mensili CCNL Metalmeccanico
    const overtimeDay = officialHourlyRate * 1.20; // Straordinario diurno +20%
    const overtimeNightUntil22 = officialHourlyRate * 1.25; // Straordinario notturno fino alle 22 +25%
    const overtimeNightAfter22 = officialHourlyRate * 1.35; // Straordinario notturno dopo le 22 +35%
    const overtimeHoliday = officialHourlyRate * 1.50; // Straordinario festivo +50%
    const overtimeSunday = officialHourlyRate * 1.50; // Straordinario domenicale +50%
    const ordinaryNight = officialHourlyRate * 1.25; // Lavoro ordinario notturno +25%
    const ordinaryHoliday = officialHourlyRate * 1.30; // Lavoro ordinario festivo +30%
    const ordinarySunday = officialHourlyRate * 1.30; // Lavoro ordinario domenicale +30%
    const ordinaryNightHoliday = officialHourlyRate * 1.60; // Lavoro ordinario notturno festivo +60%

    setCalculatedRates({
      monthlySalary: monthly,
      dailyRate,
      officialHourlyRate,
      overtimeDay,
      overtimeNightUntil22,
      overtimeNightAfter22,
      overtimeHoliday,
      overtimeSunday,
      ordinaryNight,
      ordinaryHoliday,
      ordinarySunday,
      ordinaryNightHoliday,
    });
  };

  const handleMonthlySalaryChange = (value) => {
    const salary = getSafeSalary(value);
    setFormData(prev => ({ ...prev, monthlySalary: value }));
    calculateRates(salary);
  };

  const handleSave = async () => {
    try {
      const monthlySalary = getSafeSalary(formData.monthlySalary);
      const travelRate = parseFloat(formData.travelCompensationRate) / 100;
      const saturdayBonus = typeof formData.saturdayBonus === 'string' ? parseFloat(formData.saturdayBonus.replace(',', '.')) : 15;

      if (isNaN(monthlySalary) || monthlySalary <= 0) {
        Alert.alert('Errore', 'Inserisci una retribuzione mensile valida');
        return;
      }
      if (isNaN(travelRate) || travelRate < 0 || travelRate > 2) {
        Alert.alert('Errore', 'Inserisci una percentuale di retribuzione viaggio valida (0-200)');
        return;
      }

      // Prendi il template del contratto base
      const selectedContractTemplate = CONTRACT_OPTIONS.find(opt => opt.key === selectedContractKey)?.contract || CCNL_CONTRACTS.METALMECCANICO_PMI_L5;

      // Crea l'oggetto contratto aggiornato con i dati del form e i tassi calcolati
      const updatedContract = {
        ...selectedContractTemplate,
        key: selectedContractKey,
        monthlySalary: monthlySalary,
        dailyRate: calculatedRates?.dailyRate || (monthlySalary / 26),
        hourlyRate: calculatedRates?.officialHourlyRate || (monthlySalary / 173),
        overtimeRates: {
          ...selectedContractTemplate.overtimeRates,
          saturday: 1 + (isNaN(saturdayBonus) ? 0.15 : saturdayBonus / 100),
        },
        bonusRates: bonusRates,
      };

      await updatePartialSettings({
        contract: updatedContract,
        travelCompensationRate: travelRate,
      });

      Alert.alert('Successo', 'Impostazioni contratto salvate correttamente', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving contract settings:', error);
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  // Personalizzazione maggiorazioni CCNL
  const [showBonusSettings, setShowBonusSettings] = useState(false);
  const [bonusRates, setBonusRates] = useState({
    overtimeDay: 20,
    overtimeNight: 50,
    overtimeHoliday: 50,
    overtimeSunday: 50,
    ordinaryNight: 25,
    ordinaryHoliday: 30,
    ordinarySunday: 30,
    ordinaryNightHoliday: 60
  });
  useEffect(() => {
    if (settings.contract?.bonusRates) {
      setBonusRates(settings.contract.bonusRates);
    }
  }, [settings]);

  const [customContracts, setCustomContracts] = useState([]);
  const [urlInput, setUrlInput] = useState('');

  // Funzione di validazione contratto aggiornata e più difensiva
  const validateContract = (contract) => {
    if (!contract || typeof contract !== 'object') return false;
    // Accetta sia number che stringa numerica
    const salary = contract.hasOwnProperty('monthlySalary') ? (typeof contract.monthlySalary === 'string' ? parseFloat(contract.monthlySalary) : contract.monthlySalary) : undefined;
    if (typeof salary !== 'number' || isNaN(salary) || salary <= 0) return false;
    if (!contract.overtimeRates || typeof contract.overtimeRates !== 'object') return false;
    return true;
  };

  // Funzione per importare contratto da file locale
  const handleImportContractFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.type === 'success') {
        const content = await FileSystem.readAsStringAsync(result.uri);
        const contract = JSON.parse(content);
        if (!validateContract(contract)) {
          Alert.alert('Errore', 'Il contratto importato non è valido. Verifica che tutti i campi obbligatori siano presenti (es. retribuzione mensile, maggiorazioni, ecc.).');
          return;
        }
        setCustomContracts(prev => [...prev, contract]);
        Alert.alert('Contratto importato', 'Il nuovo contratto è stato aggiunto!');
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile importare il contratto.');
    }
  };
  // Funzione per importare contratto da URL
  const handleImportContractFromUrl = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download fallito');
      const contract = await response.json();
      if (!validateContract(contract)) {
        Alert.alert('Errore', 'Il contratto scaricato non è valido. Verifica che tutti i campi obbligatori siano presenti (es. retribuzione mensile, maggiorazioni, ecc.).');
        return;
      }
      setCustomContracts(prev => [...prev, contract]);
      Alert.alert('Contratto importato', 'Il nuovo contratto è stato aggiunto!');
    } catch (e) {
      Alert.alert('Errore', 'Impossibile scaricare il contratto da URL.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  if (contractError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:32}}>
          <Text style={{color:'red',fontWeight:'bold',fontSize:18,marginBottom:12}}>ERRORE CONTRATTO</Text>
          <Text style={{color:'#333',fontSize:16,textAlign:'center'}}>{contractError}</Text>
          <Text style={{color:'#666',fontSize:14,marginTop:16}}>Prova a reimpostare le impostazioni o a importare un contratto valido.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contratto CCNL</Text>
          <Text style={styles.headerSubtitle}>
            Configura la retribuzione e le tariffe automatiche
          </Text>
        </View>

        {/* Miglioro la visuale della selezione contratto */}
        <View style={{backgroundColor:'#fff',borderRadius:12,padding:18,margin:15,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:4,elevation:2}}>
          <Text style={{fontWeight:'bold',fontSize:17,marginBottom:8,color:'#222',paddingLeft:2}}>Tipo di contratto</Text>
          <View style={{borderWidth:1,borderColor:'#e0e0e0',borderRadius:8,backgroundColor:'#f9f9f9',marginBottom:16,overflow:'hidden',minHeight:56,justifyContent:'center',paddingVertical:2}}>
            <Picker
              selectedValue={selectedContractKey}
              onValueChange={(itemValue) => {
                const opt = CONTRACT_OPTIONS.find(opt => opt.key === itemValue);
                const salary = getSafeSalary(opt?.contract?.monthlySalary);
                setSelectedContractKey(itemValue);
                setFormData(prev => ({ ...prev, monthlySalary: salary.toString() }));
                calculateRates(salary);
              }}
              style={{height: 52, width: '100%', fontSize: 17, lineHeight: 22, textAlignVertical: 'center'}} // height/fontSize/lineHeight migliorati
              itemStyle={{fontSize:17, color:'#222'}} // font più grande
              numberOfLines={1}
            >
              {CONTRACT_OPTIONS.map(opt => (
                <Picker.Item key={opt.key} label={opt.label.length > 32 ? opt.label.slice(0,32)+'…' : opt.label} value={opt.key} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Retribuzione Mensile *
              <Text style={{fontWeight:'normal',color:'#1976d2'}}>  ({CONTRACT_OPTIONS.find(opt=>opt.key===selectedContractKey)?.label})</Text>
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.monthlySalary}
                onChangeText={handleMonthlySalaryChange}
                placeholder="2839.07"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.inputSuffix}>€</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Retribuzione Viaggio</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.travelCompensationRate}
                onChangeText={(value) => setFormData(prev => ({ ...prev, travelCompensationRate: value }))}
                placeholder="100"
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.inputSuffix}>%</Text>
            </View>
            <Text style={styles.inputHelp}>
              Percentuale della retribuzione oraria per le ore di viaggio
            </Text>
          </View>
        </View>

        {/* Tariffe CCNL calcolate e difensive */}
        {calculatedRates && typeof calculatedRates.monthlySalary === 'number' && !isNaN(calculatedRates.monthlySalary) ? (
          <View style={styles.calculatedRatesContainer}>
            <Text style={styles.sectionTitle}>Dettaglio Tariffe CCNL</Text>
            <View style={styles.rateCard}>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Retribuzione Mensile</Text>
                <Text style={styles.rateValue}>{formatCurrency(calculatedRates.monthlySalary)}</Text>
              </View>
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel}>Retribuzione Giornaliera</Text>
                <Text style={styles.rateValue}>{formatCurrency(calculatedRates.dailyRate)}</Text>
              </View>
              <Text style={{fontSize:12, color:'#666', marginBottom:8, marginLeft:4}}>
                Calcolo: mensile / 26 = {formatCurrency(calculatedRates.monthlySalary)} / 26 = {formatCurrency(calculatedRates.dailyRate)}
              </Text>
              <View style={styles.rateRow}>
                <Text style={[styles.rateLabel, {color: '#2196F3'}]}>Retribuzione Oraria Ufficiale CCNL</Text>
                <Text style={[styles.rateValue, {color: '#2196F3'}]}>{formatCurrency(calculatedRates.officialHourlyRate)}</Text>
              </View>
              <Text style={{fontSize:12, color:'#2196F3', marginBottom:8, marginLeft:4}}>
                Calcolo: mensile / 173 = {formatCurrency(calculatedRates.monthlySalary)} / 173 = {formatCurrency(calculatedRates.officialHourlyRate)}
              </Text>
              <View style={{marginTop:10}}>
                <Text style={{fontWeight:'bold', fontSize:15, marginBottom:4}}>Tabella Maggiorazioni CCNL</Text>
                <View style={{borderWidth:1, borderColor:'#e0e0e0', borderRadius:8, marginBottom:8}}>
                  {/* Tabella maggiorazioni, sempre difensiva */}
                  {['overtimeDay','overtimeNightUntil22','overtimeNightAfter22','overtimeHoliday','overtimeSunday','ordinaryNight','ordinaryHoliday','ordinarySunday','ordinaryNightHoliday'].every(k => typeof calculatedRates[k] === 'number') ? (
                    <>
                      <View style={{flexDirection:'row', padding:4, backgroundColor:'#f0f4ff'}}>
                        <Text style={{flex:2, fontWeight:'bold'}}>Tipo</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right'}}>Maggiorazione</Text>
                        <Text style={{flex:1, fontWeight:'bold', textAlign:'right'}}>Valore</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2}}>Straordinario diurno</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+20%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.overtimeDay)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor:'#f9f9f9'}}>
                        <Text style={{flex:2}}>Lavoro ordinario notturno (fino alle 22)</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+25%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.overtimeNightUntil22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2}}>Lavoro ordinario notturno (dopo le 22)</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+35%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.overtimeNightAfter22)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor:'#f9f9f9'}}>
                        <Text style={{flex:2}}>Straordinario festivo</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+50%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.overtimeHoliday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2}}>Straordinario domenicale</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+50%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.overtimeSunday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor:'#f9f9f9'}}>
                        <Text style={{flex:2}}>Lavoro ordinario festivo</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+30%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.ordinaryHoliday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4}}>
                        <Text style={{flex:2}}>Lavoro ordinario domenicale</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+30%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.ordinarySunday)}</Text>
                      </View>
                      <View style={{flexDirection:'row', padding:4, backgroundColor:'#f9f9f9'}}>
                        <Text style={{flex:2}}>Lavoro ordinario notturno festivo</Text>
                        <Text style={{flex:1, textAlign:'right'}}>+60%</Text>
                        <Text style={{flex:1, textAlign:'right'}}>{formatCurrency(calculatedRates.ordinaryNightHoliday)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={{padding:8}}>
                      <Text style={{color:'red'}}>Dati maggiorazioni non disponibili o corrotti.</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{marginTop: 10, backgroundColor: '#f0f4ff', borderRadius: 8, padding: 10}}>
                <Text style={{fontSize: 13, color: '#333', fontWeight: 'bold'}}>Nota:</Text>
                <Text style={{fontSize: 13, color: '#333'}}>
                  Le maggiorazioni CCNL Metalmeccanico PMI sono: straordinario diurno +20%, notturno +50%, festivo +50%, domenicale +50%, lavoro ordinario notturno +25%, festivo +30%, domenicale +30%, notturno festivo +60%. La retribuzione oraria ufficiale si calcola come mensile diviso 173 ore (fonte: CCNL Metalmeccanico, FIM-CISL, UILM, busta paga reale).
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{margin:15,backgroundColor:'#fff3f3',borderRadius:8,padding:16}}>
            <Text style={{color:'red',fontWeight:'bold'}}>Dati contratto non validi o incompleti. Impossibile calcolare le tariffe CCNL.</Text>
            <Text style={{color:'#333',marginTop:8}}>Verifica la retribuzione mensile e riprova.</Text>
          </View>
        )}

        {/* Festivi nazionali in menu a parte */}
        <TouchableOpacity onPress={()=>setShowHolidays(v=>!v)} style={{marginTop:16,alignSelf:'flex-start'}}>
          <Text style={{fontWeight:'bold',color:'#1976d2'}}>Mostra/chiudi festività nazionali riconosciute automaticamente</Text>
        </TouchableOpacity>
        {showHolidays && (
          <View style={{marginTop:8,backgroundColor:'#f9f9f9',borderRadius:8,padding:12}}>
            {holidays.map(h => <Text key={h} style={{fontSize:13}}>{h}</Text>)}
          </View>
        )}

        {/* Personalizzazione maggiorazioni CCNL */}
        <TouchableOpacity onPress={()=>setShowBonusSettings(v=>!v)} style={{marginVertical:12,alignSelf:'flex-end'}}>
          <Text style={{color:'#1976d2',fontWeight:'bold'}}>Personalizza maggiorazioni CCNL</Text>
        </TouchableOpacity>
        {showBonusSettings && (
          <View style={{backgroundColor:'#f9f9f9',padding:10,borderRadius:8,marginBottom:12}}>
            {/* Campo sabato */}
            <View key="saturday" style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
              <Text style={{flex:2}}>Sabato</Text>
              <TextInput
                style={{flex:1,borderWidth:1,borderColor:'#ddd',borderRadius:4,padding:4,marginLeft:8}}
                value={formData.saturdayBonus}
                keyboardType="numeric"
                onChangeText={v=>setFormData(prev=>({...prev, saturdayBonus: v}))}
              />
              <Text style={{marginLeft:4}}>%</Text>
            </View>
            {Object.entries(bonusRates).map(([key, value]) => (
              <View key={key} style={{flexDirection:'row',alignItems:'center',marginBottom:6}}>
                <Text style={{flex:2}}>{
                  key === 'overtimeDay' ? 'Straordinario diurno'
                  : key === 'overtimeNight' ? 'Straordinario notturno'
                  : key === 'overtimeHoliday' ? 'Straordinario festivo'
                  : key === 'overtimeSunday' ? 'Straordinario domenicale'
                  : key === 'ordinaryNight' ? 'Ordinario notturno'
                  : key === 'ordinaryHoliday' ? 'Ordinario festivo'
                  : key === 'ordinarySunday' ? 'Ordinario domenicale'
                  : key === 'ordinaryNightHoliday' ? 'Ordinario notturno festivo'
                  : key
                }</Text>
                <TextInput
                  style={{flex:1,borderWidth:1,borderColor:'#ddd',borderRadius:4,padding:4,marginLeft:8}}
                  value={value.toString()}
                  keyboardType="numeric"
                  onChangeText={v=>setBonusRates(prev=>({...prev,[key]:parseFloat(v)||0}))}
                />
                <Text style={{marginLeft:4}}>%</Text>
              </View>
            ))}
            <TouchableOpacity style={{marginTop:8,backgroundColor:'#1976d2',padding:8,borderRadius:6,alignSelf:'flex-end'}} onPress={async()=>{
              // Aggiorna anche la maggiorazione sabato nel contratto
              const saturdayBonus = typeof formData.saturdayBonus === 'string' ? parseFloat(formData.saturdayBonus.replace(',', '.')) : 15;
              await updatePartialSettings({ contract: { ...settings.contract, bonusRates, overtimeRates: { ...settings.contract.overtimeRates, saturday: 1 + (isNaN(saturdayBonus) ? 0.15 : saturdayBonus / 100) } } });
              setShowBonusSettings(false);
              Alert.alert('Salvato','Maggiorazioni personalizzate salvate!');
            }}>
              <Text style={{color:'white',fontWeight:'bold'}}>Salva maggiorazioni</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Importazione contratti */}
        <View style={{marginVertical:12}}>
          <TouchableOpacity onPress={handleImportContractFromFile} style={{backgroundColor:'#e3f2fd',padding:10,borderRadius:6,marginBottom:8}}>
            <Text style={{color:'#1976d2',fontWeight:'bold'}}>Importa contratto da file</Text>
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            <TextInput
              placeholder="Incolla URL contratto JSON"
              style={{flex:1,borderWidth:1,borderColor:'#ddd',borderRadius:4,padding:6,marginRight:8}}
              onChangeText={setUrlInput}
            />
            <TouchableOpacity onPress={()=>handleImportContractFromUrl(urlInput)} style={{backgroundColor:'#1976d2',padding:10,borderRadius:6}}>
              <Text style={{color:'white',fontWeight:'bold'}}>Scarica da URL</Text>
            </TouchableOpacity>
          </View>
          {DEFAULT_CONTRACT_URLS.length > 0 && (
            <View style={{marginBottom:8}}>
              <Text style={{fontSize:13, color:'#666', marginBottom:4}}>Oppure scegli un URL predefinito:</Text>
              {DEFAULT_CONTRACT_URLS.map(opt => (
                <TouchableOpacity key={opt.url} onPress={() => { setUrlInput(opt.url); handleImportContractFromUrl(opt.url); }} style={{backgroundColor:'#e3f2fd',padding:8,borderRadius:6,marginBottom:4}}>
                  <Text style={{color:'#1976d2'}}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, !calculatedRates && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={!calculatedRates}
        >
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
  contractInfo: {
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
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contractTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  contractDescription: {
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
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
  inputHelp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  calculatedRatesContainer: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  rateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rateLabel: {
    fontSize: 16,
    color: '#666',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  overtimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ContractSettingsScreen;
