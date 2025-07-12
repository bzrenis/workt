/**
 * Test specifico per il debug delle notifiche di reperibilità
 * Questo script testa direttamente le funzioni corrette
 */

const DatabaseService = require('./src/services/DatabaseService').default;

async function testStandbyDatesReading() {
  console.log('🧪 TEST LETTURA DATE REPERIBILITÀ');
  console.log('=================================\n');

  try {
    // Test inizializzazione database
    console.log('1. Inizializzazione database...');
    await DatabaseService.initialize();
    console.log('✅ Database inizializzato\n');

    // Test lettura date luglio 2024
    console.log('2. Test lettura date luglio 2024...');
    const julDates = await DatabaseService.getStandbyDays(2024, 7);
    console.log(`📅 Date reperibilità luglio 2024: ${julDates.length}`);
    julDates.forEach(date => {
      console.log(`   - ${date.date} (is_standby: ${date.is_standby})`);
    });
    console.log();

    // Test lettura date dicembre 2024 (mese corrente)
    console.log('3. Test lettura date dicembre 2024...');
    const decDates = await DatabaseService.getStandbyDays(2024, 12);
    console.log(`📅 Date reperibilità dicembre 2024: ${decDates.length}`);
    decDates.forEach(date => {
      console.log(`   - ${date.date} (is_standby: ${date.is_standby})`);
    });
    console.log();

    // Test lettura date gennaio 2025
    console.log('4. Test lettura date gennaio 2025...');
    const janDates = await DatabaseService.getStandbyDays(2025, 1);
    console.log(`📅 Date reperibilità gennaio 2025: ${janDates.length}`);
    janDates.forEach(date => {
      console.log(`   - ${date.date} (is_standby: ${date.is_standby})`);
    });
    console.log();

    // Test query diretta per vedere tutte le date di reperibilità
    console.log('5. Test query diretta tutte le date...');
    const db = DatabaseService.db;
    if (db) {
      const allStandby = await db.getAllAsync(`
        SELECT * FROM standby_calendar 
        WHERE is_standby = 1 
        ORDER BY date
      `);
      console.log(`📅 Totale date reperibilità nel database: ${allStandby.length}`);
      allStandby.forEach(date => {
        console.log(`   - ${date.date} (is_standby: ${date.is_standby})`);
      });
    }

    console.log('\n✅ Test completato con successo');

  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Test delle funzioni di notifica corrette
async function testNotificationService() {
  console.log('\n🧪 TEST NOTIFICATION SERVICE');
  console.log('============================\n');

  try {
    console.log('1. Importazione NotificationService...');
    const NotificationService = require('./src/services/NotificationService').default;
    console.log('✅ NotificationService importato\n');

    console.log('2. Test getStandbyDatesFromSettings...');
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + 1);
    
    const standbyDates = await NotificationService.getStandbyDatesFromSettings(today, futureDate);
    console.log(`📞 Date reperibilità trovate: ${standbyDates.length}`);
    standbyDates.forEach(date => {
      console.log(`   - ${date}`);
    });
    console.log();

    console.log('3. Test getSettings...');
    const settings = await NotificationService.getSettings();
    console.log('✅ Impostazioni caricate:');
    console.log(`   - Notifiche abilitate: ${settings.enabled}`);
    console.log(`   - Reperibilità abilitata: ${settings.standbyReminders?.enabled}`);
    console.log();

    console.log('4. Test getScheduledNotifications...');
    const scheduled = await NotificationService.getScheduledNotifications();
    console.log(`📅 Notifiche programmate: ${scheduled.length}`);
    scheduled.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.content.title} - Tipo: ${notif.content.data?.type || 'unknown'}`);
    });

    console.log('\n✅ Test NotificationService completato');

  } catch (error) {
    console.error('❌ Errore nel test NotificationService:', error);
  }
}

async function runAllTests() {
  await testStandbyDatesReading();
  await testNotificationService();
  console.log('\n🎉 TUTTI I TEST COMPLETATI');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testStandbyDatesReading,
  testNotificationService,
  runAllTests
};
