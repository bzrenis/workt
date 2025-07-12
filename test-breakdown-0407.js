// Test specifico per verificare la correzione del breakdown intervento 04/07/2025
const fs = require('fs');

// Mock della logica corretta di classificazione CCNL
function classifyHourCCNL(hour) {
  if (hour >= 22 || hour < 6) {
    return { category: 'night', rate: 1.35, description: 'Notturno (22:00-06:00) +35%' };
  } else if (hour >= 20 && hour < 22) {
    return { category: 'evening', rate: 1.25, description: 'Serale (20:00-22:00) +25%' };
  } else {
    return { category: 'ordinary', rate: 1.20, description: 'Diurno (06:00-20:00) +20%' };
  }
}

function simulateStandbyBreakdown() {
  console.log('🔧 SIMULAZIONE BREAKDOWN INTERVENTO 04/07/2025');
  console.log('═'.repeat(60));
  
  // Intervento reale: 19:00-23:00 (4 ore lavoro)
  const workStart = 19;
  const workEnd = 23;
  const hourlyRate = 16.41081;
  
  console.log(`📅 Intervento: ${workStart}:00 → ${workEnd}:00`);
  console.log(`💰 Tariffa base: €${hourlyRate.toFixed(2)}/h\n`);
  
  // Analisi ora per ora
  const hourlyBreakdown = {
    ordinary: { hours: 0, earnings: 0 },
    evening: { hours: 0, earnings: 0 },
    night: { hours: 0, earnings: 0 }
  };
  
  console.log('📊 ANALISI ORA PER ORA:');
  console.log('━'.repeat(50));
  
  for (let hour = workStart; hour < workEnd; hour++) {
    const classification = classifyHourCCNL(hour);
    const hourlyPayment = hourlyRate * classification.rate;
    
    hourlyBreakdown[classification.category].hours += 1;
    hourlyBreakdown[classification.category].earnings += hourlyPayment;
    
    console.log(`⏰ ${hour}:00-${hour+1}:00 → ${classification.description}`);
    console.log(`   💵 €${hourlyRate.toFixed(2)} × ${classification.rate.toFixed(2)} = €${hourlyPayment.toFixed(2)}`);
  }
  
  console.log('\n🎯 RIEPILOGO PER FASCIA:');
  console.log('━'.repeat(50));
  
  Object.entries(hourlyBreakdown).forEach(([category, data]) => {
    if (data.hours > 0) {
      const rate = data.earnings / data.hours / hourlyRate;
      const percentage = ((rate - 1) * 100).toFixed(0);
      console.log(`📈 ${category.toUpperCase()}:`);
      console.log(`   ⏱️  Ore: ${data.hours}:00`);
      console.log(`   💰 Guadagno: €${data.earnings.toFixed(2)}`);
      console.log(`   📊 Tariffa: €${(data.earnings / data.hours).toFixed(2)}/h (+${percentage}%)`);
      console.log('');
    }
  });
  
  const totalHours = Object.values(hourlyBreakdown).reduce((sum, data) => sum + data.hours, 0);
  const totalEarnings = Object.values(hourlyBreakdown).reduce((sum, data) => sum + data.earnings, 0);
  
  console.log('🎉 TOTALE INTERVENTO:');
  console.log('━'.repeat(50));
  console.log(`⏱️  Ore totali: ${totalHours}:00`);
  console.log(`💰 Guadagno totale: €${totalEarnings.toFixed(2)}`);
  console.log(`📊 Media oraria: €${(totalEarnings / totalHours).toFixed(2)}/h`);
  
  return hourlyBreakdown;
}

