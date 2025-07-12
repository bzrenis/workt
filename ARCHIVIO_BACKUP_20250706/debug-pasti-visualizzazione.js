/**
 * 🐞 DEBUG VISUALIZZAZIONE PASTI
 * 
 * Test per verificare come vengono aggregati e mostrati i pasti
 */

const { DatabaseService } = require('./src/services/DatabaseService');

async function debugMeals() {
  console.log('🔍 DEBUG VISUALIZZAZIONE PASTI\n');
  
  try {
    // Inizializza il database
    const db = new DatabaseService();
    await db.initializeDatabase();
    
    // Ottieni entries di luglio 2025
    const currentDate = new Date(2025, 6, 1); // Luglio 2025
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    console.log(`📅 Periodo: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);
    
    const entries = await db.getWorkEntriesByDateRange(startOfMonth, endOfMonth);
    console.log(`📊 Entries trovate: ${entries.length}\n`);
    
    // Analizza i pasti entry per entry
    let totalMeals = {
      lunch: { voucher: 0, cash: 0, specific: 0 },
      dinner: { voucher: 0, cash: 0, specific: 0 },
      byType: {
        vouchers: { total: 0, count: 0 },
        cashStandard: { total: 0, count: 0 },
        cashSpecific: { total: 0, count: 0 }
      }
    };
    
    entries.forEach((entry, index) => {
      const workEntry = entry.data;
      console.log(`\n📋 Entry ${index + 1} - ${entry.date}:`);
      console.log(`   Pranzo: voucher=${workEntry.mealLunchVoucher}, cash=${workEntry.mealLunchCash}`);
      console.log(`   Cena: voucher=${workEntry.mealDinnerVoucher}, cash=${workEntry.mealDinnerCash}`);
      
      // Simula la logica di aggregazione della dashboard
      if (workEntry.mealLunchVoucher || workEntry.mealLunchCash) {
        if (workEntry.mealLunchCash > 0) {
          console.log(`   → Pranzo: Cash specifico ${workEntry.mealLunchCash}`);
          totalMeals.lunch.specific += workEntry.mealLunchCash;
          totalMeals.byType.cashSpecific.total += workEntry.mealLunchCash;
          totalMeals.byType.cashSpecific.count += 1;
        } else if (workEntry.mealLunchVoucher) {
          const voucherAmount = 7.0; // Valore di default
          console.log(`   → Pranzo: Voucher ${voucherAmount}`);
          totalMeals.lunch.voucher += voucherAmount;
          totalMeals.byType.vouchers.total += voucherAmount;
          totalMeals.byType.vouchers.count += 1;
        } else {
          const cashAmount = 6.0; // Valore di default
          console.log(`   → Pranzo: Cash standard ${cashAmount}`);
          totalMeals.lunch.cash += cashAmount;
          totalMeals.byType.cashStandard.total += cashAmount;
          totalMeals.byType.cashStandard.count += 1;
        }
      }
      
      if (workEntry.mealDinnerVoucher || workEntry.mealDinnerCash) {
        if (workEntry.mealDinnerCash > 0) {
          console.log(`   → Cena: Cash specifico ${workEntry.mealDinnerCash}`);
          totalMeals.dinner.specific += workEntry.mealDinnerCash;
          totalMeals.byType.cashSpecific.total += workEntry.mealDinnerCash;
          totalMeals.byType.cashSpecific.count += 1;
        } else if (workEntry.mealDinnerVoucher) {
          const voucherAmount = 7.0; // Valore di default
          console.log(`   → Cena: Voucher ${voucherAmount}`);
          totalMeals.dinner.voucher += voucherAmount;
          totalMeals.byType.vouchers.total += voucherAmount;
          totalMeals.byType.vouchers.count += 1;
        } else {
          const cashAmount = 6.0; // Valore di default
          console.log(`   → Cena: Cash standard ${cashAmount}`);
          totalMeals.dinner.cash += cashAmount;
          totalMeals.byType.cashStandard.total += cashAmount;
          totalMeals.byType.cashStandard.count += 1;
        }
      }
    });
    
    console.log('\n\n📊 TOTALI CALCOLATI:');
    console.log('━'.repeat(50));
    
    console.log('\n🍽️ Per tipo di pasto:');
    console.log(`Pranzo:`);
    console.log(`  - Voucher: €${totalMeals.lunch.voucher.toFixed(2)}`);
    console.log(`  - Cash: €${totalMeals.lunch.cash.toFixed(2)}`);
    console.log(`  - Specifico: €${totalMeals.lunch.specific.toFixed(2)}`);
    
    console.log(`Cena:`);
    console.log(`  - Voucher: €${totalMeals.dinner.voucher.toFixed(2)}`);
    console.log(`  - Cash: €${totalMeals.dinner.cash.toFixed(2)}`);
    console.log(`  - Specifico: €${totalMeals.dinner.specific.toFixed(2)}`);
    
    console.log('\n🏷️ Per tipologia:');
    console.log(`Vouchers: €${totalMeals.byType.vouchers.total.toFixed(2)} (${totalMeals.byType.vouchers.count} pasti)`);
    console.log(`Cash Standard: €${totalMeals.byType.cashStandard.total.toFixed(2)} (${totalMeals.byType.cashStandard.count} pasti)`);
    console.log(`Cash Specifico: €${totalMeals.byType.cashSpecific.total.toFixed(2)} (${totalMeals.byType.cashSpecific.count} pasti)`);
    
    const totalAmount = totalMeals.byType.vouchers.total + totalMeals.byType.cashStandard.total + totalMeals.byType.cashSpecific.total;
    console.log(`\n💰 TOTALE RIMBORSI PASTI: €${totalAmount.toFixed(2)}`);
    
    console.log('\n\n🎯 VISUALIZZAZIONE ATTUALE:');
    console.log('━'.repeat(50));
    console.log('Come dovrebbe apparire nella dashboard:');
    console.log(`\nRimborso pasti                     ${totalAmount.toFixed(2)} €`);
    console.log(`X giorni con rimborsi pasti (voce non tassabile)`);
    
    if (totalMeals.lunch.voucher > 0 || totalMeals.lunch.cash > 0 || totalMeals.lunch.specific > 0) {
      console.log('\n- Pranzo:');
      if (totalMeals.lunch.voucher > 0) {
        console.log(`  ${totalMeals.lunch.voucher.toFixed(2)} € (buono)`);
      }
      if (totalMeals.lunch.cash > 0) {
        console.log(`  ${totalMeals.lunch.cash.toFixed(2)} € (contanti)`);
      }
      if (totalMeals.lunch.specific > 0) {
        console.log(`  ${totalMeals.lunch.specific.toFixed(2)} € (contanti - valore specifico)`);
      }
    }
    
    if (totalMeals.dinner.voucher > 0 || totalMeals.dinner.cash > 0 || totalMeals.dinner.specific > 0) {
      console.log('\n- Cena:');
      if (totalMeals.dinner.voucher > 0) {
        console.log(`  ${totalMeals.dinner.voucher.toFixed(2)} € (buono)`);
      }
      if (totalMeals.dinner.cash > 0) {
        console.log(`  ${totalMeals.dinner.cash.toFixed(2)} € (contanti)`);
      }
      if (totalMeals.dinner.specific > 0) {
        console.log(`  ${totalMeals.dinner.specific.toFixed(2)} € (contanti - valore specifico)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error);
  }
}

// Esegui il debug
debugMeals().then(() => {
  console.log('\n✅ Debug completato');
  process.exit(0);
}).catch(error => {
  console.error('❌ Errore:', error);
  process.exit(1);
});
