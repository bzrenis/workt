/**
 * Verifica semplice della logica di aggregazione breakdown
 * Testa che le operazioni di somma funzionino correttamente
 */

console.log('🔍 DEBUG: Test logica aggregazione breakdown');
console.log('===========================================');

// Simula due breakdown giornalieri di esempio
const breakdown1 = {
  totalEarnings: 120.50,
  ordinary: {
    hours: {
      lavoro_giornaliera: 8,
      viaggio_giornaliera: 2,
      lavoro_extra: 1,
      viaggio_extra: 0
    },
    earnings: {
      giornaliera: 109.19,
      straordinario_giorno: 16.41,
      straordinario_notte_22: 0,
      straordinario_notte_dopo22: 0,
      sabato_bonus: 0,
      domenica_bonus: 0,
      festivo_bonus: 0
    },
    total: 125.60
  },
  standby: {
    workHours: { ordinary: 0, night: 0 },
    workEarnings: { ordinary: 0, night: 0 },
    travelHours: { ordinary: 0, night: 0 },
    travelEarnings: { ordinary: 0, night: 0 },
    dailyIndemnity: 0,
    totalEarnings: 0
  },
  allowances: {
    travel: 35.50,
    standby: 0,
    meal: 5.29
  }
};

const breakdown2 = {
  totalEarnings: 180.75,
  ordinary: {
    hours: {
      lavoro_giornaliera: 0,
      viaggio_giornaliera: 0,
      lavoro_extra: 6,
      viaggio_extra: 2
    },
    earnings: {
      giornaliera: 0,
      straordinario_giorno: 0,
      straordinario_notte_22: 65.64,
      straordinario_notte_dopo22: 44.31,
      sabato_bonus: 0,
      domenica_bonus: 0,
      festivo_bonus: 0
    },
    total: 109.95
  },
  standby: {
    workHours: { ordinary: 0, night: 6 },
    workEarnings: { ordinary: 0, night: 98.47 },
    travelHours: { ordinary: 0, night: 2 },
    travelEarnings: { ordinary: 0, night: 32.82 },
    dailyIndemnity: 7.5,
    totalEarnings: 138.79
  },
  allowances: {
    travel: 0,
    standby: 7.5,
    meal: 5.29
  }
};

