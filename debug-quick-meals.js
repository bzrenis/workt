console.log('🔍 DEBUG QUICK - Controllando struttura meals...');

// Simula la struttura che dovrebbe essere nel componente
const testMeals = {
  lunch: { voucher: 32, cash: 16, specific: 14 },
  dinner: { voucher: 0, cash: 0, specific: 0 }
};

console.log('Test visualizzazione:');
console.log('\nPranzo:');
if (testMeals.lunch.voucher > 0) console.log(`  ${testMeals.lunch.voucher} € (buono)`);
if (testMeals.lunch.cash > 0) console.log(`  ${testMeals.lunch.cash} € (contanti)`);
if (testMeals.lunch.specific > 0) console.log(`  ${testMeals.lunch.specific} € (contanti - valore specifico)`);

console.log('\nCena:');
if (testMeals.dinner.voucher > 0) console.log(`  ${testMeals.dinner.voucher} € (buono)`);
if (testMeals.dinner.cash > 0) console.log(`  ${testMeals.dinner.cash} € (contanti)`);
if (testMeals.dinner.specific > 0) console.log(`  ${testMeals.dinner.specific} € (contanti - valore specifico)`);

const hasDinner = testMeals.dinner.voucher > 0 || testMeals.dinner.cash > 0 || testMeals.dinner.specific > 0;
console.log(`\nLa sezione cena dovrebbe essere mostrata? ${hasDinner ? 'SÌ' : 'NO'}`);

if (!hasDinner) {
  console.log('✅ È normale che la cena non appaia se tutti i valori sono 0');
  console.log('📊 Dalla foto si vede solo pranzo, quindi probabilmente non ci sono cene nel periodo');
}
