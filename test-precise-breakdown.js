// Test più preciso per verificare che le sezioni viaggio siano corrette
console.log('Test: Verifica precisa delle sezioni viaggio nel breakdown');

const fs = require('fs');
const path = require('path');

// Leggi il file TimeEntryForm.js
const formPath = path.join(__dirname, 'src', 'screens', 'TimeEntryForm.js');
const formContent = fs.readFileSync(formPath, 'utf8');

console.log('\n--- Verifica sezioni viaggio nel breakdown ---');

// Verifica la struttura corretta cercando i pattern specifici
const patterns = [
  {
    name: 'Viaggio diurno',
    pattern: /\{\/\* Viaggio diurno reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio diurno<\/Text>/,
    description: 'Sezione completa per viaggio diurno'
  },
  {
    name: 'Viaggio notturno (+25%)',
    pattern: /\{\/\* Viaggio notturno reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio notturno \(\+25%\)<\/Text>/,
    description: 'Sezione completa per viaggio notturno'
  },
  {
    name: 'Viaggio sabato',
    pattern: /\{\/\* Viaggio sabato reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio sabato \(\+/,
    description: 'Sezione completa per viaggio sabato'
  },
  {
    name: 'Viaggio sabato notturno',
    pattern: /\{\/\* Viaggio sabato notturno reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio sabato notturno \(\+/,
    description: 'Sezione completa per viaggio sabato notturno'
  },
  {
    name: 'Viaggio festivo (+30%)',
    pattern: /\{\/\* Viaggio festivo reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio festivo \(\+30%\)<\/Text>/,
    description: 'Sezione completa per viaggio festivo'
  },
  {
    name: 'Viaggio festivo notturno (+60%)',
    pattern: /\{\/\* Viaggio festivo notturno reperibilità \*\/\}[\s\S]*?breakdownLabel">Viaggio festivo notturno \(\+60%\)<\/Text>/,
    description: 'Sezione completa per viaggio festivo notturno'
  }
];

let allFound = true;
patterns.forEach((pattern, index) => {
  const matches = formContent.match(pattern.pattern);
  const found = matches !== null;
  console.log(`${index + 1}. ${pattern.name}: ${found ? '✅ TROVATO' : '❌ MANCANTE'}`);
  if (!found) {
    console.log(`   ${pattern.description}`);
    allFound = false;
  }
});

// Verifica che non ci siano sezioni generiche "Viaggio reperibilità"
console.log('\n--- Verifica rimozione sezioni generiche ---');
const hasGeneric = /breakdownLabel">Viaggio reperibilità<\/Text>/.test(formContent);
console.log(`Sezione generica "Viaggio reperibilità": ${hasGeneric ? '❌ PRESENTE' : '✅ RIMOSSA'}`);

// Verifica ordine corretto delle sezioni
console.log('\n--- Verifica ordine sezioni ---');
const sectionOrder = [
  'Viaggio diurno reperibilità',
  'Viaggio notturno reperibilità', 
  'Viaggio sabato reperibilità',
  'Viaggio sabato notturno reperibilità',
  'Viaggio festivo reperibilità',
  'Viaggio festivo notturno reperibilità'
];

let lastIndex = -1;
let orderCorrect = true;

sectionOrder.forEach((section, i) => {
  const index = formContent.indexOf(`{/* ${section} */}`);
  if (index !== -1) {
    if (index <= lastIndex) {
      console.log(`❌ Ordine errato: ${section} dovrebbe venire dopo la sezione precedente`);
      orderCorrect = false;
    } else {
      console.log(`✅ ${section} in posizione corretta`);
    }
    lastIndex = index;
  }
});

// Verifica che ogni sezione abbia la struttura completa
console.log('\n--- Verifica struttura completa delle sezioni ---');
const requiredElements = [
  'breakdownItem',
  'breakdownRow', 
  'breakdownLabel',
  'breakdownValue',
  'formatSafeHours',
  'breakdown.standby.travelHours',
  'breakdown.standby.travelEarnings',
  'rateCalc'
];

let structureComplete = true;
patterns.forEach(pattern => {
  const sectionMatch = formContent.match(pattern.pattern);
  if (sectionMatch) {
    const sectionContent = sectionMatch[0];
    const missingElements = requiredElements.filter(element => 
      !sectionContent.includes(element)
    );
    
    if (missingElements.length > 0) {
      console.log(`❌ ${pattern.name} manca: ${missingElements.join(', ')}`);
      structureComplete = false;
    } else {
      console.log(`✅ ${pattern.name} struttura completa`);
    }
  }
});

// Risultato finale
console.log('\n--- Risultato finale ---');
const success = allFound && !hasGeneric && orderCorrect && structureComplete;

if (success) {
  console.log('✅ PERFETTO: Tutte le sezioni viaggio sono presenti, ordinate correttamente e complete');
} else {
  console.log('❌ PROBLEMI TROVATI:');
  if (!allFound) console.log('  - Alcune sezioni mancano');
  if (hasGeneric) console.log('  - Sezione generica ancora presente');
  if (!orderCorrect) console.log('  - Ordine sezioni non corretto');
  if (!structureComplete) console.log('  - Struttura di alcune sezioni incompleta');
}

console.log('\n--- Test finale semplificato ---');
// Test semplice: conta solo i commenti delle sezioni
const commentCounts = sectionOrder.map(section => {
  const count = (formContent.match(new RegExp(`\\/\\* ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\*\\/`, 'g')) || []).length;
  return { section, count };
});

commentCounts.forEach(({ section, count }) => {
  console.log(`${section}: ${count} occorrenze ${count === 1 ? '✅' : '❌'}`);
});

const totalExpected = sectionOrder.length;
const totalFound = commentCounts.reduce((sum, { count }) => sum + count, 0);
console.log(`\nTotale sezioni: ${totalFound}/${totalExpected} ${totalFound === totalExpected ? '✅' : '❌'}`);

return success;
