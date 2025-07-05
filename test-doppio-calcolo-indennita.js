const { CalculationService } = require('./src/services/CalculationService');

console.log("=== TEST DOPPIO CALCOLO INDENNITÀ TRASFERTA ===\n");

// Configurazione con entrambe le opzioni attive (problema)
const settingsProblematico = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07
  },
  travelAllowance: {
    enabled: true,
    dailyAmount: 15,
    selectedOptions: [
      'PROPORTIONAL_CCNL',  // ← Calcolo proporzionale attivo
      'HALF_ALLOWANCE_HALF_DAY'  // ← Mezza giornata ANCHE attiva
    ]
  }
};

// Configurazione corretta (solo proporzionale)
const settingsCorretto = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07
  },
  travelAllowance: {
    enabled: true,
    dailyAmount: 15,
    selectedOptions: [
      'PROPORTIONAL_CCNL'  // ← Solo calcolo proporzionale
    ]
  }
};

// Entry di esempio: sabato con 7 ore totali
const workEntry = {
  date: '2025-07-12', // Sabato
  workStart1: '08:00',
  workEnd1: '16:00',
  departureCompany: '07:00',
  arrivalSite: '08:00',
  departureReturn: '16:00',
  arrivalCompany: '17:00',
  travelAllowance: true
};

const calcService = new CalculationService();

console.log("📊 CASO PROBLEMATICO (entrambe le opzioni attive):");
console.log("Opzioni selezionate:", settingsProblematico.travelAllowance.selectedOptions);

const resultProblematico = calcService.calculateDailyEarnings(workEntry, settingsProblematico);
const workHours = calcService.calculateWorkHours(workEntry);
const travelHours = calcService.calculateTravelHours(workEntry);
const totalHours = workHours + travelHours;

console.log(`Ore lavoro: ${workHours}h`);
console.log(`Ore viaggio: ${travelHours}h`);
console.log(`Totale ore: ${totalHours}h`);
console.log(`Proporzione CCNL: ${totalHours}/8 = ${(totalHours/8*100).toFixed(1)}%`);
console.log(`Calcolo teorico: 15€ × ${(totalHours/8*100).toFixed(1)}% = ${(15 * totalHours/8).toFixed(2)}€`);
console.log(`Indennità effettiva: ${resultProblematico.travelAllowance.toFixed(2)}€`);
console.log(`❌ PROBLEMA: ${(15 * totalHours/8).toFixed(2)}€ → ${resultProblematico.travelAllowance.toFixed(2)}€ (applicata riduzione 50%)\n`);

console.log("✅ CASO CORRETTO (solo proporzionale CCNL):");
console.log("Opzioni selezionate:", settingsCorretto.travelAllowance.selectedOptions);

const resultCorretto = calcService.calculateDailyEarnings(workEntry, settingsCorretto);
console.log(`Ore lavoro: ${workHours}h`);
console.log(`Ore viaggio: ${travelHours}h`);
console.log(`Totale ore: ${totalHours}h`);
console.log(`Proporzione CCNL: ${totalHours}/8 = ${(totalHours/8*100).toFixed(1)}%`);
console.log(`Calcolo: 15€ × ${(totalHours/8*100).toFixed(1)}% = ${(15 * totalHours/8).toFixed(2)}€`);
console.log(`Indennità effettiva: ${resultCorretto.travelAllowance.toFixed(2)}€`);
console.log(`✅ CORRETTO: Calcolo proporzionale puro secondo CCNL\n`);

console.log("=== CONFRONTO RISULTATI ===");
console.log(`Configurazione problematica: ${resultProblematico.travelAllowance.toFixed(2)}€`);
console.log(`Configurazione corretta: ${resultCorretto.travelAllowance.toFixed(2)}€`);
console.log(`Differenza: ${(resultCorretto.travelAllowance - resultProblematico.travelAllowance).toFixed(2)}€`);

console.log("\n=== SOLUZIONE ===");
console.log("Per risolvere il problema:");
console.log("1. Nelle impostazioni dell'app, disattivare l'opzione 'Mezza giornata (50%)'");
console.log("2. Mantenere attiva solo l'opzione 'Calcolo proporzionale CCNL'");
console.log("3. Questo garantisce il calcolo conforme al CCNL: (ore/8) × indennità");
