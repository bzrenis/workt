// 📱 RILEVAMENTO AGGIORNAMENTI BUILD NATIVA - Sistema per distinguere OTA vs Build Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';

/**
 * Controlla se c'è stato un aggiornamento della build nativa
 */
export const checkNativeBuildUpdate = async () => {
  try {
    console.log('📱 CONTROLLO BUILD NATIVA...');
    
    // Ottieni informazioni sulla build corrente
    const currentBuildVersion = Application.nativeBuildVersion;
    const currentAppVersion = Application.nativeApplicationVersion;
    const isEmbeddedLaunch = Updates.isEmbeddedLaunch;
    
    // Recupera versioni precedenti salvate
    const lastKnownBuildVersion = await AsyncStorage.getItem('last_known_build_version');
    const lastKnownAppVersion = await AsyncStorage.getItem('last_known_app_version');
    
    console.log('📋 BUILD INFO:', {
      currentBuildVersion,
      currentAppVersion,
      lastKnownBuildVersion,
      lastKnownAppVersion,
      isEmbeddedLaunch
    });
    
    // Determina il tipo di aggiornamento
    let updateType = null;
    let shouldShowPopup = false;
    
    if (!lastKnownBuildVersion || !lastKnownAppVersion) {
      // Prima installazione o reset dati
      updateType = 'first_install';
      shouldShowPopup = true;
    } else if (lastKnownBuildVersion !== currentBuildVersion) {
      // Aggiornamento build nativa (Play Store/App Store)
      updateType = 'native_build';
      shouldShowPopup = true;
    } else if (lastKnownAppVersion !== currentAppVersion) {
      // Aggiornamento versione app (potrebbe essere OTA)
      updateType = 'app_version';
      shouldShowPopup = true;
    } else if (isEmbeddedLaunch === false) {
      // Lancio da aggiornamento OTA
      updateType = 'ota_update';
      shouldShowPopup = false; // Gestito dal sistema OTA esistente
    }
    
    if (shouldShowPopup) {
      const updateInfo = {
        type: updateType,
        currentBuildVersion,
        currentAppVersion,
        previousBuildVersion: lastKnownBuildVersion,
        previousAppVersion: lastKnownAppVersion,
        isEmbeddedLaunch,
        updateTime: new Date().toISOString()
      };
      
      setTimeout(() => {
        showNativeBuildUpdatePopup(updateInfo);
      }, 2000);
    }
    
    // Salva versioni correnti per confronti futuri
    await AsyncStorage.setItem('last_known_build_version', currentBuildVersion || 'unknown');
    await AsyncStorage.setItem('last_known_app_version', currentAppVersion || 'unknown');
    
    return {
      updateDetected: shouldShowPopup,
      updateType,
      buildVersion: currentBuildVersion,
      appVersion: currentAppVersion
    };
    
  } catch (error) {
    console.error('❌ Errore controllo build nativa:', error);
    return { updateDetected: false, error: error.message };
  }
};

/**
 * Mostra popup specifico per aggiornamenti build nativa
 */
