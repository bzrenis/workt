// Test per verificare la gestione delle 8 ore giornaliere con interventi di reperibilità
const path = require('path');

// Mock delle dipendenze
class MockDatabaseService {
  async getSettings() {
    return {
      contract: {
        hourlyRate: 16.41,
        dailyRate: 109.19,
        overtimeRates: {
          day: 1.2,
          nightUntil22: 1.25,
          nightAfter22: 1.35,
          saturday: 1.25,
          holiday: 1.35
        }
      },
      standbySettings: {
        enabled: true,
        dailyAllowance: 7.50,
        standbyDays: {
          '2025-01-15': { selected: true } // Mercoledì in reperibilità
        }
      },
      travelCompensationRate: 1.0
    };
  }
}

// Mock delle funzioni di utilità
function isItalianHoliday(date) {
  return false;
}

function getWorkDayHours() {
  return 8;
}

function isNightWork(hour) {
  return hour < 6 || hour >= 22;
}

// Importa il CalculationService
const CalculationServicePath = path.join(__dirname, 'src', 'services', 'CalculationService.js');
const fs = require('fs');

// Leggi il file del CalculationService e adatta per il test
let serviceCode = fs.readFileSync(CalculationServicePath, 'utf8');

// Rimuovi gli import/export e aggiungi le nostre mock
serviceCode = serviceCode.replace(/import.*from.*;/g, '');
serviceCode = serviceCode.replace(/export default.*/, '');

// Definisci le funzioni mock
const mockFunctions = `
const { isItalianHoliday, getWorkDayHours, isNightWork } = require('./src/constants');

// Mock per i test
global.isItalianHoliday = isItalianHoliday;
global.getWorkDayHours = getWorkDayHours;
global.isNightWork = isNightWork;
`;

// Valuta il codice del service
eval(mockFunctions + serviceCode);

