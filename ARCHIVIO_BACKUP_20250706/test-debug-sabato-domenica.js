// Test per verificare l'impostazione attuale saturdayAsRest e il calcolo delle indennità
// Simula carichi di dati reali per vedere cosa sta succedendo

console.log('=== VERIFICA IMPOSTAZIONE ATTUALE saturdayAsRest E CALCOLI ===\n');

// Simula il valore predefinito dell'app (dovrebbe essere false)
const defaultSettings = {
  contract: {
    hourlyRate: 16.41081,
    monthlySalary: 2839.07,
    dailyRate: 109.195,
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
    saturdayAsRest: false, // VALORE PREDEFINITO dall'app
    allowanceType: '24h',
    dailyAllowance: 7.50,
    // Personalizzazioni
    customFeriale16: null,
    customFeriale24: null,
    customFestivo: null
  }
};

// Simula la logica corretta come dovrebbe essere
function calculateCorrectStandbyAllowance(date, settings) {
  // Valori CCNL di default (dal CalculationService.js)
  const IND_16H_FERIALE = 4.22;
  const IND_24H_FERIALE = 7.03;
  const IND_24H_FESTIVO = 10.63;
  
  const dateObj = new Date(date);
  const isSaturday = dateObj.getDay() === 6;
  const isSunday = dateObj.getDay() === 0;
  const isHoliday = false; // Per semplicità
  
  const customFeriale16 = settings.standbySettings.customFeriale16;
  const customFeriale24 = settings.standbySettings.customFeriale24;
  const customFestivo = settings.standbySettings.customFestivo;
  const allowanceType = settings.standbySettings.allowanceType || '24h';
  const saturdayAsRest = settings.standbySettings.saturdayAsRest === true;
  
  console.log(`[Test] Verifica impostazioni per ${date}:`, {
    isSaturday,
    isSunday,
    isHoliday,
    saturdayAsRest,
    allowanceType
  });
  
  let baseDailyAllowance;
  
  // LOGICA CORRETTA dal CalculationService.js linea 295:
  const isRestDay = isSunday || isHoliday || (isSaturday && saturdayAsRest);
  
  if (isRestDay) {
    // Giorni di riposo (domenica, festivi, sabato se configurato come riposo)
    baseDailyAllowance = customFestivo || IND_24H_FESTIVO;
    console.log(`[Test] → Giorno di riposo: ${baseDailyAllowance}€ (IND_24H_FESTIVO)`);
  } else {
    // Giorni feriali (incluso sabato se non è giorno di riposo)
    if (allowanceType === '16h') {
      baseDailyAllowance = customFeriale16 || IND_16H_FERIALE;
      console.log(`[Test] → Giorno feriale 16h: ${baseDailyAllowance}€ (IND_16H_FERIALE)`);
    } else {
      baseDailyAllowance = customFeriale24 || IND_24H_FERIALE;
      console.log(`[Test] → Giorno feriale 24h: ${baseDailyAllowance}€ (IND_24H_FERIALE)`);
    }
  }
  
  return {
    amount: baseDailyAllowance,
    type: isRestDay ? 'festivo' : 'feriale',
    isRestDay,
    saturdayAsRest,
    calculations: {
      isSaturday,
      isSunday,
      isHoliday,
      condition: `isSunday(${isSunday}) || isHoliday(${isHoliday}) || (isSaturday(${isSaturday}) && saturdayAsRest(${saturdayAsRest}))`,
      result: isRestDay
    }
  };
}

console.log('📅 TEST CON IMPOSTAZIONE PREDEFINITA (saturdayAsRest: false)');
console.log('=========================================================');

// Test sabato (4 gennaio 2025)
const sabatoResult = calculateCorrectStandbyAllowance('2025-01-04', defaultSettings);
console.log(`\n🗓️  SABATO 2025-01-04:`);
console.log(`   Indennità: €${sabatoResult.amount.toFixed(2)} (${sabatoResult.type})`);
console.log(`   Logica: ${sabatoResult.calculations.condition} = ${sabatoResult.calculations.result}`);
console.log(`   Dovrebbe essere: €7.03 (feriale) ✅`);

// Test domenica (5 gennaio 2025)
const domenicaResult = calculateCorrectStandbyAllowance('2025-01-05', defaultSettings);
console.log(`\n🗓️  DOMENICA 2025-01-05:`);
console.log(`   Indennità: €${domenicaResult.amount.toFixed(2)} (${domenicaResult.type})`);
console.log(`   Logica: ${domenicaResult.calculations.condition} = ${domenicaResult.calculations.result}`);
console.log(`   Dovrebbe essere: €10.63 (festivo) ✅`);

console.log('\n🔍 VERIFICA POSSIBILI PROBLEMI:');
console.log('==============================');

// Possibile problema 1: dailyAllowance nelle impostazioni sovrascrive il calcolo CCNL
console.log('1. Verifica se dailyAllowance sovrascrive i calcoli CCNL:');
if (defaultSettings.standbySettings.dailyAllowance && 
    defaultSettings.standbySettings.dailyAllowance !== 7.03 && 
    defaultSettings.standbySettings.dailyAllowance !== 10.63) {
  console.log(`   ⚠️  PROBLEMA TROVATO: dailyAllowance=${defaultSettings.standbySettings.dailyAllowance} potrebbe sovrascrivere i calcoli CCNL!`);
  console.log(`   Questo forza entrambi i giorni a usare lo stesso valore: €${defaultSettings.standbySettings.dailyAllowance}`);
} else {
  console.log(`   ✅ dailyAllowance=${defaultSettings.standbySettings.dailyAllowance} non dovrebbe interferire`);
}

// Possibile problema 2: impostazioni personalizzate
console.log('\n2. Verifica personalizzazioni:');
console.log(`   customFeriale24: ${defaultSettings.standbySettings.customFeriale24 || 'null (usa default)'}`);
console.log(`   customFestivo: ${defaultSettings.standbySettings.customFestivo || 'null (usa default)'}`);
console.log(`   allowanceType: ${defaultSettings.standbySettings.allowanceType}`);

console.log('\n💡 POSSIBILI CAUSE DEL PROBLEMA:');
console.log('=================================');
console.log('1. Il campo "dailyAllowance" nelle impostazioni potrebbe sovrascrivere i calcoli CCNL');
console.log('2. Le personalizzazioni (customFeriale24/customFestivo) potrebbero essere impostate');
console.log('3. La logica del frontend potrebbe non rispettare la logica del backend');
console.log('4. I settings salvati nel database potrebbero avere valori diversi da quelli predefiniti');

console.log('\n🛠️  PROSSIMO PASSO:');
console.log('===================');
console.log('Verifichiamo le impostazioni effettive salvate nel database dell\'app');
