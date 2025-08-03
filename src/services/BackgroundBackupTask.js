import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import SuperBackupService from './SuperBackupService';

const BACKUP_TASK = 'background-backup-task';

TaskManager.defineTask(BACKUP_TASK, async () => {
  try {
    console.log('🔄 [BackgroundFetch] Esecuzione backup automatico in background...');
    const result = await SuperBackupService.executeAutomaticBackup();
    if (result.success) {
      console.log('✅ [BackgroundFetch] Backup automatico completato in background');
      // Notifica locale di conferma
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Backup automatico completato',
          body: `Backup eseguito in background: ${result.fileName}`,
          data: { type: 'backup_success', fileName: result.fileName },
          sound: false,
        },
        trigger: null,
      });
      return BackgroundFetch.Result.NewData;
    } else {
      console.warn('⚠️ [BackgroundFetch] Backup non eseguito:', result.reason || result.error);
      return BackgroundFetch.Result.NoData;
    }
  } catch (e) {
    console.error('❌ [BackgroundFetch] Errore backup automatico:', e);
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundBackupTask() {
  try {
    // Verifica se BackgroundFetch è disponibile
    if (!BackgroundFetch || !BackgroundFetch.getStatusAsync) {
      console.log('⚠️ [BackgroundFetch] Modulo non disponibile - saltando registrazione');
      return false;
    }
    
    let status;
    try {
      status = await BackgroundFetch.getStatusAsync();
    } catch (statusError) {
      console.log('⚠️ [BackgroundFetch] Impossibile verificare status:', statusError.message);
      return false;
    }
    
    // Verifica se le costanti di status esistono prima di usarle
    if (BackgroundFetch.Status && (status === BackgroundFetch.Status.Restricted || status === BackgroundFetch.Status.Denied)) {
      console.warn('❌ [BackgroundFetch] Permessi background negati');
      return false;
    }
    
    await BackgroundFetch.registerTaskAsync(BACKUP_TASK, {
      minimumInterval: 60 * 60, // 1 ora (in secondi)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('✅ [BackgroundFetch] Task backup automatico registrato');
    return true;
  } catch (e) {
    console.error('❌ [BackgroundFetch] Errore registrazione task:', e);
    return false;
  }
}
