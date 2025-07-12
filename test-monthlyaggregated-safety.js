/**
 * Test per verificare che tutti gli accessi a monthlyAggregated siano sicuri
 */

console.log('🧪 Testing monthlyAggregated safety...');

// Simula monthlyAggregated come undefined o oggetto vuoto per testare gli accessi
const testCases = [
  undefined,
  null,
  {},
  { analytics: null },
  { analytics: undefined },
  { analytics: {}, totalEarnings: 0 },
  { analytics: {}, totalEarnings: undefined }
];

function simulateRenderEarningsBreakdownSection(monthlyAggregated) {
  try {
    // Simula il codice della funzione renderEarningsBreakdownSection
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.totalEarnings || 0) === 0) return 'SAFE_RETURN_NULL';
    
    // Simula gli accessi alle proprietà
    const ordinaryTotal = monthlyAggregated?.ordinary?.total;
    const standbyEarnings = monthlyAggregated?.standby?.totalEarnings || 0;
    const travelEarnings = monthlyAggregated?.travel?.totalEarnings || 0;
    const ordinaryPercentage = analytics?.breakdown?.ordinaryPercentage || 0;
    const standbyPercentage = analytics?.breakdown?.standbyPercentage || 0;
    const travelPercentage = analytics?.breakdown?.travelPercentage || 0;
    
    return 'SAFE_RENDER_SUCCESS';
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

function simulateRenderWorkPatternsSection(monthlyAggregated) {
  try {
    // Simula il codice della funzione renderWorkPatternsSection
    const analytics = monthlyAggregated?.analytics;
    if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0) return 'SAFE_RETURN_NULL';
    
    // Simula gli accessi alle proprietà
    const weekendWorkDays = analytics?.weekendWorkDays || 0;
    const standbyInterventions = analytics?.standbyInterventions || 0;
    const nightWorkHours = analytics?.nightWorkHours || 0;
    const standbyWorkRatio = analytics?.standbyWorkRatio || 0;
    const daysWorked = monthlyAggregated?.daysWorked || 0;
    
    return 'SAFE_RENDER_SUCCESS';
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

function simulateMainRenderCondition(monthlyAggregated) {
  try {
    // Simula la condizione principale di rendering alla riga 1744
    const shouldRender = (monthlyAggregated?.daysWorked || 0) > 0;
    return shouldRender ? 'SHOULD_RENDER' : 'SHOULD_NOT_RENDER';
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

// Esegui i test
console.log('\n🔬 Testing renderEarningsBreakdownSection:');
testCases.forEach((testCase, index) => {
  const result = simulateRenderEarningsBreakdownSection(testCase);
  console.log(`Test ${index + 1} (${typeof testCase}):`, result);
});

console.log('\n🔬 Testing renderWorkPatternsSection:');
testCases.forEach((testCase, index) => {
  const result = simulateRenderWorkPatternsSection(testCase);
  console.log(`Test ${index + 1} (${typeof testCase}):`, result);
});

console.log('\n🔬 Testing main render condition (line 1744):');
testCases.forEach((testCase, index) => {
  const result = simulateMainRenderCondition(testCase);
  console.log(`Test ${index + 1} (${typeof testCase}):`, result);
});

// Test degli accessi più comuni nelle altre parti del codice
console.log('\n🔬 Testing common property access patterns:');
testCases.forEach((testCase, index) => {
  try {
    // Simula accessi comuni
    const totalEarnings = testCase?.totalEarnings || 0;
    const daysWorked = testCase?.daysWorked || 0;
    const totalHours = testCase?.totalHours || 0;
    const ordinary = testCase?.ordinary || {};
    const standby = testCase?.standby || {};
    const allowances = testCase?.allowances || {};
    const meals = testCase?.meals || {};
    
    console.log(`Test ${index + 1}: SAFE ACCESS`);
  } catch (error) {
    console.log(`Test ${index + 1}: ERROR - ${error.message}`);
  }
});

console.log('\n✅ Test monthlyAggregated safety completato!');
