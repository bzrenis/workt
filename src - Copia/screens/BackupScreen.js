import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackupService from '../services/BackupService';
import { formatDate } from '../utils';

const BackupScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupStats, setBackupStats] = useState(null);

  useEffect(() => {
    loadBackups();
    loadBackupStats();
  }, []);

  const loadBackups = async () => {
    try {
      const backupList = await BackupService.listLocalBackups();
      setBackups(backupList);
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadBackupStats = async () => {
    try {
      const stats = await BackupService.getBackupStats();
      setBackupStats(stats);
    } catch (error) {
      console.error('Error loading backup stats:', error);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      const result = await BackupService.createLocalBackup();
      
      Alert.alert(
        'Backup Creato',
        `Backup salvato con successo: ${result.fileName}`,
        [{ text: 'OK' }]
      );
      
      await loadBackups();
      await loadBackupStats();
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Errore', 'Impossibile creare il backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsLoading(true);
      const result = await BackupService.exportBackup();
      
      Alert.alert(
        'Backup Esportato',
        `Backup condiviso con successo: ${result.fileName}`,
        [{ text: 'OK' }]
      );
      
      await loadBackups();
      await loadBackupStats();
    } catch (error) {
      console.error('Error exporting backup:', error);
      Alert.alert('Errore', 'Impossibile esportare il backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportBackup = async () => {
    Alert.alert(
      'Attenzione',
      'L\'importazione sostituirà tutti i dati esistenti. Vuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Continua', onPress: performImport }
      ]
    );
  };

  const performImport = async () => {
    try {
      setIsLoading(true);
      const result = await BackupService.importBackup();
      
      if (result.success) {
        Alert.alert(
          'Importazione Completata',
          `Dati ripristinati da: ${result.fileName}\n` +
          `Inserimenti: ${result.recordsCount.workEntries}\n` +
          `Giorni reperibilità: ${result.recordsCount.standbyDays}\n` +
          `Impostazioni: ${result.recordsCount.settings}`,
          [{ text: 'OK' }]
        );
        
        await loadBackups();
        await loadBackupStats();
      } else {
        Alert.alert('Info', result.message || 'Operazione annullata');
      }
    } catch (error) {
      console.error('Error importing backup:', error);
      Alert.alert('Errore', 'Impossibile importare il backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = (backup) => {
    Alert.alert(
      'Elimina Backup',
      `Vuoi eliminare il backup "${backup.fileName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => performDelete(backup) }
      ]
    );
  };

  const performDelete = async (backup) => {
    try {
      await BackupService.deleteLocalBackup(backup.fileName);
      Alert.alert('Successo', 'Backup eliminato');
      await loadBackups();
      await loadBackupStats();
    } catch (error) {
      console.error('Error deleting backup:', error);
      Alert.alert('Errore', 'Impossibile eliminare il backup');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderBackupItem = ({ item }) => (
    <View style={styles.backupItem}>
      <View style={styles.backupHeader}>
        <Text style={styles.backupName}>{item.fileName}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteBackup(item)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.backupDetails}>
        <Text style={styles.backupDate}>
          {formatDate(new Date(item.created), 'dd/MM/yyyy')} - {formatFileSize(item.size)}
        </Text>
        <Text style={styles.backupRecords}>
          {item.recordsCount.workEntries} inserimenti, {item.recordsCount.standbyDays} giorni reperibilità
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Backup e Ripristino</Text>
          <Text style={styles.headerSubtitle}>
            Gestisci i backup dei tuoi dati di lavoro
          </Text>
        </View>

        {backupStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Statistiche Backup</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{backupStats.totalBackups}</Text>
                <Text style={styles.statLabel}>Backup Totali</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatFileSize(backupStats.totalSize)}</Text>
                <Text style={styles.statLabel}>Spazio Utilizzato</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.createButton]} 
            onPress={handleCreateBackup}
            disabled={isLoading}
          >
            <Ionicons name="save-outline" size={24} color="white" />
            <Text style={styles.actionButtonText}>Crea Backup Locale</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.exportButton]} 
            onPress={handleExportBackup}
            disabled={isLoading}
          >
            <Ionicons name="share-outline" size={24} color="white" />
            <Text style={styles.actionButtonText}>Esporta e Condividi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.importButton]} 
            onPress={handleImportBackup}
            disabled={isLoading}
          >
            <Ionicons name="download-outline" size={24} color="white" />
            <Text style={styles.actionButtonText}>Importa Backup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.backupsContainer}>
          <Text style={styles.backupsTitle}>Backup Locali</Text>
          
          {backups.length === 0 ? (
            <View style={styles.noBackupsContainer}>
              <Ionicons name="archive-outline" size={48} color="#ccc" />
              <Text style={styles.noBackupsText}>Nessun backup trovato</Text>
              <Text style={styles.noBackupsSubtext}>
                Crea il primo backup per proteggere i tuoi dati
              </Text>
            </View>
          ) : (
            <FlatList
              data={backups}
              renderItem={renderBackupItem}
              keyExtractor={(item) => item.fileName}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#2196F3" />
            <Text style={styles.infoTitle}>Informazioni Backup</Text>
          </View>
          <Text style={styles.infoText}>
            • I backup locali vengono salvati sul dispositivo{'\n'}
            • Usa "Esporta e Condividi" per salvare su cloud o inviare via email{'\n'}
            • L'importazione sostituisce tutti i dati esistenti{'\n'}
            • Viene creato automaticamente un backup ogni settimana
          </Text>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Elaborazione in corso...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  exportButton: {
    backgroundColor: '#FF9800',
  },
  importButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backupsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backupsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  noBackupsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noBackupsText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  noBackupsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  backupItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  backupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  backupDetails: {
    gap: 4,
  },
  backupDate: {
    fontSize: 14,
    color: '#666',
  },
  backupRecords: {
    fontSize: 12,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
});

export default BackupScreen;
