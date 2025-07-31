import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FadeInCard } from '../components/AnimatedComponents';
import { useTheme } from '../contexts/ThemeContext';

// Importa la versione dell'app dal package.json
import { version } from '../../package.json';
import { expo } from '../../app.json';

const AppInfoScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const changelog = [
    {
      version: '1.0.9',
      date: '27 Luglio 2025',
      changes: [
        'Miglioramenti alla dashboard con giorni non ordinari',
        'Separazione giorni lavorativi per tipologia (sabato, domenica, festivi)',
        'Aggiornamento interfaccia menu impostazioni',
        'Rimozione voci di test e debug dal menu',
        'Miglioramenti alla visualizzazione delle card giornaliere',
        'Aggiornamento informazioni app con logo e versione corretti'
      ]
    },
    {
      version: '1.0.0',
      date: 'Luglio 2025',
      changes: [
        'Prima release stabile dell\'app',
        'Implementazione completa del calcolo CCNL Metalmeccanico PMI',
        'Sistema di tracciamento ore con maggiorazioni automatiche',
        'Gestione reperibilità e indennità trasferta',
        'Calcolo automatico rimborsi pasti',
        'Dashboard completa con breakdown dettagliati',
        'Sistema di backup e ripristino dati',
        'Notifiche e promemoria configurabili'
      ]
    }
  ];

  const features = [
    {
      icon: 'clock-time-eight',
      title: 'Tracciamento Ore Preciso',
      description: 'Registra orari di lavoro, viaggi e pause con precisione al minuto'
    },
    {
      icon: 'calculator-variant',
      title: 'Calcoli CCNL Conformi',
      description: 'Calcoli automatici secondo CCNL Metalmeccanico PMI con maggiorazioni corrette'
    },
    {
      icon: 'phone-in-talk',
      title: 'Gestione Reperibilità',
      description: 'Calendario reperibilità con indennità automatiche e notifiche'
    },
    {
      icon: 'car-clock',
      title: 'Ore di Viaggio',
      description: 'Calcolo automatico ore viaggio con tariffe configurabili'
    },
    {
      icon: 'food-fork-drink',
      title: 'Rimborsi Pasti',
      description: 'Gestione automatica buoni pasto e rimborsi in contanti'
    },
    {
      icon: 'chart-line',
      title: 'Dashboard Avanzata',
      description: 'Analisi dettagliate con breakdown ore, guadagni e pattern lavorativi'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Info App</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header App Info */}
        <FadeInCard style={[styles.appHeaderCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.appIconLarge}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.appIconLargeImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}>
            {expo.name}
          </Text>
          <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>
            Versione {expo.version}
          </Text>
          <Text style={[styles.appDescription, { color: theme.colors.textSecondary }]}>
            App professionale per il tracking delle ore di lavoro con calcoli automatici 
            conformi al CCNL Metalmeccanico PMI. I calcoli sono completamente personalizzabili 
            per adattarsi a diverse tipologie contrattuali. Gestione completa di orari, viaggi, 
            reperibilità e indennità con dashboard avanzate per l'analisi dei dati.
          </Text>
        </FadeInCard>

        {/* Caratteristiche Principali */}
        <FadeInCard delay={100} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Caratteristiche Principali
          </Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <MaterialCommunityIcons name={feature.icon} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </FadeInCard>

        {/* Cronologia Aggiornamenti */}
        <FadeInCard delay={200} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Cronologia Aggiornamenti
          </Text>
          {changelog.map((release, index) => (
            <View key={index} style={styles.changelogItem}>
              <View style={styles.changelogHeader}>
                <Text style={[styles.changelogVersion, { color: theme.colors.primary }]}>
                  v{release.version}
                </Text>
                <Text style={[styles.changelogDate, { color: theme.colors.textSecondary }]}>
                  {release.date}
                </Text>
              </View>
              <View style={styles.changelogChanges}>
                {release.changes.map((change, changeIndex) => (
                  <View key={changeIndex} style={styles.changeItem}>
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={16} 
                      color={theme.colors.success} 
                      style={styles.changeIcon}
                    />
                    <Text style={[styles.changeText, { color: theme.colors.textSecondary }]}>
                      {change}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </FadeInCard>

        {/* Informazioni Legali */}
        <FadeInCard delay={300} style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Informazioni
          </Text>
          <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>
            Quest'app è progettata per assistere nel tracciamento delle ore di lavoro e nel calcolo 
            delle retribuzioni secondo il CCNL Metalmeccanico PMI. I calcoli sono indicativi e 
            potrebbero non riflettere situazioni contrattuali specifiche. Si consiglia sempre di 
            verificare con il proprio ufficio paghe.
          </Text>
          
          <View style={styles.contactSection}>
            <Text style={[styles.contactTitle, { color: theme.colors.text }]}>
              Sviluppato da
            </Text>
            <Text style={[styles.contactText, { color: theme.colors.textSecondary }]}>
              Team WorkT
            </Text>
          </View>
        </FadeInCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  appHeaderCard: {
    marginTop: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appIconLarge: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIconLargeImage: {
    width: 150,
    height: 150,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  appDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  changelogItem: {
    marginBottom: 20,
  },
  changelogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changelogVersion: {
    fontSize: 18,
    fontWeight: '700',
  },
  changelogDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  changelogChanges: {
    paddingLeft: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  changeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  changeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  legalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  contactSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
  },
});

export default AppInfoScreen;
