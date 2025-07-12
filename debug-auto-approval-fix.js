// Debug script per verificare il problema auto-approvazione
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function debugAutoApproval() {
  console.log('=== DEBUG AUTO-APPROVAZIONE FERIE ===');
  
  try {
    // Verifica le impostazioni attuali
    const settingsKey = 'vacation_settings';
    const settingsData = await AsyncStorage.getItem(settingsKey);
    
    if (settingsData) {
      const settings = JSON.parse(settingsData);
      console.log('📋 Impostazioni correnti:', JSON.stringify(settings, null, 2));
      
      console.log('🔍 Controllo specifico auto-approvazione:');
      console.log('- autoApprovalEnabled:', settings.autoApprovalEnabled);
      console.log('- Tipo:', typeof settings.autoApprovalEnabled);
      console.log('- Confronto === true:', settings.autoApprovalEnabled === true);
      console.log('- Confronto == true:', settings.autoApprovalEnabled == true);
      
      if (settings.autoApprovalEnabled !== true) {
        console.log('⚠️ AUTO-APPROVAZIONE DISATTIVATA');
        console.log('🔧 Attivo auto-approvazione...');
        
        settings.autoApprovalEnabled = true;
        settings.autoCompileEnabled = true;
        
        await AsyncStorage.setItem(settingsKey, JSON.stringify(settings));
        console.log('✅ Auto-approvazione attivata');
      } else {
        console.log('✅ Auto-approvazione già attivata');
      }
    } else {
      console.log('❌ Nessuna impostazione trovata');
      console.log('🔧 Creo impostazioni di default...');
      
      const defaultSettings = {
        annualVacationDays: 26,
        carryOverDays: 0,
        currentYear: new Date().getFullYear(),
        startDate: `${new Date().getFullYear()}-01-01`,
        permitsPerMonth: 8,
        autoApprovalEnabled: true,
        autoCompileEnabled: true
      };
      
      await AsyncStorage.setItem(settingsKey, JSON.stringify(defaultSettings));
      console.log('✅ Impostazioni create con auto-approvazione attiva');
    }
    
    // Verifica le richieste esistenti
    const vacationKey = 'vacation_data';
    const vacationData = await AsyncStorage.getItem(vacationKey);
    
    if (vacationData) {
      const requests = JSON.parse(vacationData);
      console.log('\n📝 Richieste esistenti:');
      
      requests.forEach((req, index) => {
        console.log(`${index + 1}. ID: ${req.id}`);
        console.log(`   Tipo: ${req.type}`);
        console.log(`   Periodo: ${req.startDate} - ${req.endDate}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Creata: ${req.createdAt}`);
        
        if (req.status === 'pending') {
          console.log('   🔄 QUESTA RICHIESTA È IN ATTESA');
        }
      });
      
      // Cerca richieste in attesa e approvale automaticamente
      const pendingRequests = requests.filter(req => req.status === 'pending');
      
      if (pendingRequests.length > 0) {
        console.log(`\n🔧 Trovate ${pendingRequests.length} richieste in attesa`);
        console.log('🔄 Approvo automaticamente...');
        
        pendingRequests.forEach(req => {
          req.status = 'approved';
          req.approvedAt = new Date().toISOString();
          console.log(`✅ Approvata richiesta ${req.id} (${req.type})`);
        });
        
        await AsyncStorage.setItem(vacationKey, JSON.stringify(requests));
        console.log('✅ Tutte le richieste sono state approvate');
      } else {
        console.log('\n✅ Nessuna richiesta in attesa trovata');
      }
    } else {
      console.log('\n📝 Nessuna richiesta trovata');
    }
    
    console.log('\n=== RISULTATO ===');
    console.log('✅ Debug completato');
    console.log('✅ Auto-approvazione attivata');
    console.log('✅ Richieste in attesa approvate');
    console.log('\n💡 Riavvia l\'app per vedere i cambiamenti');
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

// Esegui il debug
debugAutoApproval();
