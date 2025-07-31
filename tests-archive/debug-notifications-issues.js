const NotificationService = require('./src/services/NotificationService').default;
import * as Notifications from 'expo-notifications';

async function debugNotificationIssues() {
  console.log('🔍 === DEBUG NOTIFICHE - ANALISI PROBLEMI ===');
  console.log('Data/Ora attuale:', new Date().toISOString());
  
  try {
    // Verifica permessi
    const permissions = await NotificationService.getPermissionsAsync();
    console.log('📱 Status permessi:', permissions.status);
    
    if (permissions.status !== 'granted') {
      console.log('❌ Permessi non concessi, richiedendo...');
      const requested = await NotificationService.requestPermissions();
      console.log('📱 Permessi dopo richiesta:', requested);
    }
    
    // Cancella tutto per iniziare pulito
    console.log('\n🧹 Pulizia notifiche esistenti...');
    await NotificationService.cancelAllNotifications();
    
    // Test 1: Notifica immediata (per confermare che il sistema funziona)
    console.log('\n🧪 TEST 1: Notifica immediata (5 secondi)');
    const immediateDate = new Date();
    immediateDate.setSeconds(immediateDate.getSeconds() + 5);
    
    console.log(`🕐 Programmando per: ${immediateDate.toISOString()}`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Immediato',
        body: 'Questa notifica dovrebbe arrivare tra 5 secondi',
        sound: 'default',
        data: { test: 'immediate' }
      },
      trigger: {
        date: immediateDate
      }
    });
    
    console.log('✅ Notifica immediata programmata');
    
    // Test 2: Notifica futura (domani alle 08:00)
    console.log('\n🧪 TEST 2: Notifica futura (domani alle 08:00)');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    futureDate.setHours(8, 0, 0, 0);
    
    console.log(`🕐 Programmando per: ${futureDate.toISOString()}`);
    console.log(`🕐 Differenza: ${futureDate.getTime() - Date.now()} millisecondi`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Futuro',
        body: 'Questa notifica dovrebbe arrivare domani alle 08:00',
        sound: 'default',
        data: { test: 'future' }
      },
      trigger: {
        date: futureDate
      }
    });
    
    console.log('✅ Notifica futura programmata');
    
    // Verifica notifiche programmate
    setTimeout(async () => {
      console.log('\n📋 VERIFICA NOTIFICHE PROGRAMMATE:');
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔢 Totale programmate: ${scheduled.length}`);
      
      scheduled.forEach((notif, index) => {
        const trigger = notif.trigger;
        console.log(`\n${index + 1}. ${notif.content.title}`);
        console.log(`   ID: ${notif.identifier}`);
        console.log(`   Body: ${notif.content.body}`);
        
        if (trigger.date) {
          const triggerDate = new Date(trigger.date);
          console.log(`   Trigger Date: ${triggerDate.toISOString()}`);
          console.log(`   Trigger Local: ${triggerDate.toLocaleString('it-IT')}`);
          
          const now = new Date();
          const timeDiff = triggerDate.getTime() - now.getTime();
          
          if (timeDiff > 0) {
            const minutes = Math.floor(timeDiff / (1000 * 60));
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) {
              console.log(`   ⏰ Tra: ${days} giorni, ${hours % 24} ore, ${minutes % 60} minuti`);
            } else if (hours > 0) {
              console.log(`   ⏰ Tra: ${hours} ore, ${minutes % 60} minuti`);
            } else {
              console.log(`   ⏰ Tra: ${minutes} minuti`);
            }
          } else {
            console.log(`   ❌ NEL PASSATO! (-${Math.abs(Math.floor(timeDiff / (1000 * 60)))} minuti)`);
          }
        } else {
          console.log(`   ❌ Trigger non valido:`, trigger);
        }
      });
      
      // Test notifiche del servizio
      console.log('\n🧪 TEST 3: Sistema di notifiche del servizio');
      const testSettings = {
        enabled: true,
        timeEntryReminders: {
          enabled: true,
          time: '20:30', // Tra poco
          weekendsEnabled: true
        }
      };
      
      console.log('📱 Programmando con il servizio...');
      await NotificationService.scheduleNotifications(testSettings);
      
      // Verifica finale
      setTimeout(async () => {
        console.log('\n📋 VERIFICA FINALE DOPO SERVIZIO:');
        const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`🔢 Totale finale: ${finalScheduled.length}`);
        
        if (finalScheduled.length === 0) {
          console.log('❌ PROBLEMA GRAVE: Il servizio non programma notifiche!');
        } else {
          console.log('✅ Il servizio ha programmato le notifiche');
        }
      }, 3000);
      
    }, 2000);
    
  } catch (error) {
    console.error('❌ Errore nel debug:', error);
  }
}

module.exports = debugNotificationIssues;
