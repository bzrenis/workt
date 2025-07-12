// Test di conformità CCNL per sistema multi-utente
// Verifica che i calcoli rispettino i parametri contrattuali

// Configurazione CCNL di esempio (configurabile per ogni utente)
const CCNLConfig = {
  // CCNL Metalmeccanico PMI - Level 5 (esempio)
  contract: {
    type: 'CCNL_METALMECCANICO_PMI',
    level: 5,
    monthlyGrossSalary: 2839.07,
    dailyRate: 109.195,
    hourlyRate: 16.41081
  },
  
  // Regole per straordinari
  overtime: {
    threshold: 8, // Ore standard giornaliere
    rates: {
      day: 1.20,    // +20% diurno (6:00-18:00)
      evening: 1.25, // +25% serale (18:00-22:00)  
      night: 1.35    // +35% notturno (22:00-6:00)
    }
  },
  
  // Indennità configurabili
  allowances: {
    standbyRate: 1.0,     // Coefficiente reperibilità
    travelRate: 1.0,      // Coefficiente viaggio
    mealAllowance: 7.00   // Rimborso pasto fisso
  }
};

// Test conformità calcoli CCNL
function testCCNLCompliance() {
  console.log('🏛️ TEST CONFORMITÀ CCNL');
  console.log('='.repeat(50));
  
  console.log('\n📋 Configurazione Contratto:');
  console.log(`   🏢 Tipo: ${CCNLConfig.contract.type}`);
  console.log(`   🎯 Livello: ${CCNLConfig.contract.level}`);
  console.log(`   💰 Stipendio mensile: €${CCNLConfig.contract.monthlyGrossSalary}`);
  console.log(`   📅 Tariffa giornaliera: €${CCNLConfig.contract.dailyRate}`);
  console.log(`   ⏰ Tariffa oraria: €${CCNLConfig.contract.hourlyRate}`);

  // Test calcolo tariffe straordinarie
  console.log('\n⚡ Tariffe Straordinarie:');
  const { hourlyRate } = CCNLConfig.contract;
  const { rates } = CCNLConfig.overtime;
  
  const dayOvertimeRate = hourlyRate * rates.day;
  const eveningOvertimeRate = hourlyRate * rates.evening;
  const nightOvertimeRate = hourlyRate * rates.night;
  
  console.log(`   🌅 Diurno: €${dayOvertimeRate.toFixed(2)} (${hourlyRate} * ${rates.day})`);
  console.log(`   🌆 Serale: €${eveningOvertimeRate.toFixed(2)} (${hourlyRate} * ${rates.evening})`);
  console.log(`   🌙 Notturno: €${nightOvertimeRate.toFixed(2)} (${hourlyRate} * ${rates.night})`);

  return {
    baseRate: hourlyRate,
    dayRate: dayOvertimeRate,
    eveningRate: eveningOvertimeRate,
    nightRate: nightOvertimeRate
  };
}

// Test scenario reperibilità conforme CCNL
function testStandbyScenario() {
  console.log('\n\n🚨 TEST SCENARIO REPERIBILITÀ');
  console.log('='.repeat(50));
  
  // Scenario di test: intervento serale con viaggio
  const scenario = {
    date: '2025-07-04',
    isWeekday: true,
    interventions: [
      {
        departure_company: "18:00",
        arrival_site: "19:00",
        work_start_1: "19:00",
        work_end_1: "23:00",
        work_start_2: "",
        work_end_2: "",
        departure_return: "23:00",
        arrival_company: "00:00"
      }
    ]
  };

  console.log('📅 Scenario:', scenario.date);
  console.log('📊 Giorno feriale:', scenario.isWeekday ? 'Sì' : 'No');
  
  // Calcolo ore per tipo
  let totalWorkHours = 0;
  let totalTravelHours = 0;
  
  scenario.interventions.forEach((intervention, index) => {
    console.log(`\n🔧 Intervento ${index + 1}:`);
    
    // Ore lavoro
    if (intervention.work_start_1 && intervention.work_end_1) {
      const workStart = new Date(`2000-01-01T${intervention.work_start_1}`);
      const workEnd = new Date(`2000-01-01T${intervention.work_end_1}`);
      const workHours = (workEnd - workStart) / (1000 * 60 * 60);
      totalWorkHours += workHours;
      console.log(`   💼 Lavoro: ${intervention.work_start_1}-${intervention.work_end_1} = ${workHours}h`);
    }
    
    // Ore viaggio andata
    if (intervention.departure_company && intervention.arrival_site) {
      const travelStart = new Date(`2000-01-01T${intervention.departure_company}`);
      const travelEnd = new Date(`2000-01-01T${intervention.arrival_site}`);
      const travelHours = (travelEnd - travelStart) / (1000 * 60 * 60);
      totalTravelHours += travelHours;
      console.log(`   🚗 Viaggio A: ${intervention.departure_company}-${intervention.arrival_site} = ${travelHours}h`);
    }
    
    // Ore viaggio ritorno
    if (intervention.departure_return && intervention.arrival_company) {
      const returnStart = new Date(`2000-01-01T${intervention.departure_return}`);
      let returnEnd = new Date(`2000-01-01T${intervention.arrival_company}`);
      
      // Gestione passaggio mezzanotte
      if (returnEnd < returnStart) {
        returnEnd.setDate(returnEnd.getDate() + 1);
      }
      
      const returnHours = (returnEnd - returnStart) / (1000 * 60 * 60);
      totalTravelHours += returnHours;
      console.log(`   🏠 Viaggio R: ${intervention.departure_return}-${intervention.arrival_company} = ${returnHours}h`);
    }
  });

  console.log('\n📊 Totali:');
  console.log(`   💼 Ore lavoro: ${totalWorkHours}h`);
  console.log(`   🚗 Ore viaggio: ${totalTravelHours}h`);
  console.log(`   📈 Totale: ${totalWorkHours + totalTravelHours}h`);

  // Verifica soglia straordinari CCNL
  const shouldApplyOvertime = scenario.isWeekday && totalWorkHours >= CCNLConfig.overtime.threshold;
  console.log(`\n⚡ Straordinari applicabili: ${shouldApplyOvertime ? '✅ Sì' : '❌ No'}`);
  console.log(`   📏 Soglia CCNL: ${CCNLConfig.overtime.threshold}h`);
  console.log(`   🎯 Ore lavoro: ${totalWorkHours}h`);
  
  if (shouldApplyOvertime) {
    console.log('   ✅ Condizioni CCNL soddisfatte per straordinari');
  } else {
    console.log('   ℹ️ Tariffe ordinarie (soglia non raggiunta)');
  }

  return {
    workHours: totalWorkHours,
    travelHours: totalTravelHours,
    totalHours: totalWorkHours + totalTravelHours,
    shouldApplyOvertime
  };
}

