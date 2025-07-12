/**
 * Fix definitivo per tutti gli accessi non sicuri a monthlyAggregated in DashboardScreen.js
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'screens', 'DashboardScreen.js');

function fixMonthlyAggregatedAccess() {
  console.log('🔧 Fixing monthlyAggregated access in DashboardScreen.js...');
  
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ DashboardScreen.js non trovato');
    return;
  }
  
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Lista di correzioni da applicare
  const fixes = [
    // Fix principale: renderEarningsBreakdownSection
    {
      from: 'monthlyAggregated.totalEarnings === 0',
      to: '(monthlyAggregated?.totalEarnings || 0) === 0'
    },
    
    // Fix renderWorkPatternsSection
    {
      from: 'monthlyAggregated.daysWorked === 0',
      to: '(monthlyAggregated?.daysWorked || 0) === 0'
    },
    
    // Fix accessi diretti a analytics senza controllo
    {
      from: 'monthlyAggregated.analytics;',
      to: 'monthlyAggregated?.analytics;'
    },
    
    // Fix accessi a proprietà specifiche
    {
      from: 'monthlyAggregated.analytics.standbyInterventions',
      to: 'monthlyAggregated?.analytics?.standbyInterventions'
    },
    
    // Fix divisioni che possono causare NaN
    {
      from: '/ monthlyAggregated.totalHours)',
      to: '/ (monthlyAggregated?.totalHours || 1))'
    },
    
    // Fix altri accessi diretti
    {
      from: 'monthlyAggregated.ordinary.total',
      to: 'monthlyAggregated?.ordinary?.total'
    },
    
    // Fix accessi a standby
    {
      from: 'monthlyAggregated.standby.totalEarnings',
      to: 'monthlyAggregated?.standby?.totalEarnings'
    },
    
    // Fix accessi a travel
    {
      from: 'monthlyAggregated.travel.totalEarnings',
      to: 'monthlyAggregated?.travel?.totalEarnings'
    }
  ];
  
  // Applica tutte le correzioni
  fixes.forEach(fix => {
    const oldContent = content;
    content = content.replace(new RegExp(escapeRegExp(fix.from), 'g'), fix.to);
    if (content !== oldContent) {
      console.log(`✅ Fixed: ${fix.from} -> ${fix.to}`);
    }
  });
  
  // Correzioni specifiche per righe problematiche
  const lineSpecificFixes = [
    // Riga 1531: renderEarningsBreakdownSection
    {
      pattern: /if \(!analytics \|\| monthlyAggregated\.totalEarnings === 0\)/g,
      replacement: 'if (!analytics || (monthlyAggregated?.totalEarnings || 0) === 0)'
    },
    
    // Riga 1399: renderWorkPatternsSection
    {
      pattern: /if \(!analytics \|\| monthlyAggregated\.daysWorked === 0\)/g,
      replacement: 'if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0)'
    },
    
    // Accessi analytics senza controllo
    {
      pattern: /const analytics = monthlyAggregated\.analytics;/g,
      replacement: 'const analytics = monthlyAggregated?.analytics;'
    }
  ];
  
  lineSpecificFixes.forEach(fix => {
    const oldContent = content;
    content = content.replace(fix.pattern, fix.replacement);
    if (content !== oldContent) {
      console.log(`✅ Applied line-specific fix: ${fix.replacement}`);
    }
  });
  
  // Salva il file corretto
  fs.writeFileSync(dashboardPath, content, 'utf8');
  console.log('✅ DashboardScreen.js aggiornato con accessi sicuri a monthlyAggregated');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Esegui la correzione
try {
  fixMonthlyAggregatedAccess();
  console.log('🎉 Correzione monthlyAggregated completata!');
} catch (error) {
  console.error('❌ Errore durante la correzione:', error);
}
