// Test per verificare l'indennità di reperibilità tra sabato e domenica
// Simula la logica del CalculationService per testare sabato vs domenica

console.log('=== TEST INDENNITÀ REPERIBILITÀ: SABATO vs DOMENICA ===\n');

// Simula la logica di calcolo dell'indennità reperibilità
function calculateStandbyAllowance(date, settings) {
  // Valori CCNL di default
  const IND_16H_FERIALE = 4.22;
  const IND_24H_FERIALE = 7.03;
  const IND_24H_FESTIVO = 10.63;
  
  // Determina il tipo di giorno
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay(); // 0 = domenica, 6 = sabato
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isHoliday = false; // Per semplicità, assumiamo non sia festivo
  
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
    console.log(`[Test] Indennità reperibilità giorno di riposo per ${date}: ${baseDailyAllowance}€ (personalizzata: ${!!customFestivo})`);
  } else {
    // Giorni feriali (incluso sabato se non è giorno di riposo)
    if (allowanceType === '16h') {
      baseDailyAllowance = customFeriale16 || IND_16H_FERIALE;
    } else {
      baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
    }
    console.log(`[Test] Indennità reperibilità feriale ${allowanceType} per ${date}: ${baseDailyAllowance}€ (personalizzata: ${!!(allowanceType === '16h' ? customFeriale16 : customFeriale24)})`);
  }
  
  return {
    amount: baseDailyAllowance,
    type: isRestDay ? 'festivo' : 'feriale',
    dayInfo: {
      isSaturday,
      isSunday,
      isHoliday,
      saturdayAsRest,
      isRestDay
    }
  };
}