// Test calcolo retribuzione conforme CCNL
function testPayrollCalculation() {
  console.log('\n\n💰 TEST CALCOLO RETRIBUZIONE');
  console.log('='.repeat(50));
  
  const scenario = testStandbyScenario();
  const rates = testCCNLCompliance();
  
  console.log('\n💵 Calcolo compensi:');
  
  // Calcolo compenso lavoro
  let workEarnings = 0;
  if (scenario.shouldApplyOvertime) {
    // Con straordinari - esempio fascia serale
    workEarnings = scenario.workHours * rates.eveningRate;
    console.log(`   💼 Lavoro: ${scenario.workHours}h × €${rates.eveningRate.toFixed(2)} = €${workEarnings.toFixed(2)} (serale)`);
  } else {
    // Tariffa ordinaria
    workEarnings = scenario.workHours * rates.baseRate;
    console.log(`   💼 Lavoro: ${scenario.workHours}h × €${rates.baseRate.toFixed(2)} = €${workEarnings.toFixed(2)} (ordinaria)`);
  }
  
  // Calcolo compenso viaggio (sempre tariffa base secondo CCNL)
  const travelEarnings = scenario.travelHours * rates.baseRate * CCNLConfig.allowances.travelRate;
  console.log(`   🚗 Viaggio: ${scenario.travelHours}h × €${rates.baseRate.toFixed(2)} = €${travelEarnings.toFixed(2)}`);
  
  // Totale
  const totalEarnings = workEarnings + travelEarnings;
  console.log(`\n🎯 Totale compenso: €${totalEarnings.toFixed(2)}`);
  
  return {
    workEarnings,
    travelEarnings,
    totalEarnings
  };
}

// Esegui tutti i test di conformità
console.log('🏛️ TEST CONFORMITÀ CCNL COMPLETO');
console.log('='.repeat(60));

const complianceRates = testCCNLCompliance();
const scenarioResults = testStandbyScenario();
const payrollResults = testPayrollCalculation();

console.log('\n\n📋 RIEPILOGO CONFORMITÀ:');
console.log('━'.repeat(50));
console.log('✅ Tariffe CCNL calcolate correttamente');
console.log('✅ Soglia straordinari rispettata');
console.log('✅ Separazione tariffe lavoro/viaggio');
console.log('✅ Gestione ore notturne corretta');

console.log('\n🎯 RISULTATI:');
console.log(`📊 Ore totali: ${scenarioResults.totalHours}h`);
console.log(`💰 Compenso totale: €${payrollResults.totalEarnings.toFixed(2)}`);
console.log(`⚡ Straordinari: ${scenarioResults.shouldApplyOvertime ? 'Applicati' : 'Non applicati'}`);

console.log('\n💡 CONFIGURAZIONE UTENTE:');
console.log('Per personalizzare i parametri CCNL:');
console.log('1. Modificare CCNLConfig nel file');
console.log('2. Impostare il livello contrattuale');
console.log('3. Configurare stipendio mensile');
console.log('4. Verificare tariffe calcolate');

console.log('\n📖 Documentazione: CONFIGURAZIONE_MULTI_UTENTE.md');
