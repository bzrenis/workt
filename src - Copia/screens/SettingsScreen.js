import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableAnimated, FadeInCard } from '../components/AnimatedComponents';

const { width } = Dimensions.get('window');

// Componente moderno per gli elementi delle impostazioni
const ModernSettingItem = ({ item, onPress, index }) => {
  return (
    <FadeInCard delay={index * 100} style={styles.modernSettingItem}>
      <PressableAnimated onPress={onPress} style={styles.settingPressable}>
        <View style={[styles.modernIconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon} size={28} color="white" />
        </View>
        <View style={styles.modernSettingContent}>
          <Text style={styles.modernSettingTitle}>{item.title}</Text>
          <Text style={styles.modernSettingSubtitle}>{item.subtitle}</Text>
        </View>
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={24} color="#c0c0c0" />
        </View>
      </PressableAnimated>
    </FadeInCard>
  );
};

// Header moderno con gradiente
const ModernHeader = () => (
  <FadeInCard style={styles.modernHeader}>
    <View style={styles.headerContent}>
      <View style={styles.headerIcon}>
        <MaterialCommunityIcons name="cog" size={32} color="#2196F3" />
      </View>
      <Text style={styles.modernHeaderTitle}>Impostazioni</Text>
      <Text style={styles.modernHeaderSubtitle}>
        Configura i parametri per il calcolo automatico delle retribuzioni
      </Text>
    </View>
  </FadeInCard>
);

const SettingsScreen = ({ navigation }) => {
  const settingsOptions = [
    {
      title: 'Contratto CCNL',
      subtitle: 'Configurazione retribuzioni e tariffe',
      icon: 'file-document-edit',
      screen: 'ContractSettings',
      color: '#2196F3'
    },
    {
      title: 'Calcolo Netto',
      subtitle: 'Trattenute fiscali e calcolo netto',
      icon: 'calculator-variant',
      screen: 'NetCalculationSettings',
      color: '#1a73e8'
    },
    {
      title: 'Ore di Viaggio',
      subtitle: 'Modalità di calcolo ore viaggio',
      icon: 'car-clock',
      screen: 'TravelSettings',
      color: '#FF9800'
    },
    {
      title: 'Reperibilità',
      subtitle: 'Indennità e calendario reperibilità',
      icon: 'phone-in-talk',
      screen: 'StandbySettings',
      color: '#9C27B0'
    },
    {
      title: 'Indennità Trasferta',
      subtitle: 'Contributi giornalieri trasferta',
      icon: 'briefcase-variant',
      screen: 'TravelAllowanceSettings',
      color: '#607D8B'
    },
    {
      title: 'Rimborsi Pasti',
      subtitle: 'Buoni pasto e rimborsi',
      icon: 'food-fork-drink',
      screen: 'MealSettings',
      color: '#4CAF50'
    },
    {
      title: 'Backup e Ripristino',
      subtitle: 'Salvataggio e ripristino dati',
      icon: 'cloud-sync',
      screen: 'Backup',
      color: '#F44336'
    }
  ];

  return (
    <SafeAreaView style={styles.modernContainer}>
      <ScrollView style={styles.modernScrollView} showsVerticalScrollIndicator={false}>
        <ModernHeader />

        <View style={styles.modernSettingsContainer}>
          {settingsOptions.map((item, index) => (
            <ModernSettingItem
              key={item.screen}
              item={item}
              index={index}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>

        <FadeInCard delay={700} style={styles.modernFooter}>
          <View style={styles.footerContent}>
            <MaterialCommunityIcons name="information" size={24} color="#2196F3" />
            <Text style={styles.modernFooterText}>WorkTracker v1.0</Text>
            <Text style={styles.modernFooterSubtext}>
              App per il tracciamento ore di lavoro
            </Text>
          </View>
        </FadeInCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modernContainer: {
    flex: 1,
    backgroundColor: '#f8f9fb',
    paddingTop: 8, // Aggiunge spazio sotto la status bar
  },
  modernScrollView: {
    flex: 1,
  },
  modernHeader: {
    margin: 16,
    marginTop: 8, // Riduce il margine superiore per evitare sovrapposizioni
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modernHeaderSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  modernSettingsContainer: {
    paddingHorizontal: 16,
  },
  modernSettingItem: {
    marginBottom: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  modernIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modernSettingContent: {
    flex: 1,
    paddingRight: 12,
  },
  modernSettingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modernSettingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  chevronContainer: {
    padding: 4,
  },
  modernFooter: {
    margin: 16,
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  footerContent: {
    padding: 24,
    alignItems: 'center',
  },
  modernFooterText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  modernFooterSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Stili legacy mantenuti per compatibilità (se necessari)
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
