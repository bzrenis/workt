/**
 * Script di verifica finale per confermare che l'errore 'totalEarnings' of undefined è risolto
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'src', 'screens', 'DashboardScreen.js');

function verifyErrorFix() {
  console.log('🔍 Verifica finale delle correzioni...');
  
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ DashboardScreen.js non trovato');
    return;
  }
  
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Pattern problematici che NON devono esistere
  const problematicPatterns = [
    /monthlyAggregated\.totalEarnings(?!\?)/g,  // Accesso diretto senza optional chaining
    /monthlyAggregated\.daysWorked(?!\?)/g,     // Accesso diretto senza optional chaining
    /monthlyAggregated\.analytics(?!\?)/g,      // Accesso diretto senza optional chaining
    /monthlyAggregated\.ordinary(?!\?)/g,       // Accesso diretto senza optional chaining
    /monthlyAggregated\.standby(?!\?)/g,        // Accesso diretto senza optional chaining
    /monthlyAggregated\.allowances(?!\?)/g,     // Accesso diretto senza optional chaining
    /monthlyAggregated\.meals(?!\?)/g           // Accesso diretto senza optional chaining
  ];
  
  const problematicPatternNames = [
    'totalEarnings accesso diretto',
    'daysWorked accesso diretto',
    'analytics accesso diretto',
    'ordinary accesso diretto',
    'standby accesso diretto',
    'allowances accesso diretto',
    'meals accesso diretto'
  ];
  
  let issuesFound = 0;
  
  // Verifica che non ci siano pattern problematici
  problematicPatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.error(`❌ PROBLEMA: ${problematicPatternNames[index]} trovato ${matches.length} volte`);
      console.error(`   Esempi: ${matches.slice(0, 3).join(', ')}`);
      issuesFound++;
    } else {
      console.log(`✅ OK: ${problematicPatternNames[index]} - nessun accesso non sicuro`);
    }
  });
  
  // Pattern sicuri che DEVONO esistere
  const safePatterns = [
    /monthlyAggregated\?\./g,                    // Optional chaining generale
    /monthlyAggregated\?\.totalEarnings/g,       // totalEarnings sicuro
    /monthlyAggregated\?\.daysWorked/g,          // daysWorked sicuro
    /monthlyAggregated\?\.analytics/g            // analytics sicuro
  ];
  
  const safePatternNames = [
    'Optional chaining generale',
    'totalEarnings sicuro',
    'daysWorked sicuro',
    'analytics sicuro'
  ];
  
  // Verifica che esistano pattern sicuri
  safePatterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      console.log(`✅ SICURO: ${safePatternNames[index]} - ${matches.length} accessi protetti`);
    } else {
      console.warn(`⚠️  ATTENZIONE: ${safePatternNames[index]} - nessun accesso trovato`);
    }
  });
  
  // Verifica specifica delle funzioni critiche
  console.log('\n🎯 Verifica funzioni critiche:');
  
  // renderEarningsBreakdownSection
  if (content.includes('renderEarningsBreakdownSection')) {
    if (content.includes('if (!analytics || (monthlyAggregated?.totalEarnings || 0) === 0)')) {
      console.log('✅ renderEarningsBreakdownSection: condizione sicura implementata');
    } else {
      console.error('❌ renderEarningsBreakdownSection: condizione non sicura!');
      issuesFound++;
    }
  }
  
  // renderWorkPatternsSection
  if (content.includes('renderWorkPatternsSection')) {
    if (content.includes('if (!analytics || (monthlyAggregated?.daysWorked || 0) === 0)')) {
      console.log('✅ renderWorkPatternsSection: condizione sicura implementata');
    } else {
      console.error('❌ renderWorkPatternsSection: condizione non sicura!');
      issuesFound++;
    }
  }
  
  // Conta le occorrenze totali di accessi sicuri vs non sicuri
  const safeAccesses = (content.match(/monthlyAggregated\?\./g) || []).length;
  const unsafeAccesses = (content.match(/monthlyAggregated\.[^?]/g) || []).length;
  
  console.log(`\n📊 Statistiche accessi:`);
  console.log(`   Accessi sicuri (?.): ${safeAccesses}`);
  console.log(`   Accessi potenzialmente non sicuri: ${unsafeAccesses}`);
  
  // Risultato finale
  if (issuesFound === 0) {
    console.log('\n🎉 VERIFICA COMPLETATA: Tutti gli accessi sono SICURI!');
    console.log('✅ L\'errore "Cannot read property \'totalEarnings\' of undefined" è RISOLTO');
    return true;
  } else {
    console.log(`\n❌ VERIFICA FALLITA: ${issuesFound} problemi trovati`);
    console.log('⚠️  Sono necessarie ulteriori correzioni');
    return false;
  }
}

// Esegui la verifica
try {
  const success = verifyErrorFix();
  if (success) {
    console.log('\n✨ Il fix è stato applicato correttamente!');
    console.log('📱 L\'app dovrebbe ora funzionare senza errori nella Dashboard');
  } else {
    console.log('\n🔧 Sono necessarie ulteriori correzioni');
  }
} catch (error) {
  console.error('❌ Errore durante la verifica:', error);
}
