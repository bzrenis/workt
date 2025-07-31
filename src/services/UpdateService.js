import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

class UpdateService {
  constructor() {
    this.isChecking = false;
  }

  /**
   * Controlla se ci sono aggiornamenti disponibili
   */
  async checkForUpdates(showAlert = false) {
    // Non controllare in sviluppo
    if (__DEV__) {
      console.log('🔄 UPDATE SERVICE - Saltato controllo aggiornamenti (modalità sviluppo)');
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
        
        if (showAlert) {
          return this.showUpdatePrompt();
        } else {
          // Aggiornamento silenzioso
          return this.downloadAndApplyUpdate();
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
  async showUpdatePrompt() {
    return new Promise((resolve) => {
      Alert.alert(
        '🚀 Aggiornamento Disponibile',
        'È disponibile una nuova versione dell\'app con miglioramenti e correzioni. Vuoi aggiornare ora?',
        [
          {
            text: 'Più tardi',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Aggiorna',
            style: 'default',
            onPress: async () => {
              const success = await this.downloadAndApplyUpdate();
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
  async downloadAndApplyUpdate() {
    try {
      console.log('⬇️ UPDATE SERVICE - Download aggiornamento...');
      
      // Scarica l'aggiornamento
      await Updates.fetchUpdateAsync();
      console.log('✅ UPDATE SERVICE - Download completato');

      // Applica l'aggiornamento (riavvia l'app)
      await Updates.reloadAsync();
      return true;
    } catch (error) {
      console.error('❌ UPDATE SERVICE - Errore download/applicazione aggiornamento:', error);
      
      Alert.alert(
        'Errore Aggiornamento',
        'Si è verificato un errore durante l\'aggiornamento. Riprova più tardi.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Controllo automatico all'avvio dell'app
   */
  async checkOnAppStart() {
    // Aspetta un po' prima di controllare per non interferire con l'avvio
    setTimeout(() => {
      this.checkForUpdates(false); // Aggiornamento silenzioso
    }, 3000);
  }

  /**
   * Controllo manuale (con prompt)
   */
  async checkManually() {
    return this.checkForUpdates(true);
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
}

// Singleton instance
const updateService = new UpdateService();

export default updateService;
