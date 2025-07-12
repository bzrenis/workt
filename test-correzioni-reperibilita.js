// Test script per verificare le correzioni alle notifiche
// Verificherà se AsyncStorage ora contiene le date di reperibilità

const testAsyncStorageReperibilita = async () => {
  try {
    console.log('🔍 VERIFICA CORREZIONI - Inizio test...');
    console.log('');
    
    // 1. Test di base AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const settingsStr = await AsyncStorage.getItem('settings');
    
    console.log('📱 Stato AsyncStorage:');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      console.log('✅ Settings trovate in AsyncStorage');
      
      if (settings.standbySettings) {
        console.log('✅ standbySettings presenti');
        
        if (settings.standbySettings.standbyDays) {
          const standbyDays = settings.standbySettings.standbyDays;
          const allDates = Object.keys(standbyDays);
          const activeDates = allDates.filter(date => standbyDays[date]?.selected);
          
          console.log(`📅 Totale date nel calendario: ${allDates.length}`);
          console.log(`📅 Date attive (selected: true): ${activeDates.length}`);
          
          if (activeDates.length > 0) {
            console.log('✅ Date attive trovate:');
            activeDates.forEach((date, index) => {
              console.log(`   ${index + 1}. ${date}`);
            });
          } else {
            console.log('⚠️ Nessuna data attiva trovata');
          }
          
        } else {
          console.log('❌ standbyDays non trovate');
        }
      } else {
        console.log('❌ standbySettings non trovate');
      }
    } else {
      console.log('❌ Nessuna settings trovata in AsyncStorage');
    }
    
    console.log('');
    console.log('🔍 VERIFICA CORREZIONI - Test completato');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error.message);
  }
};

// Esegui il test
testAsyncStorageReperibilita();
