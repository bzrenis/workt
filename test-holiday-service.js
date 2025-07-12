// Script di test per il servizio HolidayService
// Verifica il riconoscimento automatico dei giorni festivi feriali

import HolidayService from './src/services/HolidayService.js';

console.log('🎄 TEST SERVIZIO GIORNI FESTIVI 🎄\n');

// Test date dell'anno 2025
const testDates = [
  '06/07/2025', // Oggi (domenica) - non dovrebbe essere rilevato come festivo feriale
  '01/01/2025', // Capodanno (mercoledì) - festivo feriale
  '06/01/2025', // Epifania (lunedì) - festivo feriale 
  '25/04/2025', // Festa della Liberazione (venerdì) - festivo feriale
  '01/05/2025', // Festa del Lavoro (giovedì) - festivo feriale
  '02/06/2025', // Festa della Repubblica (lunedì) - festivo feriale
  '15/08/2025', // Ferragosto (venerdì) - festivo feriale
  '01/11/2025', // Ognissanti (sabato) - festivo feriale
  '08/12/2025', // Immacolata (lunedì) - festivo feriale
  '25/12/2025', // Natale (giovedì) - festivo feriale
  '26/12/2025', // Santo Stefano (venerdì) - festivo feriale
  '10/07/2025', // Giorno normale (giovedì) - non festivo
  '13/04/2025', // Pasqua 2025 (domenica) - non rilevato come festivo feriale
  '14/04/2025', // Lunedì dell'Angelo 2025 (lunedì) - festivo feriale
];

console.log('TEST SINGOLE DATE:');
console.log('='.repeat(50));

testDates.forEach(date => {
  const holidayInfo = HolidayService.isHoliday(date);
  const weekdayHolidayInfo = HolidayService.isWeekdayHoliday(date);
  
  console.log(`Data: ${date}`);
  console.log(`  Festivo: ${holidayInfo ? holidayInfo.name : 'NO'}`);
  console.log(`  Festivo feriale: ${weekdayHolidayInfo ? weekdayHolidayInfo.name : 'NO'}`);
  console.log('');
});

console.log('\nTEST ANNO COMPLETO 2025:');
console.log('='.repeat(50));

const holidays2025 = HolidayService.getYearHolidays(2025);
console.log('Tutti i giorni festivi 2025:');
holidays2025.forEach(holiday => {
  const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][holiday.date.getDay()];
  console.log(`  ${HolidayService.formatDate(holiday.date)} (${dayName}) - ${holiday.name} [${holiday.type}]`);
});

console.log('\nSolo giorni festivi feriali 2025:');
const weekdayHolidays2025 = HolidayService.getWeekdayHolidays(2025);
weekdayHolidays2025.forEach(holiday => {
  const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][holiday.date.getDay()];
  const pay = HolidayService.calculateHolidayPay({ contract: { dailyRate: 109.195 }});
  console.log(`  ${HolidayService.formatDate(holiday.date)} (${dayName}) - ${holiday.name} - Retribuzione: €${pay.toFixed(2)}`);
});

console.log(`\n📊 STATISTICHE 2025:`);
console.log(`   Totale giorni festivi: ${holidays2025.length}`);
console.log(`   Giorni festivi feriali retribuiti: ${weekdayHolidays2025.length}`);
console.log(`   Retribuzione totale giorni festivi: €${(weekdayHolidays2025.length * 109.195).toFixed(2)}`);

console.log('\n✅ Test completato!');
