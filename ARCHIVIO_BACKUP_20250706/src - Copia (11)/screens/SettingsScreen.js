import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const settingsOptions = [
    {
      title: 'Contratto CCNL',
      subtitle: 'Configurazione retribuzioni e tariffe',
      icon: 'document-text',
      screen: 'ContractSettings',
      color: '#2196F3'
    },
    {
      title: 'Ore di Viaggio',
      subtitle: 'Modalità di calcolo ore viaggio',
      icon: 'car',
      screen: 'TravelSettings',
      color: '#FF9800'
    },
    {
      title: 'Reperibilità',
      subtitle: 'Indennità e calendario reperibilità',
      icon: 'phone-portrait',
      screen: 'StandbySettings',
      color: '#9C27B0'
    },
    {
      title: 'Indennità Trasferta',
      subtitle: 'Contributi giornalieri trasferta',
      icon: 'business',
      screen: 'TravelAllowanceSettings',
      color: '#607D8B'
    },
    {
      title: 'Rimborsi Pasti',
      subtitle: 'Buoni pasto e rimborsi',
      icon: 'restaurant',
      screen: 'MealSettings',
      color: '#4CAF50'
    },
    {
      title: 'Backup e Ripristino',
      subtitle: 'Salvataggio e ripristino dati',
      icon: 'cloud-upload',
      screen: 'Backup',
      color: '#F44336'
    }
  ];

  const renderSettingItem = (item) => (
    <TouchableOpacity
      key={item.screen}
      style={styles.settingItem}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color="white" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Impostazioni</Text>
          <Text style={styles.headerSubtitle}>
            Configura i parametri per il calcolo automatico delle retribuzioni
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {settingsOptions.map(renderSettingItem)}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>WorkTracker v1.0</Text>
          <Text style={styles.footerSubtext}>
            App per il tracciamento ore di lavoro
          </Text>
        </View>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  settingsContainer: {
    padding: 15,
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default SettingsScreen;
