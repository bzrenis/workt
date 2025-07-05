// Test di debug specifico per il problema persistente di 6.56€
console.log("=== DEBUG PROBLEMA 6.56€ PERSISTENTE ===\n");

// Possibili cause del problema:
// 1. Campo travelAllowancePercent nel workEntry che forza 50%
// 2. Altro calcolo che applica una riduzione
// 3. Valore errato nella configurazione

console.log("🔍 ANALISI POSSIBILI CAUSE:\n");

// Test 1: Campo travelAllowancePercent
console.log("1. TEST travelAllowancePercent:");
function testTravelAllowancePercent() {
  const workEntryProblematico = {
    date: '2025-07-12',
    travelAllowancePercent: 0.5  // ← QUESTA potrebbe essere la causa!
  };
  
  const workEntryCorretto = {
    date: '2025-07-12',
    travelAllowancePercent: 1.0  // o undefined
  };
  
  console.log("Entry problematico:", { travelAllowancePercent: workEntryProblematico.travelAllowancePercent });
  console.log("Entry corretto:", { travelAllowancePercent: workEntryCorretto.travelAllowancePercent });
  
  // Simula calcolo
  const baseTravelAllowance = 13.13; // Dopo calcolo proporzionale CCNL
  
  console.log(`Base dopo proporzionale CCNL: ${baseTravelAllowance}€`);
  console.log(`Con travelAllowancePercent 0.5: ${(baseTravelAllowance * 0.5).toFixed(2)}€ ❌`);
  console.log(`Con travelAllowancePercent 1.0: ${(baseTravelAllowance * 1.0).toFixed(2)}€ ✅`);
}

testTravelAllowancePercent();

console.log("\n2. TEST valori di configurazione:");

// Test 2: Configurazione errata
function testConfiguration() {
  const configProblematica = {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15,
      selectedOptions: ['PROPORTIONAL_CCNL']
    }
  };
  
  console.log("Configurazione:", JSON.stringify(configProblematica, null, 2));
  
  // Simula il calcolo
  const oreReali = 7;
  const proportionalRate = oreReali / 8; // 0.875
  const risultato = configProblematica.travelAllowance.dailyAmount * proportionalRate;
  
  console.log(`Calcolo: ${configProblematica.travelAllowance.dailyAmount}€ × (${oreReali}/8) = ${risultato.toFixed(2)}€`);
}

testConfiguration();

console.log("\n3. VERIFICA LOGICA NEL CODICE:");

// Test 3: Simula esattamente la logica del codice
function simulateExactLogic() {
  console.log("Simulazione esatta della logica del CalculationService...");
  
  const workEntry = {
    date: '2025-07-12',
    // Questo potrebbe essere il problema!
    travelAllowancePercent: 0.5 // ← Campo che forza il 50%
  };
  
  const settings = {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15,
      selectedOptions: ['PROPORTIONAL_CCNL']
    }
  };
  
  const totalWorked = 7; // ore
  const travelAllowanceAmount = settings.travelAllowance.dailyAmount;
  let baseTravelAllowance = travelAllowanceAmount;
  
  console.log(`1. Base allowance: ${baseTravelAllowance}€`);
  
  // Logica CCNL proporzionale
  if (settings.travelAllowance.selectedOptions.includes('PROPORTIONAL_CCNL')) {
    const standardWorkDay = 8;
    const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
    baseTravelAllowance = travelAllowanceAmount * proportionalRate;
    console.log(`2. Dopo proporzionale CCNL: ${baseTravelAllowance.toFixed(2)}€`);
  }
  
  // QUESTO È IL PROBLEMA! Il campo travelAllowancePercent viene applicato DOPO
  let travelAllowancePercent = 1.0;
  if (typeof workEntry.travelAllowancePercent === 'number') {
    travelAllowancePercent = workEntry.travelAllowancePercent;
  }
  
  const finalAllowance = baseTravelAllowance * travelAllowancePercent;
  
  console.log(`3. travelAllowancePercent dal workEntry: ${travelAllowancePercent}`);
  console.log(`4. Calcolo finale: ${baseTravelAllowance.toFixed(2)}€ × ${travelAllowancePercent} = ${finalAllowance.toFixed(2)}€`);
  
  if (finalAllowance.toFixed(2) === "6.56") {
    console.log("🎯 PROBLEMA TROVATO! Il campo travelAllowancePercent è 0.5");
    console.log("💡 SOLUZIONE: Rimuovi o imposta travelAllowancePercent a 1.0 nel workEntry");
  }
}

simulateExactLogic();

console.log("\n📋 POSSIBILI SOLUZIONI:");
console.log("1. ✅ Controlla se nel form del giorno c'è un campo per la percentuale indennità");
console.log("2. ✅ Verifica se c'è un toggle o slider che riduce l'indennità al 50%");
console.log("3. ✅ Modifica il valore da 50% a 100% nel form del giorno specifico");
console.log("4. ✅ Oppure rimuovi completamente il campo percentuale se non serve");

console.log("\n🔍 COSA CERCARE NELL'APP:");
console.log("- Nel form di inserimento del sabato 12/07/2025");
console.log("- Campo 'Percentuale indennità' o simile");
console.log("- Valore impostato al 50% invece che 100%");
console.log("- Toggle 'Mezza giornata' o 'Riduzione indennità'");
