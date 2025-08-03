import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UpdateService {
  constructor() {
    this.isChecking = false;
    this.currentVersion = '1.2.2'; // ✅ AGGIORNATO v1.2.2: Backup automatico con app chiusa
  }

  /**
   * Controlla se ci sono aggiornamenti disponibili
   */
  async checkForUpdates(showAlert = false) {
    // In modalità sviluppo, mostra info utili invece di saltare
    if (__DEV__) {
      console.log('🔄 UPDATE SERVICE - Modalità sviluppo rilevata');
      if (showAlert) {
        return this.showDevelopmentUpdateInfo();
      }
      return false;
    }

    // Evita controlli multipli simultanei
    if (this.isChecking) {
      console.log('🔄 UPDATE SERVICE - Controllo già in corso');
      return false;
    }

    try {
      this.isChecking = true;
      console.log('🔄 UPDATE SERVICE - Controllo aggiornamenti...');

      // Controlla se ci sono aggiornamenti
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('✅ UPDATE SERVICE - Aggiornamento disponibile!');
        console.log('🔍 UPDATE SERVICE - Manifest:', update.manifest);
        
        if (showAlert) {
          return this.showUpdatePrompt(update);
        } else {
          // Aggiornamento silenzioso
          return this.downloadAndApplyUpdate(update);
        }
      } else {
        console.log('ℹ️ UPDATE SERVICE - Nessun aggiornamento disponibile');
        return false;
      }
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore controllo aggiornamenti:', error);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Mostra prompt all'utente per l'aggiornamento
   */
  async showUpdatePrompt(update) {
    const newVersion = this.extractVersionFromUpdate(update);
    
    return new Promise((resolve) => {
      Alert.alert(
        '🚀 Aggiornamento Disponibile',
        `È disponibile la versione ${newVersion || 'più recente'} dell'app con miglioramenti e correzioni. Vuoi aggiornare ora?\n\n📱 L'app si riavvierà automaticamente dopo l'aggiornamento.`,
        [
          {
            text: 'Più tardi',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Aggiorna Ora',
            style: 'default',
            onPress: async () => {
              const success = await this.downloadAndApplyUpdate(update, newVersion);
              resolve(success);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Scarica e applica l'aggiornamento
   */
  async downloadAndApplyUpdate(update, newVersion) {
    try {
      console.log('⬇️ UPDATE SERVICE - Download aggiornamento...');
      
      // Salva info pre-aggiornamento
      await this.savePreUpdateInfo(newVersion);
      
      // Scarica l'aggiornamento
      await Updates.fetchUpdateAsync();
      console.log('✅ UPDATE SERVICE - Download completato');

      // Applica l'aggiornamento (riavvia l'app)
      console.log('🔄 UPDATE SERVICE - Applicazione aggiornamento e riavvio...');
      await Updates.reloadAsync();
      return true;
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore download/applicazione aggiornamento:', error);
      
      Alert.alert(
        '❌ Errore Aggiornamento',
        'Si è verificato un errore durante l\'aggiornamento. Riprova più tardi.\n\nDettagli: ' + error.message,
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Controllo automatico all'avvio dell'app
   */
  async checkOnAppStart() {
    // Prima controlla se è appena stato completato un aggiornamento
    const wasUpdated = await this.checkAndShowUpdateCompletedMessage();
    
    // Se non c'è stato un aggiornamento, controlla versioni storiche
    if (!wasUpdated) {
      await this.checkVersionChange();
    }
    
    // Aspetta un po' prima di controllare per non interferire con l'avvio
    setTimeout(() => {
      this.checkForUpdates(false); // Aggiornamento silenzioso
    }, 5000); // Aumentato a 5 secondi per evitare conflitti
  }

  /**
   * Controlla se la versione è cambiata dall'ultimo avvio
   */
  async checkVersionChange() {
    try {
      const lastKnownVersion = await AsyncStorage.getItem('last_known_version');
      
      if (lastKnownVersion && lastKnownVersion !== this.currentVersion) {
        console.log(`🔄 UPDATE SERVICE - Rilevato cambio versione: ${lastKnownVersion} → ${this.currentVersion}`);
        
        // Mostra popup di aggiornamento completato
        const updateInfo = {
          previousVersion: lastKnownVersion,
          targetVersion: this.currentVersion,
          updateTime: new Date().toISOString()
        };
        
        setTimeout(() => {
          this.showUpdateCompletedMessage(updateInfo);
        }, 2000);
      }
      
      // Salva la versione corrente
      await AsyncStorage.setItem('last_known_version', this.currentVersion);
      
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore controllo cambio versione:', error);
    }
  }

  /**
   * Controllo manuale (con prompt)
   */
  async checkManually() {
    return this.checkForUpdates(true);
  }

  /**
   * Salva informazioni pre-aggiornamento
   */
  async savePreUpdateInfo(newVersion) {
    try {
      const updateInfo = {
        pendingUpdate: true,
        targetVersion: newVersion || 'unknown',
        updateTime: new Date().toISOString(),
        previousVersion: this.currentVersion
      };
      await AsyncStorage.setItem('pending_update_info', JSON.stringify(updateInfo));
      console.log('💾 UPDATE SERVICE - Info pre-aggiornamento salvate:', updateInfo);
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore salvataggio info pre-aggiornamento:', error);
    }
  }

  /**
   * Controlla e mostra messaggio aggiornamento completato
   */
  async checkAndShowUpdateCompletedMessage() {
    try {
      const pendingUpdateInfo = await AsyncStorage.getItem('pending_update_info');
      
      if (pendingUpdateInfo) {
        const updateInfo = JSON.parse(pendingUpdateInfo);
        console.log('✅ UPDATE SERVICE - Aggiornamento completato rilevato:', updateInfo);
        
        // Rimuovi flag pending
        await AsyncStorage.removeItem('pending_update_info');
        
        // Mostra popup di conferma
        setTimeout(() => {
          this.showUpdateCompletedMessage(updateInfo);
        }, 2000); // Attesa per permettere all'app di caricarsi completamente
        
        return true;
      }
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore controllo aggiornamento completato:', error);
    }
    return false;
  }

  /**
   * Mostra popup aggiornamento completato
   */
  showUpdateCompletedMessage(updateInfo) {
    const version = updateInfo.targetVersion;
    const fromVersion = updateInfo.previousVersion;
    
    Alert.alert(
      '🎉 Aggiornamento Completato!',
      `L'app è stata aggiornata con successo alla versione ${version}!\n\n🚀 Novità e miglioramenti disponibili\n📱 Da versione ${fromVersion} → ${version}\n\n✅ L'app è ora pronta per l'uso.`,
      [
        {
          text: 'Perfetto!',
          style: 'default',
          onPress: () => {
            console.log('✅ UPDATE SERVICE - Popup aggiornamento completato confermato dall\'utente');
          },
        },
      ],
      { cancelable: false }
    );
  }

  /**
   * Estrae la versione dal manifest di aggiornamento
   */
  extractVersionFromUpdate(update) {
    try {
      // Tenta di estrarre la versione dal manifest
      if (update.manifest && update.manifest.extra && update.manifest.extra.version) {
        return update.manifest.extra.version;
      }
      if (update.manifest && update.manifest.version) {
        return update.manifest.version;
      }
      // Fallback: incrementa versione corrente
      const versionParts = this.currentVersion.split('.');
      versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
      return versionParts.join('.');
    } catch (error) {
      console.warn('⚠️ UPDATE SERVICE - Impossibile estrarre versione, usando fallback');
      return null;
    }
  }

  /**
   * Ottieni informazioni sulla versione corrente
   */
  getCurrentUpdateInfo() {
    if (__DEV__) {
      return {
        runtimeVersion: 'development',
        updateId: 'dev-build',
        isEmbeddedLaunch: true,
      };
    }

    return {
      runtimeVersion: Updates.runtimeVersion,
      updateId: Updates.updateId,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    };
  }

  /**
   * Forza il riavvio dell'app
   */
  async forceRestart() {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore riavvio forzato:', error);
    }
  }

  /**
   * 🧪 TEST: Simula un aggiornamento completato (solo per test)
   */
  async testUpdateCompletedMessage() {
    if (__DEV__) {
      console.log('🧪 UPDATE SERVICE - Simulazione aggiornamento completato per test');
      const testUpdateInfo = {
        pendingUpdate: true,
        targetVersion: this.currentVersion,
        updateTime: new Date().toISOString(),
        previousVersion: '1.1.0'
      };
      
      await AsyncStorage.setItem('pending_update_info', JSON.stringify(testUpdateInfo));
      console.log('💾 UPDATE SERVICE - Info test salvate, riavvia l\'app per vedere il popup');
      
      Alert.alert(
        '🧪 Test Aggiornamento',
        'Info test salvate! Riavvia l\'app (Cmd+R o Ctrl+R) per vedere il popup di aggiornamento completato.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Test non disponibile',
        'Questa funzione è disponibile solo in modalità sviluppo.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Forza la visualizzazione del popup per l'aggiornamento corrente
   */
  async forceShowCurrentUpdateMessage() {
    console.log('🔄 UPDATE SERVICE - Forzando visualizzazione popup aggiornamento...');
    
    const updateInfo = {
      previousVersion: '1.1.0',
      targetVersion: this.currentVersion,
      updateTime: new Date().toISOString()
    };
    
    this.showUpdateCompletedMessage(updateInfo);
  }

  /**
   * Mostra informazioni aggiornamenti in modalità sviluppo
   */
  showDevelopmentUpdateInfo() {
    const currentInfo = this.getCurrentUpdateInfo();
    
    Alert.alert(
      '🚧 Modalità Sviluppo',
      `📱 Versione corrente: ${this.currentVersion}\n\n` +
      `🔧 Modalità: ${currentInfo.isEmbeddedLaunch ? 'Build locale' : 'OTA'}\n\n` +
      `ℹ️ Info per sviluppatori:\n` +
      `• Gli aggiornamenti OTA funzionano solo in production\n` +
      `• In sviluppo usa "Ricarica" per aggiornare\n` +
      `• Per testare aggiornamenti usa i comandi debug\n\n` +
      `🚀 Comandi disponibili:\n` +
      `• showPopupNow() - Test popup immediato\n` +
      `• testUpdateCompleted() - Simula aggiornamento\n` +
      `• verifyVersionSync() - Verifica versioni`,
      [
        {
          text: 'Test Popup',
          onPress: () => this.forceShowCurrentUpdateMessage(),
          style: 'default'
        },
        {
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
    
    return true; // Indica che abbiamo gestito la richiesta
  }

  /**
   * 🧪 TEST: Simula disponibilità aggiornamento
   */
  async testUpdateAvailable() {
    if (__DEV__) {
      console.log('🧪 UPDATE SERVICE - Simulazione aggiornamento disponibile per test');
      
      const fakeUpdate = {
        isAvailable: true,
        manifest: {
          version: '1.2.2',
          extra: {
            version: '1.2.2'
          }
        }
      };
      
      await this.showUpdatePrompt(fakeUpdate);
    } else {
      Alert.alert(
        'Test non disponibile',
        'Questa funzione è disponibile solo in modalità sviluppo.',
        [{ text: 'OK' }]
      );
    }
  }
}

// Singleton instance
const updateService = new UpdateService();

export default updateService;
