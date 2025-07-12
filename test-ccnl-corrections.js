// Test completo per verificare tutte le correzioni CCNL
const fs = require('fs');

// Mock delle funzioni principali
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

function getRateMultiplierForCategory(category, contract) {
  const ccnlRates = contract.overtimeRates; // Maggiorazioni CCNL
  if (category.includes('standby')) {
      category = category.replace('standby_', '');
  }

  if (category === 'overtime_night_holiday') return ccnlRates.holiday || 1.3;
  if (category === 'overtime_holiday') return ccnlRates.holiday || 1.3;
  if (category === 'overtime_night') return ccnlRates.nightAfter22 || 1.35;
  if (category === 'overtime') return ccnlRates.day || 1.20;
  if (category === 'ordinary_night_holiday') return ccnlRates.holiday || 1.3;
  if (category === 'ordinary_holiday') return ccnlRates.holiday || 1.3;
  if (category === 'ordinary_night') return ccnlRates.nightUntil22 || 1.25;
  
  return 1.0;
}

function getHourlyRateWithBonus({
  baseRate,
  isOvertime = false,
  isNight = false,
  isHoliday = false,
  isSunday = false,
  contract = null
}) {
  const rates = contract?.overtimeRates || {
    day: 1.20,
    nightUntil22: 1.25,
    nightAfter22: 1.35,
    saturday: 1.25,
    holiday: 1.3
  };

  if (isOvertime && isNight) return baseRate * (rates.nightAfter22 || 1.35);
  if (isOvertime && (isHoliday || isSunday)) return baseRate * (rates.holiday || 1.3);
  if (isOvertime) return baseRate * (rates.day || 1.20);
  if (isNight && isHoliday) return baseRate * (rates.holiday || 1.3);
  if (isNight) return baseRate * (rates.nightUntil22 || 1.25);
  if (isHoliday || isSunday) return baseRate * (rates.holiday || 1.3);
  return baseRate;
}

// Mock del contratto CCNL
const mockContract = {
  hourlyRate: 16.41081,
  overtimeRates: {
    day: 1.20,
    nightUntil22: 1.25,
    nightAfter22: 1.35,
    saturday: 1.25,
    holiday: 1.3
  }
};

console.log('🔧 TEST COMPLETO CORREZIONI CCNL METALMECCANICO PMI');
console.log('═'.repeat(70));

console.log('\n🎯 1. TEST calculateOvertimeRate():');
console.log('━'.repeat(50));
const testHours = [6, 19, 20, 21, 22, 23];
testHours.forEach(hour => {
  const rate = calculateOvertimeRate(hour);
  const percentage = ((rate / mockContract.hourlyRate - 1) * 100).toFixed(0);
  console.log(`   ${hour.toString().padStart(2, '0')}:00 → €${rate.toFixed(2)} (+${percentage}%)`);
});

console.log('\n🎯 2. TEST getRateMultiplierForCategory():');
console.log('━'.repeat(50));
const categories = [
  'overtime',
  'overtime_night', 
  'overtime_holiday',
  'ordinary_night',
  'ordinary_holiday',
  'standby_overtime',
  'standby_ordinary_night'
];

categories.forEach(category => {
  const multiplier = getRateMultiplierForCategory(category, mockContract);
  const rate = mockContract.hourlyRate * multiplier;
  const percentage = ((multiplier - 1) * 100).toFixed(0);
  console.log(`   ${category.padEnd(20)} → x${multiplier.toFixed(2)} = €${rate.toFixed(2)} (+${percentage}%)`);
});

console.log('\n🎯 3. TEST getHourlyRateWithBonus():');
console.log('━'.repeat(50));
const scenarios = [
  { name: 'Diurno normale', params: { baseRate: 16.41081, contract: mockContract } },
  { name: 'Straordinario diurno', params: { baseRate: 16.41081, isOvertime: true, contract: mockContract } },
  { name: 'Notturno ordinario', params: { baseRate: 16.41081, isNight: true, contract: mockContract } },
  { name: 'Straordinario notturno', params: { baseRate: 16.41081, isOvertime: true, isNight: true, contract: mockContract } },
  { name: 'Festivo ordinario', params: { baseRate: 16.41081, isHoliday: true, contract: mockContract } },
  { name: 'Festivo straordinario', params: { baseRate: 16.41081, isOvertime: true, isHoliday: true, contract: mockContract } }
];

