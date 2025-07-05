// Test rapido per verificare le ore di viaggio in reperibilità nel summary
// Da eseguire manualmente controllando la console dell'app

console.log('=== TEST ORE VIAGGIO REPERIBILITÀ NEL SUMMARY ===');
console.log('');
console.log('✅ Modifiche applicate:');
console.log('• Il summary ora usa le ore dal breakdown dettagliato quando disponibile');
console.log('• Fallback alla logica semplice se il breakdown non è disponibile');
console.log('• Log aggiunto per tracciare quale logica viene usata');
console.log('');
console.log('🔍 Per verificare:');
console.log('1. Inserisci un intervento di reperibilità con ore di viaggio');
console.log('2. Controlla che le ore appaiano nel breakdown del form');
console.log('3. Verifica che appaiano nel riepilogo della dashboard');
console.log('4. Controlla la console per i log di debug');
console.log('');
console.log('📊 Nella dashboard dovrebbero apparire:');
console.log('• "Ore Viaggio in Reperibilità" > 0 se ci sono viaggi negli interventi');
console.log('• "Totale Ore in Reperibilità" che include lavoro + viaggio');
console.log('');
console.log('🚨 Se non appaiono ancora:');
console.log('• Controlla i log della console per vedere quale logica viene usata');
console.log('• Verifica che gli interventi abbiano i campi departure_company/arrival_site');
console.log('• Prova a refreshare la dashboard');
console.log('');
console.log('=== FINE TEST ===');
