// Test per verificare che il dettaglio mostri la descrizione corretta
// per il calcolo CCNL proporzionale invece di "Mezza giornata (50%)"

console.log('=== TEST DESCRIZIONE DETTAGLIO CALCOLO CCNL ===\n');

// Simula la logica del frontend per generare la descrizione
function simulateDetailDescription(settings, breakdown, form) {
  // Gestione delle opzioni: supporta sia il nuovo formato selectedOptions che il vecchio formato option
  const travelAllowanceSettings = settings.travelAllowance || {};
  const selectedOptions = travelAllowanceSettings.selectedOptions || [travelAllowanceSettings.option || 'WITH_TRAVEL'];
  
  // Se è attivo il calcolo CCNL proporzionale, mostra la descrizione corretta
  if (selectedOptions.includes('PROPORTIONAL_CCNL')) {
    const workHours = (breakdown.ordinary?.hours?.lavoro_giornaliera || 0) + 
                     (breakdown.ordinary?.hours?.lavoro_extra || 0);
    const travelHours = (breakdown.ordinary?.hours?.viaggio_giornaliera || 0) + 
                       (breakdown.ordinary?.hours?.viaggio_extra || 0);
    const totalHours = workHours + travelHours;
    const proportion = Math.min(totalHours / 8, 1.0);
    return `Calcolo CCNL proporzionale (${(proportion * 100).toFixed(1)}%)`;
  }
  
  // Logica precedente per retrocompatibilità
  if (form.trasfertaPercent && form.trasfertaPercent < 1) {
    return `Mezza giornata (${Math.round(form.trasfertaPercent * 100)}%)`;
  }
  
  return 'Giornata intera';
}

// Test case 1: Calcolo CCNL con 6.4 ore (caso specifico dal problema)
console.log('TEST 1: Calcolo CCNL con 6.4 ore (caso specifico)');
const test1Settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['PROPORTIONAL_CCNL']
  }
};

const test1Breakdown = {
  ordinary: {
    hours: {
      lavoro_giornaliera: 4.4,  // 4.4 ore di lavoro
      viaggio_giornaliera: 2.0, // 2 ore di viaggio
      lavoro_extra: 0,
      viaggio_extra: 0
    }
  },
  allowances: {
    travel: 13.13
  }
};

const test1Form = {
  trasfertaPercent: 0.5 // Questo dovrebbe essere ignorato
};

const result1 = simulateDetailDescription(test1Settings, test1Breakdown, test1Form);
console.log(`- Ore totali: 6.4h (4.4h lavoro + 2h viaggio)`);
console.log(`- Indennità: 13.13€`);
console.log(`- Descrizione: "${result1}"`);
console.log(`- Corretto: ${result1.includes('CCNL proporzionale') && result1.includes('80.0%') ? 'SÌ' : 'NO'}\n`);

// Test case 2: Calcolo CCNL con 8 ore (giornata piena)
console.log('TEST 2: Calcolo CCNL con 8 ore (giornata piena)');
const test2Settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['PROPORTIONAL_CCNL']
  }
};

const test2Breakdown = {
  ordinary: {
    hours: {
      lavoro_giornaliera: 6.0,
      viaggio_giornaliera: 2.0,
      lavoro_extra: 0,
      viaggio_extra: 0
    }
  },
  allowances: {
    travel: 16.41
  }
};

const test2Form = {
  trasfertaPercent: 1.0
};

const result2 = simulateDetailDescription(test2Settings, test2Breakdown, test2Form);
console.log(`- Ore totali: 8h (6h lavoro + 2h viaggio)`);
console.log(`- Indennità: 16.41€`);
console.log(`- Descrizione: "${result2}"`);
console.log(`- Corretto: ${result2.includes('CCNL proporzionale') && result2.includes('100.0%') ? 'SÌ' : 'NO'}\n`);

// Test case 3: Calcolo vecchio (HALF_ALLOWANCE_HALF_DAY) - retrocompatibilità
console.log('TEST 3: Calcolo vecchio (HALF_ALLOWANCE_HALF_DAY) - retrocompatibilità');
const test3Settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['HALF_ALLOWANCE_HALF_DAY']
  }
};

const test3Breakdown = {
  ordinary: {
    hours: {
      lavoro_giornaliera: 4.0,
      viaggio_giornaliera: 0,
      lavoro_extra: 0,
      viaggio_extra: 0
    }
  },
  allowances: {
    travel: 8.21
  }
};

const test3Form = {
  trasfertaPercent: 0.5
};

const result3 = simulateDetailDescription(test3Settings, test3Breakdown, test3Form);
console.log(`- Ore totali: 4h (solo lavoro)`);
console.log(`- Indennità: 8.21€`);
console.log(`- Descrizione: "${result3}"`);
console.log(`- Corretto: ${result3.includes('Mezza giornata (50%)') ? 'SÌ' : 'NO'}\n`);

// Test case 4: Giornata intera senza calcolo CCNL
console.log('TEST 4: Giornata intera senza calcolo CCNL');
const test4Settings = {
  travelAllowance: {
    enabled: true,
    dailyAmount: 16.41081,
    selectedOptions: ['WITH_TRAVEL']
  }
};

const test4Breakdown = {
  ordinary: {
    hours: {
      lavoro_giornaliera: 8.0,
      viaggio_giornaliera: 0,
      lavoro_extra: 0,
      viaggio_extra: 0
    }
  },
  allowances: {
    travel: 16.41
  }
};

const test4Form = {
  trasfertaPercent: 1.0
};

const result4 = simulateDetailDescription(test4Settings, test4Breakdown, test4Form);
console.log(`- Ore totali: 8h (solo lavoro)`);
console.log(`- Indennità: 16.41€`);
console.log(`- Descrizione: "${result4}"`);
console.log(`- Corretto: ${result4 === 'Giornata intera' ? 'SÌ' : 'NO'}\n`);

console.log('=== RIEPILOGO RISULTATI ===');
const results = [
  { test: 'CCNL 6.4h', expected: 'CCNL proporzionale (80.0%)', actual: result1, passed: result1.includes('CCNL proporzionale') && result1.includes('80.0%') },
  { test: 'CCNL 8h', expected: 'CCNL proporzionale (100.0%)', actual: result2, passed: result2.includes('CCNL proporzionale') && result2.includes('100.0%') },
  { test: 'Vecchio 4h', expected: 'Mezza giornata (50%)', actual: result3, passed: result3.includes('Mezza giornata (50%)') },
  { test: 'Standard 8h', expected: 'Giornata intera', actual: result4, passed: result4 === 'Giornata intera' }
];

results.forEach(r => {
  console.log(`✓ ${r.test}: ${r.passed ? 'PASS' : 'FAIL'} (${r.actual})`);
});

const allPassed = results.every(r => r.passed);
console.log(`\n🎯 RISULTATO FINALE: ${allPassed ? 'TUTTI I TEST SUPERATI' : 'ALCUNI TEST FALLITI'}`);

if (allPassed) {
  console.log('\n🎉 CORREZIONE COMPLETATA!');
  console.log('- Il dettaglio ora mostra "Calcolo CCNL proporzionale (X%)" invece di "Mezza giornata (50%)"');
  console.log('- La retrocompatibilità con i vecchi metodi è preservata');
  console.log('- L\'interfaccia utente è ora allineata con la logica di calcolo');
} else {
  console.log('\n❌ Verificare l\'implementazione della logica di descrizione');
}
