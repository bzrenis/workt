/**
 * Test per verificare che la correzione del refuso loading -> isLoading sia stata applicata
 * Controlla che non ci siano più riferimenti a 'loading' nel codice
 */

const fs = require('fs');
const path = require('path');

function testLoadingRefactoring() {
  console.log('🔍 Test correzione refuso loading -> isLoading...\n');
  
  try {
    const timeEntryPath = path.join(__dirname, 'src', 'screens', 'TimeEntryScreen.js');
    const content = fs.readFileSync(timeEntryPath, 'utf8');
    
    // Verifica che non ci siano più riferimenti a 'loading' non in commenti o stringhe di stile
    const lines = content.split('\n');
    const problematicLines = [];
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Escludiamo: commenti, stringhe di stile (loadingContainer, loadingText), e ActivityIndicator
      if (line.includes('loading') && 
          !line.includes('//') && 
          !line.includes('loadingContainer') && 
          !line.includes('loadingText') && 
          !line.includes('Caricamento')) {
        
        // Verifica se è un riferimento problematico alla variabile loading
        if (line.includes('if (loading)') || 
            line.includes('loading &&') || 
            line.includes('&& loading') ||
            line.includes('loading}') ||
            line.includes('{loading')) {
          problematicLines.push({ line: lineNumber, content: line.trim() });
        }
      }
    });
    
    if (problematicLines.length > 0) {
      console.log('❌ TROVATI RIFERIMENTI PROBLEMATICI A "loading":');
      problematicLines.forEach(({ line, content }) => {
        console.log(`   Riga ${line}: ${content}`);
      });
      return false;
    }
    
    // Verifica che ci siano i riferimenti corretti a isLoading
    const hasIsLoadingDeclaration = content.includes('const { entries, isLoading, refreshEntries }');
    const hasIsLoadingCondition = content.includes('if (isLoading)');
    const hasIsLoadingInUseEffect = content.includes('[entries, standbyAllowances, selectedYear, selectedMonth, isLoading]');
    const hasIsLoadingInRefresh = content.includes('refreshing={isLoading}');
    
    console.log('✅ VERIFICA CORREZIONI:');
    console.log(`   Dichiarazione isLoading: ${hasIsLoadingDeclaration ? '✅' : '❌'}`);
    console.log(`   Condizione if (isLoading): ${hasIsLoadingCondition ? '✅' : '❌'}`);
    console.log(`   isLoading in useEffect deps: ${hasIsLoadingInUseEffect ? '✅' : '❌'}`);
    console.log(`   isLoading in RefreshControl: ${hasIsLoadingInRefresh ? '✅' : '❌'}`);
    
    const allCorrect = hasIsLoadingDeclaration && hasIsLoadingCondition && 
                      hasIsLoadingInUseEffect && hasIsLoadingInRefresh;
    
    if (allCorrect) {
      console.log('\n🎉 CORREZIONE COMPLETATA CON SUCCESSO!');
      console.log('   Tutti i riferimenti a loading sono stati corretti in isLoading');
      return true;
    } else {
      console.log('\n❌ Alcune correzioni mancano ancora');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Errore durante il test:', error.message);
    return false;
  }
}

// Esegui il test
const success = testLoadingRefactoring();
process.exit(success ? 0 : 1);
