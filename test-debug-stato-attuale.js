/**
 * Test di debug per verificare lo stato attuale del problema
 * Scenario: Sabato con 7 ore ordinarie + 4 ore reperibilità
 */

// Simula l'importazione del servizio di calcolo
const { calculateDailyEarnings } = require('./src/services/CalculationService');

// Test del caso problematico: sabato con trasferta che dovrebbe essere proporzionale
console.log('\n=== TEST DEBUG STATO ATTUALE ===\n');

// 1. Configurazione trasferta con la nuova opzione CCNL
const settingsConCCNL = {
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
  travelAllowance: {
    enabled: true,
    dailyAmount: 46.48,
    selectedOptions: ['PROPORTIONAL_CCNL'], // Nuova opzione CCNL
    applyOnSpecialDays: true,
    autoActivate: true
  },
  standbySettings: {
    enabled: true,
    dailyAllowance: 7.03,
    standbyDays: {
      '2025-07-05': { selected: true } // Sabato
    }
  }
};

// 2. Entry del sabato problematico
const sabatoEntry = {
  id: 'test-sabato',
  date: '2025-07-05', // Sabato
  workStart1: '08:00',
  workEnd1: '15:00', // 7 ore lavoro ordinario
  // Nessun viaggio ordinario
  
  // Reperibilità con viaggio
  isStandbyDay: true,
  interventi: [{
    departure_company: '16:00',
    arrival_site: '18:00',     // 2 ore viaggio andata
    work_start_1: '18:00',
    work_end_1: '20:00',       // 2 ore lavoro reperibilità
    departure_return: '20:00',
    arrival_company: '22:00'   // 2 ore viaggio ritorno
  }],
  
  // Trasferta attiva
  travelAllowance: true,
  travelAllowancePercent: 1.0
};

console.log('Configurazione trasferta:', JSON.stringify(settingsConCCNL.travelAllowance, null, 2));
console.log('\nEntry sabato:', JSON.stringify(sabatoEntry, null, 2));

// 3. Test con configurazione CCNL (dovrebbe essere proporzionale)
try {
  const calcService = new (require('./src/services/CalculationService'))();
  const risultatoConCCNL = calcService.calculateDailyEarnings(sabatoEntry, settingsConCCNL);
  
  console.log('\n--- RISULTATO CON LOGICA CCNL PROPORZIONALE ---');
  console.log(`Ore totali lavorate: ${risultatoConCCNL.breakdown.workHours + risultatoConCCNL.breakdown.travelHours + risultatoConCCNL.breakdown.standbyWorkHours + risultatoConCCNL.breakdown.standbyTravelHours}h`);
  console.log(`Ore ordinarie: ${risultatoConCCNL.breakdown.workHours}h lavoro + ${risultatoConCCNL.breakdown.travelHours}h viaggio = ${risultatoConCCNL.breakdown.workHours + risultatoConCCNL.breakdown.travelHours}h`);
  console.log(`Ore reperibilità: ${risultatoConCCNL.breakdown.standbyWorkHours}h lavoro + ${risultatoConCCNL.breakdown.standbyTravelHours}h viaggio = ${risultatoConCCNL.breakdown.standbyWorkHours + risultatoConCCNL.breakdown.standbyTravelHours}h`);
  
  console.log(`\nIndennità trasferta: €${risultatoConCCNL.travelAllowance?.toFixed(2) || '0.00'}`);
  
  // Calcolo aspettato per verifica
  const oreTotali = 7 + 4; // 7 ore ordinarie + 4 ore reperibilità = 11 ore
  const percentualeAspettata = Math.min(oreTotali / 8, 1.0) * 100;
  const importoAspettato = 46.48 * (oreTotali / 8);
  
  console.log(`\nCalcolo aspettato CCNL:`);
  console.log(`- Ore totali: ${oreTotali}h`);
  console.log(`- Percentuale: ${oreTotali}h / 8h = ${percentualeAspettata.toFixed(1)}% (max 100%)`);
  console.log(`- Importo: €46.48 × ${Math.min(oreTotali / 8, 1.0).toFixed(3)} = €${importoAspettato.toFixed(2)}`);
  
  // Verifica se il risultato è corretto
  const importoOttenuto = risultatoConCCNL.travelAllowance || 0;
  const isCorretto = Math.abs(importoOttenuto - 46.48) < 0.01; // Dovrebbe essere 100% dato che 11h > 8h
  
  console.log(`\n${isCorretto ? '✅ CORRETTO' : '❌ ERRATO'}: L'indennità dovrebbe essere €46.48 (100%) ma è €${importoOttenuto.toFixed(2)}`);
  
  if (!isCorretto) {
    console.log('\n🔍 ANALISI DEL PROBLEMA:');
    console.log('- Verifica che selectedOptions contenga "PROPORTIONAL_CCNL"');
    console.log('- Verifica che il calcolo proporzionale sia attivo');
    console.log('- Controlla i log del CalculationService per debug');
  }
  
} catch (error) {
  console.error('❌ Errore durante il test:', error.message);
  console.error('Stack trace:', error.stack);
}

// 4. Test con vecchia configurazione per confronto
console.log('\n\n--- CONFRONTO CON VECCHIA LOGICA ---');

const settingsVecchia = {
  ...settingsConCCNL,
  travelAllowance: {
    ...settingsConCCNL.travelAllowance,
    selectedOptions: ['WITH_TRAVEL'], // Vecchia opzione
    option: 'WITH_TRAVEL' // Retrocompatibilità
  }
};

try {
  const calcService = new (require('./src/services/CalculationService'))();
  const risultatoVecchio = calcService.calculateDailyEarnings(sabatoEntry, settingsVecchia);
  
  console.log(`Indennità trasferta (vecchia logica): €${risultatoVecchio.travelAllowance?.toFixed(2) || '0.00'}`);
  console.log('Nota: Con la vecchia logica, il sabato con 7h + 4h reperibilità potrebbe risultare come "mezza giornata" = 50%');
  
} catch (error) {
  console.error('❌ Errore durante il test vecchia logica:', error.message);
}

console.log('\n=== FINE TEST DEBUG ===\n');