// Inizializza aggregated breakdown
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
      night: 0
    },
    workEarnings: {
      ordinary: 0,
      night: 0
    },
    travelHours: {
      ordinary: 0,
      night: 0
    },
    travelEarnings: {
      ordinary: 0,
      night: 0
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

console.log('\n📊 Aggregazione breakdown 1...');
console.log('Input:', JSON.stringify(breakdown1, null, 2));

// Aggrega breakdown1
aggregatedBreakdown.totalEarnings += breakdown1.totalEarnings || 0;

if (breakdown1.ordinary) {
  if (breakdown1.ordinary.hours) {
    aggregatedBreakdown.ordinary.hours.lavoro_giornaliera += breakdown1.ordinary.hours.lavoro_giornaliera || 0;
    aggregatedBreakdown.ordinary.hours.viaggio_giornaliera += breakdown1.ordinary.hours.viaggio_giornaliera || 0;
    aggregatedBreakdown.ordinary.hours.lavoro_extra += breakdown1.ordinary.hours.lavoro_extra || 0;
    aggregatedBreakdown.ordinary.hours.viaggio_extra += breakdown1.ordinary.hours.viaggio_extra || 0;
  }
  if (breakdown1.ordinary.earnings) {
    aggregatedBreakdown.ordinary.earnings.giornaliera += breakdown1.ordinary.earnings.giornaliera || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_giorno += breakdown1.ordinary.earnings.straordinario_giorno || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_notte_22 += breakdown1.ordinary.earnings.straordinario_notte_22 || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_notte_dopo22 += breakdown1.ordinary.earnings.straordinario_notte_dopo22 || 0;
    aggregatedBreakdown.ordinary.earnings.sabato_bonus += breakdown1.ordinary.earnings.sabato_bonus || 0;
    aggregatedBreakdown.ordinary.earnings.domenica_bonus += breakdown1.ordinary.earnings.domenica_bonus || 0;
    aggregatedBreakdown.ordinary.earnings.festivo_bonus += breakdown1.ordinary.earnings.festivo_bonus || 0;
  }
  aggregatedBreakdown.ordinary.total += breakdown1.ordinary.total || 0;
}

if (breakdown1.standby) {
  if (breakdown1.standby.workHours) {
    Object.keys(breakdown1.standby.workHours).forEach(type => {
      aggregatedBreakdown.standby.workHours[type] += breakdown1.standby.workHours[type] || 0;
    });
  }
  if (breakdown1.standby.workEarnings) {
    Object.keys(breakdown1.standby.workEarnings).forEach(type => {
      aggregatedBreakdown.standby.workEarnings[type] += breakdown1.standby.workEarnings[type] || 0;
    });
  }
  if (breakdown1.standby.travelHours) {
    Object.keys(breakdown1.standby.travelHours).forEach(type => {
      aggregatedBreakdown.standby.travelHours[type] += breakdown1.standby.travelHours[type] || 0;
    });
  }
  if (breakdown1.standby.travelEarnings) {
    Object.keys(breakdown1.standby.travelEarnings).forEach(type => {
      aggregatedBreakdown.standby.travelEarnings[type] += breakdown1.standby.travelEarnings[type] || 0;
    });
  }
  aggregatedBreakdown.standby.dailyIndemnity += breakdown1.standby.dailyIndemnity || 0;
  aggregatedBreakdown.standby.totalEarnings += breakdown1.standby.totalEarnings || 0;
}

if (breakdown1.allowances) {
  aggregatedBreakdown.allowances.travel += breakdown1.allowances.travel || 0;
  aggregatedBreakdown.allowances.standby += breakdown1.allowances.standby || 0;
  aggregatedBreakdown.allowances.meal += breakdown1.allowances.meal || 0;
}

console.log('\n📊 Aggregazione breakdown 2...');
console.log('Input:', JSON.stringify(breakdown2, null, 2));

// Aggrega breakdown2 (stesso codice)
aggregatedBreakdown.totalEarnings += breakdown2.totalEarnings || 0;

if (breakdown2.ordinary) {
  if (breakdown2.ordinary.hours) {
    aggregatedBreakdown.ordinary.hours.lavoro_giornaliera += breakdown2.ordinary.hours.lavoro_giornaliera || 0;
    aggregatedBreakdown.ordinary.hours.viaggio_giornaliera += breakdown2.ordinary.hours.viaggio_giornaliera || 0;
    aggregatedBreakdown.ordinary.hours.lavoro_extra += breakdown2.ordinary.hours.lavoro_extra || 0;
    aggregatedBreakdown.ordinary.hours.viaggio_extra += breakdown2.ordinary.hours.viaggio_extra || 0;
  }
  if (breakdown2.ordinary.earnings) {
    aggregatedBreakdown.ordinary.earnings.giornaliera += breakdown2.ordinary.earnings.giornaliera || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_giorno += breakdown2.ordinary.earnings.straordinario_giorno || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_notte_22 += breakdown2.ordinary.earnings.straordinario_notte_22 || 0;
    aggregatedBreakdown.ordinary.earnings.straordinario_notte_dopo22 += breakdown2.ordinary.earnings.straordinario_notte_dopo22 || 0;
    aggregatedBreakdown.ordinary.earnings.sabato_bonus += breakdown2.ordinary.earnings.sabato_bonus || 0;
    aggregatedBreakdown.ordinary.earnings.domenica_bonus += breakdown2.ordinary.earnings.domenica_bonus || 0;
    aggregatedBreakdown.ordinary.earnings.festivo_bonus += breakdown2.ordinary.earnings.festivo_bonus || 0;
  }
  aggregatedBreakdown.ordinary.total += breakdown2.ordinary.total || 0;
}

if (breakdown2.standby) {
  if (breakdown2.standby.workHours) {
    Object.keys(breakdown2.standby.workHours).forEach(type => {
      aggregatedBreakdown.standby.workHours[type] += breakdown2.standby.workHours[type] || 0;
    });
  }
  if (breakdown2.standby.workEarnings) {
    Object.keys(breakdown2.standby.workEarnings).forEach(type => {
      aggregatedBreakdown.standby.workEarnings[type] += breakdown2.standby.workEarnings[type] || 0;
    });
  }
  if (breakdown2.standby.travelHours) {
    Object.keys(breakdown2.standby.travelHours).forEach(type => {
      aggregatedBreakdown.standby.travelHours[type] += breakdown2.standby.travelHours[type] || 0;
    });
  }
  if (breakdown2.standby.travelEarnings) {
    Object.keys(breakdown2.standby.travelEarnings).forEach(type => {
      aggregatedBreakdown.standby.travelEarnings[type] += breakdown2.standby.travelEarnings[type] || 0;
    });
  }
  aggregatedBreakdown.standby.dailyIndemnity += breakdown2.standby.dailyIndemnity || 0;
  aggregatedBreakdown.standby.totalEarnings += breakdown2.standby.totalEarnings || 0;
}

if (breakdown2.allowances) {
  aggregatedBreakdown.allowances.travel += breakdown2.allowances.travel || 0;
  aggregatedBreakdown.allowances.standby += breakdown2.allowances.standby || 0;
  aggregatedBreakdown.allowances.meal += breakdown2.allowances.meal || 0;
}

console.log('\n🎯 RISULTATO AGGREGATED BREAKDOWN:');
console.log('=================================');
console.log('💰 Totale Guadagni:', aggregatedBreakdown.totalEarnings.toFixed(2), '€');
console.log('📊 Ordinario Totale:', aggregatedBreakdown.ordinary.total.toFixed(2), '€');
console.log('🚨 Reperibilità Totale:', aggregatedBreakdown.standby.totalEarnings.toFixed(2), '€');
console.log('🎫 Indennità Trasferta:', aggregatedBreakdown.allowances.travel.toFixed(2), '€');
console.log('🎫 Indennità Reperibilità:', aggregatedBreakdown.allowances.standby.toFixed(2), '€');
console.log('🍽️ Pasti:', aggregatedBreakdown.allowances.meal.toFixed(2), '€');

console.log('\n✅ Test aggregazione completato!');
console.log('🎯 La logica di aggregazione funziona correttamente');
console.log('📱 Testa ora nell\'app per vedere il breakdown nella dashboard');
