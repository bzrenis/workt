// Test per verificare la configurazione della maggiorazione del sabato
// Eseguire con: node test-saturday-bonus.js

const { CalculationService } = require('./src/services/CalculationService');

// Mock delle impostazioni con diversi valori di maggiorazione sabato
const testSettings = [
  {
    name: 'Default 25%',
    settings: {
      contract: {
        monthlySalary: 2839.07,
        hourlyRate: 16.41081,
        overtimeRates: {
          saturday: 1.25 // 25%
        }
      },
      travelCompensationRate: 1.0
    }
  },
  {
    name: 'CCNL Standard 15%',
    settings: {
      contract: {
        monthlySalary: 2839.07,
        hourlyRate: 16.41081,
        overtimeRates: {
          saturday: 1.15 // 15%
        }
      },
      travelCompensationRate: 1.0
    }
  },
  {
    name: 'Personalizzato 30%',
    settings: {
      contract: {
        monthlySalary: 2839.07,
        hourlyRate: 16.41081,
        overtimeRates: {
          saturday: 1.30 // 30%
        }
      },
      travelCompensationRate: 1.0
    }
  }
];

// Test data - sabato 4 gennaio 2025
const testData = {
  date: '2025-01-04', // Sabato
  workStartTime: '08:00',
  workEndTime: '16:00',
  travelHours: 2,
  isStandby: false,
  travelAllowance: false,
  lunchType: 'none'
};

console.log('=== TEST CONFIGURAZIONE MAGGIORAZIONE SABATO ===\n');

testSettings.forEach(({ name, settings }) => {
  console.log(`--- ${name} ---`);
  
  try {
    const result = CalculationService.calculateDailyEarnings(testData, settings);
    
    console.log(`Ore lavoro: ${result.hours.work}h`);
    console.log(`Ore viaggio: ${result.hours.travel}h`);
    console.log(`Maggiorazione sabato: ${((settings.contract.overtimeRates.saturday - 1) * 100).toFixed(1)}%`);
    console.log(`Paga lavoro: €${result.earnings.work.toFixed(2)}`);
    console.log(`Paga viaggio: €${result.earnings.travel.toFixed(2)}`);
    console.log(`Totale: €${result.totalEarnings.toFixed(2)}`);
    console.log(`È sabato: ${result.details.isSaturday ? 'Sì' : 'No'}`);
    
    // Verifica che la maggiorazione sia applicata correttamente
    const expectedWorkPay = 8 * settings.contract.hourlyRate * settings.contract.overtimeRates.saturday;
    const expectedTravelPay = 2 * settings.contract.hourlyRate * settings.contract.overtimeRates.saturday;
    
    console.log(`Verifica paga lavoro: €${expectedWorkPay.toFixed(2)} (atteso) vs €${result.earnings.work.toFixed(2)} (calcolato)`);
    console.log(`Verifica paga viaggio: €${expectedTravelPay.toFixed(2)} (atteso) vs €${result.earnings.travel.toFixed(2)} (calcolato)`);
    
    const workCorrect = Math.abs(expectedWorkPay - result.earnings.work) < 0.01;
    const travelCorrect = Math.abs(expectedTravelPay - result.earnings.travel) < 0.01;
    
    console.log(`✅ Test ${workCorrect && travelCorrect ? 'PASSATO' : 'FALLITO'}`);
    
  } catch (error) {
    console.log(`❌ Errore nel test: ${error.message}`);
  }
  
  console.log('');
});

console.log('=== FINE TEST ===');
