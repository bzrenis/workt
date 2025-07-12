// Test per verificare l'importazione di FixedDaysServiceSimple

try {
  console.log('🔍 Test importazione FixedDaysServiceSimple...');
  
  // Test importazione stile ES6
  import('./src/services/FixedDaysServiceSimple.js').then(module => {
    console.log('✅ Importazione ES6 riuscita');
    console.log('Modulo importato:', module);
    console.log('Default export:', module.default);
    console.log('Named exports:', Object.keys(module).filter(k => k !== 'default'));
    console.log('getFixedDaysSummary esiste:', typeof module.default?.getFixedDaysSummary);
    console.log('getFixedDaysSummary (named):', typeof module.getFixedDaysSummary);
    
    if (typeof module.default?.getFixedDaysSummary === 'function') {
      console.log('✅ getFixedDaysSummary è una funzione nel default export');
      
      // Test della funzione
      const testStart = new Date('2025-01-01');
      const testEnd = new Date('2025-01-31');
      
      module.default.getFixedDaysSummary(testStart, testEnd).then(result => {
        console.log('✅ Test funzione riuscito:', result);
      }).catch(err => {
        console.error('❌ Errore test funzione:', err);
      });
      
    } else {
      console.log('❌ getFixedDaysSummary NON è una funzione nel default export');
    }
    
    if (typeof module.getFixedDaysSummary === 'function') {
      console.log('✅ getFixedDaysSummary è una funzione nel named export');
    } else {
      console.log('❌ getFixedDaysSummary NON è una funzione nel named export');
    }
    
  }).catch(err => {
    console.error('❌ Errore importazione ES6:', err);
  });

} catch (error) {
  console.error('❌ Errore generale test:', error);
}
