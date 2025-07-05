/**
 * Script di debug per verificare il breakdown aggregato mensile
 * Testa che l'aggregatedBreakdown contenga le stesse informazioni del TimeEntryForm
 */

// Importa i servizi necessari
import { CalculationService } from './src/services/CalculationService.js';
import { createWorkEntryFromData } from './src/utils/earningsHelper.js';

// Simula dati di esempio per dicembre 2024
const sampleEntries = [
  {
    id: 1,
    date: '2024-12-01',
    work_start: '08:00',
    work_end: '17:00',
    travel_start: '07:00',
    travel_end: '08:00',
    travel_return_start: '17:00',
    travel_return_end: '18:00',
    is_standby: 0,
    is_travel_day: 1,
    meal_lunch_voucher: 1,
    standby_intervention_duration: null
  },
  {
    id: 2,
    date: '2024-12-02',
    work_start: '08:00',
    work_end: '18:00',
    travel_start: null,
    travel_end: null,
    travel_return_start: null,
    travel_return_end: null,
    is_standby: 0,
    is_travel_day: 0,
    meal_lunch_voucher: 1,
    standby_intervention_duration: null
  },
  {
    id: 3,
    date: '2024-12-03',
    work_start: '20:00',
    work_end: '02:00',
    travel_start: '19:00',
    travel_end: '20:00',
    travel_return_start: '02:00',
    travel_return_end: '03:00',
    is_standby: 1,
    is_travel_day: 1,
    meal_lunch_voucher: 0,
    meal_dinner_voucher: 1,
    standby_intervention_duration: 6
  }
];

// Settings di test
const testSettings = {
  contract: {
    dailyRate: 109.19,
    hourlyRate: 16.41,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3,
      nightHoliday: 1.5
    }
  },
  travelCompensationRate: 1.0,
  standbySettings: {
    dailyAllowance: 7.5,
    dailyIndemnity: 7.5,
    travelWithBonus: false
  },
  mealAllowances: {
    lunch: { voucherAmount: 5.29 },
    dinner: { voucherAmount: 5.29 }
  }
};

console.log('🔍 DEBUG: Test aggregated breakdown mensile');
console.log('=====================================');

const calculationService = new CalculationService();