export const showNativeBuildUpdatePopup = (updateInfo) => {
  let title = '';
  let message = '';
  
  switch (updateInfo.type) {
    case 'first_install':
      title = '🎉 Benvenuto in WorkT!';
      message = `Grazie per aver installato WorkT v${updateInfo.currentAppVersion}!\n\n📱 Build: ${updateInfo.currentBuildVersion}\n\n🚀 Inizia subito a tracciare le tue ore di lavoro con calcoli automatici secondo CCNL Metalmeccanico PMI.\n\n✅ Tutte le funzionalità sono pronte per l'uso.`;
      break;
      
    case 'native_build':
      title = '🔄 Aggiornamento Build Nativa!';
      message = `WorkT è stato aggiornato tramite ${updateInfo.isEmbeddedLaunch ? 'store ufficiale' : 'build diretta'}!\n\n📱 Build: ${updateInfo.previousBuildVersion} → ${updateInfo.currentBuildVersion}\n📦 Versione: ${updateInfo.currentAppVersion}\n\n🎯 NOVITÀ BUILD NATIVA:\n• Prestazioni migliorate\n• Correzioni compatibilità sistema\n• Funzionalità native ottimizzate\n• Sistema backup app chiusa perfezionato\n\n✅ L'app è pronta con tutti i miglioramenti.`;
      break;
      
    case 'app_version':
      title = '🚀 Nuova Versione App!';
      message = `WorkT è stato aggiornato alla versione ${updateInfo.currentAppVersion}!\n\n📦 Versione: ${updateInfo.previousAppVersion} → ${updateInfo.currentAppVersion}\n📱 Build: ${updateInfo.currentBuildVersion}\n\n🎯 AGGIORNAMENTO COMPLETO:\n• Nuove funzionalità implementate\n• Miglioramenti sistema esistente\n• Correzioni e ottimizzazioni\n• Backup e PDF perfezionati\n\n✅ Tutte le novità sono disponibili.`;
      break;
      
    default:
      title = '📱 Aggiornamento Rilevato';
      message = `WorkT è stato aggiornato!\n\nVersione: ${updateInfo.currentAppVersion}\nBuild: ${updateInfo.currentBuildVersion}\n\n✅ L'app è pronta per l'uso.`;
  }
  
  Alert.alert(
    title,
    message,
    [
      {
        text: updateInfo.type === 'first_install' ? 'Iniziamo! 🚀' : 'Perfetto! ✅',
        style: 'default',
        onPress: async () => {
          // Marca questo aggiornamento come visto
          await AsyncStorage.setItem(`${updateInfo.type}_${updateInfo.currentBuildVersion}_shown`, 'true');
          console.log(`✅ Popup ${updateInfo.type} confermato per build ${updateInfo.currentBuildVersion}`);
        },
      },
    ],
    { cancelable: false }
  );
};

/**
 * Forza la visualizzazione del popup build nativa (per testing)
 */
export const forceNativeBuildPopup = async () => {
  try {
    const buildVersion = Application.nativeBuildVersion;
    const appVersion = Application.nativeApplicationVersion;
    
    const updateInfo = {
      type: 'native_build',
      currentBuildVersion: buildVersion,
      currentAppVersion: appVersion,
      previousBuildVersion: '10', // Simula build precedente
      previousAppVersion: '1.2.2', // Simula versione precedente
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      updateTime: new Date().toISOString()
    };
    
    showNativeBuildUpdatePopup(updateInfo);
    return true;
  } catch (error) {
    console.error('❌ Errore forzatura popup build nativa:', error);
    return false;
  }
};

/**
 * Ottieni informazioni dettagliate sulla build corrente
 */
export const getBuildInfo = async () => {
  try {
    const buildInfo = {
      nativeBuildVersion: Application.nativeBuildVersion,
      nativeApplicationVersion: Application.nativeApplicationVersion,
      applicationId: Application.applicationId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
      createdAt: Updates.createdAt,
      channel: Updates.channel
    };
    
    console.log('📋 BUILD INFO COMPLETA:', buildInfo);
    return buildInfo;
  } catch (error) {
    console.error('❌ Errore recupero build info:', error);
    return null;
  }
};

/**
 * Reset sistema rilevamento build native
 */
export const resetNativeBuildSystem = async () => {
  try {
    await AsyncStorage.removeItem('last_known_build_version');
    await AsyncStorage.removeItem('last_known_app_version');
    
    // Rimuovi tutti i flag popup mostrati
    const allKeys = await AsyncStorage.getAllKeys();
    const popupKeys = allKeys.filter(key => 
      key.includes('_shown') && 
      (key.includes('first_install') || key.includes('native_build') || key.includes('app_version'))
    );
    
    for (const key of popupKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    console.log('🔄 Sistema rilevamento build nativa resettato completamente');
    return true;
  } catch (error) {
    console.error('❌ Errore reset sistema build nativa:', error);
    return false;
  }
};

// Esponi le funzioni globalmente
if (typeof global !== 'undefined') {
  global.checkNativeBuildUpdate = checkNativeBuildUpdate;
  global.forceNativeBuildPopup = forceNativeBuildPopup;
  global.getBuildInfo = getBuildInfo;
  global.resetNativeBuildSystem = resetNativeBuildSystem;
}
