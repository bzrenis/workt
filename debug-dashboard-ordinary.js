// Debug per analizzare la struttura ordinary nel DashboardScreen
console.log('🔍 DEBUG: Analisi struttura dati DashboardScreen');

// Simula la struttura dati che dovrebbe essere presente
const mockOrdinary = {
  total: 1500.00,
  days: 15,
  hours: {
    lavoro_giornaliera: 120.0,
    viaggio_giornaliera: 15.0,
    lavoro_extra: 8.0,
    viaggio_extra: 2.0
  },
  earnings: {
    giornaliera: 1400.00,
    lavoro_extra: 80.00,
    viaggio_extra: 20.00,
    sabato_bonus: 50.00,
    domenica_bonus: 60.00,
    festivo_bonus: 0.00
  }
};

console.log('📊 STRUTTURA ORDINARY ATTESA:', JSON.stringify(mockOrdinary, null, 2));

// Analizza quali informazioni dovrebbero essere mostrate nella card
console.log('\n🎯 INFORMAZIONI CHE LA CARD DOVREBBE MOSTRARE:');
console.log('1. ✅ Giorni lavorativi:', mockOrdinary.days);
console.log('2. ✅ Ore totali lavoro:', mockOrdinary.hours.lavoro_giornaliera + mockOrdinary.hours.lavoro_extra);
console.log('3. ✅ Ore totali viaggio:', mockOrdinary.hours.viaggio_giornaliera + mockOrdinary.hours.viaggio_extra);
console.log('4. ✅ Retribuzione giornaliera base (CCNL)');
console.log('5. ✅ Straordinari lavoro (+20%):', mockOrdinary.earnings.lavoro_extra);
console.log('6. ✅ Viaggio extra:', mockOrdinary.earnings.viaggio_extra);
console.log('7. ✅ Maggiorazioni weekend/festivi:');
console.log('   - Sabato (+25%):', mockOrdinary.earnings.sabato_bonus);
console.log('   - Domenica (+30%):', mockOrdinary.earnings.domenica_bonus);
console.log('   - Festivo (+30%):', mockOrdinary.earnings.festivo_bonus);
console.log('8. ✅ Totale Lavoro Ordinario');

console.log('\n❓ POSSIBILI INFORMAZIONI MANCANTI CHE POTREBBERO SERVIRE:');
console.log('- 🤔 Ore viaggio giornaliere separate (attualmente aggregate)');
console.log('- 🤔 Dettaglio calcolo retribuzione giornaliera CCNL');
console.log('- 🤔 Suddivisione ore per tipologia (normale, straordinario, notturno)');
console.log('- 🤔 Percentuale straordinari sul totale');
console.log('- 🤔 Ore lavoro giornaliere separate (attualmente aggregate)');

console.log('\n🔧 SUGGERIMENTI PER MIGLIORARE LA CARD:');
console.log('1. Aggiungere suddivisione ore lavoro/viaggio normale vs extra');
console.log('2. Mostrare percentuale di ore extra sul totale');
console.log('3. Dettagliare meglio il calcolo CCNL (ore normali vs straordinarie)');
console.log('4. Aggiungere informazioni su ore notturne se presenti');

console.log('\n✅ Test completato - verifica nell\'app se queste informazioni sono visibili');
