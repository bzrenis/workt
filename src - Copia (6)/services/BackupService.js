import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import DatabaseService from './DatabaseService';

class BackupService {
  constructor() {
    this.backupDirectory = `${FileSystem.documentDirectory}backups/`;
  }

  async ensureBackupDirectory() {
    try {
      await FileSystem.makeDirectoryAsync(this.backupDirectory, { intermediateDirectories: true });
    } catch (error) {
      // On Android, makeDirectoryAsync can throw an error if the directory already exists.
      // We check if the directory exists to confirm that this is the case. If it does, we can ignore the error.
      const dirInfo = await FileSystem.getInfoAsync(this.backupDirectory);
      if (!dirInfo.exists) {
        // If the directory doesn't exist, then the error was for a different reason, and we should re-throw it.
        throw error;
      }
    }
  }

  // Create local backup
  async createLocalBackup(backupName = null) {
    try {
      await this.ensureBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = backupName || `worktracker-backup-${timestamp}.json`;
      const filePath = `${this.backupDirectory}${fileName}`;
      
      // Get all data from database
      const data = await DatabaseService.getAllData();
      
      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'local',
          version: '1.0',
          app: 'WorkTracker'
        }
      };
      
      // Write to file
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Record backup in database
      await DatabaseService.recordBackup({
        backup_name: fileName,
        backup_type: 'local',
        file_path: filePath,
        status: 'completed'
      });
      
