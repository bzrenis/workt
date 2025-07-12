// Test per verificare la correzione delle fasce orarie straordinari CCNL
const fs = require('fs');

// Mock della funzione corretta (come nel file constants/index.js)
function calculateOvertimeRate(hour, hourlyRate = 16.41081) {
  const overtimeRates = {
    day: 1.20,        // +20% Diurno (06:00-20:00)
    nightUntil22: 1.25, // +25% Serale (20:00-22:00)  
    nightAfter22: 1.35, // +35% Notturno (22:00-06:00)
  };

  // CCNL Metalmeccanico PMI - Fasce orarie straordinari:
  // Notturno (22:00-06:00): +35%
  if (hour >= 22 || hour < 6) {
    return hourlyRate * overtimeRates.nightAfter22;
  }
  // Serale (20:00-22:00): +25%
  else if (hour >= 20 && hour < 22) {
    return hourlyRate * overtimeRates.nightUntil22;
  }
  // Diurno (06:00-20:00): +20%
  return hourlyRate * overtimeRates.day;
}

console.log('🕒 TEST FASCE ORARIE STRAORDINARI CCNL METALMECCANICO PMI');
console.log('═'.repeat(60));

const hourlyRate = 16.41081;

console.log('\n📊 TEST COMPLETO - 24 ORE:');
console.log('━'.repeat(50));

const testHours = [
  { hour: 5, expected: 'notturno +35%' },
  { hour: 6, expected: 'diurno +20%' },
  { hour: 10, expected: 'diurno +20%' },
  { hour: 14, expected: 'diurno +20%' },
  { hour: 18, expected: 'diurno +20%' },
  { hour: 19, expected: 'diurno +20%' },
  { hour: 20, expected: 'serale +25%' },
  { hour: 21, expected: 'serale +25%' },
  { hour: 22, expected: 'notturno +35%' },
  { hour: 23, expected: 'notturno +35%' },
  { hour: 0, expected: 'notturno +35%' },
  { hour: 1, expected: 'notturno +35%' }
];

testHours.forEach(({ hour, expected }) => {
  const rate = calculateOvertimeRate(hour, hourlyRate);
  const percentage = ((rate / hourlyRate - 1) * 100).toFixed(0);
  const multiplier = (rate / hourlyRate).toFixed(2);
  
  console.log(`⏰ ${hour.toString().padStart(2, '0')}:00 → €${rate.toFixed(2)} (x${multiplier}) = +${percentage}% → ${expected}`);
});

console.log('\n🎯 VERIFICA INTERVENTO 04/07/2025:');
console.log('━'.repeat(50));

// Simula le ore dell'intervento 04/07/2025: 19:00-23:00 (4 ore lavoro)
const interventoHours = [19, 20, 21, 22];

let totaleCosto = 0;
interventoHours.forEach(hour => {
  const rate = calculateOvertimeRate(hour, hourlyRate);
  const percentage = ((rate / hourlyRate - 1) * 100).toFixed(0);
  totaleCosto += rate;
  
  console.log(`⏰ ${hour}:00-${hour+1}:00 → €${rate.toFixed(2)} (+${percentage}%)`);
});

console.log(`\n💰 Costo totale 4 ore: €${totaleCosto.toFixed(2)}`);
console.log(`📊 Media oraria: €${(totaleCosto/4).toFixed(2)}`);

// Calcolo con vecchia logica (BUGGATA)
console.log('\n🐛 CONFRONTO CON VECCHIA LOGICA (BUGGATA):');
console.log('━'.repeat(50));

function calculateOvertimeRateOLD(hour, hourlyRate = 16.41081) {
  const overtimeRates = {
    day: 1.20,
    nightUntil22: 1.25,
    nightAfter22: 1.35,
  };

  // VECCHIA LOGICA BUGGATA
  if (hour >= 22 || hour < 6) {
    return hourlyRate * overtimeRates.nightAfter22;
  } else if (hour >= 22) { // ❌ Questa condizione non viene MAI raggiunta!
    return hourlyRate * overtimeRates.nightUntil22;
  }
  return hourlyRate * overtimeRates.day;
}

let totaleCostoOLD = 0;
interventoHours.forEach(hour => {
  const rate = calculateOvertimeRateOLD(hour, hourlyRate);
  const percentage = ((rate / hourlyRate - 1) * 100).toFixed(0);
  totaleCostoOLD += rate;
  
  console.log(`⏰ ${hour}:00-${hour+1}:00 → €${rate.toFixed(2)} (+${percentage}%) [VECCHIA]`);
});

console.log(`\n💰 Costo totale 4 ore (vecchia): €${totaleCostoOLD.toFixed(2)}`);
console.log(`📊 Media oraria (vecchia): €${(totaleCostoOLD/4).toFixed(2)}`);

console.log('\n🎯 RISULTATO:');
console.log('━'.repeat(50));
console.log(`✅ Nuova logica: €${totaleCosto.toFixed(2)}`);
console.log(`❌ Vecchia logica: €${totaleCostoOLD.toFixed(2)}`);
console.log(`💡 Differenza: €${(totaleCosto - totaleCostoOLD).toFixed(2)}`);

if (totaleCosto > totaleCostoOLD) {
  console.log('🎉 LA CORREZIONE AUMENTA CORRETTAMENTE IL COMPENSO!');
  console.log('   La fascia serale +25% ora viene applicata correttamente.');
} else {
  console.log('⚠️  Verifica necessaria - risultato inaspettato');
}

console.log('\n📋 RIEPILOGO FASCE CCNL METALMECCANICO PMI:');
console.log('━'.repeat(50));
console.log('🌅 Diurno (06:00-20:00): +20%');
console.log('🌆 Serale (20:00-22:00): +25% ← QUESTA ERA MANCANTE!');
console.log('🌙 Notturno (22:00-06:00): +35%');