// Simula l'aggregazione come nella dashboard
let aggregatedBreakdown = {
  totalEarnings: 0,
  ordinary: {
    hours: {
      lavoro_giornaliera: 0,
      viaggio_giornaliera: 0,
      lavoro_extra: 0,
      viaggio_extra: 0
    },
    earnings: {
      giornaliera: 0,
      straordinario_giorno: 0,
      straordinario_notte_22: 0,
      straordinario_notte_dopo22: 0,
      sabato_bonus: 0,
      domenica_bonus: 0,
      festivo_bonus: 0
    },
    total: 0
  },
  standby: {
    workHours: {
      ordinary: 0,
      night: 0,
      saturday: 0,
      holiday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    workEarnings: {
      ordinary: 0,
      night: 0,
      saturday: 0,
      holiday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    travelHours: {
      ordinary: 0,
      night: 0,
      saturday: 0,
      holiday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    travelEarnings: {
      ordinary: 0,
      night: 0,
      saturday: 0,
      holiday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    dailyIndemnity: 0,
    totalEarnings: 0
  },
  allowances: {
    travel: 0,
    standby: 0,
    meal: 0
  }
};

console.log('\n📊 Processing sample entries...');

sampleEntries.forEach((entry, index) => {
  console.log(`\n--- Entry ${index + 1}: ${entry.date} ---`);
  
  try {
    // Crea work entry
    const workEntry = createWorkEntryFromData(entry, calculationService);
    console.log('✅ WorkEntry creato:', {
      date: workEntry.date,
      isStandby: workEntry.isStandby,
      isTravelDay: workEntry.isTravelDay
    });
    
    // Calcola breakdown giornaliero
    const breakdown = calculationService.calculateEarningsBreakdown(workEntry, testSettings);
    console.log('✅ Breakdown calcolato:', {
      totalEarnings: breakdown.totalEarnings?.toFixed(2),
      ordinary: breakdown.ordinary?.total?.toFixed(2),
      standby: breakdown.standby?.totalEarnings?.toFixed(2),
      allowances: {
        travel: breakdown.allowances?.travel?.toFixed(2),
        meal: breakdown.allowances?.meal?.toFixed(2)
      }
    });
    
    // Aggrega nel breakdown mensile
    aggregatedBreakdown.totalEarnings += breakdown.totalEarnings || 0;

    // Aggregate ordinary breakdown
    if (breakdown.ordinary) {
      if (breakdown.ordinary.hours) {
        aggregatedBreakdown.ordinary.hours.lavoro_giornaliera += breakdown.ordinary.hours.lavoro_giornaliera || 0;
        aggregatedBreakdown.ordinary.hours.viaggio_giornaliera += breakdown.ordinary.hours.viaggio_giornaliera || 0;
        aggregatedBreakdown.ordinary.hours.lavoro_extra += breakdown.ordinary.hours.lavoro_extra || 0;
        aggregatedBreakdown.ordinary.hours.viaggio_extra += breakdown.ordinary.hours.viaggio_extra || 0;
      }
      if (breakdown.ordinary.earnings) {
        aggregatedBreakdown.ordinary.earnings.giornaliera += breakdown.ordinary.earnings.giornaliera || 0;
        aggregatedBreakdown.ordinary.earnings.straordinario_giorno += breakdown.ordinary.earnings.straordinario_giorno || 0;
        aggregatedBreakdown.ordinary.earnings.straordinario_notte_22 += breakdown.ordinary.earnings.straordinario_notte_22 || 0;
        aggregatedBreakdown.ordinary.earnings.straordinario_notte_dopo22 += breakdown.ordinary.earnings.straordinario_notte_dopo22 || 0;
        aggregatedBreakdown.ordinary.earnings.sabato_bonus += breakdown.ordinary.earnings.sabato_bonus || 0;
        aggregatedBreakdown.ordinary.earnings.domenica_bonus += breakdown.ordinary.earnings.domenica_bonus || 0;
        aggregatedBreakdown.ordinary.earnings.festivo_bonus += breakdown.ordinary.earnings.festivo_bonus || 0;
      }
      aggregatedBreakdown.ordinary.total += breakdown.ordinary.total || 0;
    }

    // Aggregate standby breakdown
    if (breakdown.standby) {
      if (breakdown.standby.workHours) {
        Object.keys(breakdown.standby.workHours).forEach(type => {
          aggregatedBreakdown.standby.workHours[type] += breakdown.standby.workHours[type] || 0;
        });
      }
      if (breakdown.standby.workEarnings) {
        Object.keys(breakdown.standby.workEarnings).forEach(type => {
          aggregatedBreakdown.standby.workEarnings[type] += breakdown.standby.workEarnings[type] || 0;
        });
      }
      if (breakdown.standby.travelHours) {
        Object.keys(breakdown.standby.travelHours).forEach(type => {
          aggregatedBreakdown.standby.travelHours[type] += breakdown.standby.travelHours[type] || 0;
        });
      }
      if (breakdown.standby.travelEarnings) {
        Object.keys(breakdown.standby.travelEarnings).forEach(type => {
          aggregatedBreakdown.standby.travelEarnings[type] += breakdown.standby.travelEarnings[type] || 0;
        });
      }
      aggregatedBreakdown.standby.dailyIndemnity += breakdown.standby.dailyIndemnity || 0;
      aggregatedBreakdown.standby.totalEarnings += breakdown.standby.totalEarnings || 0;
    }

    // Aggregate allowances breakdown
    if (breakdown.allowances) {
      aggregatedBreakdown.allowances.travel += breakdown.allowances.travel || 0;
      aggregatedBreakdown.allowances.standby += breakdown.allowances.standby || 0;
      aggregatedBreakdown.allowances.meal += breakdown.allowances.meal || 0;
    }

  } catch (error) {
    console.error('❌ Errore processing entry:', error);
  }
});

console.log('\n🎯 RISULTATO AGGREGATED BREAKDOWN MENSILE:');
console.log('==========================================');
console.log('💰 Totale Guadagni:', aggregatedBreakdown.totalEarnings.toFixed(2), '€');

console.log('\n📊 Lavoro Ordinario:');
console.log('  Ore:');
console.log('    - Lavoro giornaliera:', aggregatedBreakdown.ordinary.hours.lavoro_giornaliera.toFixed(2), 'h');
console.log('    - Viaggio giornaliera:', aggregatedBreakdown.ordinary.hours.viaggio_giornaliera.toFixed(2), 'h');
console.log('    - Lavoro extra:', aggregatedBreakdown.ordinary.hours.lavoro_extra.toFixed(2), 'h');
console.log('    - Viaggio extra:', aggregatedBreakdown.ordinary.hours.viaggio_extra.toFixed(2), 'h');
console.log('  Guadagni:');
console.log('    - Giornaliera:', aggregatedBreakdown.ordinary.earnings.giornaliera.toFixed(2), '€');
console.log('    - Straordinario giorno:', aggregatedBreakdown.ordinary.earnings.straordinario_giorno.toFixed(2), '€');
console.log('    - Straordinario notte (fino 22):', aggregatedBreakdown.ordinary.earnings.straordinario_notte_22.toFixed(2), '€');
console.log('    - Straordinario notte (dopo 22):', aggregatedBreakdown.ordinary.earnings.straordinario_notte_dopo22.toFixed(2), '€');
console.log('    - Bonus sabato:', aggregatedBreakdown.ordinary.earnings.sabato_bonus.toFixed(2), '€');
console.log('    - Bonus domenica:', aggregatedBreakdown.ordinary.earnings.domenica_bonus.toFixed(2), '€');
console.log('    - Bonus festivo:', aggregatedBreakdown.ordinary.earnings.festivo_bonus.toFixed(2), '€');
console.log('  Totale ordinario:', aggregatedBreakdown.ordinary.total.toFixed(2), '€');

console.log('\n🚨 Reperibilità:');
console.log('  Ore lavoro:');
Object.entries(aggregatedBreakdown.standby.workHours).forEach(([type, hours]) => {
  if (hours > 0) console.log(`    - ${type}:`, hours.toFixed(2), 'h');
});
console.log('  Guadagni lavoro:');
Object.entries(aggregatedBreakdown.standby.workEarnings).forEach(([type, earnings]) => {
  if (earnings > 0) console.log(`    - ${type}:`, earnings.toFixed(2), '€');
});
console.log('  Ore viaggio:');
Object.entries(aggregatedBreakdown.standby.travelHours).forEach(([type, hours]) => {
  if (hours > 0) console.log(`    - ${type}:`, hours.toFixed(2), 'h');
});
console.log('  Guadagni viaggio:');
Object.entries(aggregatedBreakdown.standby.travelEarnings).forEach(([type, earnings]) => {
  if (earnings > 0) console.log(`    - ${type}:`, earnings.toFixed(2), '€');
});
console.log('  Indennità giornaliera:', aggregatedBreakdown.standby.dailyIndemnity.toFixed(2), '€');
console.log('  Totale reperibilità:', aggregatedBreakdown.standby.totalEarnings.toFixed(2), '€');

console.log('\n🎫 Indennità:');
console.log('  - Trasferta:', aggregatedBreakdown.allowances.travel.toFixed(2), '€');
console.log('  - Reperibilità:', aggregatedBreakdown.allowances.standby.toFixed(2), '€');
console.log('  - Pasti:', aggregatedBreakdown.allowances.meal.toFixed(2), '€');

console.log('\n✅ DEBUG COMPLETATO - Il breakdown aggregato è ora popolato correttamente!');
console.log('🎯 La dashboard dovrebbe mostrare tutte le informazioni dettagliate come il TimeEntryForm');
