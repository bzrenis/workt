// 🔧 DEBUG NOTIFICHE - Da eseguire nell'app React Native
// Verifica quale sistema sta funzionando

import * as Notifications from 'expo-notifications';

// Funzione principale di debug da chiamare nell'app
export const debugNotificationSystems = async () => {
  console.log('🔧 === DEBUG SISTEMI NOTIFICHE ===');
  console.log(`📅 Data/Ora: ${new Date().toISOString()}`);
  
  const debug = {
    timestamp: new Date().toISOString(),
    expo: {},
    javascript: {},
    currentService: {},
    recommendations: []
  };

  // 1. TEST JAVASCRIPT TIMERS (Base)
  console.log('\n🚀 1. TEST JAVASCRIPT TIMERS');
  try {
    const jsTest = await testJavaScriptTimers();
    debug.javascript = jsTest;
    console.log(`✅ JavaScript Timers: ${jsTest.working ? 'FUNZIONANO' : 'NON FUNZIONANO'}`);
    if (jsTest.working) {
      console.log(`   🎯 Precisione media: ${jsTest.averageAccuracy}ms`);
    }
  } catch (error) {
    console.error('❌ Errore test JavaScript:', error);
    debug.javascript = { working: false, error: error.message };
  }

  // 2. TEST EXPO NOTIFICATIONS
  console.log('\n🔋 2. TEST EXPO NOTIFICATIONS');
  try {
    const expoTest = await testExpoNotifications();
    debug.expo = expoTest;
    console.log(`✅ Expo Notifications: ${expoTest.working ? 'FUNZIONANO' : 'NON FUNZIONANO'}`);
    if (expoTest.working) {
      console.log(`   📱 Permessi: ${expoTest.permissions}`);
      console.log(`   📅 Notifiche programmate: ${expoTest.scheduledCount}`);
    }
  } catch (error) {
    console.error('❌ Errore test Expo:', error);
    debug.expo = { working: false, error: error.message };
  }

  // 3. VERIFICA NOTIFICATION SERVICE ATTUALE
  console.log('\n🔧 3. VERIFICA NOTIFICATION SERVICE');
  try {
    const serviceTest = await testCurrentNotificationService();
    debug.currentService = serviceTest;
    console.log(`✅ NotificationService: ${serviceTest.working ? 'ATTIVO' : 'NON ATTIVO'}`);
    console.log(`   🚀 Sistema alternativo: ${serviceTest.usingAlternative ? 'ATTIVO' : 'INATTIVO'}`);
    console.log(`   📊 Timer attivi: ${serviceTest.activeTimers || 0}`);
    console.log(`   📱 Notifiche Expo: ${serviceTest.expoNotifications || 0}`);
  } catch (error) {
    console.error('❌ Errore verifica service:', error);
    debug.currentService = { working: false, error: error.message };
  }

  // 4. ANALISI E RACCOMANDAZIONI
  console.log('\n📊 4. ANALISI FINALE');
  
  const jsWorking = debug.javascript.working;
  const expoWorking = debug.expo.working;
  const serviceWorking = debug.currentService.working;
  
  console.log(`🚀 JavaScript Timers: ${jsWorking ? '✅' : '❌'}`);
  console.log(`🔋 Expo Notifications: ${expoWorking ? '✅' : '❌'}`);
  console.log(`🔧 Current Service: ${serviceWorking ? '✅' : '❌'}`);

  // Raccomandazioni
  if (jsWorking && expoWorking) {
    debug.recommendations.push('IBRIDO: Mantieni sistema attuale (JavaScript + Expo)');
    console.log('🎯 RACCOMANDAZIONE: Sistema IBRIDO funziona perfettamente');
  } else if (jsWorking && !expoWorking) {
    debug.recommendations.push('JAVASCRIPT: Disattiva Expo, usa solo JavaScript');
    console.log('🎯 RACCOMANDAZIONE: Usa SOLO JavaScript Timers');
  } else if (!jsWorking && expoWorking) {
    debug.recommendations.push('EXPO: Disattiva JavaScript, usa solo Expo');
    console.log('🎯 RACCOMANDAZIONE: Usa SOLO Expo Notifications');
  } else {
    debug.recommendations.push('PROBLEMA: Nessun sistema funziona - verificare configurazione');
    console.log('🎯 RACCOMANDAZIONE: PROBLEMA CRITICO - Nessun sistema funziona');
  }

  // Status attuale del servizio
  if (debug.currentService.usingAlternative && jsWorking) {
    console.log('✅ STATO OTTIMALE: Sistema JavaScript attivo e funzionante');
  } else if (!debug.currentService.usingAlternative && expoWorking) {
    console.log('✅ STATO OTTIMALE: Sistema Expo attivo e funzionante');
  } else {
    console.log('⚠️ STATO SUBOTTIMALE: Sistema attivo non corrisponde a quello funzionante');
  }

  console.log('\n📋 REPORT COMPLETO:');
  console.log(JSON.stringify(debug, null, 2));

  return debug;
};

