// Test semplificato per il nuovo sistema di indennità reperibilità
// Questo testa solo la logica del calcolo dell'indennità

function calculateStandbyAllowance(workEntry, settings) {
  // Logica presa dal CalculationService
  const date = new Date(workEntry.date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  
  // Simulazione isHoliday (per semplicità, solo alcuni giorni)
  const isHoliday = ['2025-01-01', '2025-12-25'].includes(workEntry.date);
  
  if (!workEntry.isStandbyDay || !settings?.standbySettings?.enabled) {
    return 0;
  }
  
  // Valori CCNL di default
  const IND_16H_FERIALE = 4.22;
  const IND_24H_FERIALE = 7.03;
  const IND_24H_FESTIVO = 10.63;
  
  // Verifica se abbiamo personalizzazioni
  const customFeriale16 = settings.standbySettings.customFeriale16;
  const customFeriale24 = settings.standbySettings.customFeriale24;
  const customFestivo = settings.standbySettings.customFestivo;
  const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  
  let baseDailyAllowance;
  
  // Determina il tipo di giorno considerando le impostazioni personalizzate
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayAsRest);
  
  if (isRestDay) {
    // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
    baseDailyAllowance = customFestivo || IND_24H_FESTIVO;
  } else {
    // Giorni feriali (incluso sabato se non è giorno di riposo)
    if (allowanceType === '16h') {
      baseDailyAllowance = customFeriale16 || IND_16H_FERIALE;
    } else {
      baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
    }
  }
  
  return baseDailyAllowance;
}

// Test settings con personalizzazioni
const testSettings = {
  standbySettings: {
    enabled: true,
    customFeriale16: 4.50, // personalizzato invece di 4.22
    customFeriale24: 7.50, // personalizzato invece di 7.03
    customFestivo: 11.00, // personalizzato invece di 10.63
    allowanceType: '24h', // '16h' o '24h'
    saturdayAsRest: false, // sabato come giorno lavorativo
  }
};

const testSettings16h = {
  standbySettings: {
    ...testSettings.standbySettings,
    allowanceType: '16h'
  }
};

const testSettingsSaturdayRest = {
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
      isStandbyDay: true
    },
    settings: testSettings,
    expected: 7.50
  },
  {
    name: 'Feriale 16h con personalizzazione',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true
    },
    settings: testSettings16h,
    expected: 4.50
  },
  {
    name: 'Sabato lavorativo (24h)',
    workEntry: {
      date: '2025-07-05', // sabato
      isStandbyDay: true
    },
    settings: testSettings,
    expected: 7.50 // feriale perché sabato non è riposo
  },
  {
    name: 'Sabato riposo (dovrebbe usare tariffa festivo)',
    workEntry: {
      date: '2025-07-05', // sabato
      isStandbyDay: true
    },
    settings: testSettingsSaturdayRest,
    expected: 11.00 // festivo perché sabato è riposo
  },
  {
    name: 'Domenica (sempre festivo)',
    workEntry: {
      date: '2025-07-06', // domenica
      isStandbyDay: true
    },
    settings: testSettings,
    expected: 11.00
  },
  {
    name: 'Feriale senza personalizzazione (dovrebbe usare CCNL default)',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true
    },
    settings: {
      standbySettings: {
        enabled: true,
        allowanceType: '24h',
        saturdayAsRest: false
      }
    },
    expected: 7.03 // CCNL default 24h
  },
  {
    name: 'Reperibilità disabilitata',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: true
    },
    settings: {
      standbySettings: {
        enabled: false,
        allowanceType: '24h'
      }
    },
    expected: 0
  },
  {
    name: 'Non è giorno di reperibilità',
    workEntry: {
      date: '2025-07-03', // giovedì
      isStandbyDay: false
    },
    settings: testSettings,
    expected: 0
  }
];

console.log('🧪 Test del nuovo sistema di indennità reperibilità personalizzate\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  
  try {
    const result = calculateStandbyAllowance(testCase.workEntry, testCase.settings);
    const expected = testCase.expected;
    
    if (Math.abs(result - expected) < 0.01) {
      console.log(`   ✅ PASS: Indennità = €${result.toFixed(2)} (atteso: €${expected.toFixed(2)})`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Indennità = €${result.toFixed(2)} (atteso: €${expected.toFixed(2)})`);
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
  }
  
  console.log('');
});

console.log(`🏁 Test completati: ${passedTests}/${totalTests} superati`);

if (passedTests === totalTests) {
  console.log('🎉 Tutti i test sono passati! Il nuovo sistema di indennità personalizzate funziona correttamente.');
} else {
  console.log('⚠️  Alcuni test hanno fallito. Verifica la logica di calcolo.');
}
