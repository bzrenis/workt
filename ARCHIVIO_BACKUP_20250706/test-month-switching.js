/**
 * Test per verificare il problema specifico del mese precedente nella Dashboard
 * Simula il comportamento quando si naviga tra i mesi
 */

function testMonthSwitching() {
  console.log('🔍 === TEST PROBLEMA MESE PRECEDENTE ===');
  
  // Simula i dati che dovresti avere (adatta alle tue entries reali)
  const mockDatabaseResponses = {
    // Luglio 2025 (mese attuale)
    '2025-7': [
      { id: 1, date: '2025-07-01' },
      { id: 2, date: '2025-07-03' },
      { id: 3, date: '2025-07-04' },
      { id: 4, date: '2025-07-05' }
    ],
    // Giugno 2025 (mese precedente)
    '2025-6': [
      { id: 5, date: '2025-06-15' },
      { id: 6, date: '2025-06-20' },
      { id: 7, date: '2025-06-25' }
    ]
  };
  
  // Simula DatabaseService.getWorkEntries
  function mockGetWorkEntries(year, month) {
    const key = `${year}-${month}`;
    const entries = mockDatabaseResponses[key] || [];
    console.log(`📡 Mock DatabaseService.getWorkEntries(${year}, ${month}) -> ${entries.length} entries`);
    return Promise.resolve(entries);
  }
  
  // Simula il filtro della Dashboard
  function simulateDashboardFilter(workEntries, selectedMonth, selectedYear) {
    console.log(`\n🔍 SIMULAZIONE FILTRO DASHBOARD`);
    console.log(`📅 Mese selezionato: ${selectedMonth + 1}/${selectedYear} (selectedMonth=${selectedMonth}, 0-based)`);
    console.log(`📋 workEntries ricevute: ${workEntries.length}`);
    
    if (workEntries.length > 0) {
      console.log('📋 Dettaglio workEntries:');
      workEntries.forEach(entry => {
        console.log(`   - ${entry.date} (ID: ${entry.id})`);
      });
    }
    
    const filteredEntries = workEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      const entryMonth = entryDate.getMonth(); // 0-based
      const entryYear = entryDate.getFullYear();
      const belongsToMonth = entryMonth === selectedMonth && entryYear === selectedYear;
      
      console.log(`🔍 Entry ${entry.id}: ${entry.date} -> mese ${entryMonth + 1}/${entryYear} vs selezionato ${selectedMonth + 1}/${selectedYear} = ${belongsToMonth}`);
      
      return belongsToMonth;
    });
    
    console.log(`✅ Entries dopo filtro: ${filteredEntries.length}`);
    console.log(`🎯 Giorni lavorati mostrati: ${filteredEntries.length}`);
    
    return filteredEntries;
  }
  
  // Test scenario: Partendo da Luglio, vai a Giugno
  async function testScenario() {
    console.log('\n🎬 === SCENARIO TEST: LUGLIO -> GIUGNO ===');
    
    // Step 1: Carica Luglio 2025 (mese attuale)
    console.log('\n📅 STEP 1: Carica Luglio 2025');
    const selectedMonth1 = 6; // Luglio (0-based)
    const selectedYear1 = 2025;
    const workEntries1 = await mockGetWorkEntries(selectedYear1, selectedMonth1 + 1);
    const filtered1 = simulateDashboardFilter(workEntries1, selectedMonth1, selectedYear1);
    console.log(`🎯 Risultato Luglio: ${filtered1.length} giorni (atteso: 4)`);
    
    // Step 2: Cambia a Giugno 2025 (mese precedente)
    console.log('\n📅 STEP 2: Cambia a Giugno 2025');
    const selectedMonth2 = 5; // Giugno (0-based)
    const selectedYear2 = 2025;
    const workEntries2 = await mockGetWorkEntries(selectedYear2, selectedMonth2 + 1);
    const filtered2 = simulateDashboardFilter(workEntries2, selectedMonth2, selectedYear2);
    console.log(`🎯 Risultato Giugno: ${filtered2.length} giorni (atteso: 3)`);
    
    // Step 3: Torna a Luglio per verificare che non ci siano contaminazioni
    console.log('\n📅 STEP 3: Torna a Luglio 2025');
    const workEntries3 = await mockGetWorkEntries(selectedYear1, selectedMonth1 + 1);
    const filtered3 = simulateDashboardFilter(workEntries3, selectedMonth1, selectedYear1);
    console.log(`🎯 Risultato Luglio (ritorno): ${filtered3.length} giorni (atteso: 4)`);
    
    // Verifica risultati
    console.log('\n🎯 === VERIFICA RISULTATI ===');
    const julyOk = filtered1.length === 4 && filtered3.length === 4;
    const juneOk = filtered2.length === 3;
    
    console.log(`📊 Luglio: ${filtered1.length}/4 e ${filtered3.length}/4 - ${julyOk ? '✅' : '❌'}`);
    console.log(`📊 Giugno: ${filtered2.length}/3 - ${juneOk ? '✅' : '❌'}`);
    
    if (julyOk && juneOk) {
      console.log('🎉 TUTTO OK! Il problema dovrebbe essere altrove.');
    } else {
      console.log('❌ PROBLEMA CONFERMATO nella logica di filtro.');
    }
    
    // Possibili cause se il test fallisce
    if (!juneOk) {
      console.log('\n🔍 === POSSIBILI CAUSE PROBLEMA GIUGNO ===');
      console.log('1. DatabaseService.getWorkEntries non restituisce i dati corretti per Giugno');
      console.log('2. Race condition: workEntries non aggiornato quando cambi mese');
      console.log('3. Cache nel DatabaseService che restituisce dati vecchi');
      console.log('4. Problema nel useEffect che non si triggera correttamente');
      console.log('5. selectedMonth/selectedYear non aggiornati correttamente nella navigazione');
    }
  }
  
  return testScenario();
}

// Esegui il test
testMonthSwitching().then(() => {
  console.log('\n✅ Test completato!');
}).catch(console.error);
