// Test specifico per verificare quando si ottiene indennità trasferta al 50%
// Analisi completa degli scenari per il 12/07/2025 (sabato)

console.log("🔍 ANALISI DETTAGLIATA: Indennità trasferta 50% - 12/07/2025");
console.log("=" .repeat(70));

// Simula la logica del CalculationService
function testTravelAllowanceCalculation(workEntry, settings) {
  const dateObj = new Date(workEntry.date);
  const isSunday = dateObj.getDay() === 0;
  const isSaturday = dateObj.getDay() === 6;
  const isHoliday = false; // Semplifichiamo
  
  const workHours = workEntry.workHours || 0;
  const travelHours = workEntry.travelHours || 0;
  const totalWorked = workHours + travelHours;
  const isFullDay = totalWorked >= 8;
  const isHalfDay = totalWorked > 0 && totalWorked < 8;
  
  const travelAllowanceSettings = settings.travelAllowance || {};
  const travelAllowanceEnabled = travelAllowanceSettings.enabled;
  const travelAllowanceAmount = parseFloat(travelAllowanceSettings.dailyAmount) || 15.00;
  const travelAllowanceOption = travelAllowanceSettings.option || 'WITH_TRAVEL';
  const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;
  
  // Campo chiave che può causare 50%
  let travelAllowancePercent = 1.0;
  if (typeof workEntry.travelAllowancePercent === 'number') {
    travelAllowancePercent = workEntry.travelAllowancePercent;
  }
  
  const manualOverride = workEntry.trasfertaManualOverride || false;
  
  console.log(`\n📋 DATI INPUT per ${workEntry.date}:`);
  console.log(`   Ore lavoro: ${workHours}h`);
  console.log(`   Ore viaggio: ${travelHours}h`);
  console.log(`   Totale ore: ${totalWorked}h`);
  console.log(`   È giornata piena: ${isFullDay} (>= 8h)`);
  console.log(`   È mezza giornata: ${isHalfDay} (> 0 e < 8h)`);
  console.log(`   Tipo giorno: ${isSaturday ? 'Sabato' : isSunday ? 'Domenica' : 'Feriale'}`);
  
  // Verifica attivazione
  let attiva = false;
  switch (travelAllowanceOption) {
    case 'WITH_TRAVEL':
      attiva = travelHours > 0;
      break;
    case 'ALWAYS':
      attiva = true;
      break;
    case 'FULL_DAY_ONLY':
      attiva = isFullDay;
      break;
    case 'FULL_ALLOWANCE_HALF_DAY':
      attiva = totalWorked > 0;
      break;
    case 'HALF_ALLOWANCE_HALF_DAY':
      attiva = totalWorked > 0;
      break;
    default:
      attiva = travelHours > 0;
  }
  
  console.log(`\n🔧 LOGICA ATTIVAZIONE:`);
  console.log(`   Regola: ${travelAllowanceOption}`);
  console.log(`   Condizioni soddisfatte: ${attiva}`);
  console.log(`   Apply on special days: ${applyOnSpecialDays}`);
  console.log(`   Manual override: ${manualOverride}`);
  
  // Calcolo indennità
  let travelAllowance = 0;
  if (attiva && (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride)) {
    let baseTravelAllowance = travelAllowanceAmount;
    
    // PRIMO SCENARIO 50%: Regola HALF_ALLOWANCE_HALF_DAY
    if (travelAllowanceOption === 'HALF_ALLOWANCE_HALF_DAY' && isHalfDay) {
      baseTravelAllowance = travelAllowanceAmount / 2;
      console.log(`\n🎯 SCENARIO 1 - Mezza giornata con HALF_ALLOWANCE_HALF_DAY:`);
      console.log(`   Base: ${travelAllowanceAmount}€ → ${baseTravelAllowance}€ (50%)`);
    }
    
    // SECONDO SCENARIO 50%: Campo travelAllowancePercent
    travelAllowance = baseTravelAllowance * travelAllowancePercent;
    
    if (travelAllowancePercent !== 1.0) {
      console.log(`\n🎯 SCENARIO 2 - Percentuale personalizzata:`);
      console.log(`   travelAllowancePercent: ${travelAllowancePercent} (${travelAllowancePercent * 100}%)`);
      console.log(`   ${baseTravelAllowance}€ × ${travelAllowancePercent} = ${travelAllowance}€`);
    }
    
    console.log(`\n💰 CALCOLO FINALE:`);
    console.log(`   Importo base: ${travelAllowanceAmount}€`);
    console.log(`   Dopo regola: ${baseTravelAllowance}€`);
    console.log(`   Percentuale: ${travelAllowancePercent} (${travelAllowancePercent * 100}%)`);
    console.log(`   TOTALE: ${travelAllowance}€`);
  } else {
    console.log(`\n❌ INDENNITÀ NON APPLICABILE:`);
    console.log(`   Condizioni non soddisfatte per l'applicazione`);
  }
  
  return { travelAllowance, baseTravelAllowance: travelAllowanceAmount };
}

