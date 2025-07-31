/**
 * DEBUG: Test differenti formati di trigger per expo-notifications
 * Per capire quale formato funziona correttamente
 */

import * as Notifications from 'expo-notifications';

const testDifferentTriggers = async () => {
  console.log('🧪 === TEST FORMATI TRIGGER ===');
  
  try {
    // Cancella tutto prima
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const baseDate = new Date();
    baseDate.setMinutes(baseDate.getMinutes() + 5); // 5 minuti nel futuro
    
    console.log(`🎯 Data target: ${baseDate.toLocaleString()}`);
    console.log(`🕒 Ora corrente: ${new Date().toLocaleString()}`);
    console.log(`⏱️ Differenza: ${Math.round((baseDate.getTime() - new Date().getTime()) / 1000 / 60)} minuti`);
    
    // Test 1: Oggetto Date
    console.log('\n1️⃣ Test con oggetto Date...');
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test 1: Date Object',
          body: `Programmata per ${baseDate.toLocaleTimeString()}`
        },
        trigger: {
          date: baseDate
        }
      });
      console.log('✅ Test 1 completato');
    } catch (error) {
      console.error('❌ Test 1 fallito:', error.message);
    }
    
    // Test 2: Timestamp
    console.log('\n2️⃣ Test con timestamp...');
    try {
      const testDate2 = new Date(baseDate.getTime() + 60000); // +1 minuto
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test 2: Timestamp',
          body: `Programmata per ${testDate2.toLocaleTimeString()}`
        },
        trigger: {
          date: testDate2.getTime()
        }
      });
      console.log('✅ Test 2 completato');
    } catch (error) {
      console.error('❌ Test 2 fallito:', error.message);
    }
    
    // Test 3: Secondi nel futuro
    console.log('\n3️⃣ Test con seconds...');
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test 3: Seconds',
          body: 'Programmata per +7 minuti'
        },
        trigger: {
          seconds: 420 // 7 minuti
        }
      });
      console.log('✅ Test 3 completato');
    } catch (error) {
      console.error('❌ Test 3 fallito:', error.message);
    }
    
    // Test 4: Date ISO string
    console.log('\n4️⃣ Test con ISO string...');
    try {
      const testDate4 = new Date(baseDate.getTime() + 180000); // +3 minuti
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test 4: ISO String',
          body: `Programmata per ${testDate4.toLocaleTimeString()}`
        },
        trigger: {
          date: testDate4.toISOString()
        }
      });
      console.log('✅ Test 4 completato');
    } catch (error) {
      console.error('❌ Test 4 fallito:', error.message);
    }
    
    // Verifica cosa è stato programmato
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`\n📊 Risultati: ${scheduled.length} notifiche programmate:`);
    scheduled.forEach((notif, i) => {
      const triggerDate = new Date(notif.trigger.date || notif.trigger.value || 0);
      console.log(`  ${i + 1}. ${notif.content.title}`);
      console.log(`     Trigger: ${triggerDate.toLocaleString()}`);
      console.log(`     Tra: ${Math.round((triggerDate.getTime() - new Date().getTime()) / 1000 / 60)} min`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante test:', error);
  }
};

export { testDifferentTriggers };
