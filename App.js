import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ HANDLER NOTIFICHE CORRETTO - Mostra solo notifiche legittime
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('� Notifica ricevuta:', notification.request.content.title);
    console.log('� Data notifica:', notification.request.content.data);
    
    // Mostra tutte le notifiche che arrivano (ora che il sistema funziona)
    return {
      shouldShowAlert: true,    // ✅ Mostra popup
      shouldPlaySound: true,    // ✅ Suona
      shouldSetBadge: true,     // ✅ Badge
      shouldShowBanner: true,   // ✅ Banner
      shouldShowList: true,     // ✅ Lista notifiche
    };
  },
});

console.log('✅ Handler notifiche ripristinato: NOTIFICHE ABILITATE');

// Configura i canali di notifica Android all'avvio
// Funzione per eliminare tutte le chiavi di backup da AsyncStorage
export async function clearAllBackupsFromAsyncStorage() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // Elimina tutte le chiavi che iniziano con "backup_" o "manual_backup_"
    const backupKeys = allKeys.filter(key => key.startsWith('backup_') || key.startsWith('manual_backup_'));
    // Elimina anche la lista dei backup JS e la data ultimo backup
    const extraKeys = ['javascript_backups', 'last_backup_date'];
    const keysToRemove = [...backupKeys, ...extraKeys];
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`🗑️ Backup eliminati da AsyncStorage: ${keysToRemove.length}`);
    } else {
      console.log('ℹ️ Nessun backup trovato in AsyncStorage da eliminare');
    }
    // Ferma il timer automatico JS se presente
    try {
      const BackupService = require('./src/services/BackupService').default;
      if (BackupService && BackupService.jsBackupService && BackupService.jsBackupService.stopAutoBackup) {
        await BackupService.jsBackupService.stopAutoBackup();
        console.log('🛑 Timer backup automatico JS fermato');
      }
    } catch (e) {
      console.warn('⚠️ Impossibile fermare timer JS:', e.message);
    }
    return keysToRemove.length;
  } catch (err) {
    console.warn('❌ Errore durante la pulizia dei backup in AsyncStorage:', err.message);
    return 0;
  }
}
async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notifiche Generali',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E3A8A',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('reminder', {
        name: 'Promemoria Lavoro',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E3A8A',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('standby', {
        name: 'Reperibilità',
        importance: Notifications.AndroidImportance.HIGH,
        sound: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E3A8A',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Canali di notifica Android configurati');
    } catch (err) {
      console.warn('⚠️ Errore configurazione canali notifiche Android:', err.message);
    }
  }
}

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
import HourlyRatesSettingsScreen from './src/screens/HourlyRatesSettingsScreen';
import CalculationMethodSettingsScreen from './src/screens/CalculationMethodSettingsScreen';
import AppInfoScreen from './src/screens/AppInfoScreen';

import { useDatabase } from './src/hooks';
import DatabaseHealthService from './src/services/DatabaseHealthService';
// import NotificationService from './src/services/FixedNotificationService'; // DISATTIVATO - usando SuperNotificationService
import BackupService from './src/services/BackupService';
const SuperNotificationService = require('./src/services/SuperNotificationService');
const SuperBackupService = require('./src/services/SuperBackupService');
import UpdateService from './src/services/UpdateService';
import { ThemeProvider, useTheme, lightTheme } from './src/contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SettingsStack() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
    >
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
        name="HourlyRatesSettings" 
        component={HourlyRatesSettingsScreen} 
        options={{ title: 'Fasce Orarie Avanzate' }}
      />
      <Stack.Screen 
        name="CalculationMethodSettings" 
        component={CalculationMethodSettingsScreen} 
        options={{ title: 'Metodo di Calcolo' }}
      />
      <Stack.Screen 
        name="AppInfo" 
        component={AppInfoScreen} 
        options={{ title: 'Info App' }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
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
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
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

const TimeEntryStack = () => {
  const themeContext = useTheme();
  const theme = themeContext?.theme || lightTheme; // Fallback di sicurezza
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen name="TimeEntryScreen" component={TimeEntryScreen} options={{ title: 'Inserimento Orario' }} />
      <Stack.Screen name="TimeEntryForm" component={TimeEntryForm} options={{ title: 'Nuovo Inserimento' }} />
    </Stack.Navigator>
  );
};

// Mostra un alert se è disponibile un aggiornamento OTA
async function checkForOTAUpdate() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      const { Alert } = await import('react-native');
      Alert.alert(
        'Aggiornamento disponibile',
        'È disponibile una nuova versione dell’app. Vuoi aggiornare ora?',
        [
          {
            text: 'Aggiorna',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (err) {
                Alert.alert('Errore', 'Impossibile applicare l’aggiornamento. Riprova più tardi.');
              }
            },
          },
          { text: 'Annulla', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  } catch (err) {
    console.warn('Errore controllo OTA update:', err.message);
  }
}

