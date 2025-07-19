import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const ThemeSettingsScreen = ({ navigation }) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const styles = createStyles(theme);
  const [autoTheme, setAutoTheme] = useState(false);

  const themeOptions = [
    {
      id: 'light',
      name: 'Tema Chiaro',
      description: 'Interfaccia chiara, ideale per l\'uso diurno',
      icon: 'weather-sunny',
      colors: ['#FFFFFF', '#F5F5F5', '#2196F3'],
      preview: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#212121',
        primary: '#2196F3'
      }
    },
    {
      id: 'dark',
      name: 'Tema Scuro',
      description: 'Interfaccia scura, riduce l\'affaticamento degli occhi',
      icon: 'weather-night',
      colors: ['#121212', '#1E1E1E', '#64B5F6'],
      preview: {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        primary: '#64B5F6'
      }
    }
  ];

  const handleThemeChange = (themeId) => {
    setTheme(themeId);
    // Mostra feedback
    Alert.alert(
      '🎨 Tema Cambiato',
      `Tema ${themeId === 'dark' ? 'scuro' : 'chiaro'} applicato con successo!`,
      [{ text: 'OK' }]
    );
  };

  const handleAutoThemeToggle = (value) => {
    setAutoTheme(value);
    if (value) {
      Alert.alert(
        '🌓 Tema Automatico',
        'Funzionalità in sviluppo. Il tema cambierà automaticamente in base all\'orario.',
        [{ text: 'OK' }]
      );
    }
  };

  const ThemePreviewCard = ({ themeOption, isSelected }) => (
    <TouchableOpacity
      style={[
        styles.themeCard,
        {
          backgroundColor: theme.colors.card,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
      onPress={() => handleThemeChange(themeOption.id)}
    >
      <View style={styles.themeCardHeader}>
        <MaterialCommunityIcons 
          name={themeOption.icon} 
          size={24} 
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <Text style={[styles.themeTitle, { color: theme.colors.text }]}>
          {themeOption.name}
        </Text>
        {isSelected && (
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={theme.colors.primary} 
          />
        )}
      </View>
      
      <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
        {themeOption.description}
      </Text>
      
      {/* Anteprima del tema */}
      <View style={styles.themePreview}>
        <View style={[
          styles.previewContainer,
          { backgroundColor: themeOption.preview.background }
        ]}>
          <View style={[
            styles.previewHeader,
            { backgroundColor: themeOption.preview.primary }
          ]}>
            <View style={styles.previewHeaderContent} />
          </View>
          <View style={[
            styles.previewCard,
            { backgroundColor: themeOption.preview.surface }
          ]}>
            <View style={[
              styles.previewText,
              { backgroundColor: themeOption.preview.text }
            ]} />
            <View style={[
              styles.previewText,
              { 
                backgroundColor: themeOption.preview.text,
                width: '70%',
                marginTop: 4
              }
            ]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.colors.statusBarStyle} 
        backgroundColor={theme.colors.statusBarBackground} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons name="palette" size={32} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Tema e Aspetto
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Personalizza l'aspetto dell'app secondo le tue preferenze
          </Text>
        </View>

        {/* Interruttore rapido */}
        <View style={[styles.quickToggleCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.quickToggleContent}>
            <MaterialCommunityIcons 
              name={isDark ? "weather-night" : "weather-sunny"} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.quickToggleText}>
              <Text style={[styles.quickToggleTitle, { color: theme.colors.text }]}>
                {isDark ? 'Tema Scuro Attivo' : 'Tema Chiaro Attivo'}
              </Text>
              <Text style={[styles.quickToggleSubtitle, { color: theme.colors.textSecondary }]}>
                Tocca per cambiare tema rapidamente
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={isDark ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Selezione temi */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Scegli Tema
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Seleziona il tema che preferisci per l'interfaccia dell'app
          </Text>
          
          <View style={styles.themesContainer}>
            {themeOptions.map((themeOption) => (
              <ThemePreviewCard
                key={themeOption.id}
                themeOption={themeOption}
                isSelected={isDark ? themeOption.id === 'dark' : themeOption.id === 'light'}
              />
            ))}
          </View>
        </View>

        {/* Opzioni avanzate */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Opzioni Avanzate
          </Text>
          
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.textSecondary} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                  Tema Automatico
                </Text>
                <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                  Cambia automaticamente in base all'orario (Prossimamente)
                </Text>
              </View>
            </View>
            <Switch
              value={autoTheme}
              onValueChange={handleAutoThemeToggle}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={autoTheme ? '#4CAF50' : '#f4f3f4'}
              disabled={true}
            />
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Alert.alert(
                '🔄 Reset Tema',
                'Vuoi ripristinare il tema predefinito (chiaro)?',
                [
                  { text: 'Annulla', style: 'cancel' },
                  { 
                    text: 'Ripristina', 
                    onPress: () => setTheme('light'),
                    style: 'destructive'
                  }
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="restore" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.resetButtonText, { color: theme.colors.textSecondary }]}>
              Ripristina Tema Predefinito
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
          <MaterialCommunityIcons name="information" size={24} color={theme.colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
              💡 Suggerimento
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              Il tema scuro può ridurre l'affaticamento degli occhi durante l'uso prolungato, 
              specialmente in condizioni di scarsa illuminazione.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    ...theme.colors.cardElevation,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickToggleCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...theme.colors.cardElevation,
  },
  quickToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickToggleText: {
    flex: 1,
    marginLeft: 16,
  },
  quickToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickToggleSubtitle: {
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...theme.colors.cardElevation,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  themesContainer: {
    gap: 12,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  themeDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  themePreview: {
    alignItems: 'center',
  },
  previewContainer: {
    width: 120,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewHeader: {
    height: 20,
    width: '100%',
  },
  previewHeaderContent: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    margin: 8,
    borderRadius: 2,
  },
  previewCard: {
    flex: 1,
    margin: 8,
    borderRadius: 4,
    padding: 8,
  },
  previewText: {
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  resetButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ThemeSettingsScreen;
