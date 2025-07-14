import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'react-native';

// Definizione dei temi
export const lightTheme = {
  name: 'light',
  colors: {
    // Colori di base
    primary: '#2196F3',
    primaryDark: '#1976D2',
    primaryLight: '#64B5F6',
    secondary: '#4CAF50',
    secondaryDark: '#388E3C',
    accent: '#FF9800',
    
    // Sfondi
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#FFFFFF',
    
    // Testo
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#BDBDBD',
    
    // Bordi e divisori
    border: '#E0E0E0',
    divider: '#EEEEEE',
    
    // Stati
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    
    // Specifici per l'app
    income: '#4CAF50',
    expense: '#F44336',
    travel: '#FF9800',
    overtime: '#9C27B0',
    standby: '#607D8B',
    
    // Componenti specifici
    statusBarStyle: 'dark-content',
    statusBarBackground: '#f5f5f5',
    
    // Sfumature per le card
    cardShadow: '#000000',
    cardElevation: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }
  }
};

export const darkTheme = {
  name: 'dark',
  colors: {
    // Colori di base (adattati per dark mode)
    primary: '#64B5F6',
    primaryDark: '#42A5F5',
    primaryLight: '#90CAF9',
    secondary: '#81C784',
    secondaryDark: '#66BB6A',
    accent: '#FFB74D',
    
    // Sfondi
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    
    // Testo
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textDisabled: '#666666',
    
    // Bordi e divisori
    border: '#333333',
    divider: '#2A2A2A',
    
    // Stati (più visibili nel dark)
    success: '#81C784',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    
    // Specifici per l'app
    income: '#81C784',
    expense: '#EF5350',
    travel: '#FFB74D',
    overtime: '#BA68C8',
    standby: '#78909C',
    
    // Componenti specifici
    statusBarStyle: 'light-content',
    statusBarBackground: '#121212',
    
    // Sfumature per le card
    cardShadow: '#000000',
    cardElevation: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }
  }
};

// Contesto del tema
const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

// Hook per usare il tema
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve essere usato all\'interno di ThemeProvider');
  }
  return context;
};

// Provider del tema
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carica il tema salvato all'avvio
  useEffect(() => {
    loadTheme();
  }, []);

  // Aggiorna la StatusBar quando cambia il tema
  useEffect(() => {
    const currentTheme = isDark ? darkTheme : lightTheme;
    StatusBar.setBarStyle(currentTheme.colors.statusBarStyle);
    StatusBar.setBackgroundColor(currentTheme.colors.statusBarBackground, true);
  }, [isDark]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@app_theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Errore nel caricamento tema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTheme = async (themeName) => {
    try {
      await AsyncStorage.setItem('@app_theme', themeName);
    } catch (error) {
      console.error('Errore nel salvataggio tema:', error);
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    saveTheme(newIsDark ? 'dark' : 'light');
  };

  const setTheme = (themeName) => {
    const newIsDark = themeName === 'dark';
    setIsDark(newIsDark);
    saveTheme(themeName);
  };

  const theme = isDark ? darkTheme : lightTheme;

  if (isLoading) {
    // Ritorna un tema di default durante il caricamento
    return null;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        isDark, 
        toggleTheme, 
        setTheme,
        isLoading 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Utilità per creare stili che dipendono dal tema
export const createThemedStyles = (styleFunction) => {
  return (theme) => styleFunction(theme);
};

// Hook per creare stili dinamici
export const useThemedStyles = (styleFunction) => {
  const { theme } = useTheme();
  return styleFunction(theme);
};

export default ThemeContext;