// Testa la logica delle 8 ore giornaliere
async function testEightHourRule() {
  console.log('🧪 Test: Gestione limite 8 ore giornaliere con reperibilità\n');
  
  const service = new CalculationService();
  const databaseService = new MockDatabaseService();
  const settings = await databaseService.getSettings();
  
  // Test case 1: Giorno feriale con 6 ore lavoro ordinario + 4 ore reperibilità (supera 8 ore)
  console.log('📋 Test 1: Giorno feriale - 6h ordinarie + 4h reperibilità (totale 10h)');
  const workEntry1 = {
    date: '2025-01-15', // Mercoledì
    startTime: '08:00',
    endTime: '14:00', // 6 ore lavoro ordinario
    isStandbyDay: true,
    interventi: [
      {
        work_start_1: '15:00',
        work_end_1: '19:00', // 4 ore intervento reperibilità
        departure_company: '',
        arrival_site: '',
        departure_return: '',
        arrival_company: ''
      }
    ]
  };
  
  const breakdown1 = service.calculateEarningsBreakdown(workEntry1, settings);
  
  console.log('📊 Risultati Test 1:');
  console.log(`   Ore lavoro ordinario: ${service.calculateWorkHours(workEntry1)}h`);
  console.log(`   Ore interventi reperibilità: ${Object.values(breakdown1.standby.workHours).reduce((a, b) => a + b, 0)}h`);
  console.log(`   Guadagno interventi: ${breakdown1.standby.totalEarnings - breakdown1.standby.dailyIndemnity}€`);
  console.log(`   Dovrebbe applicare maggiorazione straordinari: SÌ (superato limite 8h)`);
  
  // Le ore di reperibilità dovrebbero essere pagate come straordinari (1.2x base rate)
  const expectedStandbyRate = settings.contract.hourlyRate * settings.contract.overtimeRates.day; // 16.41 * 1.2
  const actualStandbyRate = breakdown1.standby.workEarnings.ordinary / breakdown1.standby.workHours.ordinary;
  
  console.log(`   Tariffa attesa reperibilità: ${expectedStandbyRate.toFixed(2)}€/h (straordinari)`);
  console.log(`   Tariffa effettiva reperibilità: ${actualStandbyRate.toFixed(2)}€/h`);
  
  const test1Pass = Math.abs(actualStandbyRate - expectedStandbyRate) < 0.01;
  console.log(`   ✅ Test 1: ${test1Pass ? 'SUPERATO' : 'FALLITO'}\n`);
  
  // Test case 2: Giorno feriale con solo 4 ore reperibilità (non supera 8 ore)
  console.log('📋 Test 2: Giorno feriale - solo 4h reperibilità (totale 4h)');
  const workEntry2 = {
    date: '2025-01-16', // Giovedì
    startTime: '',
    endTime: '',
    isStandbyDay: true,
    interventi: [
      {
        work_start_1: '15:00',
        work_end_1: '19:00', // 4 ore intervento reperibilità
        departure_company: '',
        arrival_site: '',
        departure_return: '',
        arrival_company: ''
      }
    ]
  };
  
  const breakdown2 = service.calculateEarningsBreakdown(workEntry2, settings);
  
  console.log('📊 Risultati Test 2:');
  console.log(`   Ore lavoro ordinario: ${service.calculateWorkHours(workEntry2)}h`);
  console.log(`   Ore interventi reperibilità: ${Object.values(breakdown2.standby.workHours).reduce((a, b) => a + b, 0)}h`);
  console.log(`   Dovrebbe applicare maggiorazione straordinari: NO (non superato limite 8h)`);
  
  // Le ore di reperibilità dovrebbero essere pagate come ordinarie (1.0x base rate)
  const expectedNormalRate = settings.contract.hourlyRate; // 16.41 * 1.0
  const actualNormalRate = breakdown2.standby.workEarnings.ordinary / breakdown2.standby.workHours.ordinary;
  
  console.log(`   Tariffa attesa reperibilità: ${expectedNormalRate.toFixed(2)}€/h (ordinarie)`);
  console.log(`   Tariffa effettiva reperibilità: ${actualNormalRate.toFixed(2)}€/h`);
  
  const test2Pass = Math.abs(actualNormalRate - expectedNormalRate) < 0.01;
  console.log(`   ✅ Test 2: ${test2Pass ? 'SUPERATO' : 'FALLITO'}\n`);
  
  // Test case 3: Sabato con reperibilità (maggiorazione sabato, non limite 8 ore)
  console.log('📋 Test 3: Sabato - 4h reperibilità (maggiorazione sabato)');
  const workEntry3 = {
    date: '2025-01-18', // Sabato
    isStandbyDay: true,
    interventi: [
      {
        work_start_1: '09:00',
        work_end_1: '13:00', // 4 ore intervento reperibilità sabato
        departure_company: '',
        arrival_site: '',
        departure_return: '',
        arrival_company: ''
      }
    ]
  };
  
  const breakdown3 = service.calculateEarningsBreakdown(workEntry3, settings);
  
  console.log('📊 Risultati Test 3:');
  console.log(`   Ore interventi sabato: ${breakdown3.standby.workHours.saturday || 0}h`);
  console.log(`   Dovrebbe applicare maggiorazione sabato: SÌ (giorno speciale)`);
  
  // Le ore di sabato dovrebbero avere maggiorazione sabato (1.25x base rate)
  const expectedSaturdayRate = settings.contract.hourlyRate * settings.contract.overtimeRates.saturday; // 16.41 * 1.25
  const actualSaturdayRate = breakdown3.standby.workEarnings.saturday / breakdown3.standby.workHours.saturday;
  
  console.log(`   Tariffa attesa sabato: ${expectedSaturdayRate.toFixed(2)}€/h`);
  console.log(`   Tariffa effettiva sabato: ${actualSaturdayRate.toFixed(2)}€/h`);
  
  const test3Pass = Math.abs(actualSaturdayRate - expectedSaturdayRate) < 0.01;
  console.log(`   ✅ Test 3: ${test3Pass ? 'SUPERATO' : 'FALLITO'}\n`);
  
  // Verifica che le ore di viaggio siano ancora calcolate
  console.log('📋 Test 4: Verifica calcolo ore viaggio negli interventi');
  const workEntry4 = {
    date: '2025-01-15',
    isStandbyDay: true,
    interventi: [
      {
        departure_company: '08:00',
        arrival_site: '09:00', // 1 ora viaggio andata
        work_start_1: '09:00',
        work_end_1: '11:00', // 2 ore lavoro
        departure_return: '11:00',
        arrival_company: '12:00' // 1 ora viaggio ritorno
      }
    ]
  };
  
  const breakdown4 = service.calculateEarningsBreakdown(workEntry4, settings);
  const totalTravelHours = Object.values(breakdown4.standby.travelHours).reduce((a, b) => a + b, 0);
  const totalWorkHours = Object.values(breakdown4.standby.workHours).reduce((a, b) => a + b, 0);
  
  console.log('📊 Risultati Test 4:');
  console.log(`   Ore viaggio calcolate: ${totalTravelHours}h (attese: 2h)`);
  console.log(`   Ore lavoro calcolate: ${totalWorkHours}h (attese: 2h)`);
  
  const test4Pass = totalTravelHours === 2 && totalWorkHours === 2;
  console.log(`   ✅ Test 4: ${test4Pass ? 'SUPERATO' : 'FALLITO'}\n`);
  
  // Riepilogo
  const allTestsPass = test1Pass && test2Pass && test3Pass && test4Pass;
  console.log('🎯 RIEPILOGO FINALE:');
  console.log(`   Test 1 (Limite 8h feriali): ${test1Pass ? '✅' : '❌'}`);
  console.log(`   Test 2 (Sotto 8h feriali): ${test2Pass ? '✅' : '❌'}`);
  console.log(`   Test 3 (Maggiorazione sabato): ${test3Pass ? '✅' : '❌'}`);
  console.log(`   Test 4 (Ore viaggio): ${test4Pass ? '✅' : '❌'}`);
  console.log(`   🏆 Tutti i test: ${allTestsPass ? 'SUPERATI' : 'FALLITI'}`);
}

// Esegui i test
if (require.main === module) {
  testEightHourRule().catch(console.error);
}

module.exports = { testEightHourRule };
