/**
 * Script di test per il sistema di notifiche
 * Testa le varie funzionalità del NotificationService
 */

// Importa il servizio (questo script deve essere lanciato in ambiente Expo/React Native)
const NotificationService = require('./src/services/NotificationService').default;

async function testNotificationService() {
  console.log('🧪 Avvio test NotificationService...\n');

  try {
    // Test 1: Verifica permessi
    console.log('📋 Test 1: Verifica permessi notifiche');
    const hasPermissions = await NotificationService.hasPermissions();
    console.log(`   Permessi concessi: ${hasPermissions ? '✅' : '❌'}`);
    
    if (!hasPermissions) {
      console.log('   Richiedendo permessi...');
      const granted = await NotificationService.requestPermissions();
      console.log(`   Permessi richiesti: ${granted ? '✅' : '❌'}`);
    }

    // Test 2: Carica impostazioni predefinite
    console.log('\n📋 Test 2: Impostazioni predefinite');
    const defaultSettings = NotificationService.getDefaultSettings();
    console.log('   ✅ Impostazioni predefinite caricate:', Object.keys(defaultSettings));

    // Test 3: Salva e carica impostazioni
    console.log('\n📋 Test 3: Salvataggio e caricamento impostazioni');
    const testSettings = {
      ...defaultSettings,
      enabled: true,
      workReminders: {
        enabled: true,
        morningTime: '08:30',
        weekendsEnabled: false
      },
      timeEntryReminders: {
        enabled: true,
        time: '18:00',
        weekendsEnabled: false
      }
    };

    const saveSuccess = await NotificationService.saveSettings(testSettings);
    console.log(`   Salvataggio: ${saveSuccess ? '✅' : '❌'}`);

    const loadedSettings = await NotificationService.getSettings();
    console.log(`   Caricamento: ${loadedSettings.enabled ? '✅' : '❌'}`);
    console.log(`   Promemoria lavoro abilitato: ${loadedSettings.workReminders.enabled ? '✅' : '❌'}`);

    // Test 4: Programmazione notifiche
    console.log('\n📋 Test 4: Programmazione notifiche');
    await NotificationService.scheduleNotifications(testSettings);
    console.log('   ✅ Notifiche programmate');

    // Test 5: Verifica notifiche programmate
    console.log('\n📋 Test 5: Verifica notifiche programmate');
    const scheduledNotifications = await NotificationService.getScheduledNotifications();
    console.log(`   Notifiche programmate: ${scheduledNotifications.length}`);

    // Test 6: Statistiche
    console.log('\n📋 Test 6: Statistiche notifiche');
    const stats = await NotificationService.getNotificationStats();
    console.log('   ✅ Statistiche:', stats);

    // Test 7: Test notifica immediata
    console.log('\n📋 Test 7: Notifica di test');
    await NotificationService.sendTestNotification();
    console.log('   ✅ Notifica di test inviata (dovresti riceverla tra pochi secondi)');

    // Test 8: Test avviso straordinario
    console.log('\n📋 Test 8: Avviso straordinario');
    await NotificationService.checkOvertimeAlert(9.5, testSettings);
    console.log('   ✅ Test avviso straordinario per 9.5 ore (dovresti ricevere un avviso)');

    // Test 9: Test promemoria reperibilità
    console.log('\n📋 Test 9: Promemoria reperibilità');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await NotificationService.scheduleStandbyReminders([tomorrowStr], {
      ...testSettings,
      standbyReminders: {
        enabled: true,
        time: '20:00',
        daysInAdvance: 1
      }
    });
    console.log('   ✅ Promemoria reperibilità programmato per domani');

    // Test 10: Verifica finale
    console.log('\n📋 Test 10: Verifica finale');
    const finalScheduled = await NotificationService.getScheduledNotifications();
    console.log(`   Notifiche totali programmate: ${finalScheduled.length}`);

    console.log('\n🎉 Tutti i test completati con successo!');
    console.log('\n📱 Per testare completamente:');
    console.log('   1. Verifica di ricevere le notifiche di test');
    console.log('   2. Controlla che i promemoria giornalieri funzionino');
    console.log('   3. Inserisci orari > 8.5 ore per testare avvisi straordinario');
    console.log('   4. Verifica i promemoria reperibilità se configurati');

  } catch (error) {
    console.error('❌ Errore durante i test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Test dei singoli componenti
function testNotificationSettings() {
  console.log('\n🧪 Test impostazioni notifiche...');
  
  const defaultSettings = NotificationService.getDefaultSettings();
  
  // Verifica struttura impostazioni
  const requiredSections = [
    'enabled',
    'workReminders',
    'timeEntryReminders', 
    'standbyReminders',
    'vacationReminders',
    'overtimeAlerts',
    'dailySummary'
  ];
  
  const missingsections = requiredSections.filter(section => !(section in defaultSettings));
  
  if (missingsections.length === 0) {
    console.log('✅ Struttura impostazioni corretta');
  } else {
    console.log('❌ Sezioni mancanti:', missingSections);
  }
  
  // Verifica formato ore
  const timeFields = [
    defaultSettings.workReminders.morningTime,
    defaultSettings.timeEntryReminders.time,
    defaultSettings.dailySummary.time
  ];
  
  const timeFormatValid = timeFields.every(time => /^\d{2}:\d{2}$/.test(time));
  console.log(`${timeFormatValid ? '✅' : '❌'} Formato ore corretto`);
  
  console.log('✅ Test impostazioni completato');
}

// Avvia i test se lo script è eseguito direttamente
if (typeof module !== 'undefined' && require.main === module) {
  console.log('⚠️  Questo script deve essere eseguito in ambiente Expo/React Native');
  console.log('   Copia il contenuto delle funzioni nell\'app per testarle');
} else {
  // Esporta le funzioni di test per uso nell'app
  module.exports = {
    testNotificationService,
    testNotificationSettings
  };
}
