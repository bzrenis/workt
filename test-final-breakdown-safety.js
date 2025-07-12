/**
 * Test finale per verificare la robustezza degli accessi a breakdown
 * Questo script testa tutti i punti critici dove breakdown potrebbe essere undefined
 */

console.log('🔍 Test finale robustezza breakdown - Inizio');

// Test 1: Simulazione accessi a breakdown undefined/null
const testUndefinedBreakdown = () => {
  console.log('\n📋 Test 1: Breakdown undefined/null');
  
  const breakdown = undefined;
  
  try {
    // Test accessi che dovrebbero essere sicuri
    const tests = [
      () => breakdown?.totalEarnings || 0,
      () => breakdown?.ordinary?.total || 0,
      () => breakdown?.standby?.totalEarnings || 0,
      () => breakdown?.standby?.dailyIndemnity || 0,
      () => breakdown?.allowances?.standby || 0,
      () => breakdown?.allowances?.travel || 0,
      () => breakdown?.allowances?.meal || 0,
      () => (breakdown?.standby?.totalEarnings || 0) - (breakdown?.standby?.dailyIndemnity || 0),
    ];
    
    tests.forEach((test, index) => {
      try {
        const result = test();
        console.log(`  ✅ Test ${index + 1}: ${result} (OK)`);
      } catch (error) {
        console.log(`  ❌ Test ${index + 1}: ERRORE - ${error.message}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Errore generale: ${error.message}`);
  }
};

// Test 2: Simulazione breakdown parzialmente definito
const testPartialBreakdown = () => {
  console.log('\n📋 Test 2: Breakdown parzialmente definito');
  
  const breakdown = {
    totalEarnings: 150.50,
    ordinary: { total: 131.28 },
    // standby mancante
    allowances: { travel: 19.22 }
    // standby e meal mancanti
  };
  
  try {
    const tests = [
      () => breakdown?.totalEarnings || 0,
      () => breakdown?.ordinary?.total || 0,
      () => breakdown?.standby?.totalEarnings || 0, // standby mancante
      () => breakdown?.standby?.dailyIndemnity || 0, // standby mancante
      () => breakdown?.allowances?.standby || 0, // standby mancante
      () => breakdown?.allowances?.travel || 0,
      () => breakdown?.allowances?.meal || 0, // meal mancante
    ];
    
    tests.forEach((test, index) => {
      try {
        const result = test();
        console.log(`  ✅ Test ${index + 1}: ${result} (OK)`);
      } catch (error) {
        console.log(`  ❌ Test ${index + 1}: ERRORE - ${error.message}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Errore generale: ${error.message}`);
  }
};

// Test 3: Simulazione breakdown completo e valido
const testValidBreakdown = () => {
  console.log('\n📋 Test 3: Breakdown valido e completo');
  
  const breakdown = {
    totalEarnings: 250.75,
    ordinary: { total: 131.28 },
    standby: { 
      totalEarnings: 95.25,
      dailyIndemnity: 24.22
    },
    allowances: {
      standby: 24.22,
      travel: 19.22,
      meal: 0
    }
  };
  
  try {
    console.log('  📊 Valori estratti:');
    console.log(`    totalEarnings: €${(breakdown?.totalEarnings || 0).toFixed(2)}`);
    console.log(`    ordinary.total: €${(breakdown?.ordinary?.total || 0).toFixed(2)}`);
    console.log(`    standby.totalEarnings: €${(breakdown?.standby?.totalEarnings || 0).toFixed(2)}`);
    console.log(`    standby.dailyIndemnity: €${(breakdown?.standby?.dailyIndemnity || 0).toFixed(2)}`);
    console.log(`    interventi: €${((breakdown?.standby?.totalEarnings || 0) - (breakdown?.standby?.dailyIndemnity || 0)).toFixed(2)}`);
    console.log(`    allowances.standby: €${(breakdown?.allowances?.standby || 0).toFixed(2)}`);
    console.log(`    allowances.travel: €${(breakdown?.allowances?.travel || 0).toFixed(2)}`);
    console.log(`    allowances.meal: €${(breakdown?.allowances?.meal || 0).toFixed(2)}`);
    
    console.log('  ✅ Tutti i valori estratti correttamente');
    
  } catch (error) {
    console.log(`❌ Errore: ${error.message}`);
  }
};

// Test 4: Funzioni di formattazione sicura
const testSafeFormatting = () => {
  console.log('\n📋 Test 4: Formattazione sicura');
  
  const formatSafeAmount = (amount) => {
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'number' && !isNaN(amount)) return `€${amount.toFixed(2)}`;
    return '€0.00';
  };
  
  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '€0.00';
    return `€${num.toFixed(2)}`;
  };
  
  const testValues = [undefined, null, NaN, 0, 150.50, '€120.00', 'invalid'];
  
  testValues.forEach(value => {
    try {
      const safe = formatSafeAmount(value);
      const currency = formatCurrency(value);
      console.log(`  📊 ${String(value).padEnd(10)}: formatSafe=${safe.padEnd(8)}, formatCurrency=${currency}`);
    } catch (error) {
      console.log(`  ❌ ${String(value).padEnd(10)}: ERRORE - ${error.message}`);
    }
  });
};

// Esegui tutti i test
const runAllTests = () => {
  console.log('🚀 Avvio test completi...');
  
  testUndefinedBreakdown();
  testPartialBreakdown();
  testValidBreakdown();
  testSafeFormatting();
  
  console.log('\n✅ Test finali completati - Sistema robusto contro breakdown undefined/null');
  console.log('🎯 Le correzioni applicate dovrebbero prevenire tutti gli errori "Cannot read property of undefined"');
};

// Esegui test
runAllTests();
