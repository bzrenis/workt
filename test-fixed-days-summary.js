/**
 * Test per verificare il metodo getFixedDaysSummary di FixedDaysService
 */

// Mock del DatabaseService per i test
const mockDatabaseService = {
  getWorkEntriesByDateRange: async (startDate, endDate) => {
    console.log('Mock DatabaseService: getWorkEntriesByDateRange', { startDate, endDate });
    
    // Dati di test
    return [
      {
        id: 1,
        date: '2024-12-20',
        isFixedDay: 1,
        dayType: 'ferie',
        fixedDayEarnings: 109.19,
        description: 'Ferie autorizzate'
      },
      {
        id: 2,
        date: '2024-12-23',
        isFixedDay: 1,
        dayType: 'malattia',
        fixedDayEarnings: 109.19,
        description: 'Malattia certificata'
      },
      {
        id: 3,
        date: '2024-12-25',
        isFixedDay: 1,
        dayType: 'festivo',
        fixedDayEarnings: 109.19,
        description: 'Natale'
      },
      {
        id: 4,
        date: '2024-12-24',
        isFixedDay: 1,
        dayType: 'permesso',
        fixedDayEarnings: 54.60, // 5 ore
        description: 'Permesso pomeriggio'
      }
    ];
  }
};

// Modulo FixedDaysService semplificato per test
class FixedDaysService {
  static async calculateFixedDaysStats(startDate, endDate) {
    console.log('FixedDaysService: Calcolo statistiche giorni fissi', { startDate, endDate });
    
    // Ottieni tutti gli inserimenti del periodo
    const entries = await mockDatabaseService.getWorkEntriesByDateRange(startDate, endDate);
    
    if (!entries || entries.length === 0) {
      return {
        totalDays: 0,
        totalEarnings: 0,
        breakdown: {
          ferie: { days: 0, earnings: 0 },
          malattia: { days: 0, earnings: 0 },
          permesso: { days: 0, earnings: 0 },
          riposo: { days: 0, earnings: 0 },
          festivo: { days: 0, earnings: 0 }
        }
      };
    }
    
    // Filtra solo i giorni fissi
    const fixedDayEntries = entries.filter(entry => 
      entry.isFixedDay === 1 || 
      entry.is_fixed_day === 1 ||
      ['ferie', 'malattia', 'permesso', 'riposo', 'festivo'].includes(entry.dayType || entry.day_type)
    );
    
    console.log(`FixedDaysService: Trovati ${fixedDayEntries.length} giorni fissi`);
    
    // Calcola le statistiche
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
    
    // Elabora ogni inserimento
    fixedDayEntries.forEach(entry => {
      const dayType = entry.dayType || entry.day_type;
      const earnings = parseFloat(entry.fixedDayEarnings || entry.fixed_day_earnings || 0);
      
      if (stats.breakdown[dayType]) {
        stats.breakdown[dayType].days += 1;
        stats.breakdown[dayType].earnings += earnings;
        stats.totalEarnings += earnings;
      }
    });
    
    return stats;
  }

  static async getFixedDaysSummary(startDate, endDate) {
    try {
      // Converte le date in formato stringa
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      
      console.log('FixedDaysService: getFixedDaysSummary', { start, end });
      
      // Calcola le statistiche usando il metodo esistente
      const stats = await FixedDaysService.calculateFixedDaysStats(start, end);
      
      // Formatta per la Dashboard
      return {
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
    } catch (error) {
      console.error('FixedDaysService: Errore in getFixedDaysSummary:', error);
      return {
        totalDays: 0,
        totalEarnings: 0,
        vacation: { days: 0, earnings: 0 },
        sick: { days: 0, earnings: 0 },
        permit: { days: 0, earnings: 0 },
        compensatory: { days: 0, earnings: 0 },
        holiday: { days: 0, earnings: 0 }
      };
    }
  }
}

// Test del metodo
async function testGetFixedDaysSummary() {
  console.log('=== TEST getFixedDaysSummary ===');
  
  const startDate = new Date('2024-12-01');
  const endDate = new Date('2024-12-31');
  
  try {
    const summary = await FixedDaysService.getFixedDaysSummary(startDate, endDate);
    
    console.log('\n✅ Riepilogo giorni fissi:');
    console.log('Totale giorni:', summary.totalDays);
    console.log('Totale guadagni:', summary.totalEarnings.toFixed(2), '€');
    console.log('\nBreakdown:');
    console.log('- Ferie:', summary.vacation.days, 'giorni,', summary.vacation.earnings.toFixed(2), '€');
    console.log('- Malattia:', summary.sick.days, 'giorni,', summary.sick.earnings.toFixed(2), '€');
    console.log('- Permessi:', summary.permit.days, 'giorni,', summary.permit.earnings.toFixed(2), '€');
    console.log('- Riposo comp.:', summary.compensatory.days, 'giorni,', summary.compensatory.earnings.toFixed(2), '€');
    console.log('- Festivi:', summary.holiday.days, 'giorni,', summary.holiday.earnings.toFixed(2), '€');
    
    console.log('\n✅ Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  }
}

// Esegui il test
testGetFixedDaysSummary();
