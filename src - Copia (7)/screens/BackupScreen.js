import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackupService from '../services/BackupService';
import { formatDate } from '../utils';

const BackupScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupStats, setBackupStats] = useState(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showBackupDetails, setShowBackupDetails] = useState(false);

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

  const handleCreateCustomBackup = () => {
    const defaultName = `backup-${new Date().toISOString().split('T')[0]}`;
    setBackupName(defaultName);
    setShowNameDialog(true);
  };

  const handleConfirmCustomBackup = async () => {
    if (!backupName.trim()) {
      Alert.alert('Errore', 'Inserisci un nome per il backup');
      return;
    }

    try {
      setIsLoading(true);
      setShowNameDialog(false);
      
      const result = await BackupService.createBackupWithFolderPicker(backupName.trim());
      
      Alert.alert(
        'Backup Creato',
        `Backup salvato con successo!\n\nNome: ${result.fileName}\nPosizione: ${result.location}`,
        [{ text: 'OK' }]
      );
      
      await loadBackups();
      await loadBackupStats();
    } catch (error) {
      console.error('Error creating custom backup:', error);
      Alert.alert('Errore', 'Impossibile creare il backup personalizzato');
    } finally {
      setIsLoading(false);
      setBackupName('');
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
        <TouchableOpacity onPress={() => handleShowBackupDetails(item)}>
          <Text style={[styles.backupName, styles.backupNameLink]} numberOfLines={1} ellipsizeMode="middle">{item.fileName}</Text>
        </TouchableOpacity>
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
        <Text style={styles.backupPath} numberOfLines={1} ellipsizeMode="middle">
          Percorso: {item.filePath ? item.filePath : item.location}
        </Text>
      </View>
    </View>
  );

  const handleShowBackupDetails = (backup) => {
    setSelectedBackup(backup);
    setShowBackupDetails(true);
  };

  const handleCloseBackupDetails = () => {
    setShowBackupDetails(false);
    setSelectedBackup(null);
  };

  // Ripristina backup dal file locale
  const handleRestoreBackup = async (backup) => {
    if (!backup.filePath || backup.filePath === 'user_selected') {
      Alert.alert('Non supportato', 'Il ripristino è disponibile solo per i backup locali presenti nella cartella dell\'app.');
      return;
    }
    try {
      setIsLoading(true);
      // Leggi il file e importa i dati
      const fileContent = await BackupService.importBackupFromPath(backup.filePath);
      if (fileContent && fileContent.success) {
        Alert.alert('Ripristino completato', `Backup ripristinato con successo da: ${backup.fileName}`);
        await loadBackups();
        await loadBackupStats();
      } else {
        Alert.alert('Errore', 'Impossibile ripristinare il backup.');
      }
    } catch (error) {
      console.error('Errore ripristino backup:', error);
      Alert.alert('Errore', 'Impossibile ripristinare il backup.');
    } finally {
      setIsLoading(false);
    }
  };

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
            style={[styles.actionButton, styles.customButton]} 
            onPress={handleCreateCustomBackup}
            disabled={isLoading}
          >
            <Ionicons name="folder-outline" size={24} color="white" />
            <Text style={styles.actionButtonText}>Backup Personalizzato</Text>
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
            • I backup locali vengono salvati nella cartella dell'app{'\n'}
            • "Backup Personalizzato" ti permette di scegliere nome e posizione{'\n'}
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

        <Modal
          visible={showNameDialog}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Backup Personalizzato</Text>
              <Text style={styles.modalSubtitle}>
                Inserisci il nome del backup. Potrai scegliere dove salvarlo.
              </Text>
              
              <TextInput
                style={styles.input}
                value={backupName}
                onChangeText={setBackupName}
                placeholder="Es: backup-lavoro-giugno-2025"
                placeholderTextColor="#999"
                autoFocus={true}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowNameDialog(false)}
                >
                  <Text style={styles.actionButtonText}>Annulla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={handleConfirmCustomBackup}
                >
                  <Text style={styles.actionButtonText}>Crea Backup</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showBackupDetails}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseBackupDetails}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Dettagli Backup</Text>
              {selectedBackup && (
                <>
                  <Text style={styles.modalLabel}>Nome:</Text>
                  <Text style={styles.modalValue}>{selectedBackup.fileName}</Text>
                  <Text style={styles.modalLabel}>Percorso completo:</Text>
                  <Text style={styles.modalValue} selectable numberOfLines={3} ellipsizeMode="middle">
                    {selectedBackup.filePath ? selectedBackup.filePath : selectedBackup.location}
                  </Text>
                  <Text style={styles.modalLabel}>Inserimenti:</Text>
                  <Text style={styles.modalValue}>{selectedBackup.recordsCount?.workEntries ?? 0}</Text>
                </>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton, { flex: 1, marginRight: 8 }]}
                  onPress={handleCloseBackupDetails}
                >
                  <Text style={styles.actionButtonText}>Chiudi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton, { flex: 1 }]}
                  onPress={() => {
                    setShowBackupDetails(false);
                    setTimeout(() => {
                      Alert.alert(
                        'Conferma Ripristino',
                        'Vuoi davvero ripristinare questo backup? Questa operazione sovrascriverà tutti i dati attuali.',
                        [
                          { text: 'Annulla', style: 'cancel' },
                          { text: 'Ripristina', style: 'destructive', onPress: () => handleRestoreBackup(selectedBackup) }
                        ]
                      );
                    }, 300);
                  }}
                >
                  <Text style={styles.actionButtonText}>Ripristina</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  customButton: {
    backgroundColor: '#9C27B0',
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
  backupNameLink: {
    color: '#1976D2',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
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
  backupPath: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#F44336',
    flex: 1,
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  detailsContainer: {
    marginTop: 10,
  },
  detailItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#2196F3',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    marginTop: 15,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
  },
  modalValue: {
    fontSize: 15,
    color: '#222',
    marginTop: 2,
  },
});

export default BackupScreen;
