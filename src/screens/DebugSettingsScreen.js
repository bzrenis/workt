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
      addLog('🧪 TEST: Funzionamento notifiche corrette');
      addLog('');
      
      // TEST 1: Notifiche immediate per verificare funzionamento
      addLog('📱 Test 1: Notifica immediata (5 secondi)...');
      await NotificationService.scheduleTestNotification(
        '🧪 Test Immediato', 
        'Questa dovrebbe arrivare tra 5 secondi', 
        5
      );
      
      addLog('� Test 2: Notifica futura (30 secondi)...');
      await NotificationService.scheduleTestNotification(
        '🧪 Test Futuro', 
        'Questa dovrebbe arrivare tra 30 secondi', 
        30
      );
      
      // Verifica notifiche programmate
      setTimeout(async () => {
        const scheduled = await NotificationService.getScheduledNotifications();
        addLog(`\n� Verifica notifiche programmate: ${scheduled.length}`);
        
        if (scheduled.length === 0) {
          addLog('❌ PROBLEMA: Nessuna notifica programmata!');
        } else {
          addLog('✅ Notifiche programmate correttamente');
          scheduled.forEach((notif, i) => {
            if (notif.content.data?.type === 'test_notification') {
              addLog(`  ${i+1}. ${notif.content.title} - Trigger: ${JSON.stringify(notif.trigger)}`);
            }
          });
        }
      }, 2000);

      addLog('');
      addLog('🔔 CONTROLLA ora il telefono per le notifiche!');
      addLog('- Prima notifica: tra 5 secondi');
      addLog('- Seconda notifica: tra 30 secondi');
      addLog('');
      
      // TEST 2: Verifica notifiche reperibilità se richiesto
      addLog('📞 Test 3: Verifica notifiche reperibilità...');
      
      // 1. Mostra le notifiche attuali
      const currentNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const standbyNotifs = currentNotifications.filter(n => n.content.data?.type === 'standby_reminder');
      addLog(`📊 Notifiche reperibilità esistenti: ${standbyNotifs.length}`);
      
      // 2. Programma nuove notifiche usando le date reperibilità
      addLog('📅 Verificando date reperibilità attive...');
      const today = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // Solo prossimo mese per test
      
      const standbyDates = await NotificationService.getStandbyDatesFromSettings(today, endDate);
      addLog(`📊 Date reperibilità trovate: ${standbyDates.length}`);
      
      if (standbyDates.length > 0) {
        standbyDates.slice(0, 5).forEach((date, index) => { // Mostra solo prime 5
          addLog(`   ${index + 1}. ${date}`);
        });
        if (standbyDates.length > 5) {
          addLog(`   ... e altre ${standbyDates.length - 5} date`);
        }
      } else {
        addLog('ℹ️ Nessuna data di reperibilità configurata nel prossimo mese');
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

  // Test DRASTICO anti-delivery immediato
  const testAntiImmediateDelivery = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🚨 === TEST ANTI-DELIVERY IMMEDIATO ===');
      addLog('');

      // FASE 1: Pulizia totale
      addLog('🧹 FASE 1: Pulizia totale...');
      await Notifications.cancelAllScheduledNotificationsAsync();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      addLog(`   Notifiche rimanenti: ${remaining.length}`);
      addLog('');

      // FASE 2: Test SINGOLA notifica con trigger secondi
      addLog('⏰ FASE 2: Test singola notifica (trigger secondi)...');
      
      const testSeconds = 120; // 2 minuti
      const result = await NotificationService.scheduleNotificationWithVerification(
        '🧪 Test Trigger Secondi',
        `Questa dovrebbe arrivare tra ESATTAMENTE ${testSeconds/60} minuti`,
        new Date(Date.now() + testSeconds * 1000),
        {
          type: 'seconds_test',
          expectedSeconds: testSeconds,
          immediate: false
        }
      );
      
      addLog(`   Test trigger secondi: ${result.success ? '✅ OK' : '❌ FAILED'}`);
      if (result.success) {
        addLog(`   ID notifica: ${result.notificationId}`);
        addLog(`   Trigger secondi: ${result.triggerSeconds}`);
      }
      addLog('');

      // FASE 3: Verifica programmazione
      addLog('🔍 FASE 3: Verifica lista notifiche...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      addLog(`   Notifiche programmate: ${scheduled.length}`);
      
      if (scheduled.length > 0) {
        scheduled.forEach((notif, index) => {
          const trigger = notif.trigger;
          let triggerDesc = 'Trigger sconosciuto';
          
          if (trigger.seconds) {
            triggerDesc = `${trigger.seconds} secondi (${Math.floor(trigger.seconds/60)}m ${trigger.seconds%60}s)`;
          } else if (trigger.date) {
            const triggerDate = new Date(trigger.date);
            const now = new Date();
            const diffMs = triggerDate.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / (1000 * 60));
            triggerDesc = `Data: tra ${diffMin} minuti`;
          }
          
          addLog(`     ${index + 1}. ${notif.content.title}`);
          addLog(`        Trigger: ${triggerDesc}`);
          addLog(`        Tipo: ${notif.content.data?.type || 'N/A'}`);
        });
      }
      addLog('');

      // FASE 4: Istruzioni
      addLog('📱 FASE 4: Monitoraggio CRITICO...');
      addLog('   ⏰ GUARDA L\'OROLOGIO e controlla quando arriva la notifica!');
      addLog('   🎯 Dovrebbe arrivare tra ESATTAMENTE 2 minuti');
      addLog('   ✅ Se arriva al momento giusto = PROBLEMA RISOLTO');
      addLog('   ❌ Se arriva SUBITO = Problema Expo non risolvibile');
      addLog('');
      addLog('🚨 IMPORTANTE: Annota l\'ora ESATTA quando ricevi la notifica!');

    } catch (error) {
      addLog(`❌ ERRORE TEST: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test completo sistema notifiche con correzione timing
  const testTimingNotificationSystem = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🚨 === TEST SISTEMA NOTIFICHE TIMING ===');
      addLog('');

      // FASE 1: Verifica permessi
      addLog('📋 FASE 1: Verifica permessi...');
      const permissions = await Notifications.getPermissionsAsync();
      addLog(`   Permessi: ${permissions.status}`);
      
      if (permissions.status !== 'granted') {
        const request = await Notifications.requestPermissionsAsync();
        addLog(`   Richiesti permessi: ${request.status}`);
      }
      addLog('');

      // FASE 2: Pulizia completa
      addLog('🧹 FASE 2: Pulizia completa notifiche...');
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Aspetta per assicurarsi che la cancellazione sia effettiva
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const remaining = await Notifications.getAllScheduledNotificationsAsync();
      addLog(`   Notifiche rimanenti dopo pulizia: ${remaining.length}`);
      addLog('');

      // FASE 3: Test progressivo con timing diversi
      addLog('⏰ FASE 3: Test timing progressivo...');
      
      const testCases = [
        { delay: 30, label: '30 secondi' },
        { delay: 90, label: '1.5 minuti' },
        { delay: 180, label: '3 minuti' },
        { delay: 300, label: '5 minuti' }
      ];

      const testResults = [];

      for (const testCase of testCases) {
        addLog(`   🧪 Test ${testCase.label}...`);
        
        const targetDate = new Date();
        targetDate.setSeconds(targetDate.getSeconds() + testCase.delay);
        
        const result = await NotificationService.scheduleNotificationWithVerification(
          `🧪 Test ${testCase.label}`,
          `Questa notifica dovrebbe arrivare tra ${testCase.label}`,
          targetDate,
          {
            type: 'timing_test',
            expectedDelay: testCase.delay,
            testLabel: testCase.label,
            immediate: false
          }
        );
        
        testResults.push({
          label: testCase.label,
          success: result.success,
          notificationId: result.notificationId
        });
        
        addLog(`   ${result.success ? '✅' : '❌'} ${testCase.label}: ${result.success ? 'OK' : result.reason}`);
        
        // Breve pausa tra i test
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      addLog('');

      // FASE 4: Verifica che le notifiche siano effettivamente programmate
      addLog('🔍 FASE 4: Verifica notifiche programmate...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      addLog(`   Notifiche totali programmate: ${finalScheduled.length}`);
      
      const testNotifications = finalScheduled.filter(notif => 
        notif.content?.data?.type === 'timing_test'
      );
      addLog(`   Notifiche test trovate: ${testNotifications.length}`);
      
      // Analizza timing di ogni notifica test
      const now = new Date();
      testNotifications.forEach((notif, index) => {
        if (notif.trigger?.date) {
          const triggerDate = new Date(notif.trigger.date);
          const timeDiff = triggerDate.getTime() - now.getTime();
          const minutesDiff = Math.floor(timeDiff / (1000 * 60));
          const secondsDiff = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          addLog(`     ${index + 1}. ${notif.content.data?.testLabel || 'Test'}: tra ${minutesDiff}m ${secondsDiff}s`);
        }
      });
      
      addLog('');

      // FASE 5: Istruzioni per il monitoraggio
      addLog('📱 FASE 5: Monitoraggio...');
      addLog('   ⏰ Controlla il telefono nei prossimi minuti');
      addLog('   ✅ Se le notifiche arrivano ai tempi giusti = PROBLEMA RISOLTO');
      addLog('   ❌ Se arrivano immediatamente = PROBLEMA PERSISTE');
      addLog('');
      
      addLog('📊 RIEPILOGO TEST:');
      testResults.forEach(result => {
        addLog(`   ${result.success ? '✅' : '❌'} ${result.label}: ${result.success ? 'Programmato' : 'Fallito'}`);
      });
      
      const allSuccessful = testResults.every(r => r.success);
      addLog('');
      addLog(`🎯 RISULTATO FINALE: ${allSuccessful ? '✅ TUTTI I TEST SUPERATI' : '❌ ALCUNI TEST FALLITI'}`);
      addLog(`📊 Successi: ${testResults.filter(r => r.success).length}/${testResults.length}`);
      addLog(`📱 Notifiche programmate: ${finalScheduled.length}`);

    } catch (error) {
      addLog(`❌ ERRORE TEST SISTEMA: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const testEmergencyNotificationFix = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🚨 === RIPARAZIONE EMERGENZA NOTIFICHE ===');
      addLog('');
      
      // FASE 1: Pulizia completa
      addLog('🧹 FASE 1: Pulizia completa sistema...');
      const cleanup = await NotificationService.cleanupAllNotifications();
      addLog(`   Pulizia: ${cleanup ? '✅ OK' : '❌ FAILED'}`);
      addLog('');

      // FASE 2: Riparazione di emergenza
      addLog('🚨 FASE 2: Riparazione di emergenza...');
      const emergency = await NotificationService.emergencyNotificationFix();
      addLog(`   Riparazione: ${emergency.success ? '✅ OK' : '❌ FAILED'}`);
      if (emergency.success) {
        addLog(`   Notifiche programmate: ${emergency.notificationsScheduled}`);
      } else {
        addLog(`   Errore: ${emergency.reason}`);
      }
      addLog('');

      // FASE 3: Diagnostica avanzata
      addLog('🔧 FASE 3: Diagnostica avanzata...');
      const diagnostic = await NotificationService.advancedNotificationDiagnostic();
      
      if (diagnostic) {
        addLog(`📊 Permessi: ${diagnostic.permissions}`);
        addLog(`📊 Totali: ${diagnostic.totalScheduled}`);
        addLog(`📊 Immediate (problema): ${diagnostic.immediateCount}`);
        addLog(`📊 Future (corrette): ${diagnostic.futureCount}`);
        addLog(`📊 Scadute: ${diagnostic.expiredCount}`);
        addLog(`📊 Test: ${diagnostic.testResult ? '✅' : '❌'}`);
        addLog(`📊 Test trovate: ${diagnostic.testNotificationsFound}`);
      } else {
        addLog('❌ Diagnostica fallita');
      }
      addLog('');

      // FASE 4: Test timing specifico
      addLog('⏰ FASE 4: Test timing specifico...');
      
      addLog('Programmando notifica test tra 1 minuto...');
      const test1min = await NotificationService.scheduleTestNotification(
        '🧪 Test 1 Minuto',
        'Questa dovrebbe arrivare tra 1 minuto',
        60
      );
      addLog(`Test 1 min: ${test1min ? '✅' : '❌'}`);

      addLog('Programmando notifica test tra 3 minuti...');
      const test3min = await NotificationService.scheduleTestNotification(
        '🧪 Test 3 Minuti', 
        'Questa dovrebbe arrivare tra 3 minuti',
        180
      );
      addLog(`Test 3 min: ${test3min ? '✅' : '❌'}`);
      addLog('');

      // FASE 5: Verifica finale
      addLog('📊 FASE 5: Verifica finale...');
      setTimeout(async () => {
        try {
          const final = await NotificationService.getScheduledNotifications();
          addLog(`\n📊 VERIFICA FINALE: ${final.length} notifiche programmate`);
          
          final.forEach((notif, i) => {
            if (notif.content.data?.type === 'test_notification') {
              const scheduledDate = notif.trigger?.date ? new Date(notif.trigger.date) : null;
              const now = new Date();
              const timeDiff = scheduledDate ? Math.floor((scheduledDate - now) / (1000 * 60)) : 'N/A';
              addLog(`  ${i+1}. ${notif.content.title} - tra ${timeDiff} minuti`);
            }
          });

          if (final.length === 0) {
            addLog('❌ PROBLEMA GRAVE: Nessuna notifica programmata!');
            addLog('💡 Il sistema di notifiche potrebbe essere rotto');
            addLog('');
            addLog('🔧 SOLUZIONI:');
            addLog('1. Riavvia completamente l\'app');
            addLog('2. Controlla impostazioni notifiche dispositivo');
            addLog('3. Prova su dispositivo fisico');
          } else {
            addLog('✅ Sistema sembra funzionare');
          }

        } catch (error) {
          addLog(`❌ Errore verifica finale: ${error.message}`);
        }
      }, 3000);

      addLog('🔔 CONTROLLA il telefono nelle prossime ore!');
      addLog('Se le notifiche arrivano ai tempi giusti, il problema è risolto.');
      addLog('');

    } catch (error) {
      addLog(`❌ Errore riparazione emergenza: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test disperato per sistema Expo con trigger multipli
  const testDesperateExpoTriggers = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🆘 === TEST DISPERATO TRIGGER EXPO ===');
      addLog('');
      addLog('🎯 Testando TUTTI i tipi di trigger per trovarne uno funzionante');
      addLog('');
      
      // 1. Cancella tutto
      await Notifications.cancelAllScheduledNotificationsAsync();
      addLog('🗑️ Reset completo sistema');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Test con trigger DIVERSI per vedere quale funziona
      const testConfigs = [
        { 
          name: 'Seconds (60s)', 
          getTrigger: () => ({ seconds: 60 }),
          expectedDelay: '1 minuto'
        },
        { 
          name: 'Seconds (120s)', 
          getTrigger: () => ({ seconds: 120 }),
          expectedDelay: '2 minuti'
        },
        { 
          name: 'Date (1 min)', 
          getTrigger: () => {
            const date = new Date();
            date.setMinutes(date.getMinutes() + 1);
            return { date };
          },
          expectedDelay: '1 minuto'
        },
        { 
          name: 'Date (2 min)', 
          getTrigger: () => {
            const date = new Date();
            date.setMinutes(date.getMinutes() + 2);
            return { date };
          },
          expectedDelay: '2 minuti'
        },
        { 
          name: 'Hour/Minute', 
          getTrigger: () => {
            const now = new Date();
            return { 
              hour: now.getHours(),
              minute: now.getMinutes() + 1
            };
          },
          expectedDelay: '1 minuto (orario)'
        }
      ];
      
      const results = [];
      
      for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        addLog(`🧪 Test ${i + 1}/5: ${config.name}`);
        addLog(`   Atteso: ${config.expectedDelay}`);
        
        try {
          const trigger = config.getTrigger();
          addLog(`   Trigger: ${JSON.stringify(trigger)}`);
          
          const startTime = new Date();
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `🧪 Test ${i + 1}: ${config.name}`,
              body: `Dovrebbe arrivare dopo ${config.expectedDelay}. Ora programmazione: ${startTime.toLocaleTimeString('it-IT')}`,
              sound: 'default',
              data: { 
                type: 'desperate_test',
                testNumber: i + 1,
                testType: config.name,
                expectedDelay: config.expectedDelay,
                scheduledAt: startTime.toISOString(),
                trigger: trigger
              }
            },
            trigger
          });
          
          addLog(`   ✅ Programmata - ID: ${notificationId.substring(0, 8)}...`);
          results.push({
            testNumber: i + 1,
            name: config.name,
            success: true,
            notificationId,
            expectedDelay: config.expectedDelay
          });
          
        } catch (error) {
          addLog(`   ❌ Errore: ${error.message}`);
          results.push({
            testNumber: i + 1,
            name: config.name,
            success: false,
            error: error.message
          });
        }
        
        // Piccola pausa tra i test
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      addLog('');
      addLog('🔍 Verifica notifiche programmate...');
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      addLog(`📊 Totali programmate: ${scheduled.length}`);
      
      if (scheduled.length > 0) {
        addLog('📋 Lista dettagliata:');
        scheduled.forEach((notif, idx) => {
          const triggerStr = JSON.stringify(notif.trigger);
          addLog(`   ${idx + 1}. ${notif.content.title}`);
          addLog(`      Trigger: ${triggerStr}`);
          addLog(`      Data: ${notif.content.data?.testType || 'N/A'}`);
        });
      }
      
      addLog('');
      addLog('⏰ === MONITORAGGIO CRITICO ===');
      addLog('📱 Adesso osserva ATTENTAMENTE quando arrivano le notifiche:');
      addLog('');
      
      results.forEach(result => {
        if (result.success) {
          addLog(`🧪 Test ${result.testNumber} (${result.name}):`);
          addLog(`   📅 Atteso: ${result.expectedDelay}`);
          addLog(`   🎯 Se arriva al momento giusto = QUESTO TRIGGER FUNZIONA!`);
          addLog(`   ❌ Se arriva subito = Trigger rotto`);
          addLog('');
        }
      });
      
      addLog('🚨 IMPORTANTE: Annota quale test arriva al momento giusto!');
      addLog('Quello sarà il trigger da usare per risolvere il problema.');
      
    } catch (error) {
      addLog(`❌ Errore test disperato: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test veloce trigger nativi Expo
  const testNativeExpoTriggers = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('⚡ === TEST VELOCE TRIGGER NATIVI ===');
      addLog('');
      
      const notificationService = new NotificationService();
      const results = await notificationService.testAllTriggerTypes();
      
      addLog('📊 RISULTATI:');
      addLog('');
      
      results.forEach(result => {
        if (result.success) {
          addLog(`✅ ${result.testNumber}. ${result.name}`);
          addLog(`   Trigger: ${JSON.stringify(result.trigger)}`);
          addLog(`   Atteso: ${result.expectedMinutes} min`);
          addLog(`   ID: ${result.notificationId.substring(0, 8)}...`);
        } else {
          addLog(`❌ ${result.testNumber}. ${result.name} - ERRORE`);
          addLog(`   ${result.error}`);
        }
        addLog('');
      });
      
      const successful = results.filter(r => r.success).length;
      addLog(`📊 RIEPILOGO: ${successful}/${results.length} trigger programmati`);
      addLog('');
      addLog('⏰ ATTENDI 1-3 MINUTI e osserva quale arriva al momento giusto!');
      addLog('Il trigger che funziona sarà la soluzione al problema.');
      
    } catch (error) {
      addLog(`❌ Errore test trigger nativi: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test sistema notifiche SEMPLICE che dovrebbe funzionare
  const testSimpleNotificationSystem = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🔧 === TEST SISTEMA NOTIFICHE SEMPLICE ===');
      addLog('');
      addLog('🎯 Testiamo il sistema più basilare possibile');
      addLog('');
      
      // 1. Verifica permessi
      const permissions = await Notifications.getPermissionsAsync();
      addLog(`📋 Permessi: ${permissions.status}`);
      
      if (permissions.status !== 'granted') {
        addLog('❌ Permessi non concessi, richiedendo...');
        const { status } = await Notifications.requestPermissionsAsync();
        addLog(`📋 Nuovi permessi: ${status}`);
        
        if (status !== 'granted') {
          addLog('❌ ERRORE: Impossibile ottenere permessi notifiche!');
          return;
        }
      }
      
      // 2. Cancella tutto
      await Notifications.cancelAllScheduledNotificationsAsync();
      addLog('🗑️ Tutte le notifiche esistenti cancellate');
      
      // 3. Test BASICO - solo trigger seconds
      addLog('');
      addLog('🧪 Test 1: Notifica tra 30 secondi (trigger seconds)');
      
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 Test 30 Secondi',
            body: 'Se questa arriva tra 30 secondi ESATTI, il sistema funziona!',
            sound: 'default',
            data: { 
              type: 'simple_test',
              programmedAt: new Date().toISOString(),
              expectedDelay: 30
            }
          },
          trigger: {
            seconds: 30
          }
        });
        
        addLog(`✅ Programmata con ID: ${notificationId}`);
        addLog(`⏰ Ora programmazione: ${new Date().toLocaleTimeString('it-IT')}`);
        
      } catch (error) {
        addLog(`❌ Errore programmazione: ${error.message}`);
      }
      
      // 4. Verifica programmazione
      addLog('');
      addLog('🔍 Verifica...');
      
      setTimeout(async () => {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        addLog(`📊 Notifiche programmate: ${scheduled.length}`);
        
        if (scheduled.length > 0) {
          scheduled.forEach((notif, i) => {
            addLog(`  ${i+1}. ${notif.content.title}`);
            addLog(`     Trigger: ${JSON.stringify(notif.trigger)}`);
          });
        }
      }, 2000);
      
      addLog('');
      addLog('⏰ === OSSERVAZIONE CRITICA ===');
      addLog('🕐 Guarda l\'orologio e annota QUANDO arriva la notifica:');
      addLog('');
      addLog('✅ Se arriva tra 30 secondi = SISTEMA OK');
      addLog('❌ Se arriva SUBITO = Sistema Expo rotto');
      addLog('');
      addLog('🚨 IMPORTANTE: Annota l\'ora ESATTA!');
      
    } catch (error) {
      addLog(`❌ Errore generale: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test NUOVO sistema notifiche da zero
  const testNewNotificationSystem = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🆕 === TEST NUOVO SISTEMA NOTIFICHE ===');
      addLog('');
      addLog('🚀 Testando il sistema ricreato da zero...');
      
      // Importa il nuovo sistema
      const NotificationServiceNew = (await import('../services/NotificationService_NEW.js')).default;
      const newService = new NotificationServiceNew();
      
      const result = await newService.testBasicSystem();
      
      if (result.success) {
        addLog('✅ Nuovo sistema inizializzato correttamente!');
        addLog('⏱️ Attendi 30 secondi per verificare il timing...');
        addLog('');
        addLog('📊 OSSERVA SE LA NOTIFICA ARRIVA:');
        addLog('   ✅ Dopo 30 secondi = SUCCESSO!');
        addLog('   ❌ Subito = Stesso problema di prima');
        addLog('   ❌ Mai = Altro errore');
      } else {
        addLog(`❌ Errore nuovo sistema: ${result.reason}`);
      }

    } catch (error) {
      addLog(`❌ Errore generale: ${error.message}`);
      console.error('Errore test nuovo sistema:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testMultipleTriggers = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🧪 === TEST TRIGGER MULTIPLI ===');
      addLog('');
      addLog('🎯 Testiamo diversi delay per trovare quello che funziona');
      
      const NotificationServiceNew = (await import('../services/NotificationService_NEW.js')).default;
      const newService = new NotificationServiceNew();
      
      const results = await newService.testMultipleTriggers();
      
      addLog(`🚀 Test avviati: ${results.length} trigger diversi`);
      addLog('');
      addLog('📅 TRIGGER PROGRAMMATI:');
      results.forEach((result, index) => {
        if (result.success) {
          addLog(`   ${index + 1}. ${result.testName} - ${result.expected}`);
        } else {
          addLog(`   ${index + 1}. ${result.testName} - ERRORE: ${result.error}`);
        }
      });
      
      addLog('');
      addLog('⏱️ NEI PROSSIMI 2 MINUTI OSSERVA:');
      addLog('   - Quale trigger (se ce n\'è uno) funziona');
      addLog('   - Se tutti arrivano subito (problema confermato)');
      addLog('   - Se alcuni funzionano e altri no');

    } catch (error) {
      addLog(`❌ Errore test trigger multipli: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAlternativeSystem = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🚀 === TEST SISTEMA ALTERNATIVO ===');
      addLog('');
      addLog('💡 Sistema che NON usa Expo Notifications per il timing');
      addLog('   Usa timer JavaScript nativi + Alert');
      addLog('');
      
      // Importa il sistema alternativo
      const AlternativeService = (await import('../services/AlternativeNotificationService.js')).default;
      const altService = new AlternativeService();
      
      const result = await altService.testAlternativeSystem();
      
      if (result.success) {
        addLog('✅ Sistema alternativo inizializzato!');
        addLog(`📅 Metodo: ${result.method}`);
        addLog(`🆔 ID notifica: ${result.notificationId}`);
        addLog('');
        addLog('⏰ ATTENDI 30 SECONDI:');
        addLog('   Se appare un ALERT dopo 30 secondi,');
        addLog('   allora il problema è SOLO in Expo Notifications!');
        addLog('');
        addLog('🎯 QUESTO SISTEMA ALTERNATIVO PUÒ SOSTITUIRE');
        addLog('   le notifiche Expo per il timing preciso');
      } else {
        addLog(`❌ Errore sistema alternativo: ${result.reason}`);
      }

    } catch (error) {
      addLog(`❌ Errore generale: ${error.message}`);
      console.error('Errore test sistema alternativo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testAlternativeMultiple = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🎯 === TEST TIMER JAVASCRIPT MULTIPLI ===');
      addLog('');
      addLog('🚀 Testiamo se i timer JavaScript funzionano meglio');
      
      const AlternativeService = (await import('../services/AlternativeNotificationService.js')).default;
      const altService = new AlternativeService();
      
      const result = await altService.testMultipleIntervals();
      
      if (result.success) {
        addLog(`✅ ${result.testsScheduled} timer JavaScript attivati!`);
        addLog('');
        addLog('📊 DOVREBBERO APPARIRE 3 ALERT:');
        addLog('   🕐 Primo alert dopo 10 secondi');
        addLog('   🕐 Secondo alert dopo 30 secondi');
        addLog('   🕐 Terzo alert dopo 60 secondi');
        addLog('');
        addLog('🎯 Se questi funzionano PERFETTAMENTE,');
        addLog('   possiamo sostituire Expo con questo sistema!');
      } else {
        addLog(`❌ Errore: ${result.reason}`);
      }

    } catch (error) {
      addLog(`❌ Errore: ${error.message}`);
      console.error('Errore completo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testHybridSystem = async () => {
    setIsLoading(true);
    clearLog();
    
    try {
      addLog('🔄 === TEST SISTEMA IBRIDO ===');
      addLog('');
      addLog('🎯 Testiamo il sistema misto:');
      addLog('   📱 Expo per alcune notifiche');
      addLog('   🚀 Timer JavaScript per timing preciso');
      addLog('');
      
      // Ottieni le impostazioni correnti
      const settingsStr = await AsyncStorage.getItem('notification_settings');
      let settings = {};
      
      if (settingsStr) {
        settings = JSON.parse(settingsStr);
        addLog('📋 Settings notifiche trovate');
      } else {
        addLog('⚠️ Nessuna settings, usando default per test');
        settings = {
          enabled: true,
          workReminders: { enabled: true, morningTime: '09:00', weekendsEnabled: false },
          timeEntryReminders: { enabled: true, time: '18:00', weekendsEnabled: false }
        };
      }
      
      // Forza abilitazione per test
      settings.enabled = true;
      settings.workReminders.enabled = true;
      settings.timeEntryReminders.enabled = true;
      
      addLog('🚀 Attivando sistema ibrido...');
      
      // Attiva il sistema alternativo nel NotificationService
      notificationService.setUseAlternativeSystem(true);
      
      // Cancella tutto prima del test
      await notificationService.cancelAllNotifications();
      addLog('🗑️ Notifiche esistenti cancellate');
      
      // Programma con sistema ibrido
      await notificationService.scheduleNotifications(settings);
      
      addLog('✅ Sistema ibrido attivato!');
      addLog('');
      addLog('📊 VERIFICA NEI PROSSIMI GIORNI:');
      addLog('   - I promemoria arrivano al momento giusto');
      addLog('   - Usa timer JavaScript per timing preciso');
      addLog('   - Mantiene compatibilità Expo quando serve');

    } catch (error) {
      addLog(`❌ Errore sistema ibrido: ${error.message}`);
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
          <Text style={styles.buttonText}>Test Notifiche Base</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.emergencyButton, isLoading && styles.buttonDisabled]} 
          onPress={testSimpleNotificationSystem}
          disabled={isLoading}
        >
          <Text style={styles.emergencyButtonText}>🔧 TEST SISTEMA SEMPLICE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.successButton, isLoading && styles.buttonDisabled]} 
          onPress={testNewNotificationSystem}
          disabled={isLoading}
        >
          <Text style={styles.successButtonText}>🆕 TEST NUOVO SISTEMA</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.warningButton, isLoading && styles.buttonDisabled]} 
          onPress={testMultipleTriggers}
          disabled={isLoading}
        >
          <Text style={styles.warningButtonText}>🧪 TEST TRIGGER MULTIPLI</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.alternativeButton, isLoading && styles.buttonDisabled]} 
          onPress={testAlternativeSystem}
          disabled={isLoading}
        >
          <Text style={styles.alternativeButtonText}>🚀 TEST SISTEMA ALTERNATIVO</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.timerButton, isLoading && styles.buttonDisabled]} 
          onPress={testAlternativeMultiple}
          disabled={isLoading}
        >
          <Text style={styles.timerButtonText}>🎯 TEST TIMER JAVASCRIPT</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.hybridButton, isLoading && styles.buttonDisabled]} 
          onPress={testHybridSystem}
          disabled={isLoading}
        >
          <Text style={styles.hybridButtonText}>🔄 ATTIVA SISTEMA IBRIDO</Text>
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
  emergencyButton: {
    backgroundColor: '#ff5722',
    borderWidth: 2,
    borderColor: '#d32f2f',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successButton: {
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#388e3c',
  },
  successButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  warningButton: {
    backgroundColor: '#ff9800',
    borderWidth: 2,
    borderColor: '#f57c00',
  },
  warningButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  alternativeButton: {
    backgroundColor: '#673ab7',
    borderWidth: 2,
    borderColor: '#512da8',
  },
  alternativeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerButton: {
    backgroundColor: '#00bcd4',
    borderWidth: 2,
    borderColor: '#0097a7',
  },
  timerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hybridButton: {
    backgroundColor: '#2e7d32',
    borderWidth: 2,
    borderColor: '#1b5e20',
  },
  hybridButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
