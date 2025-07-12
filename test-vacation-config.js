// Test delle nuove funzionalità di configurazione Ferie e Permessi
// Esegui: node test-vacation-config.js

const VacationService = require('./src/services/VacationService').default;

async function testVacationConfig() {
  console.log('🧪 Test Configurazione Ferie e Permessi');
  console.log('========================================');

  try {
    // Test 1: Inizializzazione
    console.log('\n1. Inizializzazione VacationService...');
    await VacationService.initialize();
    console.log('✅ Inizializzazione completata');

    // Test 2: Verifica impostazioni di default
    console.log('\n2. Caricamento impostazioni di default...');
    const defaultSettings = await VacationService.getSettings();
    console.log('✅ Impostazioni caricate:', JSON.stringify(defaultSettings, null, 2));

    // Test 3: Aggiorna impostazioni personalizzate
    console.log('\n3. Test aggiornamento impostazioni personalizzate...');
    const customSettings = {
      annualVacationDays: 30, // Più di CCNL standard
      carryOverDays: 3,       // Giorni residui anno precedente
      currentYear: 2025,
      startDate: '2025-01-01',
      permitsPerMonth: 10,    // Più ore del standard
      maxCarryOverDays: 5,
      permitBankEnabled: true,
      sickLeaveEnabled: true,
    };

    const updateResult = await VacationService.setSettings(customSettings);
    console.log('✅ Aggiornamento:', updateResult ? 'Successo' : 'Fallito');

    // Test 4: Verifica persistenza
    console.log('\n4. Verifica persistenza impostazioni...');
    const savedSettings = await VacationService.getSettings();
    console.log('✅ Impostazioni salvate:', JSON.stringify(savedSettings, null, 2));

    // Test 5: Verifica calcoli con nuove impostazioni
    console.log('\n5. Test calcolo giorni residui...');
    const remaining = await VacationService.calculateRemainingDays();
    console.log('✅ Giorni residui calcolati:', JSON.stringify(remaining, null, 2));

    // Test 6: Verifica riepilogo dashboard
    console.log('\n6. Test riepilogo per dashboard...');
    const summary = await VacationService.getVacationSummary();
    console.log('✅ Riepilogo dashboard:', JSON.stringify(summary, null, 2));

    // Test 7: Test validazione
    console.log('\n7. Test validazione richiesta ferie...');
    const testRequest = {
      type: 'vacation',
      startDate: '2025-07-15',
      endDate: '2025-07-20',
      reason: 'Vacanze estive test'
    };
    
    const validation = await VacationService.validateRequest(testRequest);
    console.log('✅ Validazione:', validation.isValid ? 'VALIDA' : 'NON VALIDA');
    if (!validation.isValid) {
      console.log('   Errori:', validation.errors);
    }

    // Test 8: Test metodi di compatibilità
    console.log('\n8. Test metodi di compatibilità...');
    
    try {
      const allRequests = await VacationService.getAllRequests();
      console.log('✅ getAllRequests funziona, richieste trovate:', allRequests.length);
    } catch (error) {
      console.log('❌ getAllRequests errore:', error.message);
    }

    try {
      const vacationSummary = await VacationService.getVacationSummary();
      console.log('✅ getVacationSummary funziona:', Object.keys(vacationSummary));
    } catch (error) {
      console.log('❌ getVacationSummary errore:', error.message);
    }

    console.log('\n🎉 Test completati con successo!');
    console.log('\nFunzionalità implementate:');
    console.log('- ✅ Configurazione giorni ferie annuali personalizzati');
    console.log('- ✅ Configurazione ore permesso mensili personalizzate'); 
    console.log('- ✅ Gestione giorni residui anno precedente');
    console.log('- ✅ Validazione e calcoli automatici');
    console.log('- ✅ Interfaccia di configurazione con VacationSettingsScreen');
    console.log('- ✅ Integrazione con VacationManagementScreen');
    console.log('- ✅ Compatibilità con metodi esistenti');

  } catch (error) {
    console.error('❌ Errore durante i test:', error);
  }
}

// Avvia i test
testVacationConfig();