// Simula le impostazioni con due configurazioni diverse per il sabato
const settingsWithSaturdayAsWork = {
  contract: {
    hourlyRate: 16.41081,
    monthlySalary: 2839.07,
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRates: {
      day: 1.20,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  },
  standbySettings: {
    enabled: true,
    saturdayAsRest: false, // SABATO COME GIORNO LAVORATIVO
    allowanceType: '24h',
    // Personalizzazioni
    customFeriale16: null,
    customFeriale24: null,
    customFestivo: null
  },
  travelAllowanceSettings: {
    enabled: false
  },
  mealSettings: {
    lunch: { enabled: false },
    dinner: { enabled: false }
  }
};

const settingsWithSaturdayAsRest = {
  ...settingsWithSaturdayAsWork,
  standbySettings: {
    ...settingsWithSaturdayAsWork.standbySettings,
    saturdayAsRest: true // SABATO COME GIORNO DI RIPOSO
  }
};

// Test case 1: Sabato (configurato come giorno lavorativo)
const saturdayEntry = {
  date: '2025-01-04', // Sabato
  workHours: 8,
  travelHours: 2,
  standbyHours: 4,
  standbyTravelHours: 1,
  isStandbyActivated: true,
  isStandbyManuallyDeactivated: false
};

// Test case 2: Domenica
const sundayEntry = {
  date: '2025-01-05', // Domenica
  workHours: 8,
  travelHours: 2,
  standbyHours: 4,
  standbyTravelHours: 1,
  isStandbyActivated: true,
  isStandbyManuallyDeactivated: false
};

console.log('SCENARIO 1: SABATO CONFIGURATO COME GIORNO LAVORATIVO');
console.log('=====================================================');

// Calcola per sabato (giorno lavorativo)
const saturdayAsWorkDay = calculateStandbyAllowance('2025-01-04', settingsWithSaturdayAsWork);
console.log(`Sabato (giorno lavorativo): Indennità reperibilità = €${saturdayAsWorkDay.amount.toFixed(2)} (${saturdayAsWorkDay.type})`);

// Calcola per domenica
const sundayAsRestDay = calculateStandbyAllowance('2025-01-05', settingsWithSaturdayAsWork);
console.log(`Domenica (giorno di riposo): Indennità reperibilità = €${sundayAsRestDay.amount.toFixed(2)} (${sundayAsRestDay.type})`);

console.log('\nSCENARIO 2: SABATO CONFIGURATO COME GIORNO DI RIPOSO');
console.log('==================================================');

// Calcola per sabato (giorno di riposo)
const saturdayAsRestDay = calculateStandbyAllowance('2025-01-04', settingsWithSaturdayAsRest);
console.log(`Sabato (giorno di riposo): Indennità reperibilità = €${saturdayAsRestDay.amount.toFixed(2)} (${saturdayAsRestDay.type})`);

// Calcola per domenica (sempre giorno di riposo)
const sundayAlwaysRest = calculateStandbyAllowance('2025-01-05', settingsWithSaturdayAsRest);
console.log(`Domenica (giorno di riposo): Indennità reperibilità = €${sundayAlwaysRest.amount.toFixed(2)} (${sundayAlwaysRest.type})`);

console.log('\nRIEPILOGO VALORI CCNL PREDEFINITI:');
console.log('==================================');
console.log('- Giorni feriali (24h): €7.03');
console.log('- Giorni feriali (16h): €4.22');
console.log('- Giorni festivi/domenica: €10.63');

console.log('\nANALISI DIFFERENZE:');
console.log('==================');
console.log(`Scenario 1 (sabato lavorativo):`);
console.log(`  - Sabato: €${saturdayAsWorkDay.amount.toFixed(2)} (${saturdayAsWorkDay.type})`);
console.log(`  - Domenica: €${sundayAsRestDay.amount.toFixed(2)} (${sundayAsRestDay.type})`);
console.log(`  - Differenza: €${(sundayAsRestDay.amount - saturdayAsWorkDay.amount).toFixed(2)}`);

console.log(`\nScenario 2 (sabato riposo):`);
console.log(`  - Sabato: €${saturdayAsRestDay.amount.toFixed(2)} (${saturdayAsRestDay.type})`);
console.log(`  - Domenica: €${sundayAlwaysRest.amount.toFixed(2)} (${sundayAlwaysRest.type})`);
console.log(`  - Differenza: €${(sundayAlwaysRest.amount - saturdayAsRestDay.amount).toFixed(2)}`);

console.log('\nCONCLUSIONE:');
console.log('===========');
if (sundayAsRestDay.amount === sundayAlwaysRest.amount) {
  console.log('✅ La domenica ha sempre la stessa indennità (festivo) indipendentemente dalla configurazione del sabato');
  console.log(`   Importo domenica: €${sundayAsRestDay.amount.toFixed(2)}`);
}

if (settingsWithSaturdayAsWork.standbySettings.saturdayAsRest === false && 
    saturdayAsWorkDay.amount !== sundayAsRestDay.amount) {
  console.log('✅ Quando il sabato è configurato come lavorativo, sabato e domenica hanno indennità diverse');
  console.log(`   - Sabato (feriale): €${saturdayAsWorkDay.amount.toFixed(2)}`);
  console.log(`   - Domenica (festivo): €${sundayAsRestDay.amount.toFixed(2)}`);
  console.log(`   - Differenza: €${(sundayAsRestDay.amount - saturdayAsWorkDay.amount).toFixed(2)} in più per la domenica`);
}

if (settingsWithSaturdayAsRest.standbySettings.saturdayAsRest === true && 
    saturdayAsRestDay.amount === sundayAlwaysRest.amount) {
  console.log('✅ Quando il sabato è configurato come riposo, sabato e domenica hanno la stessa indennità');
  console.log(`   - Entrambi (festivo): €${saturdayAsRestDay.amount.toFixed(2)}`);
}

console.log('\nRISPOSTA FINALE:');
console.log('===============');
console.log('🔍 L\'indennità di reperibilità per sabato e domenica dipende dalla configurazione:');
console.log('');
console.log('📋 IMPOSTAZIONE: standbySettings.saturdayAsRest');
console.log('   ├─ false → Sabato = giorno feriale (€7.03), Domenica = giorno festivo (€10.63)');
console.log('   └─ true  → Sabato = giorno festivo (€10.63), Domenica = giorno festivo (€10.63)');
console.log('');
console.log('💰 VALORI CCNL:');
console.log('   ├─ Giorni feriali: €7.03 (24h) / €4.22 (16h)');
console.log('   └─ Giorni festivi/domenica: €10.63');
console.log('');
if (saturdayAsWorkDay.amount !== sundayAsRestDay.amount) {
  console.log(`⚠️  ATTENZIONE: Con l'impostazione predefinita (sabato lavorativo), sabato e domenica hanno indennità diverse!`);
  console.log(`   Differenza: €${(sundayAsRestDay.amount - saturdayAsWorkDay.amount).toFixed(2)} in più per la domenica`);
} else {
  console.log(`✅ Con l'impostazione corrente, sabato e domenica hanno la stessa indennità: €${saturdayAsWorkDay.amount.toFixed(2)}`);
}
