/**
 * Test per verificare la nuova logica proporzionale CCNL dell'indennità trasferta
 */

// Simulazione di CalculationService con la nuova logica
class MockCalculationService {
  constructor() {
    this.defaultContract = {
      hourlyRate: 16.41,
      dailyRate: 109.19,
      monthlySalary: 2839.07
    };
  }

  parseTime(timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  minutesToHours(minutes) {
    return minutes / 60;
  }

  calculateTimeDifference(startTime, endTime) {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    if (start === null || end === null) return 0;
    
    if (end < start) {
      return (24 * 60 - start) + end;
    }
    
    return end - start;
  }

  calculateWorkHours(workEntry) {
    let totalWorkMinutes = 0;
    
    if (workEntry.workStart1 && workEntry.workEnd1) {
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart1, workEntry.workEnd1);
    }
    
    if (workEntry.workStart2 && workEntry.workEnd2) {
      totalWorkMinutes += this.calculateTimeDifference(workEntry.workStart2, workEntry.workEnd2);
    }
    
    return this.minutesToHours(totalWorkMinutes);
  }

  calculateTravelHours(workEntry) {
    let totalTravelMinutes = 0;
    
    if (workEntry.departureCompany && workEntry.arrivalSite) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureCompany, workEntry.arrivalSite);
    }
    
    if (workEntry.departureReturn && workEntry.arrivalCompany) {
      totalTravelMinutes += this.calculateTimeDifference(workEntry.departureReturn, workEntry.arrivalCompany);
    }
    
    return this.minutesToHours(totalTravelMinutes);
  }

  calculateTravelAllowance(workEntry, settings) {
    const workHours = this.calculateWorkHours(workEntry);
    const travelHours = this.calculateTravelHours(workEntry);
    const totalWorked = workHours + travelHours;
    
    const travelAllowanceSettings = settings.travelAllowance || {};
    const travelAllowanceEnabled = travelAllowanceSettings.enabled;
    const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
    const travelAllowanceOption = travelAllowanceSettings.option || 'WITH_TRAVEL';
    const travelAllowancePercent = workEntry.travelAllowancePercent || 1.0;

    if (!travelAllowanceEnabled || !travelAllowanceAmount || !workEntry.travelAllowance) {
      return 0;
    }

    let baseTravelAllowance = travelAllowanceAmount;

    // Calcolo secondo CCNL: proporzionale alle ore lavorate
    if (travelAllowanceOption === 'PROPORTIONAL_CCNL') {
      const standardWorkDay = 8;
      const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
      baseTravelAllowance = travelAllowanceAmount * proportionalRate;
      
      console.log(`Calcolo proporzionale CCNL: ${totalWorked}h / ${standardWorkDay}h = ${(proportionalRate * 100).toFixed(1)}% → ${baseTravelAllowance.toFixed(2)}€`);
    }
    // Logica precedente per retrocompatibilità
    else if (travelAllowanceOption === 'HALF_ALLOWANCE_HALF_DAY' && totalWorked < 8) {
      baseTravelAllowance = travelAllowanceAmount / 2;
      console.log(`Calcolo 50% per mezza giornata: ${baseTravelAllowance.toFixed(2)}€`);
    }

    return baseTravelAllowance * travelAllowancePercent;
  }
}

// Test scenarios
const mockService = new MockCalculationService();

const baseSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07
  },
  travelAllowance: {
    enabled: true,
    dailyAmount: 30.00
  }
};

console.log('=== TEST NUOVA LOGICA PROPORZIONALE CCNL ===\n');

// Test casi per la nuova logica PROPORTIONAL_CCNL
const testCases = [
  { ore: 4, viaggio: 2, descrizione: '4h lavoro + 2h viaggio = 6h totali (75%)' },
  { ore: 5, viaggio: 2, descrizione: '5h lavoro + 2h viaggio = 7h totali (87.5%)' },
  { ore: 6, viaggio: 2, descrizione: '6h lavoro + 2h viaggio = 8h totali (100%)' },
  { ore: 7, viaggio: 2, descrizione: '7h lavoro + 2h viaggio = 9h totali (112.5% → 100%)' },
  { ore: 3, viaggio: 1, descrizione: '3h lavoro + 1h viaggio = 4h totali (50%)' }
];

// Test con nuova logica PROPORTIONAL_CCNL
console.log('--- NUOVA LOGICA: PROPORTIONAL_CCNL ---');
const settingsProportional = {
  ...baseSettings,
  travelAllowance: {
    ...baseSettings.travelAllowance,
    option: 'PROPORTIONAL_CCNL'
  }
};

testCases.forEach(testCase => {
  console.log(`\n${testCase.descrizione}:`);
  
  const workEntry = {
    date: '2025-07-15',
    workStart1: '08:00',
    workEnd1: `${8 + testCase.ore}:00`,
    departureCompany: '07:00',
    arrivalSite: '08:00',
    departureReturn: `${8 + testCase.ore}:00`,
    arrivalCompany: `${8 + testCase.ore + testCase.viaggio}:00`,
    travelAllowance: 1,
    travelAllowancePercent: 1.0
  };
  
  const result = mockService.calculateTravelAllowance(workEntry, settingsProportional);
  const expected = 30 * Math.min((testCase.ore + testCase.viaggio) / 8, 1.0);
  
  console.log(`Indennità calcolata: ${result.toFixed(2)}€`);
  console.log(`Indennità attesa: ${expected.toFixed(2)}€`);
  console.log(`✅ ${Math.abs(result - expected) < 0.01 ? 'CORRETTO' : 'ERRORE'}`);
});

// Test con logica precedente per confronto
console.log('\n--- LOGICA PRECEDENTE: HALF_ALLOWANCE_HALF_DAY ---');
const settingsOld = {
  ...baseSettings,
  travelAllowance: {
    ...baseSettings.travelAllowance,
    option: 'HALF_ALLOWANCE_HALF_DAY'
  }
};

testCases.forEach(testCase => {
  console.log(`\n${testCase.descrizione}:`);
  
  const workEntry = {
    date: '2025-07-15',
    workStart1: '08:00',
    workEnd1: `${8 + testCase.ore}:00`,
    departureCompany: '07:00',
    arrivalSite: '08:00',
    departureReturn: `${8 + testCase.ore}:00`,
    arrivalCompany: `${8 + testCase.ore + testCase.viaggio}:00`,
    travelAllowance: 1,
    travelAllowancePercent: 1.0
  };
  
  const result = mockService.calculateTravelAllowance(workEntry, settingsOld);
  const totalHours = testCase.ore + testCase.viaggio;
  const expected = totalHours < 8 ? 15.00 : 30.00;
  
  console.log(`Indennità calcolata: ${result.toFixed(2)}€`);
  console.log(`Indennità attesa: ${expected.toFixed(2)}€`);
  console.log(`✅ ${Math.abs(result - expected) < 0.01 ? 'CORRETTO' : 'ERRORE'}`);
});

console.log('\n=== CONFRONTO PER IL CASO 12/07/2025 (7 ORE TOTALI) ===');
console.log('Logica precedente (HALF_ALLOWANCE_HALF_DAY): 15.00€ (50%)');
console.log('Nuova logica CCNL (PROPORTIONAL_CCNL): 26.25€ (87.5%)');
console.log('Differenza: +11.25€ a favore del lavoratore');
