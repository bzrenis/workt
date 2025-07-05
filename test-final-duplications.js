// Test finale per verificare che le sezioni non si ripetano
console.log('Test: Verifica finale duplicazioni sezioni viaggio');

const fs = require('fs');
const path = require('path');

const formPath = path.join(__dirname, 'src', 'screens', 'TimeEntryForm.js');
const formContent = fs.readFileSync(formPath, 'utf8');

// Estrai tutte le sezioni delle viaggio dalle linee 500 a 700 (zona del breakdown reperibilità)
const lines = formContent.split('\n');
const breakdownStart = lines.findIndex(line => line.includes('Interventi Reperibilità'));
const breakdownEnd = lines.findIndex((line, index) => 
  index > breakdownStart && line.includes('Totale reperibilità')
);

console.log(`Analizzando linee ${breakdownStart} - ${breakdownEnd} (sezione Interventi Reperibilità)`);

const breakdownSection = lines.slice(breakdownStart, breakdownEnd).join('\n');

// Conta le occorrenze specifiche nella sezione del breakdown
const travelSections = [
  'Viaggio diurno',
  'Viaggio notturno (+25%)',
  'Viaggio sabato (+',
  'Viaggio sabato notturno (+',
  'Viaggio festivo (+30%)', 
  'Viaggio festivo notturno (+60%)'
];

console.log('\n--- Analisi sezioni viaggio nel breakdown ---');
let duplicationsFound = false;

travelSections.forEach(section => {
  const matches = (breakdownSection.match(new RegExp(section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []);
  const count = matches.length;
  
  console.log(`"${section}": ${count} occorrenze ${count === 1 ? '✅' : count === 0 ? '⚠️ MANCANTE' : '❌ DUPLICATO'}`);
  
  if (count > 1) {
    duplicationsFound = true;
    console.log(`  ⚠️ Trovate ${count} duplicazioni per "${section}"`);
  }
});

// Verifica anche che non ci sia la sezione generica
const genericSection = breakdownSection.includes('breakdownLabel">Viaggio reperibilità<');
console.log(`\nSezione generica "Viaggio reperibilità": ${genericSection ? '❌ PRESENTE' : '✅ RIMOSSA'}`);

// Cerca patterns di calcoli complessi che indicano la vecchia sezione generica
const complexCalculation = breakdownSection.includes('parts.join');
console.log(`Calcolo complesso (vecchia sezione): ${complexCalculation ? '❌ PRESENTE' : '✅ RIMOSSO'}`);

// Risultato finale
console.log('\n--- Risultato finale ---');
const success = !duplicationsFound && !genericSection && !complexCalculation;

if (success) {
  console.log('✅ PERFETTO: Nessuna duplicazione trovata nel breakdown. Ogni sezione viaggio appare esattamente una volta.');
} else {
  console.log('❌ PROBLEMI TROVATI nel breakdown:');
  if (duplicationsFound) console.log('  - Alcune sezioni sono duplicate');
  if (genericSection) console.log('  - Sezione generica ancora presente');
  if (complexCalculation) console.log('  - Calcolo complesso della vecchia sezione ancora presente');
}

// Test extra: verifica che la struttura sia logicamente corretta
console.log('\n--- Verifica struttura logica ---');
const hasInterventiSection = breakdownSection.includes('Interventi Reperibilità');
const hasTotaleSection = breakdownSection.includes('Totale reperibilità');
const hasNoteSection = breakdownSection.includes('Gli interventi di reperibilità sono retribuiti');

console.log(`Sezione "Interventi Reperibilità": ${hasInterventiSection ? '✅' : '❌'}`);
console.log(`Sezione "Totale reperibilità": ${hasTotaleSection ? '✅' : '❌'}`);
console.log(`Note esplicative CCNL: ${hasNoteSection ? '✅' : '❌'}`);

const structureCorrect = hasInterventiSection && hasTotaleSection && hasNoteSection;
console.log(`Struttura generale corretta: ${structureCorrect ? '✅' : '❌'}`);

return success && structureCorrect;
