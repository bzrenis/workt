// Test per verificare il nuovo sistema di indennità reperibilità personalizzate
const CalculationService = require('./src/services/CalculationService');

// Test settings con personalizzazioni
const testSettings = {
  contract: {
    monthlySalary: 2839.07,
    hourlyRate: 16.41081,
  },
  standbySettings: {
    enabled: true,
    dailyAllowance: 7.50, // Questo non dovrebbe più essere usato
    // Personalizzazioni CCNL
    customFeriale16: 4.50, // personalizzato invece di 4.22
    customFeriale24: 7.50, // personalizzato invece di 7.03
    customFestivo: 11.00, // personalizzato invece di 10.63
    allowanceType: '24h', // '16h' o '24h'
    saturdayAsRest: false, // sabato come giorno lavorativo
    standbyDays: {}
  },
  travelSettings: {
    compensationRate: 1.0
  }
};

const testSettings16h = {
  ...testSettings,
  standbySettings: {
    ...testSettings.standbySettings,
    allowanceType: '16h'
  }
};

const testSettingsSaturdayRest = {
  ...testSettings,
  standbySettings: {
    ...testSettings.standbySettings,
    saturdayAsRest: true
  }
};

// Test cases
const testCases = [
  {
    name: 'Feriale 24h con personalizzazione',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: testSettings,
    expected: { standbyAllowance: 7.50 }
  },
  {
    name: 'Feriale 16h con personalizzazione',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: testSettings16h,
    expected: { standbyAllowance: 4.50 }
  },
  {
    name: 'Sabato lavorativo (24h)',
    workEntry: {
      date: '2025-07-05', // sabato
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: testSettings,
    expected: { standbyAllowance: 7.50 } // feriale perché sabato non è riposo
  },
  {
    name: 'Sabato riposo (dovrebbe usare tariffa festivo)',
    workEntry: {
      date: '2025-07-05', // sabato
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: testSettingsSaturdayRest,
    expected: { standbyAllowance: 11.00 } // festivo perché sabato è riposo
  },
  {
    name: 'Domenica (sempre festivo)',
    workEntry: {
      date: '2025-07-06', // domenica
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: testSettings,
    expected: { standbyAllowance: 11.00 }
  },
  {
    name: 'Feriale senza personalizzazione (dovrebbe usare CCNL default)',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true,
      workHours: 2,
      travelHours: 1
    },
    settings: {
      ...testSettings,
      standbySettings: {
        ...testSettings.standbySettings,
        customFeriale16: null,
        customFeriale24: null,
        customFestivo: null
      }
    },
    expected: { standbyAllowance: 7.03 } // CCNL default 24h
  }
];

console.log('🧪 Test del nuovo sistema di indennità reperibilità personalizzate\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  
  try {
    const result = CalculationService.calculateDailyEarnings(testCase.workEntry, testCase.settings);
    const actual = result.standbyAllowance;
    const expected = testCase.expected.standbyAllowance;
    
    if (Math.abs(actual - expected) < 0.01) {
      console.log(`   ✅ PASS: Indennità = €${actual.toFixed(2)} (atteso: €${expected.toFixed(2)})`);
    } else {
      console.log(`   ❌ FAIL: Indennità = €${actual.toFixed(2)} (atteso: €${expected.toFixed(2)})`);
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
  }
  
  console.log('');
});

console.log('🏁 Test completati');
