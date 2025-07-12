// Test di verifica: correzione indennità trasferta con calcolo CCNL
// Verifica che sia il calcolo principale che il breakdown ignorino travelAllowancePercent
// quando è attivo il calcolo proporzionale CCNL

const path = require('path');
const fs = require('fs');

// Simula il servizio di calcolo
const CalculationService = require('./src/services/CalculationService');

async function testCorrezioneCCNL() {
  console.log('=== TEST VERIFICA CORREZIONE FINALE ===\n');
  
  const calculationService = new CalculationService();
  
  // Configurazione con calcolo CCNL attivo
  const settings = {
    contract: {
      type: "Metalmeccanico PMI",
      level: 5,
      monthlyWage: 2839.07,
      dailyWage: 109.195,
      hourlyWage: 16.41081,
      overtimeRates: {
        day: 1.20,
        night: 1.25,
        nightLate: 1.35,
        saturday: 1.25,
        sunday: 1.30,
        holiday: 1.30
      }
    },
    travelAllowance: {
      enabled: true,
      dailyAmount: 16.41081, // Tariffa oraria CCNL
      selectedOptions: ['PROPORTIONAL_CCNL'], // Solo calcolo proporzionale
      applyOnSpecialDays: false
    }
  };

  // Caso problematico: workEntry con travelAllowancePercent = 0.5
  const workEntry = {
    date: '2025-01-15',
    startTime: '08:00',
    endTime: '16:00', // 8 ore di lavoro
    breakDuration: 0,
    travelAllowance: true,
    travelAllowancePercent: 0.5, // ← Questo dovrebbe essere IGNORATO con calcolo CCNL
    workType: 'normale'
  };

  console.log('INPUT:');
  console.log('- Ore lavorate:', 8);
  console.log('- Indennità CCNL per ora piena:', settings.travelAllowance.dailyAmount, '€');
  console.log('- travelAllowancePercent nel form:', workEntry.travelAllowancePercent);
  console.log('- Calcolo attivo: PROPORTIONAL_CCNL');
  console.log('- ATTESO: 16.41€ (8/8 ore = 100% dell\'indennità CCNL)\n');

  try {
    // Test 1: Calcolo principale
    const dailyResult = await calculationService.calculateDailyEarnings(workEntry, settings);
    const travelAllowanceMain = dailyResult.allowances?.travel || 0;
    
    console.log('RISULTATO CALCOLO PRINCIPALE:');
    console.log(`- Indennità trasferta: ${travelAllowanceMain.toFixed(2)}€`);
    console.log(`- Corretto: ${travelAllowanceMain.toFixed(2) === '16.41' ? 'SÌ' : 'NO'}\n`);

    // Test 2: Breakdown dettagliato
    const breakdownResult = await calculationService.calculateEarningsBreakdown(workEntry, settings);
    const travelAllowanceBreakdown = breakdownResult.allowances?.travel || 0;
    
    console.log('RISULTATO BREAKDOWN DETTAGLIATO:');
    console.log(`- Indennità trasferta: ${travelAllowanceBreakdown.toFixed(2)}€`);
    console.log(`- Corretto: ${travelAllowanceBreakdown.toFixed(2) === '16.41' ? 'SÌ' : 'NO'}\n`);

    // Test 3: Consistenza tra i due metodi
    const isConsistent = Math.abs(travelAllowanceMain - travelAllowanceBreakdown) < 0.01;
    console.log('CONSISTENZA TRA I DUE METODI:');
    console.log(`- Valori identici: ${isConsistent ? 'SÌ' : 'NO'}`);
    console.log(`- Differenza: ${Math.abs(travelAllowanceMain - travelAllowanceBreakdown).toFixed(4)}€\n`);

    // Riepilogo finale
    const isMainCorrect = travelAllowanceMain.toFixed(2) === '16.41';
    const isBreakdownCorrect = travelAllowanceBreakdown.toFixed(2) === '16.41';
    
    console.log('=== RIEPILOGO FINALE ===');
    console.log(`✓ Calcolo principale corretto: ${isMainCorrect ? 'SÌ' : 'NO'}`);
    console.log(`✓ Breakdown corretto: ${isBreakdownCorrect ? 'SÌ' : 'NO'}`);
    console.log(`✓ Consistenza: ${isConsistent ? 'SÌ' : 'NO'}`);
    console.log(`✓ Correzione applicata: ${isMainCorrect && isBreakdownCorrect && isConsistent ? 'SUCCESSO' : 'FALLIMENTO'}\n`);

    if (isMainCorrect && isBreakdownCorrect && isConsistent) {
      console.log('🎉 CORREZIONE VERIFICATA CON SUCCESSO!');
      console.log('Il sistema ora ignora correttamente travelAllowancePercent quando è attivo il calcolo CCNL.');
    } else {
      console.log('❌ CORREZIONE NON COMPLETA');
      console.log('Verificare l\'implementazione nei metodi di calcolo.');
    }

  } catch (error) {
    console.error('Errore durante il test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Esegui il test
testCorrezioneCCNL().catch(console.error);
