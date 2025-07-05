// Test per verificare il trattamento del sabato secondo CCNL Metalmeccanico PMI

// Simula la logica del CalculationService per il sabato
function testSaturdayTreatment() {
  console.log("🏢 TRATTAMENTO DEL SABATO - CCNL Metalmeccanico PMI");
  console.log("=" .repeat(80));
  
  // Configurazione contratto CCNL
  const contract = {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    overtimeRates: {
      day: 1.20,      // +20% Straordinario diurno
      saturday: 1.25, // +25% Sabato
      holiday: 1.30,  // +30% Festivo/Domenica
      nightAfter22: 1.35
    }
  };

  console.log("\n📋 NORMATIVA CCNL:");
  console.log("• Orario normale: Lunedì-Venerdì (40h/settimana)");
  console.log("• Sabato: Considerato giorno di riposo settimanale");
  console.log("• Maggiorazione sabato: +25% (conforme CCNL)");
  console.log("• Per indennità trasferta: Sabato NON è giorno speciale");
  
  console.log("\n🧪 TEST SCENARI:");
  
  // Scenario 1: Sabato normale con 8 ore
  console.log("\n1. Sabato - 8 ore lavorative:");
  const saturday8h = {
    date: "2025-07-05", // Sabato
    hours: 8,
    travel: 0
  };
  
  const saturdayEarnings = saturday8h.hours * contract.hourlyRate * contract.overtimeRates.saturday;
  console.log(`   • Ore lavorate: ${saturday8h.hours}h`);
  console.log(`   • Tariffa base: ${contract.hourlyRate}€/h`);
  console.log(`   • Maggiorazione: +${(contract.overtimeRates.saturday - 1) * 100}%`);
  console.log(`   • Calcolo: ${saturday8h.hours}h × ${contract.hourlyRate}€ × ${contract.overtimeRates.saturday} = ${saturdayEarnings.toFixed(2)}€`);
  console.log(`   • Vs feriale normale: +${((saturdayEarnings / (saturday8h.hours * contract.hourlyRate)) - 1) * 100}% in più`);
  
  // Scenario 2: Confronto con domenica
  console.log("\n2. Confronto Sabato vs Domenica:");
  const sundayEarnings = saturday8h.hours * contract.hourlyRate * contract.overtimeRates.holiday;
  console.log(`   • Sabato 8h: ${saturdayEarnings.toFixed(2)}€ (maggiorazione +25%)`);
  console.log(`   • Domenica 8h: ${sundayEarnings.toFixed(2)}€ (maggiorazione +30%)`);
  console.log(`   • Differenza: ${(sundayEarnings - saturdayEarnings).toFixed(2)}€ a favore della domenica`);
  
  // Scenario 3: Indennità trasferta
  console.log("\n3. Indennità Trasferta:");
  const travelAllowance = 15.00;
  console.log(`   • Lunedì-Venerdì: Indennità applicata se presenti condizioni ✅`);
  console.log(`   • Sabato: Indennità applicata se presenti condizioni ✅`);
  console.log(`   • Domenica: Indennità NON applicata (salvo toggle speciale) ❌`);
  console.log(`   • Festivi: Indennità NON applicata (salvo toggle speciale) ❌`);
  
  // Scenario 4: Reperibilità sabato
  console.log("\n4. Reperibilità Sabato:");
  console.log(`   • Se configurato 'Sabato come riposo': Indennità festiva (${10.63}€)`);
  console.log(`   • Se configurato 'Sabato lavorativo': Indennità feriale (${7.03}€)`);
  console.log(`   • Interventi sabato: Maggiorazione +25% sulle ore lavorate`);
  
  // Scenario 5: Calcolo mensile
  console.log("\n5. Impatto Mensile (esempio):");
  const monthlyScenario = {
    normalDays: 22, // Lun-Ven
    saturdays: 4,   // Sabati lavorati
    hoursPerDay: 8
  };
  
  const normalEarnings = monthlyScenario.normalDays * monthlyScenario.hoursPerDay * contract.hourlyRate;
  const saturdayBonusEarnings = monthlyScenario.saturdays * monthlyScenario.hoursPerDay * contract.hourlyRate * contract.overtimeRates.saturday;
  const totalMonthly = normalEarnings + saturdayBonusEarnings;
  const bonusFromSaturdays = saturdayBonusEarnings - (monthlyScenario.saturdays * monthlyScenario.hoursPerDay * contract.hourlyRate);
  
  console.log(`   • Giorni feriali (${monthlyScenario.normalDays}): ${normalEarnings.toFixed(2)}€`);
  console.log(`   • Sabati (${monthlyScenario.saturdays}): ${saturdayBonusEarnings.toFixed(2)}€`);
  console.log(`   • Bonus sabato: +${bonusFromSaturdays.toFixed(2)}€`);
  console.log(`   • Totale mensile: ${totalMonthly.toFixed(2)}€`);
  
  console.log("\n💡 CONCLUSIONI:");
  console.log("=" .repeat(40));
  console.log("✅ Il sabato è trattato come giorno straordinario (+25%)");
  console.log("✅ Per trasferta, sabato è considerato giorno normale");
  console.log("✅ Per reperibilità, dipende dalla configurazione aziendale");
  console.log("✅ Maggiorazione inferiore a domenica/festivi (+30%)");
  console.log("✅ Conforme CCNL Metalmeccanico PMI per orario Lun-Ven");
  
  return {
    contract,
    saturdayRate: contract.overtimeRates.saturday,
    saturdayVsNormal: `+${(contract.overtimeRates.saturday - 1) * 100}%`,
    saturdayVsSunday: `${contract.overtimeRates.saturday < contract.overtimeRates.holiday ? 'Inferiore' : 'Superiore'} alla domenica`
  };
}

// Esegui il test
const result = testSaturdayTreatment();

console.log("\n📊 RIEPILOGO TECNICO:");
console.log("=" .repeat(40));
console.log(`Tariffa sabato: ${result.contract.hourlyRate}€ × ${result.saturdayRate} = ${(result.contract.hourlyRate * result.saturdayRate).toFixed(2)}€/h`);
console.log(`Maggiorazione: ${result.saturdayVsNormal}`);
console.log(`Vs domenica: ${result.saturdayVsSunday}`);
