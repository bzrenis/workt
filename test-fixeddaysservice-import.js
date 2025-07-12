// Test per verificare l'importazione di FixedDaysService

try {
  console.log('🔍 Test importazione FixedDaysService...');
  
  // Test importazione stile ES6
  import('./src/services/FixedDaysService.js').then(module => {
    console.log('✅ Importazione ES6 riuscita');
    console.log('Modulo importato:', module);
    console.log('Default export:', module.default);
    console.log('Metodi disponibili:', Object.getOwnPropertyNames(module.default));
    console.log('getFixedDaysSummary esiste:', typeof module.default.getFixedDaysSummary);
    
    if (typeof module.default.getFixedDaysSummary === 'function') {
      console.log('✅ getFixedDaysSummary è una funzione');
    } else {
      console.log('❌ getFixedDaysSummary NON è una funzione');
    }
  }).catch(err => {
    console.error('❌ Errore importazione ES6:', err);
  });

} catch (error) {
  console.error('❌ Errore generale test:', error);
}