// Test specifico per JavaScript Timers
const testJavaScriptTimers = () => {
  return new Promise((resolve) => {
    console.log('   ⏰ Avvio test timer JavaScript...');
    const results = [];
    let completedTests = 0;
    const totalTests = 2;

    // Test 1: Timer breve (1 secondo)
    const start1 = Date.now();
    setTimeout(() => {
      const duration1 = Date.now() - start1;
      const accuracy1 = Math.abs(duration1 - 1000);
      results.push({ target: 1000, actual: duration1, accuracy: accuracy1 });
      completedTests++;
      
      if (completedTests === totalTests) {
        finishJavaScriptTest();
      }
    }, 1000);

    // Test 2: Timer medio (3 secondi)
    const start2 = Date.now();
    setTimeout(() => {
      const duration2 = Date.now() - start2;
      const accuracy2 = Math.abs(duration2 - 3000);
      results.push({ target: 3000, actual: duration2, accuracy: accuracy2 });
      completedTests++;
      
      if (completedTests === totalTests) {
        finishJavaScriptTest();
      }
    }, 3000);

    function finishJavaScriptTest() {
      const averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
      const allAccurate = results.every(r => r.accuracy < 200); // Entro 200ms
      
      resolve({
        working: allAccurate,
        averageAccuracy: Math.round(averageAccuracy),
        results: results,
        reliability: averageAccuracy < 100 ? 'ALTA' : averageAccuracy < 300 ? 'MEDIA' : 'BASSA'
      });
    }
  });
};

// Test specifico per Expo Notifications
const testExpoNotifications = async () => {
  console.log('   📱 Verifica Expo Notifications...');
  
  try {
    // Verifica permessi
    const { status } = await Notifications.getPermissionsAsync();
    console.log(`   📋 Permessi attuali: ${status}`);
    
    // Richiedi permessi se necessario
    let finalStatus = status;
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = newStatus;
      console.log(`   📋 Nuovi permessi: ${newStatus}`);
    }

    // Verifica notifiche programmate
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`   📅 Notifiche già programmate: ${scheduled.length}`);

    // Test programmazione notifica
    let canSchedule = false;
    if (finalStatus === 'granted') {
      try {
        console.log('   🧪 Test programmazione notifica...');
        const testId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 Test Debug',
            body: 'Test notifica per debug sistemi',
            data: { type: 'debug_test' }
          },
          trigger: { seconds: 60 }, // 1 minuto nel futuro
        });
        
        // Verifica che sia stata programmata
        const newScheduled = await Notifications.getAllScheduledNotificationsAsync();
        canSchedule = newScheduled.length > scheduled.length;
        
        // Cancella la notifica di test
        await Notifications.cancelScheduledNotificationAsync(testId);
        console.log(`   🧪 Test completato: ${canSchedule ? 'SUCCESSO' : 'FALLITO'}`);
        
      } catch (scheduleError) {
        console.error('   ❌ Errore programmazione test:', scheduleError);
        canSchedule = false;
      }
    }

    return {
      working: finalStatus === 'granted' && canSchedule,
      permissions: finalStatus,
      scheduledCount: scheduled.length,
      canSchedule: canSchedule
    };

  } catch (error) {
    console.error('   ❌ Errore generale Expo:', error);
    return {
      working: false,
      error: error.message
    };
  }
};