export default function App() {
  const { isInitialized, isLoading, error } = useDatabase();

  // Gestisce i cambiamenti dello stato dell'app (background/foreground)
  React.useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App: State changed to:', nextAppState);
      
      if (nextAppState === 'active' && isInitialized) {
        // App è tornata in foreground, verifica le notifiche
        try {
          const recoveredCount = await SuperNotificationService.checkAndRecoverMissedNotifications();
          console.log(`📊 Timer attivi dopo foreground: ${recoveredCount?.scheduled || 0}`);
        } catch (error) {
          console.warn('⚠️ Errore controllo notifiche al ritorno in foreground:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, [isInitialized]);

  // Avvia il monitoraggio della salute del database quando l'app è inizializzata
  React.useEffect(() => {
    if (isInitialized) {
      checkForOTAUpdate();
      console.log('🚀 App: Database initialized, starting complete service initialization...');
      
      // Debug dell'ambiente di esecuzione
      console.log('🔍 App: Environment check...');
      console.log('- Platform:', Platform.OS);
      console.log('- Constants.executionEnvironment:', Constants.executionEnvironment);
      console.log('- __DEV__:', __DEV__);
      
      // ⚠️ RITARDA L'AVVIO DEI SERVIZI PER EVITARE DATABASE LOCK
      setTimeout(() => {
        console.log('🚀 App: Avvio servizi dopo inizializzazione database...');
        
        // Avvia monitoraggio salute database con timeout più lungo
        DatabaseHealthService.startPeriodicHealthCheck(60000); // Check ogni 60 secondi invece di 30
        
        // Inizializza aggiornamenti automatici
        setTimeout(() => {
          console.log('🔄 App: Inizializzazione servizio aggiornamenti...');
          UpdateService.checkOnAppStart();
        }, 1000);
        

      // Inizializza notifiche con delay
      setTimeout(async () => {
        await setupAndroidNotificationChannels();
        initializeNotifications();
      }, 2000);
        
        // Inizializza backup con delay maggiore
        setTimeout(() => {
          initializeBackupSystem();
        }, 5000);
        
      }, 3000); // Attesa 3 secondi dopo inizializzazione database
      
      // Inizializza il servizio notifiche con SuperNotificationService
      console.log('App: Preparing notification service...');
      const initializeNotifications = async () => {
        try {
          console.log('🔔 App: Inizializzazione SuperNotificationService...');
          
          // Inizializza solo SuperNotificationService (sistema unificato)
          try {
            console.log('App: Usando solo SuperNotificationService (sistema unificato)');
          } catch (oldError) {
            console.warn('App: Nota: migrazione da vecchio sistema completata');
          }
          
          // Ora inizializza il nuovo sistema avanzato
          const superInitialized = await SuperNotificationService.initialize();
          console.log(`🚀 App: SuperNotificationService inizializzato: ${superInitialized ? '✅ OK' : '❌ FAILED'}`);
          
          if (superInitialized) {
            // Verifica automaticamente notifiche mancate e ripristina
            console.log('🔄 App: Controllo recovery notifiche...');
            const recoveredCount = await SuperNotificationService.checkAndRecoverMissedNotifications();
            if (recoveredCount > 0) {
              console.log(`✅ App: Recovery completato, recuperate ${recoveredCount} notifiche`);
            }
            
            // Verifica numero notifiche programmate
            const stats = await SuperNotificationService.getNotificationStats();
            console.log(`📊 App: Notifiche attive: ${stats.activeNotifications}, Programmate oggi: ${stats.scheduledToday}`);
            
            // DISATTIVATA PROGRAMMAZIONE AUTOMATICA ALL'AVVIO (evita notifiche immediate)
            if (stats.activeNotifications === 0) {
              console.log('ℹ️ App: Nessuna notifica programmata. Usa le Impostazioni → Notifiche per attivarle manualmente.');
              // const scheduledCount = await SuperNotificationService.scheduleNotifications();
              // console.log(`✅ App: Programmate ${scheduledCount} nuove notifiche`);
            }
          }
          
          // Gestisci possibili errori di importazione
          const notificationsModule = global.Notifications || Notifications;
          
          // Cancella qualsiasi notifica visibile all'avvio
          if (notificationsModule) {
            try {
              await notificationsModule.dismissAllNotificationsAsync();
              console.log('App: Notifiche visibili cancellate all\'avvio');
            } catch (notifError) {
              console.warn('⚠️ App: Errore cancellazione notifiche:', notifError.message);
            }
          }
          
          // Verifica e richiedi permessi se necessario
          const hasPermissions = await SuperNotificationService.hasPermissions();
          if (!hasPermissions) {
            console.log('App: Permessi notifiche non presenti, richiedendo...');
            const granted = await SuperNotificationService.requestPermissions();
            if (!granted) {
              console.warn('App: Permessi notifiche negati dall\'utente');
            }
          }
          
          console.log('✅ App: Sistema notifiche completo inizializzato');
        } catch (error) {
          console.warn('App: Errore inizializzazione notifiche (fallback a vecchio sistema):', error.message);
          // Nessun fallback necessario - sistema unificato SuperNotificationService
          try {
            console.log('✅ App: Sistema SuperNotificationService unificato attivo');
          } catch (fallbackError) {
            console.error('❌ App: Errore sistema notifiche:', fallbackError.message);
          }
        }
      };
      
      // ✅ INIZIALIZZA SUPER BACKUP SYSTEM + FALLBACK
      const initializeBackupSystem = async () => {
        try {
          console.log('💾 App: Inizializzazione SuperBackupService...');
          
          // Attesa aggiuntiva per evitare conflitti database
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Inizializza il nuovo sistema SuperBackup
          const superInitialized = await SuperBackupService.initialize();
          console.log(`🚀 App: SuperBackupService inizializzato: ${superInitialized ? '✅ OK' : '❌ FAILED'}`);
          
          if (superInitialized) {
            // Verifica automaticamente backup mancati e ripristina
            console.log('🔄 App: Controllo recovery backup...');
            const recoveredBackups = await SuperBackupService.checkAndRecoverMissedBackups();
            if (recoveredBackups > 0) {
              console.log(`✅ App: Recovery completato, recuperati ${recoveredBackups} backup`);
            }
            
            // Verifica statistiche backup
            const stats = await SuperBackupService.getBackupStats();
            console.log(`📊 App: Backup totali: ${stats.totalBackups || 0}, Ultimo: ${stats.lastBackupDate || 'Mai'}`);
            
            // Se non ci sono backup recenti, esegui uno ora
            if (!stats.lastBackupDate || (Date.now() - new Date(stats.lastBackupDate).getTime()) > 7 * 24 * 60 * 60 * 1000) {
              console.log('⚠️ App: Nessun backup recente, esecuzione backup iniziale...');
              const backupResult = await SuperBackupService.executeManualBackup();
              if (backupResult.success) {
                console.log(`✅ App: Backup iniziale completato: ${backupResult.fileName}`);
              } else {
                console.warn(`❌ App: Backup iniziale fallito: ${backupResult.error}`);
              }
            }
          }
          
          // Mantieni anche il vecchio sistema per compatibility (se necessario)
          try {
            console.log('App: Inizializzazione sistema backup legacy per compatibility...');
            
            // Prima prova il backup nativo
            try {
              console.log('App: Tentativo inizializzazione NativeBackupService...');
              const NativeBackupService = require('./src/services/NativeBackupService');
              await NativeBackupService.initializeNativeBackup();
              console.log('✅ App: NativeBackupService inizializzato (compatibility)');
            } catch (nativeError) {
              console.warn('App: NativeBackupService non disponibile, usando BackupService:', nativeError.message);
              // Fallback al backup JavaScript normale con attesa
              await new Promise(resolve => setTimeout(resolve, 2000));
              await BackupService.initialize();
              console.log('✅ App: BackupService JavaScript inizializzato (compatibility)');
            }
          } catch (legacyError) {
            console.warn('App: Sistema backup legacy non disponibile:', legacyError.message);
          }
          
          console.log('✅ App: Sistema backup completo inizializzato');
        } catch (error) {
          console.warn('App: Errore inizializzazione backup (fallback a vecchio sistema):', error.message);
          // Fallback al vecchio sistema in caso di problemi
          try {
            await BackupService.initialize();
            console.log('✅ App: Fallback vecchio sistema backup attivo');
          } catch (fallbackError) {
            console.error('❌ App: Errore anche nel fallback backup:', fallbackError.message);
          }
        }
      };
      
      initializeNotifications();
      initializeBackupSystem();
      
      // Verifica i servizi dopo 10 secondi (aumentato da 5)
      setTimeout(async () => {
        console.log('🔍 App: Verifica servizi dopo 10 secondi...');
        
        try {
        // Gestisci possibili errori di importazione
        const notificationsModule = global.Notifications || Notifications;
        
        // CANCELLA TUTTO ALL'AVVIO - SOLUZIONE DRASTICA
        if (notificationsModule) {
          try {
            console.log('🗑️ CANCELLAZIONE DRASTICA ALL\'AVVIO - Rimuovo TUTTE le notifiche');
            await notificationsModule.cancelAllScheduledNotificationsAsync();
            await notificationsModule.dismissAllNotificationsAsync();
            
            // Doppia cancellazione per sicurezza
            setTimeout(async () => {
              await notificationsModule.cancelAllScheduledNotificationsAsync();
              await notificationsModule.dismissAllNotificationsAsync();
              console.log('🗑️ Seconda cancellazione completata');
            }, 2000);
            
            console.log('✅ App: Notifiche residue pulite correttamente');
          } catch (notifError) {
            console.warn('⚠️ App: Errore pulizia notifiche:', notifError.message);
          }
        }          // Verifica stato notifiche
          try {
            // ⚠️ TEST DISABILITATO - Causava notifiche immediate all'avvio
            // await NotificationService.testNotificationSystem();
            console.log('✅ Test sistema notifiche SALTATO (evita notifiche immediate)');
          } catch (testError) {
            console.warn('❌ Test notifiche fallito:', testError.message);
          }
          
          // Verifica stato backup
          const backupEnabled = await BackupService.isEnabled();
          console.log('💾 Backup automatico enabled:', backupEnabled);
          
        } catch (error) {
          console.warn('⚠️ Errore verifica servizi:', error.message);
        }
      }, 10000); // Aumentato da 5000 a 10000
      
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

