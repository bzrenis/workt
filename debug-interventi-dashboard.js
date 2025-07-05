/**
 * 🐞 DEBUG INTERVENTI DASHBOARD
 * 
 * Test per verificare il flusso completo degli interventi di reperibilità
 * dalla creazione dell'entry al calcolo nella dashboard
 */

const CalculationService = require('./src/services/CalculationService');
const { createWorkEntryFromData } = require('./src/utils/earningsHelper');

// Simula le impostazioni come nella dashboard
const mockSettings = {
  contract: {
    hourlyRate: 16.41,
    dailyRate: 109.19,
    overtimeRates: {
      day: 1.2,
      nightUntil22: 1.25,
      nightAfter22: 1.35,
      holiday: 1.3,
      saturday: 1.25
    }
  },
  standbySettings: {
    enabled: true,
    allowanceType: '24h',
    customFeriale24: 7.03,
    customFestivo: 10.63,
    saturdayAsRest: false,
    standbyDays: {
      '2025-07-05': { selected: true }
    }
  },
  travelCompensationRate: 1.0
};

// Simula un entry con interventi di reperibilità
const mockEntry = {
  id: 1,
  date: '2025-07-05',
  workStart1: '08:00',
  workEnd1: '17:00',
  workStart2: null,
  workEnd2: null,
  departureCompany: null,
  arrivalSite: null,
  departureReturn: null,
  arrivalCompany: null,
  isStandbyDay: true,
  standbyAllowance: true,
  interventi: [
    {
      work_start_1: '20:00',
      work_end_1: '22:00',
      work_start_2: null,
      work_end_2: null,
      departure_company: '19:30',
      arrival_site: '19:45',
      departure_return: '22:15',
      arrival_company: '22:30'
    }
  ],
  travelAllowance: false,
  mealLunchVoucher: 0,
  mealLunchCash: 0,
  mealDinnerVoucher: 0,
  mealDinnerCash: 0,
  completamentoGiornata: 'nessuno'
};

console.log('🔍 DEBUG INTERVENTI DASHBOARD\n');
console.log(`📅 Data di test: ${mockEntry.date}`);
console.log(`🕐 Lavoro ordinario: ${mockEntry.workStart1} - ${mockEntry.workEnd1}`);
console.log(`🚨 Reperibilità attiva: ${mockEntry.isStandbyDay}`);
console.log(`🔧 Interventi:`, JSON.stringify(mockEntry.interventi, null, 2));

// Test 1: Crea WorkEntry dal raw data (come fa earningsHelper)
console.log('\n📊 TEST 1: Creazione WorkEntry');
console.log('━'.repeat(50));

const workEntry = createWorkEntryFromData(mockEntry);
console.log('WorkEntry creato:', {
  date: workEntry.date,
  isStandbyDay: workEntry.isStandbyDay,
  standbyAllowance: workEntry.standbyAllowance,
  interventiCount: workEntry.interventi ? workEntry.interventi.length : 0,
  interventiStructure: workEntry.interventi
});

// Test 2: Calcola il breakdown come fa la dashboard
console.log('\n📊 TEST 2: Calcolo Breakdown Dashboard');
console.log('━'.repeat(50));

const calculationService = new CalculationService();
const breakdown = calculationService.calculateEarningsBreakdown(workEntry, mockSettings);

if (!breakdown) {
  console.log('❌ ERRORE: Breakdown non calcolato!');
  process.exit(1);
}

console.log('Breakdown calcolato:');
console.log(`- Totale guadagno: €${breakdown.totalEarnings.toFixed(2)}`);
console.log(`- Ordinario: €${breakdown.ordinary.total.toFixed(2)}`);
console.log(`- Reperibilità: €${breakdown.standby ? breakdown.standby.totalEarnings.toFixed(2) : '0.00'}`);
console.log(`- Indennità trasferta: €${breakdown.allowances.travel.toFixed(2)}`);
console.log(`- Indennità reperibilità: €${breakdown.allowances.standby.toFixed(2)}`);

// Test 3: Dettaglio reperibilità
console.log('\n📊 TEST 3: Dettaglio Reperibilità');
console.log('━'.repeat(50));

if (breakdown.standby) {
  console.log('Ore lavoro reperibilità:');
  Object.entries(breakdown.standby.workHours).forEach(([key, hours]) => {
    if (hours > 0) {
      console.log(`  - ${key}: ${hours.toFixed(2)}h`);
    }
  });
  
  console.log('\nOre viaggio reperibilità:');
  Object.entries(breakdown.standby.travelHours).forEach(([key, hours]) => {
    if (hours > 0) {
      console.log(`  - ${key}: ${hours.toFixed(2)}h`);
    }
  });
  
  console.log('\nGuadagni lavoro reperibilità:');
  Object.entries(breakdown.standby.workEarnings).forEach(([key, earnings]) => {
    if (earnings > 0) {
      console.log(`  - ${key}: €${earnings.toFixed(2)}`);
    }
  });
  
  console.log('\nGuadagni viaggio reperibilità:');
  Object.entries(breakdown.standby.travelEarnings).forEach(([key, earnings]) => {
    if (earnings > 0) {
      console.log(`  - ${key}: €${earnings.toFixed(2)}`);
    }
  });
  
  console.log(`\nIndennità giornaliera: €${breakdown.standby.dailyIndemnity.toFixed(2)}`);
  console.log(`Totale reperibilità: €${breakdown.standby.totalEarnings.toFixed(2)}`);
} else {
  console.log('❌ PROBLEMA: Nessun breakdown di reperibilità calcolato!');
}

