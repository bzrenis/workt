// Test per dimostrare il problema del doppio calcolo nell'indennità di trasferta
// Simuliamo la logica senza importare il modulo ES

console.log("=== TEST DOPPIO CALCOLO INDENNITÀ TRASFERTA ===\n");

// Simulazione della logica di calcolo dell'indennità
function simulateCalculateTravelAllowance(totalHours, settings) {
  const { travelAllowance } = settings;
  
  if (!travelAllowance.enabled) return 0;
  
  let allowance = travelAllowance.dailyAmount || 15;
  
  // Controllo se hanno selectedOptions (nuovo) o option (vecchio)
  const options = travelAllowance.selectedOptions || (travelAllowance.option ? [travelAllowance.option] : []);
  
  console.log(`  Base allowance: ${allowance}€`);
  console.log(`  Opzioni attive:`, options);
  
  // 1. Prima applichiamo il calcolo proporzionale CCNL se presente
  if (options.includes('PROPORTIONAL_CCNL')) {
    const proportion = Math.min(totalHours / 8, 1);
    allowance = allowance * proportion;
    console.log(`  → Calcolo proporzionale CCNL: ${allowance.toFixed(2)}€ (${totalHours}/8 × 15€)`);
  }
  
  // 2. Poi applichiamo la riduzione 50% se presente
  if (options.includes('HALF_ALLOWANCE_HALF_DAY')) {
    allowance = allowance * 0.5;
    console.log(`  → Riduzione mezza giornata: ${allowance.toFixed(2)}€ (50% di ${(allowance/0.5).toFixed(2)}€)`);
  }
  
  return allowance;
}

// Configurazione con entrambe le opzioni attive (problema)
const settingsProblematico = {
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
  travelAllowance: {
    enabled: true,
    dailyAmount: 15,
    selectedOptions: [
      'PROPORTIONAL_CCNL'  // ← Solo calcolo proporzionale
    ]
  }
};

// Simulazione del caso sabato 12/07/2025 con 7 ore totali
const totalHours = 7; // 7 ore lavoro + 1 ora viaggio = 8 ore, ma consideriamo solo lavoro per semplicità

console.log("📊 CASO PROBLEMATICO (entrambe le opzioni attive):");
console.log(`Ore totali: ${totalHours}h`);
const resultProblematico = simulateCalculateTravelAllowance(totalHours, settingsProblematico);
console.log(`❌ Risultato finale: ${resultProblematico.toFixed(2)}€\n`);

console.log("✅ CASO CORRETTO (solo proporzionale CCNL):");
console.log(`Ore totali: ${totalHours}h`);
const resultCorretto = simulateCalculateTravelAllowance(totalHours, settingsCorretto);
console.log(`✅ Risultato finale: ${resultCorretto.toFixed(2)}€\n`);

console.log("=== CONFRONTO RISULTATI ===");
console.log(`Configurazione problematica: ${resultProblematico.toFixed(2)}€`);
console.log(`Configurazione corretta: ${resultCorretto.toFixed(2)}€`);
console.log(`Differenza: ${(resultCorretto - resultProblematico).toFixed(2)}€`);

console.log("\n=== SPIEGAZIONE DEL PROBLEMA ===");
console.log("Il sistema applica ENTRAMBE le logiche in sequenza:");
console.log("1. Calcolo proporzionale: 15€ × (7/8) = 13.13€");
console.log("2. Riduzione mezza giornata: 13.13€ × 50% = 6.56€");
console.log("\nQuesto non è conforme al CCNL che prevede SOLO il calcolo proporzionale.");

console.log("\n=== SOLUZIONE ===");
console.log("Per risolvere il problema:");
console.log("1. Nelle impostazioni dell'app, disattivare l'opzione 'Mezza giornata (50%)'");
console.log("2. Mantenere attiva solo l'opzione 'Calcolo proporzionale CCNL'");
console.log("3. Questo garantisce il calcolo conforme al CCNL: (ore/8) × indennità");

console.log("\n=== TEST ALTRI SCENARI ===");

// Test con 8 ore (giornata completa)
console.log("\n🔹 Test con 8 ore (giornata completa):");
console.log("Problematico:", simulateCalculateTravelAllowance(8, settingsProblematico).toFixed(2) + "€");
console.log("Corretto:", simulateCalculateTravelAllowance(8, settingsCorretto).toFixed(2) + "€");

// Test con 4 ore (mezza giornata)
console.log("\n🔹 Test con 4 ore (mezza giornata):");
console.log("Problematico:", simulateCalculateTravelAllowance(4, settingsProblematico).toFixed(2) + "€");
console.log("Corretto:", simulateCalculateTravelAllowance(4, settingsCorretto).toFixed(2) + "€");

// Test con 6 ore
console.log("\n🔹 Test con 6 ore:");
console.log("Problematico:", simulateCalculateTravelAllowance(6, settingsProblematico).toFixed(2) + "€");
console.log("Corretto:", simulateCalculateTravelAllowance(6, settingsCorretto).toFixed(2) + "€");
