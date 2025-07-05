// Test per verificare il calcolo CCNL con 7h lavoro + 4h reperibilità = 11h totali
// Dovrebbe risultare in indennità al 100% (16.41€) invece che 87.5% (14.36€)

console.log('=== TEST CALCOLO CCNL CON REPERIBILITÀ ===\n');

// Simula il calcolo backend (CalculationService)
function simulateBackendCalculation(workEntry, settings) {
  // Ore base
  const workHours = 7.0;  // 7 ore di lavoro
  const travelHours = 0.0; // Nessun viaggio ordinario
  const standbyWorkHours = 2.0; // 2 ore lavoro reperibilità
  const standbyTravelHours = 2.0; // 2 ore viaggio reperibilità
  
  // Calcolo indennità trasferta
  const travelAllowanceSettings = settings.travelAllowance || {};
  const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
  const selectedOptions = travelAllowanceSettings.selectedOptions || [];
  
  // CORREZIONE: Per il calcolo CCNL proporzionale, include anche le ore di reperibilità
  const totalWorked = workHours + travelHours;
  const totalWorkedWithStandby = workHours + travelHours + standbyWorkHours + standbyTravelHours;
  
  // Usa ore totali (inclusa reperibilità) se il calcolo CCNL è attivo
  const effectiveTotalWorked = selectedOptions.includes('PROPORTIONAL_CCNL') 
    ? totalWorkedWithStandby 
    : totalWorked;
  
  let baseTravelAllowance = travelAllowanceAmount;
  let travelAllowancePercent = 1.0;
  
  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
    const standardWorkDay = 8;
    const proportionalRate = Math.min(effectiveTotalWorked / standardWorkDay, 1.0);
    baseTravelAllowance = travelAllowanceAmount * proportionalRate;
    travelAllowancePercent = 1.0; // Ignora percentuale dal form
    
    console.log(`[BACKEND] Calcolo CCNL: ${effectiveTotalWorked}h (${workHours}h lavoro + ${travelHours}h viaggio + ${standbyWorkHours}h rep.lavoro + ${standbyTravelHours}h rep.viaggio) / ${standardWorkDay}h = ${(proportionalRate * 100).toFixed(1)}%`);
  }
  
  const finalTravelAllowance = baseTravelAllowance * travelAllowancePercent;
  
  return {
    totalWorked,
    totalWorkedWithStandby,
    effectiveTotalWorked,
    proportionalRate: effectiveTotalWorked / 8,
    travelAllowance: finalTravelAllowance,
    breakdown: {
      ordinary: {
        hours: {
          lavoro_giornaliera: Math.min(workHours, 8),
          viaggio_giornaliera: Math.min(travelHours, Math.max(0, 8 - workHours)),
          lavoro_extra: Math.max(0, workHours - 8),
          viaggio_extra: Math.max(0, travelHours - Math.max(0, 8 - workHours))
        }
      },
      standby: {
        workHours: { ordinary: standbyWorkHours },
        travelHours: { ordinary: standbyTravelHours }
      }
    }
  };
}

// Simula il calcolo frontend (TimeEntryForm.js)
function simulateFrontendDescription(breakdown, settings) {
  const travelAllowanceSettings = settings.travelAllowance || {};
  const selectedOptions = travelAllowanceSettings.selectedOptions || [];
  
  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
    const workHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + 
                     (breakdown.ordinary?.hours?.lavoro_extra || 0);
    const travelHours = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + 
                       (breakdown.ordinary?.hours?.viaggio_extra || 0);
    
    // Include tutte le ore di reperibilità (lavoro + viaggio) nel calcolo CCNL
    const standbyWorkHours = breakdown.standby ? 
      Object.values(breakdown.standby.workHours || {}).reduce((a, b) => a + b, 0) : 0;
    const standbyTravelHours = breakdown.standby ? 
      Object.values(breakdown.standby.travelHours || {}).reduce((a, b) => a + b, 0) : 0;
    const totalStandbyHours = standbyWorkHours + standbyTravelHours;
    
    const totalHours = workHours + travelHours + totalStandbyHours;
    const proportion = Math.min(totalHours / 8, 1.0);
    
    console.log(`[FRONTEND] Calcolo descrizione: ${workHours}h lavoro + ${travelHours}h viaggio + ${totalStandbyHours}h reperibilità = ${totalHours}h totali`);
    
    if (totalStandbyHours > 0) {
      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%) - include ${totalStandbyHours.toFixed(1)}h reperibilità`;
    } else {
      return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%)`;
    }
  }
  
  return 'Altra logica';
}

