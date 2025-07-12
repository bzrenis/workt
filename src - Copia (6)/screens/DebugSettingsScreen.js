import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/NotificationService';
import DatabaseService from '../services/DatabaseService';

const DebugSettingsScreen = ({ navigation }) => {
  const [debugInfo, setDebugInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message) => {
    setDebugInfo(prev => prev + message + '\n');
    console.log(message);
  };

  const clearLog = () => {
    setDebugInfo('');
  };

  const testSettingsSync = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🔍 TEST: Verifica sincronizzazione settings di reperibilità');
      addLog('');
      
      // 1. Leggi tutte le settings
      const settingsStr = await AsyncStorage.getItem('settings');
      addLog(`📱 Settings raw: ${settingsStr ? 'Presenti' : 'Vuote'}`);
      
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        
        // 2. Controlla specificamente le standbySettings
        const standbySettings = settings?.standbySettings;
        addLog(`📅 standbySettings: ${standbySettings ? 'Presenti' : 'Assenti'}`);
        
        if (standbySettings) {
          const standbyDays = standbySettings.standbyDays || {};
          addLog(`📅 standbyDays keys: ${Object.keys(standbyDays).length}`);
          
          // Mostra TUTTE le chiavi trovate
          addLog('📅 Tutte le date trovate:');
          Object.keys(standbyDays).forEach((dateStr, index) => {
            const dayData = standbyDays[dateStr];
            const isSelected = dayData?.selected === true;
            addLog(`   ${index + 1}. ${dateStr} - ${isSelected ? '✅ ATTIVA' : '❌ non attiva'}`);
          });
          
          // 3. Trova le date attive di reperibilità
          const activeDates = Object.keys(standbyDays).filter(dateStr => {
            const dayData = standbyDays[dateStr];
            return dayData?.selected === true;
          });
          
          addLog('');
          addLog(`✅ Date ATTIVE di reperibilità: ${activeDates.length}`);
          activeDates.forEach((date, index) => {
            addLog(`   ${index + 1}. ${date}`);
          });
          
          // 4. Test range date (prossimi 60 giorni)
          const today = new Date();
          const futureDate = new Date();
          futureDate.setDate(today.getDate() + 60);
          
          const startStr = today.toISOString().split('T')[0];
          const endStr = futureDate.toISOString().split('T')[0];
          
          addLog('');
          addLog(`📊 Test range: ${startStr} a ${endStr}`);
          
          const datesInRange = activeDates.filter(dateStr => {
            const checkDate = new Date(dateStr);
            return checkDate >= today && checkDate <= futureDate;
          });
          
          addLog(`📊 Date nel range futuro: ${datesInRange.length}`);
          datesInRange.forEach((date, index) => {
            addLog(`   ${index + 1}. ${date}`);
          });
          
          // 5. Test diretto della funzione getStandbyDatesFromSettings
          addLog('');
          addLog('🧪 Test diretto NotificationService.getStandbyDatesFromSettings...');
          
          const datesFromService = await NotificationService.getStandbyDatesFromSettings(today, futureDate);
          addLog(`🧪 Date restituite dal service: ${datesFromService.length}`);
          datesFromService.forEach((date, index) => {
            addLog(`   ${index + 1}. ${date}`);
          });
          
        } else {
          addLog('❌ standbySettings non trovate nelle settings');
        }
      } else {
        addLog('❌ Nessuna settings trovata in AsyncStorage');
      }
      
    } catch (error) {
      addLog(`❌ Errore nel test: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testNotificationScheduling = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('📞 TEST: Programmazione notifiche per date reperibilità attive');
      addLog('');
      
      // 1. Mostra le notifiche attuali
      const currentNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const standbyNotifs = currentNotifications.filter(n => n.content.data?.type === 'standby_reminder');
      addLog(`📊 Notifiche reperibilità esistenti: ${standbyNotifs.length}`);
      
      // 2. Cancella le notifiche di reperibilità esistenti
      addLog('🗑️ Cancellando notifiche reperibilità esistenti...');
      await NotificationService.cancelStandbyNotifications();
      
      // 3. Forza la sincronizzazione delle settings
      addLog('🔄 Sincronizzazione settings->database...');
      await DatabaseService.syncStandbySettingsToDatabase();
      
      // 4. Programma nuove notifiche usando le date reperibilità
      addLog('📅 Programmando notifiche per date attive (blu)...');
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      
      const standbyDates = await NotificationService.getStandbyDatesFromSettings(today, endDate);
      addLog(`📊 Date reperibilità trovate: ${standbyDates.length}`);
      
      if (standbyDates.length > 0) {
        standbyDates.forEach((date, index) => {
          addLog(`   ${index + 1}. ${date}`);
        });
        
        // Programma le notifiche
        const settings = await NotificationService.getSettings();
        await NotificationService.scheduleStandbyReminders(standbyDates, settings);
        
        // 5. Verifica le notifiche programmate
        const finalNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const newStandbyNotifs = finalNotifications.filter(n => n.content.data?.type === 'standby_reminder');
        addLog(`✅ Notifiche reperibilità programmate: ${newStandbyNotifs.length}`);
        
        // Mostra dettagli delle notifiche programmate
        newStandbyNotifs.forEach((notif, index) => {
          const title = notif.content.title;
          const body = notif.content.body;
          addLog(`   ${index + 1}. ${title}`);
          addLog(`      ${body}`);
        });
        
      } else {
        addLog('❌ Nessuna data di reperibilità trovata!');
      }
      
    } catch (error) {
      addLog(`❌ Errore nel test notifiche: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testForcedSync = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🔄 TEST: Sincronizzazione forzata settings->database');
      addLog('');
      
      // Test la sincronizzazione forzata
      const syncCount = await DatabaseService.forceSyncStandbyAndUpdateNotifications();
      
      addLog(`✅ Sincronizzazione completata: ${syncCount} nuove date aggiunte`);
      addLog('');
      addLog('📞 Le notifiche di reperibilità dovrebbero ora essere aggiornate');
      
    } catch (error) {
      addLog(`❌ Errore nella sincronizzazione forzata: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTestStandbyDates = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🧪 TEST: Aggiunta date di reperibilità di test');
      addLog('');
      
      // Ottieni le settings attuali
      const settingsStr = await AsyncStorage.getItem('settings');
      let settings = {};
      
      if (settingsStr) {
        settings = JSON.parse(settingsStr);
        addLog('📱 Settings esistenti trovate');
      } else {
        addLog('📱 Nessuna settings esistente - creazione nuove settings');
      }
      
      // Crea date di test (prossimi 7 giorni)
      const testDates = [];
      const today = new Date();
      
      for (let i = 1; i <= 7; i++) {
        const testDate = new Date(today);
        testDate.setDate(today.getDate() + i);
        const dateStr = testDate.toISOString().split('T')[0]; // YYYY-MM-DD
        testDates.push(dateStr);
      }
      
      // Inizializza standbySettings se non esistono
      if (!settings.standbySettings) {
        settings.standbySettings = {
          enabled: true,
          standbyDays: {}
        };
      }
      
      if (!settings.standbySettings.standbyDays) {
        settings.standbySettings.standbyDays = {};
      }
      
      // Aggiungi le date di test
      let addedCount = 0;
      testDates.forEach(dateStr => {
        if (!settings.standbySettings.standbyDays[dateStr]) {
          settings.standbySettings.standbyDays[dateStr] = {
            selected: true,
            selectedColor: '#1976d2'
          };
          addedCount++;
          addLog(`✅ Aggiunta data di test: ${dateStr}`);
        }
      });
      
      // Salva le settings aggiornate
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
      
      addLog('');
      addLog(`✅ ${addedCount} date di test aggiunte alle settings`);
      addLog('📞 Ora puoi testare la sincronizzazione e le notifiche');
      
    } catch (error) {
      addLog(`❌ Errore aggiunta date di test: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debug Settings</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testSettingsSync}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Settings Sync</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testNotificationScheduling}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Notifiche</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testForcedSync}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Forza Sincronizzazione</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearLog}
        >
          <Text style={styles.buttonText}>Pulisci Log</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={addTestStandbyDates}
        >
          <Text style={styles.buttonText}>Aggiungi Date Test</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer}>
        <Text style={styles.logText}>{debugInfo || 'Premi un pulsante per iniziare i test...'}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#2196F3',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    marginRight: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default DebugSettingsScreen;