function compareWithCurrentSystem() {
  console.log('\n\n🔍 CONFRONTO CON SISTEMA ATTUALE:');
  console.log('═'.repeat(60));
  
  // Quello che mostra l'app attualmente (dallo screenshot)
  const currentSystem = {
    diurno: { hours: 3, earnings: 59.08 },
    notturno: { hours: 1, earnings: 22.15 }
  };
  
  const correctedSystem = simulateStandbyBreakdown();
  
  console.log('📱 SISTEMA ATTUALE (dallo screenshot):');
  console.log('━'.repeat(50));
  console.log('   🌅 Lavoro diurno: 3:00 → €59,08');
  console.log('   🌙 Lavoro notturno (+25%): 1:00 → €22,15');
  console.log(`   💰 Totale: €${(59.08 + 22.15).toFixed(2)}`);
  
  console.log('\n✅ SISTEMA CORRETTO (con tre fasce CCNL):');
  console.log('━'.repeat(50));
  console.log(`   🌅 Lavoro diurno: ${correctedSystem.ordinary.hours}:00 → €${correctedSystem.ordinary.earnings.toFixed(2)}`);
  console.log(`   🌆 Lavoro serale (+25%): ${correctedSystem.evening.hours}:00 → €${correctedSystem.evening.earnings.toFixed(2)}`);
  console.log(`   🌙 Lavoro notturno (+35%): ${correctedSystem.night.hours}:00 → €${correctedSystem.night.earnings.toFixed(2)}`);
  
  const correctedTotal = Object.values(correctedSystem).reduce((sum, data) => sum + data.earnings, 0);
  const currentTotal = 59.08 + 22.15;
  const difference = correctedTotal - currentTotal;
  
  console.log(`   💰 Totale: €${correctedTotal.toFixed(2)}`);
  
  console.log('\n💡 DIFFERENZA:');
  console.log('━'.repeat(50));
  console.log(`📊 Sistema attuale: €${currentTotal.toFixed(2)}`);
  console.log(`📊 Sistema corretto: €${correctedTotal.toFixed(2)}`);
  console.log(`💵 Differenza: ${difference >= 0 ? '+' : ''}€${difference.toFixed(2)}`);
  
  if (difference > 0) {
    console.log('🎉 La correzione AUMENTA il compenso!');
  } else if (difference < 0) {
    console.log('⚠️  La correzione riduce il compenso');
  } else {
    console.log('📏 Nessuna differenza monetaria');
  }
  
  console.log('\n🔧 PROBLEMA IDENTIFICATO:');
  console.log('━'.repeat(50));
  console.log('❌ Il sistema attuale classifica erroneamente:');
  console.log('   • 19:00-20:00 come "diurno" ✅ (corretto)');
  console.log('   • 20:00-21:00 come "diurno" ❌ (dovrebbe essere "serale")');
  console.log('   • 21:00-22:00 come "diurno" ❌ (dovrebbe essere "serale")');
  console.log('   • 22:00-23:00 come "notturno" ✅ (corretto)');
  console.log('');
  console.log('✅ Il sistema corretto classifica:');
  console.log('   • 19:00-20:00 come "diurno" (+20%)');
  console.log('   • 20:00-21:00 come "serale" (+25%)');
  console.log('   • 21:00-22:00 come "serale" (+25%)');
  console.log('   • 22:00-23:00 come "notturno" (+35%)');
}

// Esegui la simulazione
console.log('🕐 TEST BREAKDOWN INTERVENTO REPERIBILITÀ 04/07/2025');
console.log('='.repeat(70));

const result = simulateStandbyBreakdown();
compareWithCurrentSystem();

console.log('\n📋 AZIONI NECESSARIE:');
console.log('━'.repeat(50));
console.log('1. ✅ Correggere calculateOvertimeRate() → COMPLETATO');
console.log('2. ✅ Aggiornare calculateStandbyBreakdown() → COMPLETATO');
console.log('3. ✅ Aggiungere fascia "evening" nel TimeEntryScreen → COMPLETATO');
console.log('4. 🔄 Testare nell\'app e verificare il nuovo breakdown');
console.log('5. 🔄 Confermare che ora mostra le tre fasce correttamente');
