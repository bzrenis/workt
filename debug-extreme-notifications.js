/**
 * DEBUG ESTREMO: Test per capire perché le notifiche arrivano subito
 */

import * as Notifications from 'expo-notifications';

// Test semplice per vedere cosa succede
const extremeDebugTest = async () => {
  console.log('🚨 === DEBUG ESTREMO NOTIFICHE ===');
  
  try {
    // 1. Stato iniziale
    console.log('\n1️⃣ STATO INIZIALE');
    let existing = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Notifiche esistenti: ${existing.length}`);
    
    // 2. Cancella tutto
    console.log('\n2️⃣ CANCELLAZIONE');
    await Notifications.cancelAllScheduledNotificationsAsync();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    existing = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Notifiche dopo cancellazione: ${existing.length}`);
    
    // 3. Test programmazione semplice
    console.log('\n3️⃣ TEST PROGRAMMAZIONE SEMPLICE');
    
    const testDate = new Date();
    testDate.setMinutes(testDate.getMinutes() + 5); // 5 minuti nel futuro
    
    console.log(`🎯 Ora corrente: ${new Date().toLocaleString()}`);
    console.log(`🎯 Target: ${testDate.toLocaleString()}`);
    console.log(`🎯 Differenza: ${Math.round((testDate.getTime() - new Date().getTime()) / 1000 / 60)} minuti`);
    
    // Test con seconds
    console.log('\n📅 TEST CON SECONDS...');
    const secondsFromNow = Math.round((testDate.getTime() - new Date().getTime()) / 1000);
    console.log(`⏰ Seconds from now: ${secondsFromNow}`);
    
    const testId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Debug Seconds',
        body: `Programmata per ${testDate.toLocaleTimeString()}`,
        data: { testType: 'seconds', timestamp: testDate.getTime() }
      },
      trigger: {
        seconds: secondsFromNow
      }
    });
    
    console.log(`✅ Notifica programmata con ID: ${testId}`);
    
    // 4. Verifica immediata
    console.log('\n4️⃣ VERIFICA IMMEDIATA');
    existing = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Notifiche programmate: ${existing.length}`);
    
    existing.forEach((notif, i) => {
      console.log(`  ${i + 1}. ${notif.content.title}`);
      console.log(`     ID: ${notif.identifier}`);
      console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
      
      if (notif.trigger.date) {
        const triggerDate = new Date(notif.trigger.date);
        console.log(`     Data trigger: ${triggerDate.toLocaleString()}`);
        console.log(`     Tra: ${Math.round((triggerDate.getTime() - new Date().getTime()) / 1000 / 60)} min`);
      }
      
      if (notif.trigger.seconds) {
        console.log(`     Seconds trigger: ${notif.trigger.seconds}`);
        console.log(`     Tra: ${Math.round(notif.trigger.seconds / 60)} min`);
      }
    });
    
    // 5. Test con date object
    console.log('\n📅 TEST CON DATE OBJECT...');
    const testDate2 = new Date();
    testDate2.setMinutes(testDate2.getMinutes() + 10); // 10 minuti nel futuro
    
    const testId2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Debug Date',
        body: `Programmata per ${testDate2.toLocaleTimeString()}`,
        data: { testType: 'date', timestamp: testDate2.getTime() }
      },
      trigger: {
        date: testDate2
      }
    });
    
    console.log(`✅ Notifica 2 programmata con ID: ${testId2}`);
    
    // 6. Verifica finale
    console.log('\n6️⃣ VERIFICA FINALE');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    existing = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📊 Totale notifiche programmate: ${existing.length}`);
    
    // 7. Aspetta e vedi se arrivano
    console.log('\n7️⃣ ATTESA 10 SECONDI...');
    console.log('⏰ Se arrivano notifiche ORA, il problema è nel trigger');
    console.log('⏰ Se arrivano tra 5-10 minuti, il sistema funziona');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('✅ Test completato - controlla se sono arrivate notifiche immediate');
    
  } catch (error) {
    console.error('❌ Errore durante debug:', error);
  }
};

export { extremeDebugTest };
