// Test per verificare il funzionamento del toggle "Applica nei giorni speciali" per l'indennità trasferta

const CalculationService = require('./src/services/CalculationService');
const { isItalianHoliday } = require('./src/utils/dateUtils');

const calculationService = new CalculationService();

// Configurazione di test per l'indennità trasferta
const baseSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07,
    overtimeRates: {
      day: 1.2,
      night: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.3
    }
  },
  travelCompensationRate: 1.0,
  travelAllowance: {
    enabled: true,
    dailyAmount: 15.00,
    autoActivate: true,
    applyOnSpecialDays: false, // Test con toggle DISATTIVATO
    selectedOptions: ['WITH_TRAVEL']
  }
};

// Dati di lavoro di test per diversi tipi di giorni
const testCases = [
  {
    name: "Lunedì normale con viaggio",
    date: "2025-07-07", // Lunedì
    workEntry: {
      date: "2025-07-07",
      workStart1: "08:00",
      workEnd1: "17:00",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      departureReturn: "17:00",
      arrivalCompany: "17:30",
      travelAllowance: 1
    },
    expectedResult: "Indennità applicata (giorno feriale)"
  },
  {
    name: "Sabato con viaggio",
    date: "2025-07-05", // Sabato
    workEntry: {
      date: "2025-07-05",
      workStart1: "08:00",
      workEnd1: "17:00",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      departureReturn: "17:00",
      arrivalCompany: "17:30",
      travelAllowance: 1
    },
    expectedResult: "Indennità applicata (sabato NON è giorno speciale)"
  },
  {
    name: "Domenica con viaggio (toggle OFF)",
    date: "2025-07-06", // Domenica
    workEntry: {
      date: "2025-07-06",
      workStart1: "08:00",
      workEnd1: "17:00",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      departureReturn: "17:00",
      arrivalCompany: "17:30",
      travelAllowance: 1
    },
    expectedResult: "Indennità NON applicata (domenica + toggle OFF)"
  },
  {
    name: "Festivo con viaggio (toggle OFF)",
    date: "2025-08-15", // Ferragosto - festivo
    workEntry: {
      date: "2025-08-15",
      workStart1: "08:00",
      workEnd1: "17:00",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      departureReturn: "17:00",
      arrivalCompany: "17:30",
      travelAllowance: 1
    },
    expectedResult: "Indennità NON applicata (festivo + toggle OFF)"
  }
];

console.log("🧪 TEST: Toggle 'Applica nei giorni speciali' DISATTIVATO\n");

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Data: ${testCase.date}`);
  
  // Verifica se è un giorno speciale
  const date = new Date(testCase.date);
  const isSunday = date.getDay() === 0;
  const isSaturday = date.getDay() === 6;
  const isHoliday = isItalianHoliday(testCase.date);
  const isSpecialDay = isSunday || isHoliday;
  
  console.log(`   Tipo giorno: ${isSaturday ? 'Sabato' : isSunday ? 'Domenica' : isHoliday ? 'Festivo' : 'Feriale'}`);
  console.log(`   È giorno speciale per trasferta: ${isSpecialDay ? 'SÌ' : 'NO'}`);
  
  // Calcola il risultato
  const result = calculationService.calculateDailyEarnings(testCase.workEntry, baseSettings);
  const travelAllowanceAmount = result.travelAllowance || 0;
  
  console.log(`   Indennità trasferta calcolata: ${travelAllowanceAmount.toFixed(2)}€`);
  console.log(`   Risultato atteso: ${testCase.expectedResult}`);
  
  // Verifica se il risultato è corretto
  const shouldHaveAllowance = !isSpecialDay; // Con toggle OFF, no indennità nei giorni speciali
  const hasAllowance = travelAllowanceAmount > 0;
  const testPassed = shouldHaveAllowance === hasAllowance;
  
  console.log(`   ✅ Test ${testPassed ? 'PASSATO' : '❌ FALLITO'}\n`);
});

// Ora testiamo con il toggle ATTIVATO
console.log("🧪 TEST: Toggle 'Applica nei giorni speciali' ATTIVATO\n");

const settingsWithToggleOn = {
  ...baseSettings,
  travelAllowance: {
    ...baseSettings.travelAllowance,
    applyOnSpecialDays: true // Toggle ATTIVATO
  }
};

// Test solo sui giorni speciali che prima fallivano
const specialDaysTests = testCases.filter(test => 
  test.date === "2025-07-06" || test.date === "2025-08-15"
);

specialDaysTests.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name} (con toggle ATTIVATO)`);
  console.log(`   Data: ${testCase.date}`);
  
  const result = calculationService.calculateDailyEarnings(testCase.workEntry, settingsWithToggleOn);
  const travelAllowanceAmount = result.travelAllowance || 0;
  
  console.log(`   Indennità trasferta calcolata: ${travelAllowanceAmount.toFixed(2)}€`);
  console.log(`   Risultato atteso: Indennità applicata (toggle ON)`);
  
  const hasAllowance = travelAllowanceAmount > 0;
  console.log(`   ✅ Test ${hasAllowance ? 'PASSATO' : '❌ FALLITO'}\n`);
});

// Test del manual override
console.log("🧪 TEST: Override manuale su giorno festivo\n");

const manualOverrideTest = {
  date: "2025-08-15",
  workStart1: "08:00",
  workEnd1: "17:00",
  departureCompany: "07:30",
  arrivalSite: "08:00",
  departureReturn: "17:00",
  arrivalCompany: "17:30",
  travelAllowance: 1,
  trasfertaManualOverride: true // Override manuale
};

const resultWithOverride = calculationService.calculateDailyEarnings(manualOverrideTest, baseSettings);
const allowanceWithOverride = resultWithOverride.travelAllowance || 0;

console.log("Test override manuale su festivo (toggle OFF ma override ON):");
console.log(`Data: ${manualOverrideTest.date}`);
console.log(`Indennità trasferta calcolata: ${allowanceWithOverride.toFixed(2)}€`);
console.log(`✅ Test ${allowanceWithOverride > 0 ? 'PASSATO' : '❌ FALLITO'}`);
console.log("L'override manuale dovrebbe permettere l'indennità anche con toggle OFF\n");

console.log("📋 RIEPILOGO COMPORTAMENTO:");
console.log("• Toggle OFF: No indennità in domenica e festivi (CCNL standard)");
console.log("• Toggle ON: Indennità applicata anche in domenica e festivi");
console.log("• Sabato: Sempre considerato giorno normale per l'indennità");
console.log("• Override manuale: Sempre permette l'indennità, anche con toggle OFF");