// Test del NotificationService attuale
const testCurrentNotificationService = async () => {
  console.log('   🔧 Verifica NotificationService...');
  
  try {
    // Prova a importare il servizio (questo potrebbe non funzionare in un test isolato)
    // In un'app reale, avresti accesso diretto all'istanza
    
    // Simulazione verifica service (sostituisci con logica reale nell'app)
    const simulatedServiceState = {
      working: true,
      usingAlternative: true, // Basato su quello che abbiamo visto nel codice
      activeTimers: 0, // Da ottenere dal servizio reale
      expoNotifications: 0 // Da ottenere dal servizio reale
    };

    // In un'app reale, faresti qualcosa del genere:
    // const notificationService = getNotificationServiceInstance();
    // const alternativeStats = notificationService.alternativeService?.getActiveTimersStats();
    // const expoNotifications = await notificationService.getScheduledNotifications();
    
    console.log(`   🔧 Service state: ${JSON.stringify(simulatedServiceState)}`);
    
    return simulatedServiceState;

  } catch (error) {
    console.error('   ❌ Errore verifica service:', error);
    return {
      working: false,
      error: error.message
    };
  }
};

// Test rapido da eseguire immediatamente
export const quickDebugTest = () => {
  console.log('⚡ === QUICK DEBUG TEST ===');
  
  // Test JavaScript immediato
  console.log('🚀 Test JavaScript Timer (2 secondi)...');
  const start = Date.now();
  setTimeout(() => {
    const duration = Date.now() - start;
    const accuracy = Math.abs(duration - 2000);
    console.log(`✅ Timer completato: ${duration}ms (target: 2000ms)`);
    console.log(`🎯 Precisione: ${accuracy}ms di differenza`);
    console.log(`🔧 Valutazione: ${accuracy < 50 ? '🟢 OTTIMA' : accuracy < 200 ? '🟡 BUONA' : '🔴 SCARSA'}`);
  }, 2000);
  
  console.log('⏰ Timer avviato, risultato tra 2 secondi...');
  
  return 'Timer JavaScript avviato';
};

// Funzione per testare il sistema in uso nell'app
export const testCurrentSystem = async () => {
  console.log('🔍 === TEST SISTEMA ATTUALE ===');
  
  try {
    // Test del sistema JavaScript (sempre disponibile)
    const jsTest = await testJavaScriptTimers();
    console.log(`🚀 JavaScript: ${jsTest.working ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);
    
    // Test delle notifiche Expo
    const expoTest = await testExpoNotifications();
    console.log(`🔋 Expo: ${expoTest.working ? '✅ FUNZIONA' : '❌ NON FUNZIONA'}`);
    
    // Raccomandazione finale
    if (jsTest.working && expoTest.working) {
      console.log('🎯 RISULTATO: Entrambi i sistemi funzionano - Sistema IBRIDO è ottimale');
      return 'IBRIDO_FUNZIONA';
    } else if (jsTest.working) {
      console.log('🎯 RISULTATO: Solo JavaScript funziona - Usa sistema alternativo');
      return 'SOLO_JAVASCRIPT';
    } else if (expoTest.working) {
      console.log('🎯 RISULTATO: Solo Expo funziona - Disattiva sistema alternativo');
      return 'SOLO_EXPO';
    } else {
      console.log('🎯 RISULTATO: Nessun sistema funziona - PROBLEMA CRITICO');
      return 'NESSUNO_FUNZIONA';
    }
    
  } catch (error) {
    console.error('❌ Errore nel test sistema attuale:', error);
    return 'ERRORE_TEST';
  }
};

export default debugNotificationSystems;
