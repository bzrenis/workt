// Test per verificare l'importazione di DatabaseService

try {
  console.log('🔍 Test importazione DatabaseService...');
  
  import('./src/services/DatabaseService.js').then(module => {
    console.log('✅ Importazione DatabaseService riuscita');
    console.log('Modulo importato:', module);
    console.log('Default export:', module.default);
    console.log('Metodi disponibili:', Object.getOwnPropertyNames(module.default));
    console.log('getWorkEntriesByDateRange esiste:', typeof module.default?.getWorkEntriesByDateRange);
    
    if (typeof module.default?.getWorkEntriesByDateRange === 'function') {
      console.log('✅ getWorkEntriesByDateRange è una funzione');
    } else {
      console.log('❌ getWorkEntriesByDateRange NON è una funzione');
    }
  }).catch(err => {
    console.error('❌ Errore importazione DatabaseService:', err);
  });

} catch (error) {
  console.error('❌ Errore generale test:', error);
}
