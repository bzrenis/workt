// Test di debug specifico per il problema dei 6.25€
console.log("=== DEBUG PROBLEMA 6.25€ ===\n");

// Simulazione del caso reale con solo PROPORTIONAL_CCNL attivo
const settingsCorrette = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    monthlySalary: 2839.07
  },
  travelAllowance: {
    enabled: true,
    dailyAmount: 15,
    selectedOptions: ['PROPORTIONAL_CCNL']  // SOLO questa opzione attiva
  }
};

// Possibili configurazioni del workEntry che potrebbero causare il problema
const workEntryScenari = [
  {
    nome: "Scenario Base (solo ore lavoro)",
    entry: {
      date: '2025-07-12',
      workStart1: '08:00',
      workEnd1: '15:00',
      travelAllowance: true
    }
  },
  {
    nome: "Scenario con travelAllowancePercent",
    entry: {
      date: '2025-07-12',
      workStart1: '08:00',
      workEnd1: '15:00',
      travelAllowance: true,
      travelAllowancePercent: 0.5  // ← POSSIBILE CAUSA!
    }
  },
  {
    nome: "Scenario con valore specifico indennità",
    entry: {
      date: '2025-07-12',
      workStart1: '08:00',
      workEnd1: '15:00',
      travelAllowance: 6.25  // ← VALORE SPECIFICO!
    }
  },
  {
    nome: "Scenario con override manuale",
    entry: {
      date: '2025-07-12',
      workStart1: '08:00',
      workEnd1: '15:00',
      travelAllowance: true,
      trasfertaManualOverride: true,
      travelAllowancePercent: 0.41666  // ← ALTRO POSSIBILE PROBLEMA
    }
  }
];

function simulateCalculation(workEntry, settings) {
  const workHours = 7; // 7 ore di lavoro
  const travelHours = 0; // nessun viaggio in questo test
  const totalWorked = workHours + travelHours;
  
  console.log(`\n🔍 ${workEntry.nome || 'Test'}:`);
  console.log(`Ore totali: ${totalWorked}h`);
  console.log(`workEntry.travelAllowance:`, workEntry.travelAllowance);
  console.log(`workEntry.travelAllowancePercent:`, workEntry.travelAllowancePercent);
  console.log(`workEntry.trasfertaManualOverride:`, workEntry.trasfertaManualOverride);
  
  let travelAllowance = 0;
  const travelAllowanceSettings = settings.travelAllowance || {};
  const travelAllowanceEnabled = travelAllowanceSettings.enabled;
  const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 0;
  
  console.log(`Impostazioni - enabled: ${travelAllowanceEnabled}, amount: ${travelAllowanceAmount}`);
  
  const selectedOptions = travelAllowanceSettings.selectedOptions || ['WITH_TRAVEL'];
  console.log(`Opzioni selezionate:`, selectedOptions);
  
  let travelAllowancePercent = 1.0;
  if (typeof workEntry.travelAllowancePercent === 'number') {
    travelAllowancePercent = workEntry.travelAllowancePercent;
    console.log(`⚠️ TROVATO travelAllowancePercent: ${travelAllowancePercent}`);
  }
  
  if (travelAllowanceEnabled && travelAllowanceAmount > 0) {
    let baseTravelAllowance = travelAllowanceAmount;
    console.log(`Base allowance: ${baseTravelAllowance}€`);
    
    // Simula la logica corretta
    if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
      const standardWorkDay = 8;
      const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
      baseTravelAllowance = travelAllowanceAmount * proportionalRate;
      console.log(`Calcolo proporzionale: ${travelAllowanceAmount}€ × (${totalWorked}/8) = ${baseTravelAllowance.toFixed(2)}€`);
    }
    
    // Applica percentuale finale
    travelAllowance = baseTravelAllowance * travelAllowancePercent;
    console.log(`Risultato finale: ${baseTravelAllowance.toFixed(2)}€ × ${travelAllowancePercent} = ${travelAllowance.toFixed(2)}€`);
    
    // Analisi del problema
    if (travelAllowance.toFixed(2) === "6.25") {
      console.log(`❌ PROBLEMA IDENTIFICATO!`);
      if (travelAllowancePercent !== 1.0) {
        console.log(`→ La causa è travelAllowancePercent = ${travelAllowancePercent}`);
        const expectedWithoutPercent = baseTravelAllowance;
        console.log(`→ Senza percentuale sarebbe: ${expectedWithoutPercent.toFixed(2)}€`);
      }
    }
  }
  
  return travelAllowance;
}

// Test di tutti gli scenari
workEntryScenari.forEach(scenario => {
  const result = simulateCalculation(scenario.entry, settingsCorrette);
  console.log(`\n📊 Risultato ${scenario.nome}: ${result.toFixed(2)}€`);
  
  if (result.toFixed(2) === "6.25") {
    console.log(`🎯 QUESTO SCENARIO PRODUCE 6.25€!`);
  }
});

console.log("\n💡 POSSIBILI CAUSE DEI 6.25€:");
console.log("1. workEntry.travelAllowancePercent = 0.5 (mezza giornata dal form)");
console.log("2. workEntry.travelAllowancePercent = 0.41666 (calcolato automaticamente)");
console.log("3. Valore hardcoded nel database");
console.log("4. Calcolo errato delle ore totali");

console.log("\n🔍 CALCOLI POSSIBILI PER 6.25€:");
console.log("• 15€ × (5/8) × 1.0 = 9.38€ (no)");
console.log("• 15€ × (7/8) × 0.5 = 6.56€ (no)");
console.log("• 15€ × (10/24) = 6.25€ (10h/24h?)");
console.log("• 15€ × 0.41666 = 6.25€ (percentage field!)");
console.log("• 12.5€ × 0.5 = 6.25€ (base amount different?)");

console.log("\n📋 PROSSIMI PASSI:");
console.log("1. Controllare il valore di workEntry.travelAllowancePercent");
console.log("2. Verificare se c'è un calcolo automatico che imposta questo valore");
console.log("3. Controllare se l'importo base è davvero 15€");
console.log("4. Verificare le ore totali calcolate");
