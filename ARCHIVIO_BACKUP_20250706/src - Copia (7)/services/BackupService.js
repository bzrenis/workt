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

  // List local backups
  async listLocalBackups() {
    try {
      await this.ensureBackupDirectory();
      
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
              }
            });
          } catch (parseError) {
            console.warn('Could not parse backup file:', fileName, parseError);
          }
        }
      }
      
      // Sort by creation date (newest first)
      backupList.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return backupList;
    } catch (error) {
      console.error('Error listing local backups:', error);
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
      const localBackups = await this.listLocalBackups();
      const totalSize = localBackups.reduce((sum, backup) => sum + backup.size, 0);
      
      return {
        totalBackups: localBackups.length,
        totalSize,
        latestBackup: localBackups[0]?.created || null,
        oldestBackup: localBackups[localBackups.length - 1]?.created || null
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
}

// Crea e esporta una singola istanza (Singleton Pattern)
const BackupServiceInstance = new BackupService();
export default BackupServiceInstance;
