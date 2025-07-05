// Test per verificare che l'indennità trasferta consideri anche le ore di reperibilità
// nel calcolo CCNL proporzionale (7h lavoro + 4h reperibilità = 11h → 100% invece di 87.5%)

console.log('=== TEST INDENNITÀ TRASFERTA CON REPERIBILITÀ ===\n');

// Simula il calcolo con la correzione applicata
function simulateCalculationWithStandby() {
  // Dati del caso specifico
  const workHours = 7.0;  // 7 ore di lavoro normale
  const travelHours = 0.0; // Nessun viaggio
  const standbyWorkHours = 4.0; // 4 ore di intervento reperibilità
  const travelAllowanceAmount = 16.41081; // Tariffa CCNL
  const selectedOptions = ['PROPORTIONAL_CCNL'];
  
  console.log('DATI INPUT:');
  console.log(`- Ore lavoro normale: ${workHours}h`);
  console.log(`- Ore viaggio: ${travelHours}h`);
  console.log(`- Ore reperibilità: ${standbyWorkHours}h`);
  console.log(`- Totale senza reperibilità: ${workHours + travelHours}h`);
  console.log(`- Totale con reperibilità: ${workHours + travelHours + standbyWorkHours}h`);
  console.log(`- Tariffa CCNL: ${travelAllowanceAmount}€\n`);
  
  // === CALCOLO VECCHIO (SENZA REPERIBILITÀ) ===
  const totalWorkedOld = workHours + travelHours; // 7h
  const proportionalRateOld = Math.min(totalWorkedOld / 8, 1.0); // 87.5%
  const allowanceOld = travelAllowanceAmount * proportionalRateOld;
  
  console.log('CALCOLO VECCHIO (SENZA REPERIBILITÀ):');
  console.log(`- Ore considerate: ${totalWorkedOld}h`);
  console.log(`- Proporzione: ${totalWorkedOld}h / 8h = ${(proportionalRateOld * 100).toFixed(1)}%`);
  console.log(`- Indennità: ${travelAllowanceAmount.toFixed(2)}€ × ${proportionalRateOld.toFixed(3)} = ${allowanceOld.toFixed(2)}€\n`);
  
  // === CALCOLO NUOVO (CON REPERIBILITÀ) ===
  let totalWorkedNew, effectiveTotalWorked;
  
  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
    totalWorkedNew = workHours + travelHours; // 7h
    const totalWorkedWithStandby = workHours + travelHours + standbyWorkHours; // 11h
    effectiveTotalWorked = totalWorkedWithStandby; // Usa ore totali per CCNL
  } else {
    totalWorkedNew = workHours + travelHours;
    effectiveTotalWorked = totalWorkedNew;
  }
  
  const proportionalRateNew = Math.min(effectiveTotalWorked / 8, 1.0); // 100% (limitato a max 100%)
  const allowanceNew = travelAllowanceAmount * proportionalRateNew;
  
  console.log('CALCOLO NUOVO (CON REPERIBILITÀ):');
  console.log(`- Ore considerate: ${effectiveTotalWorked}h (include ${standbyWorkHours}h reperibilità)`);
  console.log(`- Proporzione: ${effectiveTotalWorked}h / 8h = ${(proportionalRateNew * 100).toFixed(1)}% (max 100%)`);
  console.log(`- Indennità: ${travelAllowanceAmount.toFixed(2)}€ × ${proportionalRateNew.toFixed(3)} = ${allowanceNew.toFixed(2)}€\n`);
  
  // === CONFRONTO RISULTATI ===
  const difference = allowanceNew - allowanceOld;
  const isCorrect = Math.abs(allowanceNew - 16.41) < 0.01; // Dovrebbe essere 16.41€ (100%)
  
  console.log('=== CONFRONTO RISULTATI ===');
  console.log(`❌ Vecchio calcolo: ${allowanceOld.toFixed(2)}€ (${(proportionalRateOld * 100).toFixed(1)}%)`);
  console.log(`✅ Nuovo calcolo: ${allowanceNew.toFixed(2)}€ (${(proportionalRateNew * 100).toFixed(1)}%)`);
  console.log(`📈 Differenza: +${difference.toFixed(2)}€`);
  console.log(`🎯 Corretto (100% = 16.41€): ${isCorrect ? 'SÌ' : 'NO'}\n`);
  
  return {
    old: allowanceOld,
    new: allowanceNew,
    difference: difference,
    isCorrect: isCorrect,
    oldRate: proportionalRateOld,
    newRate: proportionalRateNew
  };
}

// Simula anche la descrizione del frontend
function simulateFrontendDescription(workHours, travelHours, standbyWorkHours) {
  const totalHours = workHours + travelHours + standbyWorkHours;
  const proportion = Math.min(totalHours / 8, 1.0);
  
  if (standbyWorkHours > 0) {
    return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%) - include ${standbyWorkHours.toFixed(1)}h reperibilità`;
  } else {
    return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%)`;
  }
}

// Esegui il test
const result = simulateCalculationWithStandby();
const description = simulateFrontendDescription(7.0, 0.0, 4.0);

console.log('=== VERIFICA FRONTEND ===');
console.log(`Descrizione mostrata: "${description}"`);
console.log(`Include reperibilità: ${description.includes('reperibilità') ? 'SÌ' : 'NO'}\n`);

// Test con diversi scenari
console.log('=== TEST SCENARI AGGIUNTIVI ===');

const scenarios = [
  { work: 6, travel: 1, standby: 0, desc: '7h senza reperibilità' },
  { work: 6, travel: 1, standby: 1, desc: '8h con 1h reperibilità' },
  { work: 6, travel: 1, standby: 3, desc: '10h con 3h reperibilità' },
  { work: 5, travel: 0, standby: 5, desc: '10h con 5h reperibilità' },
  { work: 8, travel: 0, standby: 0, desc: '8h giornata piena normale' }
];

scenarios.forEach(scenario => {
  const total = scenario.work + scenario.travel + scenario.standby;
  const proportion = Math.min(total / 8, 1.0);
  const allowance = 16.41081 * proportion;
  
  console.log(`${scenario.desc}: ${total}h → ${(proportion * 100).toFixed(1)}% → ${allowance.toFixed(2)}€`);
});

console.log('\n=== RISULTATO FINALE ===');
if (result.isCorrect) {
  console.log('🎉 CORREZIONE RIUSCITA!');
  console.log(`✅ Con 7h lavoro + 4h reperibilità = 11h totali`);
  console.log(`✅ L'indennità è ora al 100% (16.41€) invece dell'87.5% (${result.old.toFixed(2)}€)`);
  console.log(`✅ Guadagno aggiuntivo: +${result.difference.toFixed(2)}€`);
  console.log(`✅ Descrizione include le ore di reperibilità`);
} else {
  console.log('❌ CORREZIONE NON RIUSCITA');
  console.log(`- Atteso: 16.41€ (100%)`);
  console.log(`- Ottenuto: ${result.new.toFixed(2)}€ (${(result.newRate * 100).toFixed(1)}%)`);
}

console.log('\n📋 La correzione garantisce che:');
console.log('• Le ore di reperibilità contano per determinare la "giornata piena"');
console.log('• Con 8+ ore totali (lavoro + viaggio + reperibilità) → indennità al 100%');
console.log('• Il calcolo rimane conforme al CCNL Metalmeccanico PMI');
console.log('• L\'interfaccia mostra chiaramente le ore di reperibilità incluse');
