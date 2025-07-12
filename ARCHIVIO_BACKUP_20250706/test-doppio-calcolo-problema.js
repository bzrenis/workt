// Test per verificare il doppio calcolo problematico

const testDoubleCalculation = () => {
  console.log('🚨 PROBLEMA IDENTIFICATO: DOPPIO CALCOLO INDENNITÀ');
  console.log('='.repeat(60));
  
  console.log('📊 SITUAZIONE ATTUALE:');
  console.log('   Indennità base: 15.00€');
  console.log('   Ore lavorate: 7h');
  console.log('   Risultato finale: 6.56€');
  
  console.log('\n🔍 ANALISI DEL CALCOLO:');
  console.log('   1. Calcolo CCNL: 7h / 8h = 87.5%');
  console.log('   2. 15.00€ × 87.5% = 13.125€');
  console.log('   3. MA poi applica "mezza giornata": 13.125€ × 50% = 6.5625€');
  console.log('   4. Arrotondato: 6.56€');
  
  console.log('\n❌ IL PROBLEMA:');
  console.log('   Hai ENTRAMBE le opzioni attive:');
  console.log('   ✓ "Calcolo proporzionale CCNL" (87.5%)');
  console.log('   ✓ "Metà indennità se mezza giornata" (50%)');
  console.log('   → Il sistema applica ENTRAMBE le riduzioni!');
  
  console.log('\n✅ LA SOLUZIONE:');
  console.log('   1. Vai in Impostazioni → Indennità Trasferta');
  console.log('   2. DESELEZIONA "Metà indennità se mezza giornata"');
  console.log('   3. Mantieni SOLO "Calcolo proporzionale CCNL"');
  console.log('   4. Salva le impostazioni');
  
  console.log('\n📈 RISULTATO ATTESO:');
  console.log('   Solo calcolo CCNL: 15.00€ × 87.5% = 13.13€');
  console.log('   Miglioramento: da 6.56€ a 13.13€ (+6.57€)');
  
  console.log('\n⚠️  NOTA IMPORTANTE:');
  console.log('   Non puoi avere entrambe le opzioni attive!');
  console.log('   Il calcolo CCNL sostituisce completamente');
  console.log('   la logica "mezza giornata 50%"');
};

testDoubleCalculation();
