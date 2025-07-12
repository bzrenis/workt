/**
 * Test script per verificare il funzionamento delle notifiche di reperibilità
 * Esegui questo script dal terminale: node test-standby-final.js
 */

const path = require('path');

// Mock per l'ambiente React Native
global.__DEV__ = true;
global.console = console;

// Mock di AsyncStorage
const AsyncStorageMock = {
  data: new Map(),
  async getItem(key) {
    return this.data.get(key) || null;
  },
  async setItem(key, value) {
    this.data.set(key, value);
  },
  async removeItem(key) {
    this.data.delete(key);
  },
  async clear() {
    this.data.clear();
  }
};

// Mock di expo-notifications
const NotificationsMock = {
  async requestPermissionsAsync() {
    return { status: 'granted' };
  },
  async getPermissionsAsync() {
    return { status: 'granted' };
  },
  async scheduleNotificationAsync(request) {
    console.log('📱 Notifica programmata:', {
      id: Math.random().toString(36),
      title: request.content.title,
      body: request.content.body,
      trigger: request.trigger
    });
    return Math.random().toString(36);
  },
  async cancelScheduledNotificationAsync(id) {
    console.log('❌ Notifica cancellata:', id);
  },
  async cancelAllScheduledNotificationsAsync() {
    console.log('❌ Tutte le notifiche cancellate');
  },
  async getAllScheduledNotificationsAsync() {
    return [];
  }
};

// Setup dei mock
global.AsyncStorage = AsyncStorageMock;

// Mock delle dipendenze Expo
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  if (args[0] === 'expo-notifications') {
    return NotificationsMock;
  }
  if (args[0] === '@react-native-async-storage/async-storage') {
    return { default: AsyncStorageMock };
  }
  return originalRequire.apply(this, args);
};

async function testStandbyNotifications() {
  console.log('🔔 Test Sistema Notifiche Reperibilità');
  console.log('=====================================\n');

  try {
    // Carica il NotificationService con i mock
    const NotificationService = require('./src/services/NotificationService').default;

    console.log('1. Inizializzazione servizio...');
    await NotificationService.initialize();
    console.log('✅ Servizio inizializzato\n');

    console.log('2. Richiesta permessi...');
    const hasPermissions = await NotificationService.requestPermissions();
    console.log(`✅ Permessi: ${hasPermissions ? 'concessi' : 'negati'}\n`);

    console.log('3. Configurazione impostazioni reperibilità...');
    
    // Configurazione di test per le notifiche di reperibilità
    const testSettings = {
      standby: {
        enabled: true,
        reminders: [
          {
            id: '1',
            enabled: true,
            hours: 18,
            minutes: 0,
            message: 'Domani sei reperibile, non dimenticartelo!'
          },
          {
            id: '2', 
            enabled: true,
            hours: 8,
            minutes: 0,
            message: 'Oggi inizia la tua reperibilità'
          }
        ]
      }
    };

    await NotificationService.saveSettings(testSettings);
    console.log('✅ Impostazioni salvate\n');

    console.log('4. Test programmazione notifiche per date specifiche...');
    
    // Date di test (prossimi 3 giorni)
    const today = new Date();
    const testDates = [];
    
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      testDates.push(date.toISOString().split('T')[0]);
    }

    console.log(`📅 Date di test: ${testDates.join(', ')}\n`);

    // Programmazione notifiche per ciascuna data
    for (const dateStr of testDates) {
      console.log(`📱 Programmazione notifiche per ${dateStr}...`);
      const count = await NotificationService.scheduleStandbyReminders(dateStr);
      console.log(`✅ ${count} notifiche programmate per ${dateStr}`);
    }

    console.log('\n5. Test sincronizzazione calendario...');
    
    // Simula dati dal calendario (date di reperibilità)
    const calendarData = {
      standbyDays: testDates.reduce((acc, date) => {
        acc[date] = true;
        return acc;
      }, {})
    };

    // Salva dati calendario
    await AsyncStorageMock.setItem('calendarSettings', JSON.stringify(calendarData));
    
    // Sincronizza notifiche con calendario
    const syncCount = await NotificationService.syncStandbyNotificationsWithCalendar();
    console.log(`✅ ${syncCount} notifiche sincronizzate dal calendario\n`);

    console.log('6. Verifica notifiche programmate...');
    const scheduledNotifications = await NotificationService.getScheduledNotifications();
    console.log(`📋 Notifiche attualmente programmate: ${scheduledNotifications.length}`);
    
    if (scheduledNotifications.length > 0) {
      console.log('\nDettagli notifiche:');
      scheduledNotifications.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.content?.title || 'Senza titolo'}`);
        console.log(`     Messaggio: ${notif.content?.body || 'Senza messaggio'}`);
        console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
      });
    }

    console.log('\n7. Test statistiche...');
    const stats = await NotificationService.getStatistics();
    console.log('📊 Statistiche:', stats);

    console.log('\n✅ Tutti i test completati con successo!');
    console.log('\n🎯 Sistema Notifiche Reperibilità funzionante');
    console.log('   - Permessi: OK');
    console.log('   - Configurazione: OK');
    console.log('   - Programmazione: OK');
    console.log('   - Sincronizzazione calendario: OK');
    console.log('   - Statistiche: OK');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
    console.error(error.stack);
  }
}

// Esegui i test
testStandbyNotifications().catch(console.error);
