/**
 * Script per correggere automaticamente tutti gli accessi non sicuri a breakdown
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Avvio correzione automatica accessi breakdown non sicuri...');

// Patterns di correzione
const patterns = [
  // breakdown.ordinary.something -> breakdown?.ordinary?.something
  {
    search: /breakdown\.ordinary\.([a-zA-Z0-9_]+)/g,
    replace: 'breakdown?.ordinary?.$1'
  },
  // breakdown.standby.something -> breakdown?.standby?.something  
  {
    search: /breakdown\.standby\.([a-zA-Z0-9_]+)/g,
    replace: 'breakdown?.standby?.$1'
  },
  // breakdown.allowances.something -> breakdown?.allowances?.something
  {
    search: /breakdown\.allowances\.([a-zA-Z0-9_]+)/g,
    replace: 'breakdown?.allowances?.$1'
  },
  // breakdown.details.something -> breakdown?.details?.something
  {
    search: /breakdown\.details\.([a-zA-Z0-9_]+)/g,
    replace: 'breakdown?.details?.$1'
  }
];

// Files da correggere
const filesToFix = [
  'src/screens/TimeEntryForm.js',
  'src/screens/TimeEntryScreen.js',
  'src/screens/MonthlySummary.js'
];

// Funzione per applicare le correzioni a un file
const fixFile = (filePath) => {
  console.log(`\n📄 Correzione: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ File non trovato: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = 0;
    
    patterns.forEach(pattern => {
      const matches = content.match(pattern.search);
      if (matches) {
        console.log(`  🔍 Trovate ${matches.length} occorrenze per pattern: ${pattern.search}`);
        content = content.replace(pattern.search, pattern.replace);
        changesMade += matches.length;
      }
    });
    
    if (changesMade > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ ${changesMade} correzioni applicate`);
    } else {
      console.log(`  ℹ️ Nessuna correzione necessaria`);
    }
    
  } catch (error) {
    console.log(`  ❌ Errore durante la correzione: ${error.message}`);
  }
};

// Esegui correzioni
filesToFix.forEach(fixFile);

console.log('\n✅ Correzione automatica completata');
console.log('🎯 Tutti gli accessi a breakdown dovrebbero ora essere protetti con optional chaining');
