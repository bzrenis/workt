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
import { initNativeBackgroundBackup } from './src/services/NativeBackgroundBackup';

// 🧪 TEST BACKUP NATIVO - Carica il comando globale
try {
  require('./test-backup-app-closed');
  
  // Aggiungi comando per test backup silenzioso
  const NativeBackupService = require('./src/services/NativeBackupService').default;
  global.testSilentBackup = async () => {
    try {
      console.log('🔇 TEST: Simulazione backup silenzioso...');
      const result = await NativeBackupService.executeSilentBackup('asyncstorage');
      console.log('✅ TEST: Risultato backup silenzioso:', result);
      return result;
    } catch (error) {
      console.error('❌ TEST: Errore backup silenzioso:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Aggiungi comando per test background backup task
  const { testBackgroundBackupTask } = require('./src/services/BackgroundBackupTask');
  global.testBackgroundBackup = testBackgroundBackupTask;
  
  console.log('🚀 Test backup nativo caricati!');
  console.log('🚀 Comandi: testAppClosed(), testSilentBackup(), testBackgroundBackup()');
} catch (testError) {
  console.log('⚠️ Test backup app chiusa non caricato:', testError.message);
}

// 🧪 TEST AGGIORNAMENTI OTA - Carica i comandi globali
try {
  const UpdateService = require('./src/services/UpdateService').default;
  global.testUpdateCompleted = () => UpdateService.testUpdateCompletedMessage();
  global.testUpdateAvailable = () => UpdateService.testUpdateAvailable();
  global.checkForUpdates = () => UpdateService.checkManually();
  global.forceShowUpdateMessage = () => UpdateService.forceShowCurrentUpdateMessage();
  console.log('🚀 Test aggiornamenti OTA caricati!');
  console.log('🚀 Comandi: testUpdateCompleted(), testUpdateAvailable(), checkForUpdates(), forceShowUpdateMessage()');
} catch (testError) {
  console.log('⚠️ Test aggiornamenti non caricati:', testError.message);
}

// 🎯 NOTIFICA AGGIORNAMENTO v1.3.0 - Carica sistema notifiche personalizzate
try {
  const { forceUpdateNotificationV130, checkUpdateStatus, resetUpdateSystem, resetV130PopupFlag } = require('./force-update-notification-v1-3-0');
  global.forceUpdateNotificationV130 = forceUpdateNotificationV130;
  global.checkUpdateStatus = checkUpdateStatus;
  global.resetUpdateSystem = resetUpdateSystem;
  global.resetV130PopupFlag = resetV130PopupFlag;
  console.log('🎯 Notifiche aggiornamento v1.3.0 caricate!');
  console.log('🎯 Comandi: forceUpdateNotificationV130(), checkUpdateStatus(), resetUpdateSystem(), resetV130PopupFlag()');
} catch (testError) {
  console.log('⚠️ Notifiche aggiornamento v1.3.0 non caricate:', testError.message);
}

// 🧪 CARICA SISTEMA TEST AGGIORNAMENTO v1.3.1
if (__DEV__) {
  require('./test-update-system-v1-3-1.js');
}

// 🎭 CARICA TESTER COMPONENTI DEVELOPMENT
if (__DEV__) {
  require('./test-development-components.js');
}

// 🚨 CARICA PULIZIA EMERGENZA POPUP
if (__DEV__) {
  require('./emergency-popup-cleanup.js');
}

// 🧹 CARICA SISTEMA PULIZIA AGGIORNAMENTI
if (__DEV__) {
  require('./clean-update-system.js');
}

// 🚀 CARICA COMANDI PUBBLICAZIONE OTA v1.3.1
if (__DEV__) {
  require('./publish-ota-v1-3-1.js');
}

// 🎯 CARICA NOTIFICHE FORCE UPDATE v1.3.1
if (__DEV__) {
  require('./force-update-notification-v1-3-1.js');
}

// 🔍 DEBUG VERSIONI - Comando per verificare stato versioni
try {
  const simpleVersionDebug = require('./simple-version-debug').default;
  global.simpleVersionDebug = simpleVersionDebug;
  console.log('🔍 Debug versioni semplificato caricato!');
  console.log('🔍 Comando: simpleVersionDebug()');
} catch (debugError) {
  console.log('⚠️ Debug versioni non caricato:', debugError.message);
}

// 🔧 RESET VERSION SYSTEM - Comandi per reset sistema versioni
try {
  const { resetVersionSystem, checkVersionState, clearAllVersionData } = require('./reset-version-system');
  global.resetVersionSystem = resetVersionSystem;
  global.checkVersionState = checkVersionState;
  global.clearAllVersionData = clearAllVersionData;
  console.log('🔧 Reset version system caricato!');
  console.log('🔧 Comandi: resetVersionSystem(), checkVersionState(), clearAllVersionData()');
} catch (resetError) {
  console.log('⚠️ Reset version system non caricato:', resetError.message);
}

// 🚀 QUICK FIX - Comandi rapidi per popup aggiornamento
try {
  const { quickFixUpdatePopup, showPopupNow, checkStorageState } = require('./quick-fix-popup');
  global.quickFixUpdatePopup = quickFixUpdatePopup;
  global.showPopupNow = showPopupNow;
  global.checkStorageState = checkStorageState;
  console.log('🚀 Quick fix popup caricato!');
  console.log('🚀 Comandi: quickFixUpdatePopup(), showPopupNow(), checkStorageState()');
} catch (quickFixError) {
  console.log('⚠️ Quick fix popup non caricato:', quickFixError.message);
}

// 🔍 VERIFICA VERSIONI - Comandi per verifica sincronizzazione
try {
  const { verifyVersionSync, syncAllVersions } = require('./verify-version-sync');
  global.verifyVersionSync = verifyVersionSync;
  global.syncAllVersions = syncAllVersions;
  console.log('🔍 Verifica versioni caricato!');
  console.log('🔍 Comandi: verifyVersionSync(), syncAllVersions()');
} catch (verifyError) {
  console.log('⚠️ Verifica versioni non caricato:', verifyError.message);
}

// 📱 ENHANCED UPDATE INFO - Info aggiornamenti avanzate
try {
  const showEnhancedUpdateInfo = require('./enhanced-update-info').default;
  global.showEnhancedUpdateInfo = showEnhancedUpdateInfo;
  console.log('📱 Enhanced update info caricato!');
  console.log('📱 Comando: showEnhancedUpdateInfo()');
} catch (enhancedError) {
  console.log('⚠️ Enhanced update info non caricato:', enhancedError.message);
}

// 🔧 FORCE UPDATE POPUP - Test diretto popup aggiornamento
try {
  const { forceUpdatePopup, checkCurrentVersionState } = require('./force-update-popup');
  global.forceUpdatePopup = forceUpdatePopup;
  global.checkCurrentVersionState = checkCurrentVersionState;
  console.log('🔧 Force update popup caricato!');
  console.log('🔧 Comandi: forceUpdatePopup(), checkCurrentVersionState()');
} catch (forceError) {
  console.log('⚠️ Force update popup non caricato:', forceError.message);
}

// 📱 RILEVAMENTO BUILD NATIVA - Distingue aggiornamenti nativi da OTA
try {
  const { checkNativeBuildUpdate, forceNativeBuildPopup, getBuildInfo, resetNativeBuildSystem } = require('./native-build-update-detector');
  global.checkNativeBuildUpdate = checkNativeBuildUpdate;
  global.forceNativeBuildPopup = forceNativeBuildPopup;
  global.getBuildInfo = getBuildInfo;
  global.resetNativeBuildSystem = resetNativeBuildSystem;
  console.log('📱 Rilevamento build nativa caricato!');
  console.log('📱 Comandi: checkNativeBuildUpdate(), forceNativeBuildPopup(), getBuildInfo(), resetNativeBuildSystem()');
} catch (nativeError) {
  console.log('⚠️ Rilevamento build nativa non caricato:', nativeError.message);
}

// 🧪 TEST BUILD NATIVA - Sistema completo di test per aggiornamenti nativi
try {
  const { testNativeBuildDetection, resetForNewTest, testAllUpdateScenarios, testOTAvsNativeComparison } = require('./test-native-build-system');
  global.testNativeBuildDetection = testNativeBuildDetection;
  global.resetForNewTest = resetForNewTest;
  global.testAllUpdateScenarios = testAllUpdateScenarios;
  global.testOTAvsNativeComparison = testOTAvsNativeComparison;
  console.log('🧪 Test build nativa caricato!');
  console.log('🧪 Comandi: testNativeBuildDetection(), resetForNewTest(), testAllUpdateScenarios(), testOTAvsNativeComparison()');
} catch (testNativeError) {
  console.log('⚠️ Test build nativa non caricato:', testNativeError.message);
}

// 🔔 TEST NOTIFICHE BACKUP - Sistema di test per controllo notifiche backup
try {
  const { testBackupNotificationControl, testBackupWithDifferentNotificationStates, checkBackupNotificationStatus, resetNotificationTestState } = require('./test-backup-notifications');
  global.testBackupNotificationControl = testBackupNotificationControl;
  global.testBackupWithDifferentNotificationStates = testBackupWithDifferentNotificationStates;
  global.checkBackupNotificationStatus = checkBackupNotificationStatus;
  global.resetNotificationTestState = resetNotificationTestState;
  console.log('🔔 Test notifiche backup caricato!');
  console.log('🔔 Comandi: testBackupNotificationControl(), testBackupWithDifferentNotificationStates(), checkBackupNotificationStatus(), resetNotificationTestState()');
} catch (testNotificationError) {
  console.log('⚠️ Test notifiche backup non caricato:', testNotificationError.message);
}

// 📍 BACKUP PATH INSPECTOR - Visualizza percorsi e dettagli backup completi
try {
  const { inspectAllBackups, findBackupByName, verifyBackupPaths, showLatestBackup, copyBackupPath } = require('./backup-path-inspector');
  global.inspectAllBackups = inspectAllBackups;
  global.findBackupByName = findBackupByName;
  global.verifyBackupPaths = verifyBackupPaths;
  global.showLatestBackup = showLatestBackup;
  global.copyBackupPath = copyBackupPath;
  console.log('📍 Backup path inspector caricato!');
  console.log('📍 Comandi: inspectAllBackups(), findBackupByName("nome"), verifyBackupPaths(), showLatestBackup(), copyBackupPath("nome")');
} catch (inspectorError) {
  console.log('⚠️ Backup path inspector non caricato:', inspectorError.message);
}

// ✅ HANDLER NOTIFICHE CORRETTO - Mostra solo notifiche legittime
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('� Notifica ricevuta:', notification.request.content.title);
    console.log('� Data notifica:', notification.request.content.data);
    
    // Mostra tutte le notifiche che arrivano (ora che il sistema funziona)
    return {
      shouldPlaySound: true,    // ✅ Suona
      shouldSetBadge: true,     // ✅ Badge
      shouldShowBanner: true,   // ✅ Banner (sostituisce shouldShowAlert)
      shouldShowList: true,     // ✅ Lista notifiche (sostituisce shouldShowAlert)
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

// 🏷️ COMPONENTI MODALITÀ DEVELOPMENT
import DevelopmentWatermark from './src/components/DevelopmentWatermark';
import DevelopmentBanner from './src/components/DevelopmentBanner';

import { useDatabase } from './src/hooks';
import DatabaseHealthService from './src/services/DatabaseHealthService';
// import NotificationService from './src/services/FixedNotificationService'; // DISATTIVATO - usando SuperNotificationService
import BackupService from './src/services/BackupService';
import { registerBackgroundBackupTask } from './src/services/BackgroundBackupTask';
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
      
      // 📱 CONTROLLO BUILD NATIVA: Prima di tutto controlla se è cambiata la build
      setTimeout(async () => {
        try {
          console.log('📱 Controllo aggiornamento build nativa...');
          const nativeUpdateResult = await global.checkNativeBuildUpdate();
          
          if (nativeUpdateResult?.updateDetected) {
            console.log('🎯 AGGIORNAMENTO BUILD NATIVA RILEVATO:', nativeUpdateResult);
            // Il popup viene gestito automaticamente da checkNativeBuildUpdate
          } else {
            console.log('✅ Nessun aggiornamento build nativa rilevato');
          }
        } catch (nativeError) {
          console.log('⚠️ Errore controllo build nativa:', nativeError);
        }
      }, 1500); // Controlla build nativa dopo 1.5 secondi
      
      // ⚠️ RITARDA L'AVVIO DEI SERVIZI PER EVITARE DATABASE LOCK
      setTimeout(() => {
        console.log('🚀 App: Avvio servizi dopo inizializzazione database...');
        
        // Avvia monitoraggio salute database con timeout più lungo
        DatabaseHealthService.startPeriodicHealthCheck(60000); // Check ogni 60 secondi invece di 30
        
        // Inizializza aggiornamenti automatici
        setTimeout(() => {
          console.log('🔄 App: Inizializzazione servizio aggiornamenti...');
          
          // 🎯 CONTROLLO SPECIFICO v1.3.0: POPUP SEMPRE VISIBILE per aggiornamento
          const checkV130Update = async () => {
            try {
              const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
              const hasShownV130Popup = await AsyncStorage.getItem('v1_3_0_popup_shown');
              
              console.log('📋 Versione precedente nota:', lastKnownVersion);
              console.log('📋 Popup v1.3.0 già mostrato:', hasShownV130Popup);
              
              // MOSTRA SEMPRE il popup se:
              // 1. Non c'è versione precedente (prima installazione/reset)
              // 2. La versione è diversa da 1.3.0 (aggiornamento effettivo)
              // 3. Il popup v1.3.0 non è mai stato mostrato (per sicurezza)
              const shouldShowPopup = !lastKnownVersion || 
                                    lastKnownVersion !== '1.3.0' || 
                                    hasShownV130Popup !== 'true';
              
              if (shouldShowPopup) {
                console.log('🎯 MOSTRANDO POPUP v1.3.0 - Condizioni:', {
                  lastKnownVersion,
                  hasShownV130Popup,
                  shouldShowPopup
                });
                
                setTimeout(() => {
                  global.forceUpdateNotificationV130();
                }, 3000); // Aspetta 3 secondi per permettere all'app di caricarsi
              } else {
                console.log('✅ Popup v1.3.0 già mostrato, non necessario');
              }
            } catch (error) {
              console.error('❌ Errore controllo v1.3.0:', error);
              // In caso di errore, mostra comunque il popup per sicurezza
              setTimeout(() => {
                global.forceUpdateNotificationV130();
              }, 3000);
            }
          };
          
          checkV130Update();
          UpdateService.checkOnAppStart();
          
          // 🚨 BACKUP POPUP v1.3.0: Se per qualche motivo il controllo sopra fallisce,
          // forza comunque la visualizzazione del popup dopo 5 secondi
          setTimeout(async () => {
            try {
              const hasShownV130Popup = await AsyncStorage.getItem('v1_3_0_popup_shown');
              if (hasShownV130Popup !== 'true') {
                console.log('🚨 BACKUP: Forzando popup v1.3.0 per sicurezza...');
                global.forceUpdateNotificationV130();
              }
            } catch (error) {
              console.log('🚨 BACKUP: Errore controllo backup popup, forzo comunque:', error);
              global.forceUpdateNotificationV130();
            }
          }, 5000); // Backup dopo 5 secondi
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
          
          // ✅ SISTEMA BACKUP SEMPLIFICATO - Solo NativeBackupService
          console.log('App: Inizializzazione sistema backup ottimizzato...');
          try {
            console.log('App: Tentativo inizializzazione NativeBackupService...');
            const NativeBackupService = require('./src/services/NativeBackupService').default;
            if (NativeBackupService && typeof NativeBackupService.initialize === 'function') {
              await NativeBackupService.initialize();
              console.log('✅ App: NativeBackupService inizializzato (sistema principale)');
            } else {
              throw new Error('NativeBackupService.initialize is not a function');
            }
          } catch (nativeError) {
            console.warn('❌ App: NativeBackupService non disponibile:', nativeError.message);
            // Fallback al SuperBackupService
            try {
              const superInitialized = await SuperBackupService.initialize();
              console.log(`🔄 App: SuperBackupService fallback: ${superInitialized ? '✅ OK' : '❌ FAILED'}`);
            } catch (superError) {
              console.error('❌ App: Errore anche nel SuperBackupService:', superError.message);
            }
          }
          // REGISTRA IL TASK DI BACKUP AUTOMATICO IN BACKGROUND (solo build native)
          try {
            if (Platform.OS === 'android' || Platform.OS === 'ios') {
              const ok = await registerBackgroundBackupTask();
              if (ok) {
                console.log('✅ App: Task di backup automatico in background registrato con successo');
              } else {
                console.warn('⚠️ App: Task di backup automatico NON registrato');
              }
            }
          } catch (e) {
            console.error('❌ App: Errore registrazione task di backup automatico:', e.message);
          }
          console.log('✅ App: Sistema backup completo inizializzato');
        } catch (error) {
          console.error('❌ App: Errore inizializzazione sistema backup:', error.message);
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

  useEffect(() => {
    initNativeBackgroundBackup();
  }, []);

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
          
          {/* 🏷️ FILIGRANE MODALITÀ DEVELOPMENT */}
          <DevelopmentWatermark />
          <DevelopmentBanner />
        </NavigationContainer>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

