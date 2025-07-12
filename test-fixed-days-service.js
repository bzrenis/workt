// Test script per verificare FixedDaysService
// Questo script testa solo la logica senza dipendenze React Native

console.log('🧪 Test FixedDaysService');

// Mock dei dati di test
const mockFixedDayEntries = [
  {
    id: 1,
    date: '2025-07-01',
    dayType: 'ferie',
    isFixedDay: 1,
    fixedEarnings: 109.195,
    totalEarnings: 109.195
  },
  {
    id: 2,
    date: '2025-07-02',
    dayType: 'malattia',
    isFixedDay: 1,
    fixedEarnings: 109.195,
    totalEarnings: 109.195
  },
  {
    id: 3,
    date: '2025-07-03',
    dayType: 'permesso',
    isFixedDay: 1,
    fixedEarnings: 109.195,
    totalEarnings: 109.195
  },
  {
    id: 4,
    date: '2025-07-04',
    dayType: 'festivo',
    isFixedDay: 1,
    fixedEarnings: 109.195,
    totalEarnings: 109.195
  }
];

// Simula la logica di calculateFixedDaysStats
function testCalculateFixedDaysStats(entries) {
  console.log('\n📊 Test calculateFixedDaysStats');
  
  const fixedDayEntries = entries.filter(entry => 
    entry.isFixedDay === 1 || 
    entry.is_fixed_day === 1 ||
    ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(entry.dayType || entry.day_type)
  );
  
  console.log(`Trovati ${fixedDayEntries.length} giorni fissi`);
  
  const stats = {
    totalDays: fixedDayEntries.length,
    totalEarnings: 0,
    breakdown: {
      ferie: { days: 0, earnings: 0 },
      malattia: { days: 0, earnings: 0 },
      permesso: { days: 0, earnings: 0 },
      riposo: { days: 0, earnings: 0 },
      festivo: { days: 0, earnings: 0 }
    }
  };
  
  fixedDayEntries.forEach(entry => {
    const type = entry.dayType || entry.day_type;
    const earnings = entry.fixedEarnings || entry.totalEarnings || 0;
    
    if (stats.breakdown[type]) {
      stats.breakdown[type].days += 1;
      stats.breakdown[type].earnings += earnings;
      stats.totalEarnings += earnings;
    }
  });
  
  console.log('📈 Risultato:', JSON.stringify(stats, null, 2));
  return stats;
}

// Simula la logica di getFixedDaysSummary
function testGetFixedDaysSummary(stats) {
  console.log('\n🎯 Test getFixedDaysSummary');
  
  const summary = {
    totalDays: stats.totalDays,
    totalEarnings: stats.totalEarnings,
    vacation: {
      days: stats.breakdown.ferie.days,
      earnings: stats.breakdown.ferie.earnings
    },
    sick: {
      days: stats.breakdown.malattia.days,
      earnings: stats.breakdown.malattia.earnings
    },
    permit: {
      days: stats.breakdown.permesso.days,
      earnings: stats.breakdown.permesso.earnings
    },
    compensatory: {
      days: stats.breakdown.riposo.days,
      earnings: stats.breakdown.riposo.earnings
    },
    holiday: {
      days: stats.breakdown.festivo.days,
      earnings: stats.breakdown.festivo.earnings
    }
  };
  
  console.log('📋 Riepilogo per Dashboard:', JSON.stringify(summary, null, 2));
  return summary;
}

// Esegui i test
const stats = testCalculateFixedDaysStats(mockFixedDayEntries);
const summary = testGetFixedDaysSummary(stats);

console.log('\n✅ Test completato!');
console.log(`Totale giorni: ${summary.totalDays}`);
console.log(`Totale guadagni: €${summary.totalEarnings.toFixed(2)}`);
console.log(`Ferie: ${summary.vacation.days} giorni, €${summary.vacation.earnings.toFixed(2)}`);
console.log(`Malattia: ${summary.sick.days} giorni, €${summary.sick.earnings.toFixed(2)}`);
console.log(`Permesso: ${summary.permit.days} giorni, €${summary.permit.earnings.toFixed(2)}`);
console.log(`Festivi: ${summary.holiday.days} giorni, €${summary.holiday.earnings.toFixed(2)}`);
