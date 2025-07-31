/**
 * 🔍 DEBUG BREAKDOWN - Verifica perché i dettagli non appaiono
 */

console.log('🔍 === DEBUG BREAKDOWN DAILY_RATE_WITH_SUPPLEMENTS ===');
console.log('');

// Simula il caricamento del metodo di calcolo
console.log('1️⃣ Verifico il metodo di calcolo salvato...');

const fs = require('fs');

// Verifica che la chiamata al metodo sia nel posto giusto
const calculationServiceContent = fs.readFileSync('./src/services/CalculationService.js', 'utf8');

console.log('2️⃣ Verifico il flusso nel CalculationService...');

// Cerca il punto dove viene chiamato calculateDailyRateWithSupplements
const callsMethod = calculationServiceContent.includes('paymentCalculationMethod === \'DAILY_RATE_WITH_SUPPLEMENTS\'');
const hasMethodCall = calculationServiceContent.includes('this.calculateDailyRateWithSupplements(workEntry, settings, workHours, travelHours)');
const setsBreakdown = calculationServiceContent.includes('result.details.dailyRateBreakdown = dailyRateResult.breakdown');

console.log('   Controlli flusso CalculationService:', {
  verificaMetodo: callsMethod ? '✅' : '❌',
  chiamaMetodo: hasMethodCall ? '✅' : '❌', 
  impostaBreakdown: setsBreakdown ? '✅' : '❌'
});

// Verifica nel TimeEntryForm
const timeEntryFormContent = fs.readFileSync('./src/screens/TimeEntryForm.js', 'utf8');

console.log('3️⃣ Verifico il rendering nel TimeEntryForm...');

const hasRenderCheck = timeEntryFormContent.includes('breakdown?.details?.calculationMethod === \'DAILY_RATE_WITH_SUPPLEMENTS\'');
const hasBreakdownRender = timeEntryFormContent.includes('breakdown?.details?.dailyRateBreakdown');
const hasLogSystem = timeEntryFormContent.includes('SISTEMA TARIFFA GIORNALIERA ATTIVO');

console.log('   Controlli rendering TimeEntryForm:', {
  verificaMetodoRender: hasRenderCheck ? '✅' : '❌',
  renderBreakdown: hasBreakdownRender ? '✅' : '❌',
  logSistema: hasLogSystem ? '✅' : '❌'
});

console.log('4️⃣ Possibili problemi da verificare...');
console.log('');

if (!callsMethod || !hasMethodCall || !setsBreakdown) {
  console.log('❌ PROBLEMA NEL CALCULATIONSERVICE:');
  console.log('   Il metodo non viene chiamato o il breakdown non viene impostato');
}

if (!hasRenderCheck || !hasBreakdownRender) {
  console.log('❌ PROBLEMA NEL TIMEENTRYFORM:');
  console.log('   Il breakdown non viene renderizzato correttamente');
}

// Suggerimenti per il debug
console.log('🔧 PASSI PER IL DEBUG:');
console.log('');
console.log('1. Apri l\'app e vai nel TimeEntryForm');
console.log('2. Inserisci un intervento su giorno feriale (es. Lunedì)');
console.log('3. Controlla i log nella console per vedere:');
console.log('   📊 "SISTEMA TARIFFA GIORNALIERA ATTIVO:" - se appare');
console.log('   📊 "Metodo DAILY_RATE_WITH_SUPPLEMENTS attivo" - se appare');
console.log('   📊 Il breakdown completo del risultato');
console.log('');

console.log('4. Verifica che nelle impostazioni sia selezionato:');
console.log('   "Tariffa Giornaliera + Maggiorazioni CCNL"');
console.log('');

console.log('5. Se i log non appaiono, il problema è in:');
console.log('   • AsyncStorage non carica il metodo corretto');
console.log('   • La condizione if non viene soddisfatta');
console.log('   • Il metodo calculateDailyRateWithSupplements non viene chiamato');
console.log('');

console.log('6. Se i log appaiono ma l\'UI no, il problema è in:');
console.log('   • La struttura del breakdown non è corretta');
console.log('   • La condizione di rendering nel TimeEntryForm');
console.log('   • I dati non vengono passati correttamente');
console.log('');

console.log('✅ Controlla i log e dimmi cosa appare nella console!');
console.log('   Questo ci aiuterà a capire dove si interrompe il flusso.');
