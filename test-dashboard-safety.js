/**
 * Test specifico per identificare accessi problematici in DashboardScreen
 */

console.log('🔍 Test identificazione accessi problematici DashboardScreen...');

// Simula monthlyAggregated undefined o con proprietà mancanti
const testScenarios = [
  {
    name: 'monthlyAggregated undefined',
    data: undefined
  },
  {
    name: 'monthlyAggregated parziale (manca standby)',
    data: {
      totalEarnings: 1500,
      ordinary: { total: 1200 },
      // standby manca
      analytics: {
        breakdown: {
          ordinaryPercentage: 80
          // standbyPercentage manca
        }
      }
    }
  },
  {
    name: 'analytics undefined',
    data: {
      totalEarnings: 1500,
      ordinary: { total: 1200 },
      standby: { totalEarnings: 300 },
      // analytics manca
    }
  }
];

// Test degli accessi che potrebbero causare errori
const testAccesses = [
  // Accessi che stavamo cercando di proteggere
  (data) => data?.analytics?.breakdown?.ordinaryPercentage || 0,
  (data) => data?.standby?.totalEarnings || 0,
  (data) => data?.travel?.totalEarnings || 0,
  (data) => data?.analytics?.standbyInterventions || 0,
  (data) => data?.analytics?.nightWorkHours || 0,
  (data) => data?.analytics?.standbyWorkRatio || 0,
  (data) => data?.daysWorked || 0,
  (data) => data?.analytics?.breakdown?.standbyPercentage || 0,
  (data) => data?.analytics?.breakdown?.travelPercentage || 0,
  (data) => data?.analytics?.breakdown?.regularHours || 0,
  (data) => data?.analytics?.breakdown?.overtimeHours || 0,
  (data) => data?.analytics?.breakdown?.extraTravelHours || 0,
  (data) => data?.analytics?.overtimePercentage || 0,
  (data) => data?.analytics?.travelHoursTotal || 0,
  (data) => data?.totalHours || 1, // Evita divisione per zero
];

testScenarios.forEach(scenario => {
  console.log(`\n📊 Test scenario: ${scenario.name}`);
  
  testAccesses.forEach((accessor, index) => {
    try {
      const result = accessor(scenario.data);
      console.log(`  ✅ Accesso ${index + 1}: ${result}`);
    } catch (error) {
      console.log(`  ❌ Accesso ${index + 1}: ERRORE - ${error.message}`);
    }
  });
});

// Test rendering condizionale sicuro
console.log('\n📋 Test rendering condizionale...');

const testConditionalRendering = (monthlyAggregated) => {
  const analytics = monthlyAggregated?.analytics;
  
  // Test condizioni che potrebbero causare errori
  const conditions = [
    () => !analytics || (monthlyAggregated?.totalEarnings || 0) === 0,
    () => (monthlyAggregated?.standby?.totalEarnings || 0) > 0,
    () => (monthlyAggregated?.travel?.totalEarnings || 0) > 0,
    () => !analytics || (monthlyAggregated?.daysWorked || 0) === 0,
  ];
  
  conditions.forEach((condition, index) => {
    try {
      const result = condition();
      console.log(`  ✅ Condizione ${index + 1}: ${result}`);
    } catch (error) {
      console.log(`  ❌ Condizione ${index + 1}: ERRORE - ${error.message}`);
    }
  });
};

testScenarios.forEach(scenario => {
  console.log(`\n🔄 Test condizionale: ${scenario.name}`);
  testConditionalRendering(scenario.data);
});

console.log('\n✅ Test completato - Tutti gli accessi dovrebbero essere sicuri ora');
