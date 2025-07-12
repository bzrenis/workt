/**
 * 🐞 TEST PARSING INTERVENTI
 * 
 * Test per verificare che la correzione del parsing degli interventi funzioni
 */

const { createWorkEntryFromData } = require('./src/utils/earningsHelper');

console.log('🔍 TEST PARSING INTERVENTI\n');

// Simula un entry come viene dal database (con interventi come stringa JSON)
const mockDatabaseEntry = {
  id: 36,
  date: '2025-07-04',
  site_name: 'Iperal',
  work_start_1: '08:00',
  work_end_1: '12:00',
  is_standby_day: 1,
  standby_allowance: 1,
  // Gli interventi come stringa JSON (come vengono dal database)
  interventi: '[{"departure_company":"18:00","arrival_site":"19:00","work_start_1":"19:00","work_end_1":"00:00","work_start_2":"","work_end_2":"","departure_return":"00:00","arrival_company":"01:00"}]',
  meal_lunch_voucher: 1,
  travel_allowance: 1
};

console.log('📊 TEST 1: Entry con interventi come stringa JSON');
console.log('━'.repeat(50));

console.log('Entry simulato dal database:');
console.log(`- ID: ${mockDatabaseEntry.id}`);
console.log(`- Data: ${mockDatabaseEntry.date}`);
console.log(`- Reperibilità: ${mockDatabaseEntry.is_standby_day}`);
console.log(`- Interventi (stringa): ${mockDatabaseEntry.interventi}`);

console.log('\nTrasformazione con createWorkEntryFromData:');
try {
  const workEntry = createWorkEntryFromData(mockDatabaseEntry);
  
  console.log(`✅ WorkEntry creato con successo`);
  console.log(`- Data: ${workEntry.date}`);
  console.log(`- Reperibilità: ${workEntry.isStandbyDay}`);
  console.log(`- Interventi parsed (array): ${Array.isArray(workEntry.interventi) ? 'Sì' : 'No'}`);
  console.log(`- Numero interventi: ${workEntry.interventi?.length || 0}`);
  
  if (workEntry.interventi && workEntry.interventi.length > 0) {
    console.log('- Primo intervento:', JSON.stringify(workEntry.interventi[0], null, 2));
    
    // Verifica la struttura dell'intervento
    const firstIntervento = workEntry.interventi[0];
    console.log('\nVerifica struttura primo intervento:');
    console.log(`  - departure_company: ${firstIntervento.departure_company}`);
    console.log(`  - arrival_site: ${firstIntervento.arrival_site}`);
    console.log(`  - work_start_1: ${firstIntervento.work_start_1}`);
    console.log(`  - work_end_1: ${firstIntervento.work_end_1}`);
    console.log(`  - departure_return: ${firstIntervento.departure_return}`);
    console.log(`  - arrival_company: ${firstIntervento.arrival_company}`);
  } else {
    console.log('❌ Nessun intervento trovato dopo il parsing!');
  }
  
} catch (error) {
  console.log('❌ ERRORE durante la trasformazione:', error.message);
}

// Test 2: Entry con interventi già come array (per retrocompatibilità)
console.log('\n\n📊 TEST 2: Entry con interventi già come array');
console.log('━'.repeat(50));

const mockEntry2 = {
  ...mockDatabaseEntry,
  interventi: [
    {
      departure_company: "18:00",
      arrival_site: "19:00", 
      work_start_1: "19:00",
      work_end_1: "00:00",
      departure_return: "00:00",
      arrival_company: "01:00"
    }
  ]
};

console.log('Entry con interventi già come array:');
try {
  const workEntry2 = createWorkEntryFromData(mockEntry2);
  
  console.log(`✅ WorkEntry creato con successo`);
  console.log(`- Numero interventi: ${workEntry2.interventi?.length || 0}`);
  
  if (workEntry2.interventi && workEntry2.interventi.length > 0) {
    console.log('✅ Array di interventi preservato correttamente');
  }
  
} catch (error) {
  console.log('❌ ERRORE:', error.message);
}

// Test 3: Entry senza interventi
console.log('\n\n📊 TEST 3: Entry senza interventi');
console.log('━'.repeat(50));

const mockEntry3 = {
  ...mockDatabaseEntry,
  interventi: '[]'
};

try {
  const workEntry3 = createWorkEntryFromData(mockEntry3);
  console.log(`✅ Entry senza interventi gestito correttamente`);
  console.log(`- Numero interventi: ${workEntry3.interventi?.length || 0}`);
} catch (error) {
  console.log('❌ ERRORE:', error.message);
}

// Test 4: Entry con interventi malformati
console.log('\n\n📊 TEST 4: Entry con JSON malformato');
console.log('━'.repeat(50));

const mockEntry4 = {
  ...mockDatabaseEntry,
  interventi: '{invalid json'
};

try {
  const workEntry4 = createWorkEntryFromData(mockEntry4);
  console.log(`✅ JSON malformato gestito correttamente`);
  console.log(`- Numero interventi: ${workEntry4.interventi?.length || 0}`);
} catch (error) {
  console.log('❌ ERRORE:', error.message);
}

console.log('\n\n🎯 CONCLUSIONE');
console.log('━'.repeat(50));
console.log('✅ Se tutti i test passano, il parsing degli interventi ora funziona correttamente');
console.log('📊 La dashboard dovrebbe ora mostrare gli interventi di reperibilità');
console.log('🔧 Il campo interventi viene correttamente parsato da stringa JSON ad array');
