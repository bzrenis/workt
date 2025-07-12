// Aggiungiamo le funzioni necessarie direttamente nel test per evitare problemi di import
function getWorkDayHours() {
  return 8;
}

function isItalianHoliday(date) {
  // Semplificazione per il test
  return false;
}

// Import manuale della classe
const fs = require('fs');
const path = require('path');

// Leggiamo il file CalculationService e lo eseguiamo in un contesto
const calculationServicePath = path.join(__dirname, 'src', 'services', 'CalculationService.js');
let calculationServiceCode = fs.readFileSync(calculationServicePath, 'utf8');

// Rimuoviamo gli import ES6 e li sostituiamo con definizioni inline
calculationServiceCode = calculationServiceCode.replace(/import.*from.*['"].*['"];?\s*/g, '');
calculationServiceCode = calculationServiceCode.replace(/export\s+/g, '');

// Aggiungiamo le funzioni necessarie
const testCode = `
function getWorkDayHours() { return 8; }
function isItalianHoliday(date) { return false; }

${calculationServiceCode}

// Export per il test
module.exports = CalculationService;
`;

// Scriviamo un file temporaneo
const tempPath = path.join(__dirname, 'temp-calculation-service.js');
fs.writeFileSync(tempPath, testCode);

const CalculationService = require('./temp-calculation-service.js');

// Configurazione test
const settings = {
  contract: {
    hourlyRate: 16.41081,
    dailyRate: 109.195,
    monthlyGross: 2839.07,
    overtimeRates: {
      day: 1.20,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      saturday: 1.25,
      holiday: 1.30
    }
  },
  standbySettings: {
    enabled: true,
    allowanceType: '24h',
    saturdayAsRest: false,
    standbyDays: {
      '2025-01-06': { selected: true }  // Lunedì
    }
  }
};

// Test caso: 7h lavoro normale + reperibilità attiva
const workEntry = {
  date: '2025-01-06',
  workStart: '08:00',
  workEnd: '15:00',  // 7 ore lavoro
  standbyWorkStart1: '20:00',
  standbyWorkEnd1: '21:00',  // 1h intervento reperibilità
  isStandbyDay: true
};

console.log('\n=== TEST DOPPIO CONTEGGIO INDENNITÀ REPERIBILITÀ ===');
console.log('Caso test: 7h lavoro normale + 1h intervento reperibilità');
console.log('Data:', workEntry.date, '(lunedì)');
console.log('Lavoro:', workEntry.workStart, '-', workEntry.workEnd);
console.log('Intervento reperibilità:', workEntry.standbyWorkStart1, '-', workEntry.standbyWorkEnd1);

const calculationService = new CalculationService();

// Test metodo calculateEarningsBreakdown
console.log('\n--- ANALISI BREAKDOWN DETTAGLIATO ---');
const breakdown = calculationService.calculateEarningsBreakdown(workEntry, settings);

console.log('\n1. LAVORO ORDINARIO:');
console.log('   - Totale guadagno ordinario:', breakdown.ordinary.total.toFixed(2), '€');

console.log('\n2. REPERIBILITÀ BREAKDOWN:');
if (breakdown.standby) {
  console.log('   - Guadagni interventi lavoro:', Object.values(breakdown.standby.workEarnings).reduce((a, b) => a + b, 0).toFixed(2), '€');
  console.log('   - Guadagni interventi viaggio:', Object.values(breakdown.standby.travelEarnings).reduce((a, b) => a + b, 0).toFixed(2), '€');
  console.log('   - Indennità giornaliera:', breakdown.standby.dailyIndemnity.toFixed(2), '€');
  console.log('   - TOTALE REPERIBILITÀ (standby.totalEarnings):', breakdown.standby.totalEarnings.toFixed(2), '€');
  
  // Verifica manuale calcolo
  const manualStandbyTotal = Object.values(breakdown.standby.workEarnings).reduce((a, b) => a + b, 0) +
                            Object.values(breakdown.standby.travelEarnings).reduce((a, b) => a + b, 0) +
                            breakdown.standby.dailyIndemnity;
  console.log('   - Verifica manuale:', manualStandbyTotal.toFixed(2), '€', 
              manualStandbyTotal.toFixed(2) === breakdown.standby.totalEarnings.toFixed(2) ? '✓' : '✗');
}

console.log('\n3. INDENNITÀ SEPARATE:');
console.log('   - Indennità trasferta (allowances.travel):', breakdown.allowances.travel.toFixed(2), '€');
console.log('   - Indennità reperibilità (allowances.standby):', breakdown.allowances.standby.toFixed(2), '€');

console.log('\n4. CALCOLO TOTALE FINALE:');
console.log('   - Lavoro ordinario:', breakdown.ordinary.total.toFixed(2), '€');
console.log('   - + Indennità trasferta:', breakdown.allowances.travel.toFixed(2), '€');
console.log('   - + Indennità reperibilità (allowances):', breakdown.allowances.standby.toFixed(2), '€');
console.log('   - + Totale reperibilità (standby.totalEarnings):', breakdown.standby ? breakdown.standby.totalEarnings.toFixed(2) : '0.00', '€');
console.log('   - = TOTALE BREAKDOWN:', breakdown.totalEarnings.toFixed(2), '€');

// Calcolo manuale per verifica
const manualTotal = breakdown.ordinary.total + 
                   breakdown.allowances.travel + 
                   breakdown.allowances.standby + 
                   (breakdown.standby ? breakdown.standby.totalEarnings : 0);

console.log('   - Verifica manuale totale:', manualTotal.toFixed(2), '€');

// Analisi del problema
console.log('\n--- ANALISI DEL PROBLEMA ---');
if (breakdown.standby && breakdown.allowances.standby > 0) {
  console.log('🚨 PROBLEMA RILEVATO: Doppio conteggio indennità reperibilità!');
  console.log('   - L\'indennità viene contata in allowances.standby:', breakdown.allowances.standby.toFixed(2), '€');
  console.log('   - E DI NUOVO in standby.totalEarnings:', breakdown.standby.dailyIndemnity.toFixed(2), '€');
  console.log('   - Importo contato due volte:', breakdown.allowances.standby.toFixed(2), '€');
  console.log('   - Totale corretto dovrebbe essere:', (manualTotal - breakdown.allowances.standby).toFixed(2), '€');
} else {
  console.log('✓ Nessun doppio conteggio rilevato');
}

// Test con calculateDailyEarnings per confronto
console.log('\n--- CONFRONTO CON calculateDailyEarnings ---');
const dailyEarnings = calculationService.calculateDailyEarnings(workEntry, settings);
console.log('Totale calculateDailyEarnings:', dailyEarnings.total.toFixed(2), '€');
console.log('Indennità reperibilità (standbyAllowance):', dailyEarnings.standbyAllowance.toFixed(2), '€');

console.log('\n--- CONCLUSIONI ---');
console.log('- calculateDailyEarnings.total:', dailyEarnings.total.toFixed(2), '€');
console.log('- calculateEarningsBreakdown.totalEarnings:', breakdown.totalEarnings.toFixed(2), '€');
console.log('- Differenza:', (breakdown.totalEarnings - dailyEarnings.total).toFixed(2), '€');

if (Math.abs(breakdown.totalEarnings - dailyEarnings.total) > 0.01) {
  console.log('🚨 I due metodi danno risultati diversi! Possibile doppio conteggio.');
} else {
  console.log('✓ I due metodi sono coerenti.');
}
