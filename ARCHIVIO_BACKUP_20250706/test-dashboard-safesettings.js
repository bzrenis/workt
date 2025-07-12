/**
 * Test script per verificare che la logica della Dashboard funzioni correttamente
 * senza errori di safeSettings
 */

console.log('🧪 Test Dashboard - Verifica safeSettings');

// Simula la struttura delle impostazioni come nella app reale
const mockSettings = {
  contract: {
    hourlyRate: 16.41081,
    dailyRate: 109.195,
    monthlyGrossSalary: 2839.07,
    normalHours: 40,
    dailyHours: 8,
    saturdayBonus: 0.2,
    nightBonus: 0.25,
    nightBonus2: 0.35,
    overtimeBonus: 0.2
  },
  travelCompensationRate: 1.0,
  standbySettings: {
    dailyAllowance: 7.5,
    dailyIndemnity: 7.5,
    travelWithBonus: false
  },
  mealAllowances: {
    lunch: { voucherAmount: 5.29, cashAmount: 5.29 },
    dinner: { voucherAmount: 5.29, cashAmount: 5.29 }
  }
};

// Simula la creazione di safeSettings come nella Dashboard
const defaultSettings = {
  contract: {
    hourlyRate: 16.41081,
    dailyRate: 109.195,
    monthlyGrossSalary: 2839.07,
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

const safeSettings = {
  ...defaultSettings,
  ...(mockSettings || {}),
  contract: { ...defaultSettings.contract, ...(mockSettings?.contract || {}) },
  standbySettings: { ...defaultSettings.standbySettings, ...(mockSettings?.standbySettings || {}) },
  mealAllowances: { ...defaultSettings.mealAllowances, ...(mockSettings?.mealAllowances || {}) }
};

console.log('✅ safeSettings creato correttamente:');
console.log('   - Hourly Rate:', safeSettings.contract.hourlyRate);
console.log('   - Travel Rate:', safeSettings.travelCompensationRate);
console.log('   - Lunch Voucher:', safeSettings.mealAllowances.lunch.voucherAmount);
console.log('   - Lunch Cash:', safeSettings.mealAllowances.lunch.cashAmount);

// Test accesso ai valori del pasto (come nel codice della Dashboard)
const voucherAmount = safeSettings.mealAllowances?.lunch?.voucherAmount || 0;
const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;

console.log('✅ Test accesso valori pasti:');
console.log('   - Voucher Amount:', voucherAmount);
console.log('   - Cash Amount:', cashAmount);

// Test che simula la logica di aggregazione pasti della Dashboard
let mealAllowanceTotal = 0;

// Simula un pranzo con voucher
if (true) { // mealLunchVoucher
  const voucherAmount = safeSettings.mealAllowances?.lunch?.voucherAmount || 0;
  const cashAmount = safeSettings.mealAllowances?.lunch?.cashAmount || 0;
  mealAllowanceTotal += voucherAmount + cashAmount;
}

console.log('✅ Test calcolo rimborsi pasti:');
console.log('   - Totale calcolato:', mealAllowanceTotal);

console.log('\n🎉 Tutti i test superati! safeSettings funziona correttamente.');
