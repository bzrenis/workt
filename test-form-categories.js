// Test semplificato per verificare che le categorie mancanti siano state aggiunte al form
console.log('Test: Verifica che le categorie di viaggio siano state aggiunte al TimeEntryForm.js');

const fs = require('fs');
const path = require('path');

// Leggi il file TimeEntryForm.js
const formPath = path.join(__dirname, 'src', 'screens', 'TimeEntryForm.js');
const formContent = fs.readFileSync(formPath, 'utf8');

// Controlla che le nuove sezioni siano presenti
const checksToPerform = [
  {
    label: 'Viaggio sabato notturno reperibilità',
    regex: /Viaggio sabato notturno.*\+.*%.*\+.*25%/,
    description: 'Sezione per viaggio sabato notturno con maggiorazioni'
  },
  {
    label: 'Viaggio festivo notturno reperibilità', 
    regex: /Viaggio festivo notturno.*\+60%/,
    description: 'Sezione per viaggio festivo notturno con maggiorazione +60%'
  },
  {
    label: 'Lavoro sabato notturno reperibilità',
    regex: /Lavoro sabato notturno.*\+.*%.*\+.*25%/,
    description: 'Sezione per lavoro sabato notturno con maggiorazioni'
  },
  {
    label: 'Lavoro festivo notturno reperibilità',
    regex: /Lavoro festivo notturno.*\+60%/,
    description: 'Sezione per lavoro festivo notturno con maggiorazione +60%'
  },
  {
    label: 'Breakdown travel hours saturday_night',
    regex: /breakdown\.standby\.travelHours\?\.saturday_night/,
    description: 'Riferimento alle ore di viaggio sabato notturno nel breakdown'
  },
  {
    label: 'Breakdown travel hours night_holiday',
    regex: /breakdown\.standby\.travelHours\?\.night_holiday/,
    description: 'Riferimento alle ore di viaggio festivo notturno nel breakdown'
  },
  {
    label: 'Breakdown work hours saturday_night',
    regex: /breakdown\.standby\.workHours\?\.saturday_night/,
    description: 'Riferimento alle ore di lavoro sabato notturno nel breakdown'
  },
  {
    label: 'Breakdown work hours night_holiday',
    regex: /breakdown\.standby\.workHours\?\.night_holiday/,
    description: 'Riferimento alle ore di lavoro festivo notturno nel breakdown'
  }
];

console.log('\n--- Verifica delle sezioni nel TimeEntryForm.js ---');
let allPassed = true;

checksToPerform.forEach((check, index) => {
  const found = check.regex.test(formContent);
  console.log(`${index + 1}. ${check.label}: ${found ? '✅ TROVATO' : '❌ MANCANTE'}`);
  if (!found) {
    console.log(`   Descrizione: ${check.description}`);
    allPassed = false;
  }
});

console.log('\n--- Verifica calcoli nelle sezioni esistenti ---');

// Verifica che le sezioni esistenti usino i calcoli corretti
const calculationChecks = [
  {
    label: 'Calcolo sabato notturno (lavoro)',
    regex: /settings\.contract\?\.overtimeRates\?\.saturday.*\*.*1\.25.*workHours\.saturday_night/,
    description: 'Calcolo corretto per lavoro sabato notturno: tariffa base * sabato% * 1.25'
  },
  {
    label: 'Calcolo festivo notturno (lavoro)',
    regex: /settings\.contract\?\.hourlyRate.*\*.*1\.60.*workHours\.night_holiday/,
    description: 'Calcolo corretto per lavoro festivo notturno: tariffa base * 1.60'
  },
  {
    label: 'Calcolo sabato notturno (viaggio)',
    regex: /settings\.contract\?\.overtimeRates\?\.saturday.*\*.*1\.25.*travelHours\.saturday_night/,
    description: 'Calcolo corretto per viaggio sabato notturno: tariffa base * sabato% * 1.25 * travel%'
  },
  {
    label: 'Calcolo festivo notturno (viaggio)',
    regex: /settings\.contract\?\.hourlyRate.*\*.*1\.60.*travelHours\.night_holiday/,
    description: 'Calcolo corretto per viaggio festivo notturno: tariffa base * 1.60 * travel%'
  }
];

calculationChecks.forEach((check, index) => {
  const found = check.regex.test(formContent);
  console.log(`${index + 1}. ${check.label}: ${found ? '✅ TROVATO' : '❌ MANCANTE'}`);
  if (!found) {
    console.log(`   Descrizione: ${check.description}`);
    allPassed = false;
  }
});

console.log('\n--- Verifica del totale nel breakdown viaggio ---');

// Verifica che il calcolo del totale viaggio includa tutte le categorie
const totalTravelIncludes = [
  'breakdown.standby.travelHours?.ordinary',
  'breakdown.standby.travelHours?.night', 
  'breakdown.standby.travelHours?.saturday',
  'breakdown.standby.travelHours?.saturday_night',
  'breakdown.standby.travelHours?.holiday',
  'breakdown.standby.travelHours?.night_holiday'
];

const foundInTotal = totalTravelIncludes.filter(category => 
  formContent.includes(category)
);

console.log(`Categorie nel calcolo totale: ${foundInTotal.length}/${totalTravelIncludes.length}`);
foundInTotal.forEach(cat => console.log(`  ✅ ${cat}`));

const missingInTotal = totalTravelIncludes.filter(category => 
  !formContent.includes(category)
);
if (missingInTotal.length > 0) {
  console.log('Categorie mancanti nel totale:');
  missingInTotal.forEach(cat => console.log(`  ❌ ${cat}`));
  allPassed = false;
}

console.log('\n--- Risultato finale ---');
if (allPassed) {
  console.log('✅ TUTTI I CONTROLLI SUPERATI: Tutte le categorie di viaggio sono state aggiunte correttamente al breakdown del form');
} else {
  console.log('❌ ALCUNI CONTROLLI FALLITI: Alcune categorie potrebbero essere mancanti o incomplete');
}

console.log('\n--- Statistiche file ---');
console.log(`Dimensione file: ${formContent.length} caratteri`);
console.log(`Linee nel file: ${formContent.split('\n').length}`);

// Conta le occorrenze delle parole chiave per debug
const keywordCounts = {
  'standby': (formContent.match(/standby/g) || []).length,
  'travelHours': (formContent.match(/travelHours/g) || []).length,
  'workHours': (formContent.match(/workHours/g) || []).length,
  'saturday_night': (formContent.match(/saturday_night/g) || []).length,
  'night_holiday': (formContent.match(/night_holiday/g) || []).length
};

console.log('\nOccorrenze parole chiave:');
Object.entries(keywordCounts).forEach(([word, count]) => {
  console.log(`  ${word}: ${count} occorrenze`);
});

return allPassed;
