// Test semplificato per il comportamento del toggle "Applica nei giorni speciali"

// Simula la logica del CalculationService per l'indennità trasferta
function testTravelAllowanceLogic(workEntry, settings) {
  const travelAllowanceSettings = settings.travelAllowance || {};
  const travelAllowanceEnabled = travelAllowanceSettings.enabled;
  const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
  const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
  
  if (!travelAllowanceEnabled || travelAllowanceAmount <= 0) {
    return 0;
  }
  
  // Simula la verifica se ci sono ore di viaggio o se è attivato manualmente
  const hasTravel = workEntry.departureCompany && workEntry.arrivalSite;
  const manuallyActivated = workEntry.travelAllowance === 1;
  
  if (!hasTravel && !manuallyActivated) {
    return 0;
  }
  
  // Determina se è un giorno speciale
  const date = new Date(workEntry.date);
  const isSunday = date.getDay() === 0;
  // Simula la verifica dei festivi italiani per date specifiche
  const isHoliday = workEntry.date === "2025-08-15" || // Ferragosto
                   workEntry.date === "2025-12-25" || // Natale
                   workEntry.date === "2025-01-01";   // Capodanno
  
  // Override manuale
  const manualOverride = workEntry.trasfertaManualOverride || false;
  
  // Logica principale: applica l'indennità se:
  // 1. Non è un giorno speciale (domenica/festivo), OPPURE
  // 2. È abilitata l'impostazione per applicare l'indennità nei giorni speciali, OPPURE
  // 3. C'è un override manuale
  if (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride) {
    const travelAllowancePercent = workEntry.travelAllowancePercent || 1.0;
    return travelAllowanceAmount * travelAllowancePercent;
  }
  
  return 0;
}

// Configurazione di test
const baseSettings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 15.00,
    applyOnSpecialDays: false // Toggle DISATTIVATO
  }
};

const settingsWithToggleOn = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 15.00,
    applyOnSpecialDays: true // Toggle ATTIVATO
  }
};

// Test cases
const testCases = [
  {
    name: "Lunedì normale con viaggio",
    date: "2025-07-07", // Lunedì
    workEntry: {
      date: "2025-07-07",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      travelAllowance: 1
    },
    expected: { withToggleOff: 15.00, withToggleOn: 15.00 }
  },
  {
    name: "Sabato con viaggio",
    date: "2025-07-05", // Sabato
    workEntry: {
      date: "2025-07-05",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      travelAllowance: 1
    },
    expected: { withToggleOff: 15.00, withToggleOn: 15.00 }
  },
  {
    name: "Domenica con viaggio",
    date: "2025-07-06", // Domenica
    workEntry: {
      date: "2025-07-06",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      travelAllowance: 1
    },
    expected: { withToggleOff: 0.00, withToggleOn: 15.00 }
  },
  {
    name: "Ferragosto con viaggio",
    date: "2025-08-15", // Festivo
    workEntry: {
      date: "2025-08-15",
      departureCompany: "07:30",
      arrivalSite: "08:00",
      travelAllowance: 1
    },
    expected: { withToggleOff: 0.00, withToggleOn: 15.00 }
  }
];

console.log("🧪 TEST: Comportamento toggle 'Applica nei giorni speciali'\n");
console.log("=" .repeat(80));

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   Data: ${testCase.date}`);
  
  // Determina il tipo di giorno
  const date = new Date(testCase.date);
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const dayName = dayNames[date.getDay()];
  const isSpecialDay = date.getDay() === 0 || testCase.date === "2025-08-15";
  
  console.log(`   Giorno: ${dayName} ${isSpecialDay ? '(SPECIALE)' : '(normale)'}`);
  
  // Test con toggle OFF
  const resultToggleOff = testTravelAllowanceLogic(testCase.workEntry, baseSettings);
  const expectedToggleOff = testCase.expected.withToggleOff;
  const testOffPassed = Math.abs(resultToggleOff - expectedToggleOff) < 0.01;
  
  console.log(`   Toggle OFF: ${resultToggleOff.toFixed(2)}€ (atteso: ${expectedToggleOff.toFixed(2)}€) ${testOffPassed ? '✅' : '❌'}`);
  
  // Test con toggle ON
  const resultToggleOn = testTravelAllowanceLogic(testCase.workEntry, settingsWithToggleOn);
  const expectedToggleOn = testCase.expected.withToggleOn;
  const testOnPassed = Math.abs(resultToggleOn - expectedToggleOn) < 0.01;
  
  console.log(`   Toggle ON:  ${resultToggleOn.toFixed(2)}€ (atteso: ${expectedToggleOn.toFixed(2)}€) ${testOnPassed ? '✅' : '❌'}`);
  
  if (!testOffPassed || !testOnPassed) {
    allTestsPassed = false;
  }
});

// Test dell'override manuale
console.log(`\n\n🔧 TEST: Override manuale`);
console.log("=" .repeat(40));

const overrideTest = {
  date: "2025-08-15", // Festivo
  departureCompany: "07:30",
  arrivalSite: "08:00",
  travelAllowance: 1,
  trasfertaManualOverride: true
};

const resultWithOverride = testTravelAllowanceLogic(overrideTest, baseSettings);
console.log(`Override su festivo (toggle OFF): ${resultWithOverride.toFixed(2)}€`);
console.log(`Risultato atteso: 15.00€ ${resultWithOverride === 15.00 ? '✅' : '❌'}`);

if (resultWithOverride !== 15.00) {
  allTestsPassed = false;
}

// Riepilogo
console.log(`\n\n📋 RIEPILOGO:`);
console.log("=" .repeat(40));
console.log(`Tutti i test: ${allTestsPassed ? '✅ PASSATI' : '❌ ALCUNI FALLITI'}`);

console.log(`\n📖 COMPORTAMENTO DEL TOGGLE:`);
console.log(`• Toggle OFF (CCNL standard):`);
console.log(`  - Lunedì-Sabato: Indennità applicata ✅`);
console.log(`  - Domenica/Festivi: Indennità NON applicata ❌`);
console.log(`\n• Toggle ON (accordo aziendale):`);
console.log(`  - Tutti i giorni: Indennità applicata ✅`);
console.log(`  - Include domenica e festivi ✅`);
console.log(`\n• Override manuale:`);
console.log(`  - Forza l'applicazione anche con toggle OFF ✅`);
console.log(`  - Utile per casi eccezionali`);

console.log(`\n💡 NOTA IMPORTANTE:`);
console.log(`Il SABATO non è considerato "giorno speciale" per l'indennità trasferta.`);
console.log(`Solo DOMENICA e FESTIVI sono considerati giorni speciali.`);
