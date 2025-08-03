// 🔍 DEBUG: Controllo stato    // 5. Leggi package.json version
    try {
      const packageInfo = require('../package.json');
      console.log('📦 Package.json version:', packageInfo.version);
    } catch (packageError) {
      console.log('⚠️ Impossibile leggere package.json:', packageError.message);
    }
    
    // 6. Leggi app.json version  
    try {
      const appConfig = require('../app.json');
      console.log('🎯 App.json version:', appConfig.expo.version);
    } catch (appError) {
      console.log('⚠️ Impossibile leggere app.json:', appError.message);
    }ni e AsyncStorage
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
    
    // 4. Leggi package.json version
    const packageInfo = require('../../package.json');
    console.log('📦 Package.json version:', packageInfo.version);
    
    // 5. Leggi app.json version
    const appConfig = require('../../app.json');
    console.log('🎯 App.json version:', appConfig.expo.version);
    
    // 6. Simula reset per far scattare popup
    console.log('\n🔧 RESET PER TEST:');
    console.log('- Imposto last_known_version a 1.2.0 per simulare aggiornamento');
    await AsyncStorage.setItem('last_known_version', '1.2.0');
    
    // 7. Crea pending update info per test
    const testUpdateInfo = {
      pendingUpdate: true,
      targetVersion: '1.2.2',
      updateTime: new Date().toISOString(),
      previousVersion: '1.2.0'
    };
    await AsyncStorage.setItem('pending_update_info', JSON.stringify(testUpdateInfo));
    
    console.log('✅ Setup completato - al prossimo avvio dovrebbe apparire popup aggiornamento');
    console.log('📱 Riavvia l\'app per vedere il popup!');
    
  } catch (error) {
    console.error('❌ Errore debug versioni:', error);
  }
  
  console.log('=== FINE DEBUG ===\n');
}

// Esegui debug
debugVersionInfo();

export default debugVersionInfo;
