console.log('🔍 DEBUG CALCOLO EXTRA MENSILE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

function debugExtraCalculation(grossAmount, monthlyGrossSalary) {
  console.log(`\n💰 Importo lordo: €${grossAmount}`);
  console.log(`📊 Stipendio base: €${monthlyGrossSalary}`);
  
  const baseAnnual = monthlyGrossSalary * 12;
  const extraMonthly = Math.max(0, grossAmount - monthlyGrossSalary);
  const estimatedAnnual = baseAnnual + (extraMonthly * 12);
  const calculationBase = estimatedAnnual / 12;
  
  console.log(`→ Base annuale: €${baseAnnual.toFixed(2)}`);
  console.log(`→ Extra mensile: €${extraMonthly.toFixed(2)}`);
  console.log(`→ Extra annualizzato: €${(extraMonthly * 12).toFixed(2)}`);
  console.log(`→ Stima annuale totale: €${estimatedAnnual.toFixed(2)}`);
  console.log(`→ Base calcolo mensile: €${calculationBase.toFixed(2)}`);
  
  if (grossAmount > monthlyGrossSalary) {
    console.log(`⚠️  PROBLEMA: L'extra viene annualizzato!`);
    console.log(`   Questo aumenta artificialmente la base di calcolo`);
    console.log(`   perché assume che l'extra si ripeta per 12 mesi.`);
  }
}

const monthlyGrossSalary = 2839.07;

debugExtraCalculation(2500, monthlyGrossSalary);
debugExtraCalculation(3200, monthlyGrossSalary);
debugExtraCalculation(4000, monthlyGrossSalary);

console.log('\n🎯 LOGICA ALTERNATIVA: Usa sempre lo stipendio base per il calcolo IRPEF');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Quando l\'utente sceglie "stima annuale", potremmo:');
console.log('1. Usare SEMPRE lo stipendio base mensile come base di calcolo');
console.log('2. Questo garantisce sempre la stessa percentuale di trattenute');
console.log('3. È più coerente con l\'idea di "stima annuale"');

console.log('\n💡 Test logica semplificata:');
[2500, 3200, 4000].forEach(gross => {
  console.log(`\n💰 Importo: €${gross} → Base calcolo: €${monthlyGrossSalary} (sempre uguale)`);
});
