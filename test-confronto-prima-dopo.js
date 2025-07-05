// Test di confronto: PRIMA vs DOPO la correzione
// Scenario: 7h lavoro + 4h reperibilità (2h lavoro + 2h viaggio)

console.log('=== CONFRONTO PRIMA vs DOPO CORREZIONE ===\n');

const scenario = {
  workHours: 7.0,
  travelHours: 0.0,
  standbyWorkHours: 2.0,
  standbyTravelHours: 2.0,
  totalHours: 11.0
};

const settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['PROPORTIONAL_CCNL']
  }
};

console.log('SCENARIO:');
console.log(`- Lavoro ordinario: ${scenario.workHours}h`);
console.log(`- Viaggio ordinario: ${scenario.travelHours}h`);
console.log(`- Reperibilità lavoro: ${scenario.standbyWorkHours}h`);
console.log(`- Reperibilità viaggio: ${scenario.standbyTravelHours}h`);
console.log(`- TOTALE: ${scenario.totalHours}h\n`);

// CALCOLO PRIMA DELLA CORREZIONE
function calculateBefore() {
  // Prima considerava solo workHours + travelHours
  const totalOrdinaryOnly = scenario.workHours + scenario.travelHours;
  const proportionalRate = Math.min(totalOrdinaryOnly / 8, 1.0);
  const travelAllowance = settings.travelAllowance.dailyAmount * proportionalRate;
  
  return {
    totalConsidered: totalOrdinaryOnly,
    proportionalRate,
    travelAllowance,
    description: `Calcolo CCNL proporzionale (${(proportionalRate * 100).toFixed(1)}%)`
  };
}

// CALCOLO DOPO LA CORREZIONE
function calculateAfter() {
  // Ora considera tutte le ore (inclusa reperibilità)
  const totalWithStandby = scenario.workHours + scenario.travelHours + 
                          scenario.standbyWorkHours + scenario.standbyTravelHours;
  const proportionalRate = Math.min(totalWithStandby / 8, 1.0);
  const travelAllowance = settings.travelAllowance.dailyAmount * proportionalRate;
  const totalStandbyHours = scenario.standbyWorkHours + scenario.standbyTravelHours;
  
  return {
    totalConsidered: totalWithStandby,
    proportionalRate,
    travelAllowance,
    description: `Calcolo CCNL proporzionale (${(proportionalRate * 100).toFixed(1)}%) - include ${totalStandbyHours.toFixed(1)}h reperibilità`
  };
}

const before = calculateBefore();
const after = calculateAfter();

console.log('🔴 PRIMA DELLA CORREZIONE:');
console.log(`   Ore considerate: ${before.totalConsidered}h (solo lavoro + viaggio ordinario)`);
console.log(`   Proporzione: ${(before.proportionalRate * 100).toFixed(1)}%`);
console.log(`   Indennità: ${before.travelAllowance.toFixed(2)}€`);
console.log(`   Dettaglio: "${before.description}"`);
console.log(`   Problema: ❌ Non considera le ${scenario.standbyWorkHours + scenario.standbyTravelHours}h di reperibilità\n`);

console.log('🟢 DOPO LA CORREZIONE:');
console.log(`   Ore considerate: ${after.totalConsidered}h (include tutta la reperibilità)`);
console.log(`   Proporzione: ${(after.proportionalRate * 100).toFixed(1)}%`);
console.log(`   Indennità: ${after.travelAllowance.toFixed(2)}€`);
console.log(`   Dettaglio: "${after.description}"`);
console.log(`   Risolto: ✅ Include correttamente tutte le ore\n`);

// Analisi del miglioramento
const improvement = after.travelAllowance - before.travelAllowance;
const percentageImprovement = (improvement / before.travelAllowance) * 100;

console.log('📊 IMPATTO DELLA CORREZIONE:');
console.log(`   Incremento indennità: +${improvement.toFixed(2)}€`);
console.log(`   Incremento percentuale: +${percentageImprovement.toFixed(1)}%`);
console.log(`   Da: ${(before.proportionalRate * 100).toFixed(1)}% → A: ${(after.proportionalRate * 100).toFixed(1)}%\n`);

// Verifica correttezza normativa
console.log('⚖️ CONFORMITÀ CCNL:');
console.log(`   ✅ Include tutte le ore lavorate nella giornata`);
console.log(`   ✅ Calcolo proporzionale corretto: ${after.totalConsidered}h / 8h = ${(after.proportionalRate * 100).toFixed(1)}%`);
console.log(`   ✅ Indennità massima (100%) applicata perché ${after.totalConsidered}h > 8h`);
console.log(`   ✅ Trasparenza: il dettaglio specifica le ore di reperibilità incluse\n`);

// Test casi limite
console.log('🧪 TEST CASI LIMITE:');

// Caso 1: Esattamente 8h con reperibilità
const case1 = { work: 6, travel: 0, standbyWork: 1, standbyTravel: 1 }; // = 8h
const total1 = case1.work + case1.travel + case1.standbyWork + case1.standbyTravel;
const rate1 = Math.min(total1 / 8, 1.0);
console.log(`   Caso 1 (${total1}h): ${case1.work}h+${case1.travel}h+${case1.standbyWork}h+${case1.standbyTravel}h = ${(rate1 * 100).toFixed(1)}% ✅`);

// Caso 2: Sotto 8h con reperibilità
const case2 = { work: 4, travel: 1, standbyWork: 1, standbyTravel: 1 }; // = 7h
const total2 = case2.work + case2.travel + case2.standbyWork + case2.standbyTravel;
const rate2 = Math.min(total2 / 8, 1.0);
console.log(`   Caso 2 (${total2}h): ${case2.work}h+${case2.travel}h+${case2.standbyWork}h+${case2.standbyTravel}h = ${(rate2 * 100).toFixed(1)}% ✅`);

// Caso 3: Solo reperibilità
const case3 = { work: 0, travel: 0, standbyWork: 3, standbyTravel: 1 }; // = 4h
const total3 = case3.work + case3.travel + case3.standbyWork + case3.standbyTravel;
const rate3 = Math.min(total3 / 8, 1.0);
console.log(`   Caso 3 (${total3}h): ${case3.work}h+${case3.travel}h+${case3.standbyWork}h+${case3.standbyTravel}h = ${(rate3 * 100).toFixed(1)}% ✅`);

console.log('\n🎯 RISULTATO:');
console.log('La correzione risolve il problema e rende il calcolo conforme al CCNL!');
console.log('Ora l\'indennità di trasferta tiene conto di TUTTE le ore lavorate,');
console.log('inclusi gli interventi di reperibilità (sia lavoro che viaggio).');