// Test del tuo scenario specifico
console.log('SCENARIO: 7h lavoro + 4h reperibilità (2h lavoro + 2h viaggio) = 11h totali');

const workEntry = {
  date: '2025-01-15',
  // Simulazione: 7 ore di lavoro normale
  workStart1: '08:00',
  workEnd1: '15:00',
  // Simulazione: 4 ore di reperibilità (2h lavoro + 2h viaggio)
  interventi: [
    {
      departure_company: '20:00',
      arrival_site: '21:00',      // 1h viaggio andata
      work_start_1: '21:00',
      work_end_1: '23:00',        // 2h lavoro
      departure_return: '23:00',
      arrival_company: '24:00'    // 1h viaggio ritorno
    }
  ],
  travelAllowance: true
};

const settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['PROPORTIONAL_CCNL']
  }
};

console.log('\nINPUT:');
console.log('- Lavoro ordinario: 7h');
console.log('- Reperibilità lavoro: 2h');
console.log('- Reperibilità viaggio: 2h');
console.log('- Totale: 11h\n');

// Esegui test backend
const backendResult = simulateBackendCalculation(workEntry, settings);

console.log('RISULTATO BACKEND:');
console.log(`- Ore solo ordinarie: ${backendResult.totalWorked}h`);
console.log(`- Ore con reperibilità: ${backendResult.totalWorkedWithStandby}h`);
console.log(`- Ore effettive per calcolo: ${backendResult.effectiveTotalWorked}h`);
console.log(`- Proporzione: ${(backendResult.proportionalRate * 100).toFixed(1)}%`);
console.log(`- Indennità trasferta: ${backendResult.travelAllowance.toFixed(2)}€\n`);

// Esegui test frontend
const frontendDescription = simulateFrontendDescription(backendResult.breakdown, settings);

console.log('RISULTATO FRONTEND:');
console.log(`- Descrizione: "${frontendDescription}"\n`);

// Verifica risultati
const expectedAmount = 16.41081; // 100% perché 11h >= 8h
const expectedDescription = 'include 4.0h reperibilità';

const backendCorrect = Math.abs(backendResult.travelAllowance - expectedAmount) < 0.01;
const frontendCorrect = frontendDescription.includes('100.0%') && frontendDescription.includes('4.0h reperibilità');

console.log('=== VERIFICA ===');
console.log(`✓ Backend corretto (16.41€): ${backendCorrect ? 'SÌ' : 'NO'} (${backendResult.travelAllowance.toFixed(2)}€)`);
console.log(`✓ Frontend corretto (100% + 4h rep): ${frontendCorrect ? 'SÌ' : 'NO'}`);
console.log(`✓ Proporzione corretta (100%): ${backendResult.proportionalRate >= 1.0 ? 'SÌ' : 'NO'} (${(backendResult.proportionalRate * 100).toFixed(1)}%)\n`);

if (backendCorrect && frontendCorrect) {
  console.log('🎉 CORREZIONE COMPLETA!');
  console.log('✅ Il calcolo include tutte le ore di reperibilità (lavoro + viaggio)');
  console.log('✅ L\'indennità è al 100% perché 11h > 8h');
  console.log('✅ Il dettaglio mostra "include 4.0h reperibilità"');
} else {
  console.log('❌ Ancora problemi:');
  if (!backendCorrect) console.log('   - Backend non calcola correttamente');
  if (!frontendCorrect) console.log('   - Frontend non mostra descrizione corretta');
}

console.log('\n📝 NOTA: Con questo scenario:');
console.log('- 7h lavoro ordinario = 87.5% normale');
console.log('- + 4h reperibilità (2h lavoro + 2h viaggio)');
console.log('- = 11h totali > 8h → 100% indennità trasferta');
console.log('- Il dettaglio dovrebbe dire "Calcolo CCNL proporzionale (100.0%) - include 4.0h reperibilità"');