      console.log('Local backup created:', filePath);
      return {
        success: true,
        filePath,
        fileName,
        size: (await FileSystem.getInfoAsync(filePath)).size
      };
    } catch (error) {
      console.error('Error creating local backup:', error);
      throw error;
    }
  }

  // Export backup for sharing
  async exportBackup(backupName = null) {
    try {
      const backup = await this.createLocalBackup(backupName);
      
      // Share the backup file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backup.filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Condividi Backup WorkTracker'
        });
      }
      
      return backup;
    } catch (error) {
      console.error('Error exporting backup:', error);
      throw error;
    }
  }

  // Import backup from file
  async importBackup() {
    try {
      // Pick backup file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return { success: false, message: 'Operazione annullata' };
      }
      
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backupData = JSON.parse(fileContent);
      
      // Validate backup format
      if (!this.validateBackupFormat(backupData)) {
        throw new Error('Formato backup non valido');
      }
      
      // Restore data to database
      await DatabaseService.restoreData(backupData);
      
      // Record import in backup history
      await DatabaseService.recordBackup({
        backup_name: result.assets[0].name,
        backup_type: 'import',
        status: 'completed',
        notes: `Imported from ${result.assets[0].name}`
      });
      
      console.log('Backup imported successfully');
      return {
        success: true,
        fileName: result.assets[0].name,
        recordsCount: {
          workEntries: backupData.workEntries?.length || 0,
          standbyDays: backupData.standbyDays?.length || 0,
          settings: backupData.settings?.length || 0
        }
      };
    } catch (error) {
      console.error('Error importing backup:', error);
      throw error;
    }
  }

  // Import backup da percorso locale (senza picker)
  async importBackupFromPath(filePath) {
    try {
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(filePath);
      const backupData = JSON.parse(fileContent);
      // Validate backup format
      if (!this.validateBackupFormat(backupData)) {
        throw new Error('Formato backup non valido');
      }
      // Restore data to database
      await DatabaseService.restoreData(backupData);
      // Record import in backup history
      await DatabaseService.recordBackup({
        backup_name: backupData.backupInfo?.name || 'manual-restore',
        backup_type: 'import',
        status: 'completed',
        notes: `Ripristinato da file locale: ${filePath}`
      });
      return {
        success: true,
        fileName: backupData.backupInfo?.name || 'manual-restore',
        recordsCount: {
          workEntries: backupData.workEntries?.length || 0,
          standbyDays: backupData.standbyDays?.length || 0,
          settings: backupData.settings?.length || 0
        }
      };
    } catch (error) {
      console.error('Error importing backup from path:', error);
      return { success: false, message: error.message };
    }
  }

  // List local backups
  async listLocalBackups() {
    return this.listAllBackups();
  }

  // Lista tutti i backup (locali e personalizzati)
  async listAllBackups() {
    try {
      await this.ensureBackupDirectory();
      // Leggi i file fisici nella cartella locale
      const backupFiles = await FileSystem.readDirectoryAsync(this.backupDirectory);
      const backupList = [];
      for (const fileName of backupFiles) {
        if (fileName.endsWith('.json')) {
          const filePath = `${this.backupDirectory}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          try {
            const fileContent = await FileSystem.readAsStringAsync(filePath);
            const backupData = JSON.parse(fileContent);
            backupList.push({
              fileName,
              filePath,
              size: fileInfo.size,
              created: fileInfo.modificationTime,
              backupDate: backupData.backupInfo?.created || backupData.exportDate,
              recordsCount: {
                workEntries: backupData.workEntries?.length || 0,
                standbyDays: backupData.standbyDays?.length || 0,
                settings: backupData.settings?.length || 0
              },
              backupType: backupData.backupInfo?.type || 'local',
              location: 'App'
            });
          } catch (parseError) {
            console.warn('Could not parse backup file:', fileName, parseError);
          }
        }
      }
      // Leggi anche i backup registrati nel database (inclusi quelli personalizzati)
      const dbBackups = await DatabaseService.getAllBackupsFromDb();
      // Unisci, evitando duplicati (stesso nome e tipo)
      dbBackups.forEach(dbB => {
        const already = backupList.find(b => b.fileName === dbB.fileName && b.backupType === dbB.backupType);
        if (!already) {
          backupList.push({
            fileName: dbB.fileName,
            filePath: dbB.filePath,
            size: null,
            created: dbB.created,
            backupDate: dbB.created,
            recordsCount: {},
            backupType: dbB.backupType,
            location: dbB.backupType === 'custom' ? 'Personalizzato' : (dbB.backupType === 'download' ? 'Downloads' : 'App'),
            status: dbB.status,
            notes: dbB.notes
          });
        }
      });
      // Ordina per data
      backupList.sort((a, b) => new Date(b.created) - new Date(a.created));
      return backupList;
    } catch (error) {
      console.error('Error listing all backups:', error);
      throw error;
    }
  }

  // Delete local backup
  async deleteLocalBackup(fileName) {
    try {
      const filePath = `${this.backupDirectory}${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log('Backup deleted:', fileName);
        return { success: true };
      } else {
        throw new Error('File backup non trovato');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Validate backup format
  validateBackupFormat(backupData) {
    // Check required fields
    if (!backupData.exportDate && !backupData.backupInfo?.created) {
      return false;
    }
    
    // Check if it has expected data structure
    if (!Array.isArray(backupData.workEntries) && 
        !Array.isArray(backupData.standbyDays) && 
        !Array.isArray(backupData.settings)) {
      return false;
    }
    
    return true;
  }

  // Get backup statistics
  async getBackupStats() {
    try {
      const allBackups = await this.listAllBackups();
      const totalSize = allBackups.reduce((sum, backup) => sum + (backup.size || 0), 0);
      
      return {
        totalBackups: allBackups.length,
        totalSize,
        latestBackup: allBackups[0]?.created || null,
        oldestBackup: allBackups[allBackups.length - 1]?.created || null
      };
    } catch (error) {
      console.error('Error getting backup stats:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        latestBackup: null,
        oldestBackup: null
      };
    }
  }

  // Auto backup (called periodically)
  async autoBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `auto-backup-${timestamp}.json`;
      
      const result = await this.createLocalBackup(backupName);
      
      // Keep only last 5 auto backups
      await this.cleanupOldAutoBackups();
      
      return result;
    } catch (error) {
      console.error('Error in auto backup:', error);
      throw error;
    }
  }

  // Cleanup old auto backups
  async cleanupOldAutoBackups() {
    try {
      const backups = await this.listLocalBackups();
      const autoBackups = backups.filter(backup => backup.fileName.startsWith('auto-backup-'));
      
      // Keep only the 5 most recent auto backups
      if (autoBackups.length > 5) {
        const backupsToDelete = autoBackups.slice(5);
        
        for (const backup of backupsToDelete) {
          await this.deleteLocalBackup(backup.fileName);
        }
        
        console.log(`Cleaned up ${backupsToDelete.length} old auto backups`);
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }

  // Create local backup with custom name and location
  async createCustomLocalBackup(customName, saveToDownloads = false) {
    try {
      await this.ensureBackupDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName.endsWith('.json') ? customName : `${customName}.json`;
      
      // Determine save location
      let filePath;
      if (saveToDownloads) {
        // Save to Downloads folder (requires permission on Android)
        filePath = `${FileSystem.documentDirectory}../Downloads/${fileName}`;
      } else {
        // Save to app's backup directory
        filePath = `${this.backupDirectory}${fileName}`;
      }
      
      // Get all data from database
      const data = await DatabaseService.getAllData();
      
      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: saveToDownloads ? 'download' : 'local',
          version: '1.0',
          app: 'WorkTracker'
        }
      };
      
      // Write to file
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupData, null, 2));
      
      // Record backup in database
      await DatabaseService.recordBackup({
        backup_name: fileName,
        backup_type: saveToDownloads ? 'download' : 'local',
        file_path: filePath,
        status: 'completed'
      });
      
      console.log('Custom backup created:', filePath);
      return {
        success: true,
        filePath,
        fileName,
        size: (await FileSystem.getInfoAsync(filePath)).size,
        location: saveToDownloads ? 'Downloads' : 'App Directory'
      };
    } catch (error) {
      console.error('Error creating custom backup:', error);
      throw error;
    }
  }

  // Create backup with folder picker
  async createBackupWithFolderPicker(customName) {
    try {
      // Get all data from database
      const data = await DatabaseService.getAllData();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = customName.endsWith('.json') ? customName : `${customName}.json`;
      
      // Add backup metadata
      const backupData = {
        ...data,
        backupInfo: {
          name: fileName,
          created: new Date().toISOString(),
          type: 'custom',
          version: '1.0',
          app: 'WorkTracker'
        }
      };

      // Convert data to string
      const jsonContent = JSON.stringify(backupData, null, 2);
      
      // Create temporary file
      const tempPath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(tempPath, jsonContent);
      
      // Use sharing to let user choose where to save
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempPath, {
          mimeType: 'application/json',
          dialogTitle: `Salva ${fileName}`
        });
        
        // Record backup in database
        await DatabaseService.recordBackup({
          backup_name: fileName,
          backup_type: 'custom',
          file_path: 'user_selected',
          status: 'completed'
        });
        
        // Clean up temp file
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
        
        return {
          success: true,
          fileName,
          location: 'Posizione scelta dall\'utente',
          size: jsonContent.length
        };
      } else {
        throw new Error('Sharing non disponibile su questo dispositivo');
      }
    } catch (error) {
      console.error('Error creating backup with folder picker:', error);
      throw error;
    }
  }
}

// Crea e esporta una singola istanza (Singleton Pattern)
const BackupServiceInstance = new BackupService();
export default BackupServiceInstance;