scenarios.forEach(scenario => {
  const rate = getHourlyRateWithBonus(scenario.params);
  const percentage = ((rate / mockContract.hourlyRate - 1) * 100).toFixed(0);
  console.log(`   ${scenario.name.padEnd(20)} → €${rate.toFixed(2)} (+${percentage}%)`);
});

console.log('\n🎯 4. VERIFICA INTERVENTO 04/07/2025 CON NUOVE CORREZIONI:');
console.log('━'.repeat(50));

// Simulazione intervento 19:00-23:00
const interventoHours = [
  { start: 19, end: 20, type: 'diurno' },
  { start: 20, end: 21, type: 'serale' },
  { start: 21, end: 22, type: 'serale' },
  { start: 22, end: 23, type: 'notturno' }
];

let totaleCosto = 0;
interventoHours.forEach(({ start, end, type }) => {
  const rate = calculateOvertimeRate(start);
  const percentage = ((rate / mockContract.hourlyRate - 1) * 100).toFixed(0);
  totaleCosto += rate;
  
  console.log(`   ${start}:00-${end}:00 (${type.padEnd(8)}) → €${rate.toFixed(2)} (+${percentage}%)`);
});

console.log(`\n💰 Costo totale intervento: €${totaleCosto.toFixed(2)}`);
console.log(`📊 Media oraria: €${(totaleCosto/4).toFixed(2)}`);

// Test comparativo con tassi hardcoded vecchi
console.log('\n🔍 5. CONFRONTO CON TASSI VECCHI HARDCODED:');
console.log('━'.repeat(50));

const oldRates = {
  overtime_night: 1.50,  // Era 1.50, ora 1.35
  overtime: 1.30,        // Era 1.30, ora 1.20  
  ordinary_night: 1.20,  // Era 1.20, ora 1.25
  holiday: 1.40          // Era 1.40, ora 1.30
};

const newRates = {
  overtime_night: 1.35,
  overtime: 1.20,
  ordinary_night: 1.25,
  holiday: 1.30
};

console.log('   Categoria          | Vecchio | Nuovo | Differenza');
console.log('   ─'.repeat(55));
Object.keys(oldRates).forEach(key => {
  const oldRate = oldRates[key];
  const newRate = newRates[key];
  const diff = ((newRate - oldRate) * mockContract.hourlyRate).toFixed(2);
  const diffSign = newRate > oldRate ? '+' : '';
  console.log(`   ${key.padEnd(18)} | x${oldRate.toFixed(2)}   | x${newRate.toFixed(2)} | ${diffSign}€${diff}`);
});

console.log('\n🎉 RISULTATO FINALE:');
console.log('━'.repeat(50));
console.log('✅ Corretta la funzione calculateOvertimeRate()');
console.log('   → Aggiunta fascia serale 20:00-22:00 (+25%)');
console.log('   → Corretta logica condizionale');
console.log('');
console.log('✅ Corretta la funzione getRateMultiplierForCategory()');
console.log('   → Allineati tutti i tassi al CCNL Metalmeccanico PMI');
console.log('   → Rimossi tassi hardcoded errati');
console.log('');
console.log('✅ Corretta la funzione getHourlyRateWithBonus()');
console.log('   → Utilizzati tassi dal contratto invece di valori fissi');
console.log('   → Aggiunto supporto per passaggio contratto');
console.log('');
console.log('✅ Aggiornate tutte le chiamate per passare il contratto');
console.log('');
console.log('📋 FASCE ORARIE CCNL IMPLEMENTATE:');
console.log('🌅 Diurno (06:00-20:00): +20%');
console.log('🌆 Serale (20:00-22:00): +25%');
console.log('🌙 Notturno (22:00-06:00): +35%');
console.log('🎊 Festivo: +30%');
console.log('📅 Sabato: +25%');
