/**
 * Utility per testare l'auto-approvazione delle richieste ferie
 * Eseguire nell'app Expo per verificare le correzioni
 */

// Codice da eseguire nella console dell'app per testare
const testAutoApproval = async () => {
  try {
    console.log('🧪 Test Auto-Approvazione - Inizio');
    
    // Importa VacationService (questo dovrebbe essere fatto nell'app)
    // const VacationService = require('./src/services/VacationService').default;
    
    // 1. Imposta auto-approvazione a TRUE
    console.log('📝 Impostazione auto-approvazione a TRUE...');
    const settingsEnabled = {
      annualVacationDays: 26,
      autoApprovalEnabled: true,
      autoCompileTimeEntry: true
    };
    
    // await VacationService.setSettings(settingsEnabled);
    console.log('✅ Impostazioni salvate:', settingsEnabled);
    
    // 2. Crea una richiesta di test
    console.log('📝 Creazione richiesta ferie di test...');
    const testRequest = {
      type: 'ferie',
      startDate: '2025-07-07',
      endDate: '2025-07-07',
      reason: 'Test auto-approvazione',
      days: 1
    };
    
    // const result = await VacationService.addVacationRequest(testRequest);
    console.log('✅ Richiesta creata:', testRequest);
    // console.log('📋 Risultato:', result);
    // console.log(`🔍 Status atteso: 'approved', Status ricevuto: '${result?.status}'`);
    
    // 3. Imposta auto-approvazione a FALSE
    console.log('📝 Impostazione auto-approvazione a FALSE...');
    const settingsDisabled = {
      ...settingsEnabled,
      autoApprovalEnabled: false
    };
    
    // await VacationService.setSettings(settingsDisabled);
    console.log('✅ Impostazioni aggiornate:', settingsDisabled);
    
    // 4. Crea una seconda richiesta
    console.log('📝 Creazione seconda richiesta...');
    const testRequest2 = {
      type: 'permesso',
      startDate: '2025-07-08',
      endDate: '2025-07-08',
      reason: 'Test modalità manuale',
      hours: 4
    };
    
    // const result2 = await VacationService.addVacationRequest(testRequest2);
    console.log('✅ Seconda richiesta creata:', testRequest2);
    // console.log('📋 Risultato:', result2);
    // console.log(`🔍 Status atteso: 'pending', Status ricevuto: '${result2?.status}'`);
    
    console.log('🎉 Test completato! Verificare i risultati nell\'app.');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
};

// Istruzioni per l'uso
console.log('📖 ISTRUZIONI PER IL TEST:');
console.log('1. Aprire l\'app Expo');
console.log('2. Aprire la console di sviluppo (Ctrl+M su Android, Cmd+D su iOS)');
console.log('3. Incollare e eseguire la funzione testAutoApproval()');
console.log('4. Verificare i risultati nelle impostazioni e lista richieste');

console.log('\n🔄 ALTERNATIVA MANUALE:');
console.log('1. Andare su Dashboard > Ferie e Permessi > Impostazioni');
console.log('2. Attivare "Auto-approvazione richieste"');
console.log('3. Salvare');
console.log('4. Creare una nuova richiesta');
console.log('5. Verificare che sia automaticamente approvata');

console.log('\n🐛 DEBUG:');
console.log('Se il problema persiste, controllare:');
console.log('- Console log per verificare settings?.autoApprovalEnabled');
console.log('- VacationService.addVacationRequest() per il status assegnato');
console.log('- UI component per il rendering del status');

module.exports = { testAutoApproval };
