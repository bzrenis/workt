/**
 * Fix DEFINITIVO per tutti gli accessi non sicuri a monthlyAggregated in DashboardScreen.js
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'screens', 'DashboardScreen.js');

function fixAllMonthlyAggregatedAccess() {
  console.log('🔧 Fix DEFINITIVO di tutti gli accessi monthlyAggregated...');
  
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ DashboardScreen.js non trovato');
    return;
  }
  
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Correzioni specifiche per accessi diretti problematici
  const directFixes = [
    // Accessi diretti che causano errori
    {
      from: 'monthlyAggregated.ordinary;',
      to: 'monthlyAggregated?.ordinary || {};'
    },
    {
      from: 'monthlyAggregated.standby;',
      to: 'monthlyAggregated?.standby || {};'
    },
    {
      from: 'monthlyAggregated.allowances;',
      to: 'monthlyAggregated?.allowances || {};'
    },
    {
      from: 'monthlyAggregated.meals;',
      to: 'monthlyAggregated?.meals || {};'
    },
    
    // Accessi a proprietà senza optional chaining
    {
      from: 'monthlyAggregated.ordinary?.total',
      to: 'monthlyAggregated?.ordinary?.total'
    },
    {
      from: 'monthlyAggregated.standby?.totalEarnings',
      to: 'monthlyAggregated?.standby?.totalEarnings'
    },
    {
      from: 'monthlyAggregated.standby?.workHours',
      to: 'monthlyAggregated?.standby?.workHours'
    },
    {
      from: 'monthlyAggregated.standby?.travelHours',
      to: 'monthlyAggregated?.standby?.travelHours'
    },
    {
      from: 'monthlyAggregated.allowances?.travel',
      to: 'monthlyAggregated?.allowances?.travel'
    },
    {
      from: 'monthlyAggregated.allowances?.meal',
      to: 'monthlyAggregated?.allowances?.meal'
    },
    {
      from: 'monthlyAggregated.allowances?.standby',
      to: 'monthlyAggregated?.allowances?.standby'
    },
    
    // Accessi diretti a proprietà base
    {
      from: 'monthlyAggregated.daysWorked',
      to: 'monthlyAggregated?.daysWorked'
    },
    {
      from: 'monthlyAggregated.totalHours',
      to: 'monthlyAggregated?.totalHours'
    },
    {
      from: 'monthlyAggregated.totalEarnings',
      to: 'monthlyAggregated?.totalEarnings'
    }
  ];
  
  directFixes.forEach(fix => {
    const oldContent = content;
    content = content.replaceAll(fix.from, fix.to);
    if (content !== oldContent) {
      console.log(`✅ Fixed: ${fix.from} -> ${fix.to}`);
    }
  });
  
  // Correzioni con regex per pattern più complessi
  const regexFixes = [
    // Controlli condizionali senza protezione
    {
      pattern: /monthlyAggregated\.daysWorked\s*>\s*0/g,
      replacement: '(monthlyAggregated?.daysWorked || 0) > 0'
    },
    
    // Accessi in assegnazioni che potrebbero essere undefined
    {
      pattern: /const\s+(\w+)\s*=\s*monthlyAggregated\.(\w+);/g,
      replacement: 'const $1 = monthlyAggregated?.$2 || {};'
    }
  ];
  
  regexFixes.forEach(fix => {
    const oldContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== oldContent) {
      console.log(`✅ Applied regex fix: ${fix.replacement}`);
    }
  });
  
  // Salva il file corretto
  fs.writeFileSync(dashboardPath, content, 'utf8');
  console.log('✅ DashboardScreen.js aggiornato con TUTTI gli accessi sicuri');
}

// Esegui la correzione
try {
  fixAllMonthlyAggregatedAccess();
  console.log('🎉 Correzione DEFINITIVA monthlyAggregated completata!');
} catch (error) {
  console.error('❌ Errore durante la correzione:', error);
}