// Test 4: Verifica aggregazione come nella dashboard
console.log('\n📊 TEST 4: Simulazione Aggregazione Dashboard');
console.log('━'.repeat(50));

// Simula l'aggregazione della dashboard per più entries
const entries = [mockEntry];
let aggregated = {
  totalEarnings: 0,
  standby: {
    totalEarnings: 0,
    workHours: {
      ordinary: 0,
      night: 0,
      holiday: 0,
      saturday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    travelHours: {
      ordinary: 0,
      night: 0,
      holiday: 0,
      saturday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    workEarnings: {
      ordinary: 0,
      night: 0,
      holiday: 0,
      saturday: 0,
      saturday_night: 0,
      night_holiday: 0
    },
    travelEarnings: {
      ordinary: 0,
      night: 0,
      holiday: 0,
      saturday: 0,
      saturday_night: 0,
      night_holiday: 0
    }
  },
  allowances: {
    standby: 0
  },
  analytics: {
    standbyInterventions: 0
  }
};

for (const entry of entries) {
  const workEntry = createWorkEntryFromData(entry);
  const breakdown = calculationService.calculateEarningsBreakdown(workEntry, mockSettings);
  
  if (!breakdown) continue;
  
  // Aggrega totale
  aggregated.totalEarnings += breakdown.totalEarnings || 0;
  
  // Conta interventi reperibilità
  if (entry.interventi && Array.isArray(entry.interventi) && entry.interventi.length > 0) {
    aggregated.analytics.standbyInterventions += entry.interventi.length;
  }
  
  // Aggrega reperibilità
  if (breakdown.standby) {
    aggregated.standby.totalEarnings += breakdown.standby.totalEarnings || 0;
    
    // Ore lavoro reperibilità
    if (breakdown.standby.workHours) {
      Object.keys(breakdown.standby.workHours).forEach(key => {
        if (aggregated.standby.workHours[key] !== undefined) {
          aggregated.standby.workHours[key] += breakdown.standby.workHours[key] || 0;
        }
      });
    }
    
    // Ore viaggio reperibilità
    if (breakdown.standby.travelHours) {
      Object.keys(breakdown.standby.travelHours).forEach(key => {
        if (aggregated.standby.travelHours[key] !== undefined) {
          aggregated.standby.travelHours[key] += breakdown.standby.travelHours[key] || 0;
        }
      });
    }
    
    // Guadagni lavoro reperibilità
    if (breakdown.standby.workEarnings) {
      Object.keys(breakdown.standby.workEarnings).forEach(key => {
        if (aggregated.standby.workEarnings[key] !== undefined) {
          aggregated.standby.workEarnings[key] += breakdown.standby.workEarnings[key] || 0;
        }
      });
    }
    
    // Guadagni viaggio reperibilità
    if (breakdown.standby.travelEarnings) {
      Object.keys(breakdown.standby.travelEarnings).forEach(key => {
        if (aggregated.standby.travelEarnings[key] !== undefined) {
          aggregated.standby.travelEarnings[key] += breakdown.standby.travelEarnings[key] || 0;
        }
      });
    }
  }
  
  // Aggrega indennità
  if (breakdown.allowances) {
    aggregated.allowances.standby += breakdown.allowances.standby || 0;
  }
}

console.log('Aggregazione finale:');
console.log(`- Totale guadagno: €${aggregated.totalEarnings.toFixed(2)}`);
console.log(`- Totale reperibilità: €${aggregated.standby.totalEarnings.toFixed(2)}`);
console.log(`- Indennità reperibilità: €${aggregated.allowances.standby.toFixed(2)}`);
console.log(`- Numero interventi: ${aggregated.analytics.standbyInterventions}`);

// Test 5: Verifica hasStandbyData come nella dashboard
console.log('\n📊 TEST 5: Verifica hasStandbyData');
console.log('━'.repeat(50));

const hasStandbyData = aggregated.standby.totalEarnings > 0 ||
  Object.values(aggregated.standby.workHours).some(h => h > 0) ||
  Object.values(aggregated.standby.travelHours).some(h => h > 0);

console.log(`hasStandbyData: ${hasStandbyData}`);

if (!hasStandbyData) {
  console.log('❌ PROBLEMA: La dashboard non mostrerà la sezione interventi!');
  console.log('🔧 Possibili cause:');
  console.log('   - Gli interventi non vengono calcolati correttamente');
  console.log('   - Il breakdown di reperibilità è vuoto');
  console.log('   - Gli earnings degli interventi sono zero');
} else {
  console.log('✅ La dashboard dovrebbe mostrare la sezione interventi');
}

console.log('\n\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));
if (aggregated.standby.totalEarnings > 0 && aggregated.analytics.standbyInterventions > 0) {
  console.log('✅ Gli interventi di reperibilità sembrano essere calcolati correttamente');
  console.log('📊 Se la dashboard non li mostra, il problema è nell\'interfaccia utente');
} else {
  console.log('❌ Problema nel calcolo degli interventi identificato:');
  if (aggregated.analytics.standbyInterventions === 0) {
    console.log('   - Gli interventi non vengono contati');
  }
  if (aggregated.standby.totalEarnings === 0) {
    console.log('   - Gli earnings degli interventi sono zero');
  }
}
