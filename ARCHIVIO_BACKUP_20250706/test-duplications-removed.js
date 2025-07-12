// Test per verificare che non ci siano duplicazioni nel breakdown del form
console.log('Test: Verifica rimozione duplicazioni nel breakdown viaggio reperibilità');

const fs = require('fs');
const path = require('path');

// Leggi il file TimeEntryForm.js
const formPath = path.join(__dirname, 'src', 'screens', 'TimeEntryForm.js');
const formContent = fs.readFileSync(formPath, 'utf8');

console.log('\n--- Verifica duplicazioni rimosse ---');

// Controlla che non ci sia più la sezione generica "Viaggio reperibilità"
const hasGenericTravelSection = /Viaggio reperibilità.*formatSafeHours.*\+.*\+.*\+/.test(formContent);
console.log(`1. Sezione generica "Viaggio reperibilità" rimossa: ${!hasGenericTravelSection ? '✅ SÌ' : '❌ ANCORA PRESENTE'}`);

// Controlla che ci siano le sezioni specifiche
const specificSections = [
  {
    label: 'Viaggio diurno',
    regex: /Viaggio diurno.*breakdown\.standby\.travelHours\?\.ordinary/,
    description: 'Sezione specifica per viaggio diurno'
  },
  {
    label: 'Viaggio notturno (+25%)',
    regex: /Viaggio notturno.*\(\+25%\).*breakdown\.standby\.travelHours\?\.night/,
    description: 'Sezione specifica per viaggio notturno'
  },
  {
    label: 'Viaggio sabato',
    regex: /Viaggio sabato.*breakdown\.standby\.travelHours\?\.saturday/,
    description: 'Sezione specifica per viaggio sabato'
  },
  {
    label: 'Viaggio sabato notturno',
    regex: /Viaggio sabato notturno.*breakdown\.standby\.travelHours\?\.saturday_night/,
    description: 'Sezione specifica per viaggio sabato notturno'
  },
  {
    label: 'Viaggio festivo',
    regex: /Viaggio festivo.*\(\+30%\).*breakdown\.standby\.travelHours\?\.holiday/,
    description: 'Sezione specifica per viaggio festivo'
  },
  {
    label: 'Viaggio festivo notturno',
    regex: /Viaggio festivo notturno.*\(\+60%\).*breakdown\.standby\.travelHours\?\.night_holiday/,
    description: 'Sezione specifica per viaggio festivo notturno'
  }
];

console.log('\n--- Verifica sezioni specifiche presenti ---');
let allSpecificPresent = true;

specificSections.forEach((section, index) => {
  const found = section.regex.test(formContent);
  console.log(`${index + 1}. ${section.label}: ${found ? '✅ PRESENTE' : '❌ MANCANTE'}`);
  if (!found) {
    console.log(`   ${section.description}`);
    allSpecificPresent = false;
  }
});

// Conta le occorrenze per verificare che non ci siano duplicati
console.log('\n--- Conteggio occorrenze sezioni viaggio ---');
const travelSectionCounts = {
  'Viaggio diurno': (formContent.match(/Viaggio diurno/g) || []).length,
  'Viaggio notturno': (formContent.match(/Viaggio notturno/g) || []).length,
  'Viaggio sabato': (formContent.match(/Viaggio sabato.*\(\+/g) || []).length,
  'Viaggio sabato notturno': (formContent.match(/Viaggio sabato notturno/g) || []).length,
  'Viaggio festivo': (formContent.match(/Viaggio festivo.*\(\+/g) || []).length,
  'Viaggio festivo notturno': (formContent.match(/Viaggio festivo notturno/g) || []).length,
  'Viaggio reperibilità (generico)': (formContent.match(/Viaggio reperibilità.*Text.*breakdownLabel/g) || []).length
};

let noDuplicates = true;
Object.entries(travelSectionCounts).forEach(([section, count]) => {
  const isGeneric = section.includes('generico');
  const expectedCount = isGeneric ? 0 : 1; // Le sezioni generiche non dovrebbero esistere
  const status = count === expectedCount ? '✅ OK' : '❌ PROBLEMA';
  
  console.log(`${section}: ${count} occorrenze ${status}`);
  
  if (count !== expectedCount) {
    noDuplicates = false;
    if (count > expectedCount && !isGeneric) {
      console.log(`  ⚠️ Possibile duplicazione (atteso: ${expectedCount}, trovato: ${count})`);
    } else if (count > expectedCount && isGeneric) {
      console.log(`  ⚠️ Sezione generica non dovrebbe esistere`);
    } else if (count < expectedCount) {
      console.log(`  ⚠️ Sezione mancante`);
    }
  }
});

// Verifica che il calcolo totale non sia presente nelle sezioni specifiche
console.log('\n--- Verifica calcoli complessi rimossi dalle sezioni specifiche ---');
const hasComplexCalculation = /parts\.join.*\+.*total\.toFixed/.test(formContent);
console.log(`Calcolo complesso con join presente: ${hasComplexCalculation ? '❌ ANCORA PRESENTE' : '✅ RIMOSSO'}`);

// Risultato finale
console.log('\n--- Risultato finale ---');
const success = !hasGenericTravelSection && allSpecificPresent && noDuplicates && !hasComplexCalculation;

if (success) {
  console.log('✅ TUTTO OK: Duplicazioni rimosse e sezioni specifiche presenti correttamente');
} else {
  console.log('❌ PROBLEMI TROVATI: Verificare le sezioni sopra');
}

console.log('\n--- Struttura corretta attesa ---');
console.log(`
Sezioni viaggio reperibilità nel breakdown (senza duplicazioni):
1. Viaggio diurno (solo se > 0 ore)
2. Viaggio notturno (+25%) (solo se > 0 ore)  
3. Viaggio sabato (+X%) (solo se > 0 ore)
4. Viaggio sabato notturno (+X% + 25%) (solo se > 0 ore)
5. Viaggio festivo (+30%) (solo se > 0 ore)
6. Viaggio festivo notturno (+60%) (solo se > 0 ore)

Ogni sezione mostra:
- Ore per quella specifica categoria
- Calcolo semplice: tariffa x ore = importo
`);

return success;
