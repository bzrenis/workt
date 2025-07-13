import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DashboardScreen from './src/screens/DashboardScreen';
import TimeEntryScreen from './src/screens/TimeEntryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ContractSettingsScreen from './src/screens/ContractSettingsScreen';
import TravelSettingsScreen from './src/screens/TravelSettingsScreen';
import StandbySettingsScreen from './src/screens/StandbySettingsScreen';
import MealSettingsScreen from './src/screens/MealSettingsScreen';
import BackupScreen from './src/screens/BackupScreen';
import TimeEntryForm from './src/screens/TimeEntryForm';
import NetCalculationSettingsScreen from './src/screens/NetCalculationSettingsScreen';
import VacationManagementScreen from './src/screens/VacationManagementScreen';
import VacationRequestForm from './src/screens/VacationRequestForm';
import VacationSettingsScreen from './src/screens/VacationSettingsScreen';
import PDFExportScreen from './src/screens/PDFExportScreen';

import { useDatabase } from './src/hooks';
import DatabaseHealthService from './src/services/DatabaseHealthService';
import NotificationService from './src/services/NotificationService';
import DebugSettingsScreen from './src/screens/DebugSettingsScreen';
import { ThemeProvider } from './src/contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen} 
        options={{ title: 'Impostazioni' }}
      />
      <Stack.Screen 
        name="ContractSettings" 
        component={ContractSettingsScreen} 
        options={{ title: 'Contratto CCNL' }}
      />
      <Stack.Screen 
        name="NetCalculationSettings" 
        component={NetCalculationSettingsScreen} 
        options={{ title: 'Calcolo Netto' }}
      />
      <Stack.Screen 
        name="TravelSettings" 
        component={TravelSettingsScreen} 
        options={{ title: 'Ore di Viaggio' }}
      />
      <Stack.Screen 
        name="StandbySettings" 
        component={StandbySettingsScreen} 
        options={{ title: 'Reperibilità' }}
      />
      <Stack.Screen 
        name="MealSettings" 
        component={MealSettingsScreen} 
        options={{ title: 'Rimborsi Pasti' }}
      />
      <Stack.Screen 
        name="VacationManagement" 
        component={VacationManagementScreen} 
        options={{ title: 'Ferie e Permessi' }}
      />
      <Stack.Screen 
        name="VacationRequestForm" 
        component={VacationRequestForm} 
        options={{ title: 'Richiesta Ferie/Permessi' }}
      />
      <Stack.Screen 
        name="VacationSettings" 
        component={VacationSettingsScreen} 
        options={{ title: 'Configurazione Ferie/Permessi' }}
      />
      <Stack.Screen 
        name="Backup" 
        component={BackupScreen} 
        options={{ title: 'Backup e Ripristino' }}
      />
      <Stack.Screen 
        name="TravelAllowanceSettings" 
        component={require('./src/screens/TravelAllowanceSettings').default} 
        options={{ title: 'Indennità Trasferta' }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={require('./src/screens/NotificationSettingsScreen').default} 
        options={{ title: 'Notifiche' }}
      />
      <Stack.Screen 
        name="ThemeSettings" 
        component={require('./src/screens/ThemeSettingsScreen').default} 
        options={{ title: 'Tema e Aspetto' }}
      />
      <Stack.Screen 
        name="PDFExport" 
        component={PDFExportScreen} 
        options={{ title: 'Export PDF Report' }}
      />
      <Stack.Screen 
        name="DebugSettings" 
        component={DebugSettingsScreen} 
        options={{ title: 'Debug Settings' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'TimeEntry') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="TimeEntry" 
        component={TimeEntryStack} 
        options={{ title: 'Inserimento Orario' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack} 
        options={{ title: 'Impostazioni' }}
      />
    </Tab.Navigator>
  );
}

const TimeEntryStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TimeEntryScreen" component={TimeEntryScreen} options={{ title: 'Inserimento Orario' }} />
    <Stack.Screen name="TimeEntryForm" component={TimeEntryForm} options={{ title: 'Nuovo Inserimento' }} />
  </Stack.Navigator>
);

export default function App() {
  const { isInitialized, isLoading, error } = useDatabase();

  // Avvia il monitoraggio della salute del database quando l'app è inizializzata
  React.useEffect(() => {
    if (isInitialized) {
      console.log('App: Database initialized, starting health monitoring...');
      DatabaseHealthService.startPeriodicHealthCheck(30000); // Check ogni 30 secondi
      
      // Inizializza il servizio notifiche
      console.log('App: Initializing notification service...');
      NotificationService.setupNotificationListener();
      
      // Programma le notifiche se abilitate
      NotificationService.getSettings().then(settings => {
        if (settings.enabled) {
          NotificationService.scheduleNotifications(settings);
        }
      }).catch(error => {
        console.log('App: Error loading notification settings (non-critical):', error.message);
      });
      
      return () => {
        console.log('App: Stopping database health monitoring...');
        DatabaseHealthService.stopPeriodicHealthCheck();
      };
    }
  }, [isInitialized]);

  if (isLoading || !isInitialized) {
    return <LoadingScreen />;
  }

  if (error) {
    return <LoadingScreen error={error} />;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <MainTabs />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
