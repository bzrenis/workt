/**
 * Script avanzato per correggere tutti gli accessi non sicuri rimanenti
 */

const fs = require('fs');

console.log('🔧 Correzione avanzata accessi non sicuri a breakdown/analytics...');

// Patterns più completi per catturare tutti i tipi di accesso
const patterns = [
  // monthlyAggregated.something.something
  {
    search: /monthlyAggregated\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g,
    replace: 'monthlyAggregated?.$1?.$2'
  },
  // analytics.something (non già protetto)
  {
    search: /(?<![\?\.])\banalytics\.([a-zA-Z0-9_]+)/g,
    replace: 'analytics?.$1'
  },
  // breakdown.something (non già protetto)
  {
    search: /(?<![\?\.])\bbreakdown\.([a-zA-Z0-9_]+)/g,
    replace: 'breakdown?.$1'
  }
];

const filesToFix = [
  'src/screens/DashboardScreen.js',
  'src/screens/TimeEntryForm.js',
  'src/screens/TimeEntryScreen.js'
];

const fixFile = (filePath) => {
  console.log(`\n📄 Correzione avanzata: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ File non trovato: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = 0;
    
    patterns.forEach((pattern, index) => {
      const matches = content.match(pattern.search);
      if (matches) {
        console.log(`  🔍 Pattern ${index + 1}: ${matches.length} occorrenze trovate`);
        
        // Per ogni match, verifica che non sia già protetto
        const before = content.length;
        content = content.replace(pattern.search, pattern.replace);
        const after = content.length;
        
        if (before !== after) {
          changesMade += matches.length;
        }
      }
    });
    
    // Correzioni aggiuntive specifiche per casi particolari
    const specificFixes = [
      // Correzioni per accessi che potrebbero essere sfuggiti
      { from: /\.toFixed\(1\)(?![?])/g, to: '?.toFixed?.(1)' },
      { from: /aggregate\.([a-zA-Z]+)(?![?])/g, to: 'aggregate?.$1' }
    ];
    
    specificFixes.forEach(fix => {
      const beforeLength = content.length;
      content = content.replace(fix.from, fix.to);
      if (content.length !== beforeLength) {
        changesMade += 1;
      }
    });
    
    if (changesMade > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ ${changesMade} correzioni applicate`);
    } else {
      console.log(`  ℹ️ Nessuna correzione necessaria`);
    }
    
  } catch (error) {
    console.log(`  ❌ Errore: ${error.message}`);
  }
};

// Esegui correzioni
filesToFix.forEach(fixFile);

console.log('\n✅ Correzione avanzata completata');
console.log('🎯 Tutti gli accessi dovrebbero ora essere completamente protetti');
