import AsyncStorage from '@react-native-async-storage/async-storage';

// Test per verificare la lettura delle settings di reperibilità
async function testSettingsSync() {
  try {
    console.log('🔍 TEST: Verifica sincronizzazione settings di reperibilità\n');
    
    // 1. Leggi tutte le settings
    const settingsStr = await AsyncStorage.getItem('settings');
    console.log('📱 Settings raw:', settingsStr ? 'Presenti' : 'Vuote');
    
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      console.log('📱 Settings parsate:', JSON.stringify(settings, null, 2));
      
      // 2. Controlla specificamente le standbySettings
      const standbySettings = settings?.standbySettings;
      console.log('\n📅 standbySettings:', standbySettings ? 'Presenti' : 'Assenti');
      
      if (standbySettings) {
        const standbyDays = standbySettings.standbyDays || {};
        console.log('📅 standbyDays keys:', Object.keys(standbyDays).length);
        console.log('📅 standbyDays content:', JSON.stringify(standbyDays, null, 2));
        
        // 3. Trova le date attive di reperibilità
        const activeDates = Object.keys(standbyDays).filter(dateStr => {
          const dayData = standbyDays[dateStr];
          return dayData?.selected === true;
        });
        
        console.log('\n✅ Date attive di reperibilità:', activeDates.length);
        activeDates.forEach((date, index) => {
          console.log(`   ${index + 1}. ${date}`);
        });
        
        // 4. Test range date (prossimi 60 giorni)
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 60);
        
        const startStr = today.toISOString().split('T')[0];
        const endStr = futureDate.toISOString().split('T')[0];
        
        console.log(`\n📊 Test range: ${startStr} a ${endStr}`);
        
        const datesInRange = activeDates.filter(dateStr => {
          const checkDate = new Date(dateStr);
          return checkDate >= today && checkDate <= futureDate;
        });
        
        console.log(`📊 Date nel range futuro: ${datesInRange.length}`);
        datesInRange.forEach((date, index) => {
          console.log(`   ${index + 1}. ${date}`);
        });
        
      }
    }
    
    // 5. Test diretto della funzione getStandbyDatesFromSettings
    console.log('\n🧪 Test diretto NotificationService.getStandbyDatesFromSettings...');
    
    const { default: NotificationService } = await import('./src/services/NotificationService.js');
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 60);
    
    const datesFromService = await NotificationService.getStandbyDatesFromSettings(today, futureDate);
    console.log(`🧪 Date restituite dal service: ${datesFromService.length}`);
    datesFromService.forEach((date, index) => {
      console.log(`   ${index + 1}. ${date}`);
    });
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

testSettingsSync();
