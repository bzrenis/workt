// Test per verificare la visualizzazione di tutte le categorie di viaggio nel breakdown del form
const testTravelCategoriesInBreakdown = () => {
  console.log('Test: Verifica visualizzazione categorie viaggio in breakdown form');
  
  // Simula un giorno festivo (es. 25 dicembre 2025)
  const testForm = {
    date: '25/12/2025',
    site_name: 'Test Site',
    veicolo: 'andata_ritorno',
    pasti: { pranzo: false, cena: false },
    trasferta: false,
    reperibilita: true,
    completamentoGiornata: 'nessuno',
    trasfertaManualOverride: false,
    viaggi: [{}],
    interventi: [
      {
        inizio: '08:00',
        fine: '09:00',
        viaggio_andata: '30',
        viaggio_ritorno: '30',
        descrizione: 'Intervento festivo diurno'
      },
      {
        inizio: '22:00',
        fine: '23:00',
        viaggio_andata: '30',
        viaggio_ritorno: '30',
        descrizione: 'Intervento festivo notturno'
      }
    ]
  };

  const defaultSettings = {
    contract: { 
      dailyRate: 109.19,
      hourlyRate: 16.41,
      overtimeRates: {
        day: 1.2,
        nightUntil22: 1.25,
        nightAfter22: 1.35,
        holiday: 1.3,
        nightHoliday: 1.5,
        saturday: 1.25
      }
    },
    travelCompensationRate: 1.0,
    standbySettings: {
      dailyAllowance: 7.5,
      dailyIndemnity: 7.5,
      travelWithBonus: true
    },
    mealAllowances: {
      lunch: { voucherAmount: 5.29 },
      dinner: { voucherAmount: 5.29 }
    }
  };

  const workEntry = {
    date: '2025-12-25',
    siteName: testForm.site_name,
    vehicleDriven: testForm.veicolo,
    departureCompany: '',
    arrivalSite: '',
    workStart1: '',
    workEnd1: '',
    workStart2: '',
    workEnd2: '',
    departureReturn: '',
    arrivalCompany: '',
    interventi: testForm.interventi,
    mealLunchVoucher: 0,
    mealLunchCash: 0,
    mealDinnerVoucher: 0,
    mealDinnerCash: 0,
    travelAllowance: 0,
    travelAllowancePercent: 1.0,
    trasfertaManualOverride: false,
    isStandbyDay: 1,
    standbyAllowance: 1,
    completamentoGiornata: 'nessuno'
  };

  // Importa e istanzia il CalculationService
  const CalculationService = require('./src/services/CalculationService');
  const calculationService = new CalculationService();
  
  console.log('\n--- Test del breakdown ---');
  console.log('Form data:', JSON.stringify(testForm, null, 2));
  console.log('Work entry:', JSON.stringify(workEntry, null, 2));
  
  const breakdown = calculationService.calculateEarningsBreakdown(workEntry, defaultSettings);
  console.log('\n--- Breakdown risultato ---');
  console.log(JSON.stringify(breakdown, null, 2));
  
  // Verifica ore di lavoro per categoria
  console.log('\n--- Ore di lavoro reperibilità per categoria ---');
  if (breakdown.standby?.workHours) {
    Object.entries(breakdown.standby.workHours).forEach(([category, hours]) => {
      if (hours > 0) {
        console.log(`${category}: ${hours}h`);
      }
    });
  } else {
    console.log('Nessuna ora di lavoro in reperibilità');
  }
  
  // Verifica ore di viaggio per categoria
  console.log('\n--- Ore di viaggio reperibilità per categoria ---');
  if (breakdown.standby?.travelHours) {
    Object.entries(breakdown.standby.travelHours).forEach(([category, hours]) => {
      if (hours > 0) {
        console.log(`${category}: ${hours}h`);
      }
    });
  } else {
    console.log('Nessuna ora di viaggio in reperibilità');
  }
  
  // Verifica che siano presenti le categorie attese
  console.log('\n--- Verifica categorie attese ---');
  const expectedCategories = ['holiday', 'night_holiday'];
  const hasExpectedWork = expectedCategories.some(cat => 
    breakdown.standby?.workHours?.[cat] > 0
  );
  const hasExpectedTravel = expectedCategories.some(cat => 
    breakdown.standby?.travelHours?.[cat] > 0
  );
  
  console.log(`Lavoro festivo presente: ${hasExpectedWork}`);
  console.log(`Viaggio festivo presente: ${hasExpectedTravel}`);
  
  if (hasExpectedWork && hasExpectedTravel) {
    console.log('✅ Test PASSATO: Tutte le categorie sono presenti nel breakdown');
  } else {
    console.log('❌ Test FALLITO: Alcune categorie mancano nel breakdown');
  }
  
  return breakdown;
};

