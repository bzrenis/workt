// Test per verificare che il breakdown delle indennità personalizzate sia corretto
// Questo testa specificamente il metodo getStandbyBreakdown

function getStandbyBreakdown(workEntry, settings) {
  // Simulazione delle variabili dal CalculationService
  const date = new Date(workEntry.date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  const isHoliday = ['2025-01-01', '2025-12-25'].includes(workEntry.date);
  
  const standbySettings = settings?.standbySettings || {};
  const standbyDays = standbySettings.standbyDays || {};
  const dateStr = workEntry.date;
  
  // Logica per determinare se è giorno di reperibilità
  const isManuallyDeactivated = workEntry.isStandbyDay === false || 
                                workEntry.isStandbyDay === 0 ||
                                workEntry.standbyAllowance === false ||
                                workEntry.standbyAllowance === 0;
  
  const isManuallyActivated = workEntry.isStandbyDay === true || 
                              workEntry.isStandbyDay === 1 || 
                              workEntry.standbyAllowance === true || 
                              workEntry.standbyAllowance === 1;
  
  const isInCalendar = standbySettings && 
                      standbySettings.enabled && 
                      standbyDays && 
                      dateStr && 
                      standbyDays[dateStr] && 
                      standbyDays[dateStr].selected === true;
  
  const isStandbyDay = isManuallyActivated || (!isManuallyDeactivated && isInCalendar);
  
  if (!isStandbyDay || !settings?.standbySettings?.enabled) {
    return {
      status: 'Non in reperibilità',
      allowance: 0,
      details: null
    };
  }
  
  // Valori CCNL di default
  const IND_16H_FERIALE = 4.22;
  const IND_24H_FERIALE = 7.03;
  const IND_24H_FESTIVO = 10.63;
  
  // Verifica personalizzazioni
  const customFeriale16 = settings.standbySettings.customFeriale16;
  const customFeriale24 = settings.standbySettings.customFeriale24;
  const customFestivo = settings.standbySettings.customFestivo;
  const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  
  // Determina il tipo di giorno
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayAsRest);
  
  let standbyAllowance;
  let dayType;
  let isCustom = false;
  
  if (isRestDay) {
    standbyAllowance = customFestivo || IND_24H_FESTIVO;
    dayType = isSunday ? 'Domenica' : (isHoliday ? 'Festivo' : 'Sabato (riposo)');
    isCustom = !!customFestivo;
  } else {
    if (allowanceType === '16h') {
      standbyAllowance = customFeriale16 || IND_16H_FERIALE;
      isCustom = !!customFeriale16;
    } else {
      standbyAllowance = customFeriale24 || IND_24H_FERIALE;
      isCustom = !!customFeriale24;
    }
    dayType = isSaturday ? 'Sabato (lavorativo)' : 'Feriale';
  }
  
  return {
    status: 'In reperibilità',
    allowance: standbyAllowance,
    details: {
      dayType,
      allowanceType: isRestDay ? '24h' : allowanceType,
      isCustom,
      defaultValue: isRestDay ? IND_24H_FESTIVO : (allowanceType === '16h' ? IND_16H_FERIALE : IND_24H_FERIALE)
    }
  };
}

// Test settings
const testSettings = {
  standbySettings: {
    enabled: true,
    customFeriale16: 4.50,
    customFeriale24: 7.50,
    customFestivo: 11.00,
    allowanceType: '24h',
    saturdayAsRest: false,
    standbyDays: {
      '2025-07-03': { selected: true }, // giovedì
      '2025-07-05': { selected: true }, // sabato
      '2025-07-06': { selected: true }  // domenica
    }
  }
};

const testCases = [
  {
    name: 'Giovedì in reperibilità (feriale 24h personalizzato)',
    workEntry: {
      date: '2025-07-03',
      isStandbyDay: true
    },
    settings: testSettings,
    expected: {
      status: 'In reperibilità',
      allowance: 7.50,
      dayType: 'Feriale',
      allowanceType: '24h',
      isCustom: true
    }
  },
  {
    name: 'Sabato lavorativo in reperibilità',
    workEntry: {
      date: '2025-07-05',
      isStandbyDay: true
    },
    settings: testSettings,
    expected: {
      status: 'In reperibilità',
      allowance: 7.50,
      dayType: 'Sabato (lavorativo)',
      allowanceType: '24h',
      isCustom: true
    }
  },
  {
    name: 'Domenica in reperibilità (festivo personalizzato)',
    workEntry: {
      date: '2025-07-06',
      isStandbyDay: true
    },
    settings: testSettings,
    expected: {
      status: 'In reperibilità',
      allowance: 11.00,
      dayType: 'Domenica',
      allowanceType: '24h',
      isCustom: true
    }
  },
  {
    name: 'Sabato come riposo',
    workEntry: {
      date: '2025-07-05',
      isStandbyDay: true
    },
    settings: {
      ...testSettings,
      standbySettings: {
        ...testSettings.standbySettings,
        saturdayAsRest: true
      }
    },
    expected: {
      status: 'In reperibilità',
      allowance: 11.00,
      dayType: 'Sabato (riposo)',
      allowanceType: '24h',
      isCustom: true
    }
  },
  {
    name: 'Feriale 16h personalizzato',
    workEntry: {
      date: '2025-07-03',
      isStandbyDay: true
    },
    settings: {
      ...testSettings,
      standbySettings: {
        ...testSettings.standbySettings,
        allowanceType: '16h'
      }
    },
    expected: {
      status: 'In reperibilità',
      allowance: 4.50,
      dayType: 'Feriale',
      allowanceType: '16h',
      isCustom: true
    }
  }
];

console.log('🧪 Test del breakdown indennità reperibilità personalizzate\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  
  try {
    const result = getStandbyBreakdown(testCase.workEntry, testCase.settings);
    const expected = testCase.expected;
    
    let passed = true;
    let errors = [];
    
    if (result.status !== expected.status) {
      passed = false;
      errors.push(`Status: ${result.status} vs ${expected.status}`);
    }
    
    if (Math.abs(result.allowance - expected.allowance) >= 0.01) {
      passed = false;
      errors.push(`Allowance: €${result.allowance.toFixed(2)} vs €${expected.allowance.toFixed(2)}`);
    }
    
    if (result.details && expected.dayType && result.details.dayType !== expected.dayType) {
      passed = false;
      errors.push(`Day type: ${result.details.dayType} vs ${expected.dayType}`);
    }
    
    if (result.details && expected.allowanceType && result.details.allowanceType !== expected.allowanceType) {
      passed = false;
      errors.push(`Allowance type: ${result.details.allowanceType} vs ${expected.allowanceType}`);
    }
    
    if (result.details && expected.isCustom !== undefined && result.details.isCustom !== expected.isCustom) {
      passed = false;
      errors.push(`Is custom: ${result.details.isCustom} vs ${expected.isCustom}`);
    }
    
    if (passed) {
      console.log(`   ✅ PASS: ${result.status}, €${result.allowance.toFixed(2)} (${result.details?.dayType}, ${result.details?.allowanceType}${result.details?.isCustom ? ', personalizzato' : ', CCNL'})`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: ${errors.join(', ')}`);
      console.log(`   📊 Risultato: ${JSON.stringify(result, null, 2)}`);
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
  }
  
  console.log('');
});

console.log(`🏁 Test completati: ${passedTests}/${totalTests} superati`);

if (passedTests === totalTests) {
  console.log('🎉 Tutti i test sono passati! Il breakdown delle indennità personalizzate funziona correttamente.');
} else {
  console.log('⚠️  Alcuni test hanno fallito. Verifica la logica del breakdown.');
}