console.log("\n" + "=" .repeat(70));
console.log("🧪 TEST SCENARI - 12/07/2025 (Sabato)");
console.log("=" .repeat(70));

// SCENARIO 1: Giornata completa, normale
console.log("\n📊 SCENARIO 1: Giornata completa normale");
testTravelAllowanceCalculation(
  {
    date: '2025-07-12',
    workHours: 6,
    travelHours: 3,
    travelAllowancePercent: 1.0
  },
  {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15.00,
      option: 'WITH_TRAVEL',
      applyOnSpecialDays: false
    }
  }
);

// SCENARIO 2: Mezza giornata con HALF_ALLOWANCE_HALF_DAY
console.log("\n📊 SCENARIO 2: Mezza giornata con HALF_ALLOWANCE_HALF_DAY");
testTravelAllowanceCalculation(
  {
    date: '2025-07-12',
    workHours: 3,
    travelHours: 2,
    travelAllowancePercent: 1.0
  },
  {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15.00,
      option: 'HALF_ALLOWANCE_HALF_DAY',
      applyOnSpecialDays: false
    }
  }
);

// SCENARIO 3: Percentuale personalizzata 50%
console.log("\n📊 SCENARIO 3: Percentuale personalizzata 50%");
testTravelAllowanceCalculation(
  {
    date: '2025-07-12',
    workHours: 6,
    travelHours: 3,
    travelAllowancePercent: 0.5  // 50%
  },
  {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15.00,
      option: 'WITH_TRAVEL',
      applyOnSpecialDays: false
    }
  }
);

// SCENARIO 4: Combinazione mezza giornata + percentuale personalizzata
console.log("\n📊 SCENARIO 4: Combinazione mezza giornata + percentuale personalizzata");
testTravelAllowanceCalculation(
  {
    date: '2025-07-12',
    workHours: 3,
    travelHours: 2,
    travelAllowancePercent: 0.5  // 50%
  },
  {
    travelAllowance: {
      enabled: true,
      dailyAmount: 15.00,
      option: 'HALF_ALLOWANCE_HALF_DAY',
      applyOnSpecialDays: false
    }
  }
);

console.log("\n" + "=" .repeat(70));
console.log("🎯 CONCLUSIONI E RACCOMANDAZIONI");
console.log("=" .repeat(70));

console.log("\n✅ CAUSE POSSIBILI PER INDENNITÀ 50%:");
console.log("   1. Regola 'HALF_ALLOWANCE_HALF_DAY' + mezza giornata lavorata");
console.log("   2. Campo 'travelAllowancePercent' impostato a 0.5");
console.log("   3. Combinazione di entrambi i fattori");

console.log("\n📋 VERIFICA RACCOMANDATA:");
console.log("   • Controllare le ore totali lavorate (< 8h = mezza giornata)");
console.log("   • Verificare impostazione 'HALF_ALLOWANCE_HALF_DAY'");
console.log("   • Controllare campo 'travelAllowancePercent' nell'entry");
console.log("   • Verificare se è stato fatto override manuale");

console.log("\n🔧 COMPORTAMENTO CCNL CORRETTO:");
console.log("   • Sabato: Sempre giorno lavorativo normale");
console.log("   • Indennità: 100% se giornata piena");
console.log("   • Maggiorazione: +25% sulle ore lavorate");
console.log("   • 50% solo se esplicitamente configurato per mezza giornata");

console.log("\n⚠️  ATTENZIONE:");
console.log("   Se il 12/07/2025 è una giornata piena (>= 8h totali)");
console.log("   l'indennità al 50% potrebbe essere un ERRORE di configurazione!");
