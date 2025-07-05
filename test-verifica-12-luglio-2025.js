// Verifica del 12/07/2025 - Controllo indennità trasferta 50%
// Analisi conforme al CCNL Metalmeccanico PMI

console.log("🔍 VERIFICA: Indennità trasferta 12/07/2025 al 50%");
console.log("=" .repeat(60));

// Analisi della data
const dataVerifica = new Date('2025-07-12');
const giornoSettimana = dataVerifica.getDay(); // 0=domenica, 1=lunedì, ..., 6=sabato
const nomiGiorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

console.log(`\n📅 ANALISI DATA: ${dataVerifica.toLocaleDateString('it-IT')}`);
console.log(`   Giorno della settimana: ${nomiGiorni[giornoSettimana]} (indice: ${giornoSettimana})`);

// Determina tipo di giorno secondo CCNL
const isSunday = giornoSettimana === 0;
const isSaturday = giornoSettimana === 6;
const isWeekday = !isSunday && !isSaturday;

console.log(`   È domenica: ${isSunday}`);
console.log(`   È sabato: ${isSaturday}`);
console.log(`   È giorno feriale: ${isWeekday}`);

// Simula una funzione per i festivi (semplificata per il test)
function isItalianHoliday(date) {
  // Controllo festivi principali 2025
  const holidays2025 = [
    '2025-01-01', // Capodanno
    '2025-01-06', // Epifania
    '2025-04-20', // Pasquetta (esempio)
    '2025-04-25', // Liberazione
    '2025-05-01', // Festa del lavoro
    '2025-06-02', // Festa della Repubblica
    '2025-08-15', // Ferragosto
    '2025-11-01', // Ognissanti
    '2025-12-08', // Immacolata
    '2025-12-25', // Natale
    '2025-12-26'  // Santo Stefano
  ];
  
  const dateStr = date.toISOString().split('T')[0];
  return holidays2025.includes(dateStr);
}

const isHoliday = isItalianHoliday(dataVerifica);
console.log(`   È festivo: ${isHoliday}`);

console.log("\n" + "=" .repeat(60));
console.log("📋 REGOLE CCNL PER INDENNITÀ TRASFERTA");
console.log("=" .repeat(60));

console.log("\n✅ GIORNI NORMALI (Lunedì-Venerdì + Sabato):");
console.log("   • Indennità trasferta: 100% se condizioni soddisfatte");
console.log("   • Sabato: Sempre considerato giorno lavorativo normale");
console.log("   • Non richiede toggle speciale");

console.log("\n🔶 GIORNI SPECIALI (Domenica + Festivi):");
console.log("   • Indennità trasferta: 0% di default");
console.log("   • Applicabile solo se toggle 'applyOnSpecialDays' attivato");
console.log("   • Oppure se override manuale attivato");

console.log("\n🎯 POSSIBILI SCENARI PER INDENNITÀ AL 50%:");
console.log("   1. Mezza giornata con regola 'HALF_ALLOWANCE_HALF_DAY'");
console.log("   2. Override manuale con percentuale personalizzata");
console.log("   3. Errore di configurazione");

console.log("\n" + "=" .repeat(60));
console.log("🔍 ANALISI SPECIFICA 12/07/2025");
console.log("=" .repeat(60));

if (isSaturday) {
  console.log("\n✅ SABATO - COMPORTAMENTO CORRETTO:");
  console.log("   • Il sabato è sempre un giorno lavorativo normale");
  console.log("   • Indennità trasferta: 100% se condizioni soddisfatte");
  console.log("   • Maggiorazione CCNL: +25% sulle ore lavorate");
  console.log("   \n❌ INDENNITÀ AL 50% NON CORRETTA per il sabato");
  console.log("   • Non dovrebbe essere ridotta al 50% solo perché è sabato");
  console.log("   • Possibili cause: configurazione errata o mezza giornata");
} else if (isSunday || isHoliday) {
  console.log("\n🔶 GIORNO SPECIALE - VERIFICA NECESSARIA:");
  console.log("   • Domenica/Festivo richiedono toggle speciale o override");
  console.log("   • Se indennità presente, dovrebbe essere 100% (non 50%)");
  console.log("   \n❓ INDENNITÀ AL 50% POTENZIALMENTE ERRATA");
  console.log("   • Verificare se è per mezza giornata o configurazione sbagliata");
} else {
  console.log("\n✅ GIORNO FERIALE - COMPORTAMENTO STANDARD:");
  console.log("   • Indennità trasferta: 100% se condizioni soddisfatte");
  console.log("   • Nessuna restrizione speciale");
  console.log("   \n❌ INDENNITÀ AL 50% NON CORRETTA per giorno feriale");
  console.log("   • Solo se mezza giornata con regola specifica");
}

console.log("\n" + "=" .repeat(60));
console.log("🚨 RACCOMANDAZIONI");
console.log("=" .repeat(60));

console.log("\n🔧 VERIFICA NECESSARIA:");
console.log("   1. Controllare ore lavorate (mezza vs piena giornata)");
console.log("   2. Verificare regole attivazione indennità");
console.log("   3. Controllare se c'è override manuale");
console.log("   4. Verificare impostazioni 'HALF_ALLOWANCE_HALF_DAY'");

console.log("\n📝 POSSIBILI CORREZIONI:");
console.log("   • Se piena giornata: Indennità dovrebbe essere 100%");
console.log("   • Se mezza giornata: Verificare regola configurata");
console.log("   • Se override: Verificare se percentuale è corretta");

console.log("\n✨ COMPORTAMENTO ATTESO CCNL:");
if (isSaturday) {
  console.log("   • Sabato: Indennità 100% + maggiorazione +25% ore lavorate");
} else if (isSunday || isHoliday) {
  console.log("   • Domenica/Festivo: Indennità 0% o 100% (mai 50%)");
} else {
  console.log("   • Feriale: Indennità 100% se condizioni soddisfatte");
}

console.log("\n🎯 CONCLUSIONE:");
console.log("   L'indennità al 50% richiede verifica approfondita");
console.log("   secondo le regole CCNL Metalmeccanico PMI.");
