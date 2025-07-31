// Debug specifico per il problema dei breakdown dettagliati
const { CalculationService } = require('./CalculationService');
const earningsHelper = require('./src/utils/earningsHelper');

// Mock delle impostazioni base
const mockSettings = {
  contract: {
    hourlyRate: 16.15,
    dailyRate: 107.69,
    monthlyGrossSalary: 2800.00,
    normalHours: 40,
    dailyHours: 8,
    saturdayBonus: 0.2,
    nightBonus: 0.25,
    nightBonus2: 0.35,
    overtimeBonus: 0.2,
    overtimeLimit: {
      hours: 8,
      type: 'daily'
    }
  },
  travelAllowance: { enabled: true },
  travelCompensationRate: 1.0,
  mealAllowances: {
    lunchVoucher: { amount: 8.50, enabled: true },
    dinnerVoucher: { amount: 8.50, enabled: true },
    lunchCash: { amount: 12.00, enabled: true },
    dinnerCash: { amount: 18.00, enabled: true }
  },
  travelHoursSetting: 'total'
};

// Dati di test per le giornate problematiche
const testEntries = [
  // 25 luglio - giornata con supplementi serali e notturni + straordinari notturni al 50%
  {
    id: 1,
    date: "2025-07-25",
    site_name: "Test Site",
    vehicle_driven: "andata_ritorno",
    departure_company: "06:00",
    arrival_site: "07:00",
    work_start_1: "07:00",
    work_end_1: "12:00",
    work_start_2: "13:00",
    work_end_2: "23:30", // Fino alle 23:30 per avere notturno
    departure_return: "23:30",
    arrival_company: "00:30",
    meal_lunch_voucher: 1,
    meal_dinner_voucher: 1,
    travel_allowance: 1,
    day_type: "lavorativa",
    travel_allowance_percent: 1,
    interventi: "[]",
    viaggi: "[]",
    is_standby_day: 0,
    standby_allowance: 0,
    completamento_giornata: "nessuno",
    is_fixed_day: 0,
    fixed_earnings: 0
  }
];

console.log('🎯 DEBUG BREAKDOWN PROBLEM - Inizio test\n');

testEntries.forEach(entry => {
  console.log(`\n=== ANALISI GIORNATA ${entry.date} ===`);
  
  const workEntry = earningsHelper.transformDatabaseEntry(entry);
  console.log('WorkEntry trasformato:', JSON.stringify(workEntry, null, 2));
  
  const dayBreakdown = CalculationService.calculateDayBreakdown(workEntry, mockSettings);
  
  console.log('\n📊 BREAKDOWN DETTAGLIATO:');
  if (dayBreakdown.breakdown) {
    Object.entries(dayBreakdown.breakdown).forEach(([key, item]) => {
      console.log(`  ${key}: ${item.hours}h @ ${item.percentage || ''}% = €${item.amount.toFixed(2)} (${item.description})`);
    });
  } else {
    console.log('  NESSUN BREAKDOWN TROVATO!');
  }
  
  console.log('\n⭐ SUPPLEMENTI:');
  if (dayBreakdown.supplements) {
    Object.entries(dayBreakdown.supplements).forEach(([key, supplement]) => {
      console.log(`  ${key}: ${supplement.hours}h @ ${supplement.percentage || ''}% = €${supplement.amount.toFixed(2)} (${supplement.description})`);
    });
  } else {
    console.log('  NESSUN SUPPLEMENTO TROVATO!');
  }
  
  console.log(`\n💰 TOTALI:`);
  console.log(`  Ore totali: ${dayBreakdown.totalHours}`);
  console.log(`  Ore ordinarie: ${dayBreakdown.ordinaryHours}`);
  console.log(`  Ore straordinari: ${dayBreakdown.overtimeHours}`);
  console.log(`  Guadagni totali: €${dayBreakdown.totalEarnings.toFixed(2)}`);
});

console.log('\n🎯 DEBUG BREAKDOWN PROBLEM - Fine test');
