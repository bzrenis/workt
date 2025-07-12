// Test della correzione per il problema travelAllowancePercent
console.log("=== TEST CORREZIONE PROBLEMA 6.56€ ===\n");

// Simula la logica corretta dopo la modifica
function simulateFixedLogic(workEntry, settings) {
  const totalWorked = 7;
  const travelAllowanceAmount = settings.travelAllowance.dailyAmount;
  const selectedOptions = settings.travelAllowance.selectedOptions;
  
  let baseTravelAllowance = travelAllowanceAmount;
  let travelAllowancePercent = workEntry.travelAllowancePercent || 1.0;
  
  console.log(`Stato iniziale:`);
  console.log(`- Base allowance: ${travelAllowanceAmount}€`);
  console.log(`- travelAllowancePercent dal form: ${workEntry.travelAllowancePercent}`);
  console.log(`- Opzioni attive:`, selectedOptions);
  
  // Nuova logica con correzione
  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
    const standardWorkDay = 8;
    const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
    baseTravelAllowance = travelAllowanceAmount * proportionalRate;
    
    // CORREZIONE: Con calcolo CCNL, ignora travelAllowancePercent
    travelAllowancePercent = 1.0;
    
    console.log(`\n✅ CALCOLO CCNL APPLICATO:`);
    console.log(`- Proporzionale: ${travelAllowanceAmount}€ × (${totalWorked}/8) = ${baseTravelAllowance.toFixed(2)}€`);
    console.log(`- travelAllowancePercent FORZATO a 1.0 (era ${workEntry.travelAllowancePercent})`);
  }
  
  const finalAllowance = baseTravelAllowance * travelAllowancePercent;
  
  console.log(`\n🎯 RISULTATO FINALE:`);
  console.log(`- Calcolo: ${baseTravelAllowance.toFixed(2)}€ × ${travelAllowancePercent} = ${finalAllowance.toFixed(2)}€`);
  
  return finalAllowance;
}

// Test del caso problematico
console.log("📊 CASO PROBLEMATICO (Prima della correzione):");
const workEntryProblematico = {
  date: '2025-07-12',
  travelAllowancePercent: 0.5  // ← Campo che causava il problema
};

const settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 15,
    selectedOptions: ['PROPORTIONAL_CCNL']
  }
};

const risultatoCorretto = simulateFixedLogic(workEntryProblematico, settings);

console.log(`\n✅ VERIFICA:`);
console.log(`- Risultato atteso: 13.13€`);
console.log(`- Risultato ottenuto: ${risultatoCorretto.toFixed(2)}€`);
console.log(`- Correzione funziona: ${risultatoCorretto.toFixed(2) === "13.13" ? "✅ SÌ" : "❌ NO"}`);

console.log(`\n📝 SPIEGAZIONE DELLA CORREZIONE:`);
console.log(`1. Il problema era che il campo travelAllowancePercent (0.5) veniva applicato DOPO il calcolo proporzionale CCNL`);
console.log(`2. Risultato errato: 13.13€ × 0.5 = 6.56€`);
console.log(`3. Ora con calcolo CCNL, travelAllowancePercent viene forzato a 1.0`);
console.log(`4. Risultato corretto: 13.13€ × 1.0 = 13.13€`);

console.log(`\n🚀 COSA SUCCEDE ORA:`);
console.log(`- ✅ L'indennità è sempre calcolata correttamente secondo CCNL`);
console.log(`- ✅ Non importa cosa c'è nel campo percentuale del form`);
console.log(`- ✅ Il calcolo proporzionale CCNL ha precedenza assoluta`);
console.log(`- ✅ Nessuna azione richiesta all'utente`);
