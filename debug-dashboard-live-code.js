/**
 * 🐞 DEBUG DASHBOARD LIVE - INTERVENTI REPERIBILITÀ
 * 
 * Aggiungi questo codice temporaneo alla DashboardScreen per verificare
 * cosa succede durante l'aggregazione degli interventi
 */

// QUESTO CODICE VA AGGIUNTO TEMPORANEAMENTE ALLA FUNZIONE calculateMonthlyAggregation
// NELLA DashboardScreen.js DOPO LA RIGA 320 CIRCA

console.log('\n🔍 === DEBUG DASHBOARD LIVE - INTERVENTI ===');

// Per ogni entry, logga i dati cruciali
for (const entry of entries) {
  console.log(`\n📅 Entry ${entry.id} - ${entry.date}:`);
  console.log(`   - Reperibilità DB: ${entry.is_standby_day}`);
  console.log(`   - Interventi raw: ${entry.interventi || 'null'}`);
  
  try {
    const workEntry = createWorkEntryFromData(entry);
    console.log(`   - WorkEntry creato: isStandbyDay=${workEntry.isStandbyDay}, interventi=${workEntry.interventi?.length || 0}`);
    
    if (workEntry.interventi && workEntry.interventi.length > 0) {
      console.log(`   - Primo intervento:`, JSON.stringify(workEntry.interventi[0], null, 2));
    }
    
    const breakdown = calculationService.calculateEarningsBreakdown(workEntry, safeSettings);
    
    if (breakdown) {
      console.log(`   - Breakdown totale: €${breakdown.totalEarnings?.toFixed(2) || '0.00'}`);
      console.log(`   - Breakdown standby: €${breakdown.standby?.totalEarnings?.toFixed(2) || '0.00'}`);
      console.log(`   - Breakdown allowances.standby: €${breakdown.allowances?.standby?.toFixed(2) || '0.00'}`);
      
      if (breakdown.standby) {
        const hasStandbyWork = Object.values(breakdown.standby.workHours || {}).some(h => h > 0);
        const hasStandbyTravel = Object.values(breakdown.standby.travelHours || {}).some(h => h > 0);
        console.log(`   - Ha ore lavoro standby: ${hasStandbyWork}`);
        console.log(`   - Ha ore viaggio standby: ${hasStandbyTravel}`);
        
        if (hasStandbyWork || hasStandbyTravel) {
          console.log(`   - Ore lavoro standby:`, breakdown.standby.workHours);
          console.log(`   - Ore viaggio standby:`, breakdown.standby.travelHours);
          console.log(`   - Guadagni lavoro standby:`, breakdown.standby.workEarnings);
          console.log(`   - Guadagni viaggio standby:`, breakdown.standby.travelEarnings);
        }
      }
    } else {
      console.log(`   - ❌ BREAKDOWN NULL!`);
    }
    
  } catch (error) {
    console.log(`   - ❌ ERRORE: ${error.message}`);
  }
}

console.log('\n📊 AGGREGAZIONE FINALE:');
console.log(`   - aggregated.standby.totalEarnings: €${aggregated.standby?.totalEarnings?.toFixed(2) || '0.00'}`);
console.log(`   - aggregated.analytics.standbyInterventions: ${aggregated.analytics?.standbyInterventions || 0}`);

// Verifica hasStandbyData
const hasStandbyData = aggregated.standby?.totalEarnings > 0 ||
  Object.values(aggregated.standby?.workHours || {}).some(h => h > 0) ||
  Object.values(aggregated.standby?.travelHours || {}).some(h => h > 0);

console.log(`   - hasStandbyData: ${hasStandbyData}`);

if (!hasStandbyData) {
  console.log('\n❌ PROBLEMA IDENTIFICATO: hasStandbyData è false!');
  console.log('   La sezione interventi non verrà mostrata nella dashboard');
} else {
  console.log('\n✅ hasStandbyData è true, la sezione dovrebbe essere mostrata');
}

console.log('\n🔍 === FINE DEBUG DASHBOARD LIVE ===\n');

// FINE CODICE DA AGGIUNGERE TEMPORANEAMENTE
