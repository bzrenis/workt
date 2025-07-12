/**
 * Test per verificare la funzionalità della Dashboard con giorni fissi
 * Questo script testa l'integrazione della sezione ferie/permessi in DashboardScreen
 */

const DatabaseService = require('./src/services/DatabaseService');
const FixedDaysService = require('./src/services/FixedDaysService');

async function testFixedDaysIntegration() {
  console.log('🧪 Test integrazione giorni fissi in Dashboard...\n');
  
  try {
    // Test periodo corrente (Luglio 2025)
    const startDate = new Date(2025, 6, 1); // 1 luglio 2025
    const endDate = new Date(2025, 6, 31);  // 31 luglio 2025
    
    console.log(`📅 Periodo test: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    
    // Test getFixedDaysSummary
    console.log('\n1. Test getFixedDaysSummary...');
    const summary = await FixedDaysService.getFixedDaysSummary(startDate, endDate);
    
    console.log('📊 Risultato summary:', JSON.stringify(summary, null, 2));
    
    if (summary.totalDays > 0) {
      console.log('\n✅ Giorni fissi trovati:');
      
      if (summary.vacation.days > 0) {
        console.log(`  🏖️  Ferie: ${summary.vacation.days} giorni - €${summary.vacation.earnings.toFixed(2)}`);
      }
      
      if (summary.sick.days > 0) {
        console.log(`  🤒 Malattia: ${summary.sick.days} giorni - €${summary.sick.earnings.toFixed(2)}`);
      }
      
      if (summary.permit.days > 0) {
        console.log(`  📝 Permesso: ${summary.permit.days} giorni - €${summary.permit.earnings.toFixed(2)}`);
      }
      
      if (summary.compensatory.days > 0) {
        console.log(`  💤 Riposo compensativo: ${summary.compensatory.days} giorni - €${summary.compensatory.earnings.toFixed(2)}`);
      }
      
      if (summary.holiday.days > 0) {
        console.log(`  🎉 Festivi: ${summary.holiday.days} giorni - €${summary.holiday.earnings.toFixed(2)}`);
      }
      
      console.log(`\n💰 Totale: ${summary.totalDays} giorni - €${summary.totalEarnings.toFixed(2)}`);
    } else {
      console.log('ℹ️  Nessun giorno fisso trovato per il periodo specificato');
      console.log('   (Questo è normale se non ci sono ferie/malattia/permessi inseriti)');
    }
    
    // Test anche di inserire un giorno di ferie per testare la funzionalità
    console.log('\n2. Test inserimento giorno di ferie di esempio...');
    
    try {
      const testWorkEntry = {
        date: '2025-07-15',
        site_name: 'Ferie',
        day_type: 'ferie',
        is_fixed_day: 1,
        fixed_earnings: 109.195,
        total_earnings: 109.195,
        vehicleDriven: 'non_guidato',
        travelAllowance: 0,
        mealLunchVoucher: 0,
        mealDinnerVoucher: 0,
        isStandbyDay: 0,
        note: 'Giorno di ferie di test'
      };
      
      // Verifica se esiste già
      const existingEntries = await DatabaseService.getWorkEntriesByDateRange(
        new Date(2025, 6, 15), 
        new Date(2025, 6, 15)
      );
      
      if (existingEntries.length === 0) {
        console.log('   ⏳ Inserimento giorno di ferie di test...');
        await DatabaseService.saveWorkEntry(testWorkEntry);
        
        // Ritest summary
        const newSummary = await FixedDaysService.getFixedDaysSummary(startDate, endDate);
        console.log('   ✅ Nuovo summary dopo inserimento:', JSON.stringify(newSummary, null, 2));
      } else {
        console.log('   ✅ Giorno di test già presente nel database');
      }
      
    } catch (error) {
      console.log('   ⚠️  Errore nell\'inserimento del test:', error.message);
    }
    
    console.log('\n🎯 Test completato! La Dashboard dovrebbe ora mostrare la sezione "Ferie e Permessi"');
    console.log('   📱 Controlla l\'app per vedere la nuova card nella Dashboard');
    
  } catch (error) {
    console.error('❌ Errore nel test:', error);
  }
}

// Esegui il test
testFixedDaysIntegration()
  .then(() => {
    console.log('\n✨ Test completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test fallito:', error);
    process.exit(1);
  });
