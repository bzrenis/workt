// 🔍 DEBUG: Controllo stato versioni e AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

async function debugVersionInfo() {
  console.log('\n📊 === DEBUG VERSION INFO ===');
  
  try {
    // 1. Controlla AsyncStorage
    const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
    const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
    
    console.log('💾 AsyncStorage last_known_version:', lastKnownVersion);
    console.log('💾 AsyncStorage pending_update_info:', pendingUpdateInfo);
    
    // 2. Controlla versione corrente UpdateService
    const currentVersionInCode = '1.2.2';
    console.log('📝 Versione nel codice UpdateService:', currentVersionInCode);
    
    // 3. Controlla informazioni Expo Updates
    if (!__DEV__) {
      console.log('📱 Updates.runtimeVersion:', Updates.runtimeVersion);
      console.log('📱 Updates.updateId:', Updates.updateId);
      console.log('📱 Updates.isEmbeddedLaunch:', Updates.isEmbeddedLaunch);
    } else {
      console.log('🚧 Modalità sviluppo - Updates info non disponibili');
    }
    
    // 4. Versioni file - da controllare manualmente
    console.log('📦 Package.json version: 1.2.2 (da controllare manualmente)');
    console.log('🎯 App.json version: 1.2.2 (da controllare manualmente)');
    
    // 5. Simula reset per far scattare popup
    console.log('\n🔧 RESET PER TEST:');
    console.log('- Imposto last_known_version a 1.2.0 per simulare aggiornamento');
    await AsyncStorage.setItem('last_known_version', '1.2.0');
    
    // 6. Crea pending update info per test
    const testUpdateInfo = {
      pendingUpdate: true,
      targetVersion: '1.2.2',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(testUpdateInfo));
    
    console.log('✅ Setup completato - al prossimo avvio dovrebbe apparire popup aggiornamento');
    console.log('📱 Riavvia l\'app per vedere il popup!');
    
    return {
      success: true,
      lastKnownVersion,
      pendingUpdateInfo,
      resetCompleted: true
    };
    
  } catch (error) {
    console.error('❌ Errore debug versioni:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default debugVersionInfo;