// Test per sabato con ore notturne
const testSaturdayNightBreakdown = () => {
  console.log('\n\n=== Test: Sabato con ore notturne ===');
  
  const testForm = {
    date: '06/07/2025', // Sabato
    site_name: 'Test Site',
    veicolo: 'andata_ritorno',
    pasti: { pranzo: false, cena: false },
    trasferta: false,
    reperibilita: true,
    completamentoGiornata: 'nessuno',
    trasfertaManualOverride: false,
    viaggi: [{}],
    interventi: [
      {
        inizio: '10:00',
        fine: '11:00',
        viaggio_andata: '30',
        viaggio_ritorno: '30',
        descrizione: 'Intervento sabato diurno'
      },
      {
        inizio: '22:30',
        fine: '23:30',
        viaggio_andata: '30',
        viaggio_ritorno: '30',
        descrizione: 'Intervento sabato notturno'
      }
    ]
  };

  const defaultSettings = {
    contract: { 
      dailyRate: 109.19,
      hourlyRate: 16.41,
      overtimeRates: {
        day: 1.2,
        nightUntil22: 1.25,
        nightAfter22: 1.35,
        holiday: 1.3,
        nightHoliday: 1.5,
        saturday: 1.25
      }
    },
    travelCompensationRate: 1.0,
    standbySettings: {
      dailyAllowance: 7.5,
      dailyIndemnity: 7.5,
      travelWithBonus: true
    }
  };

  const workEntry = {
    date: '2025-07-06',
    siteName: testForm.site_name,
    vehicleDriven: testForm.veicolo,
    departureCompany: '',
    arrivalSite: '',
    workStart1: '',
    workEnd1: '',
    workStart2: '',
    workEnd2: '',
    departureReturn: '',
    arrivalCompany: '',
    interventi: testForm.interventi,
    mealLunchVoucher: 0,
    mealLunchCash: 0,
    mealDinnerVoucher: 0,
    mealDinnerCash: 0,
    travelAllowance: 0,
    travelAllowancePercent: 1.0,
    trasfertaManualOverride: false,
    isStandbyDay: 1,
    standbyAllowance: 1,
    completamentoGiornata: 'nessuno'
  };

  const CalculationService = require('./src/services/CalculationService');
  const calculationService = new CalculationService();
  
  const breakdown = calculationService.calculateEarningsBreakdown(workEntry, defaultSettings);
  
  // Verifica ore di viaggio per categoria
  console.log('\n--- Ore di viaggio reperibilità per categoria (sabato) ---');
  if (breakdown.standby?.travelHours) {
    Object.entries(breakdown.standby.travelHours).forEach(([category, hours]) => {
      if (hours > 0) {
        console.log(`${category}: ${hours}h`);
      }
    });
  }
  
  // Verifica ore di lavoro per categoria
  console.log('\n--- Ore di lavoro reperibilità per categoria (sabato) ---');
  if (breakdown.standby?.workHours) {
    Object.entries(breakdown.standby.workHours).forEach(([category, hours]) => {
      if (hours > 0) {
        console.log(`${category}: ${hours}h`);
      }
    });
  }
  
  const hasSaturdayNight = breakdown.standby?.workHours?.saturday_night > 0 || 
                           breakdown.standby?.travelHours?.saturday_night > 0;
  
  console.log(`Sabato notturno presente: ${hasSaturdayNight}`);
  
  if (hasSaturdayNight) {
    console.log('✅ Test PASSATO: Categoria sabato notturno presente');
  } else {
    console.log('❌ Test FALLITO: Categoria sabato notturno mancante');
  }
  
  return breakdown;
};

// Esegui i test
console.log('Avvio test per verificare tutte le categorie di viaggio nel breakdown...\n');

try {
  testTravelCategoriesInBreakdown();
  testSaturdayNightBreakdown();
  console.log('\n=== Test completati ===');
} catch (error) {
  console.error('Errore durante i test:', error);
}
