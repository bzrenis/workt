// Test debug per il problema del sabato 12/07/2025
// Simuliamo i dati esatti del caso

const testSaturdayTravelAllowance = () => {
  console.log('🔍 DEBUG INDENNITÀ TRASFERTA SABATO 12/07/2025');
  console.log('='.repeat(60));
  
  // Dati del caso specifico
  const workEntry = {
    date: '2025-07-12',
    workHours: 7, // ore ordinarie (lavoro + viaggio)
    travelHours: 0, // incluso nelle 7 ore sopra
    standbyWorkHours: 4, // ore reperibilità
    travelAllowance: true,
    trasfertaManualOverride: false,
    travelAllowancePercent: 1.0
  };
  
  const settings = {
    travelAllowance: {
      enabled: true,
      dailyAmount: 13.125, // Suppongo questo importo base per avere 6.56€ al 50%
      selectedOptions: ['WITH_TRAVEL', 'HALF_ALLOWANCE_HALF_DAY'], // Metodo corrente
      applyOnSpecialDays: false
    }
  };
  
  // Simuliamo la logica attuale
  const dateObj = new Date(workEntry.date);
  const isSaturday = dateObj.getDay() === 6; // true
  const isSunday = dateObj.getDay() === 0; // false  
  const isHoliday = false; // 12/07 non è festivo
  
  console.log(`📅 Analisi data ${workEntry.date}:`);
  console.log(`   isSaturday: ${isSaturday}`);
  console.log(`   isSunday: ${isSunday}`);
  console.log(`   isHoliday: ${isHoliday}`);
  
  // Condizione attuale per applicare l'indennità
  const applyOnSpecialDays = settings.travelAllowance.applyOnSpecialDays;
  const manualOverride = workEntry.trasfertaManualOverride;
  
  // QUESTA È LA CONDIZIONE PROBLEMATICA:
  const shouldApply = !(isSunday || isHoliday) || applyOnSpecialDays || manualOverride;
  
  console.log(`\n🔧 Condizioni applicazione indennità:`);
  console.log(`   !(isSunday || isHoliday): ${!(isSunday || isHoliday)}`);
  console.log(`   applyOnSpecialDays: ${applyOnSpecialDays}`);
  console.log(`   manualOverride: ${manualOverride}`);
  console.log(`   shouldApply (finale): ${shouldApply}`);
  
  if (shouldApply) {
    const calculationMethod = 'HALF_ALLOWANCE_HALF_DAY';
    const totalWorked = workEntry.workHours;
    const isHalfDay = totalWorked > 0 && totalWorked < 8;
    
    console.log(`\n💰 Calcolo indennità:`);
    console.log(`   totalWorked: ${totalWorked}h`);
    console.log(`   isHalfDay: ${isHalfDay}`);
    console.log(`   calculationMethod: ${calculationMethod}`);
    
    let baseTravelAllowance = settings.travelAllowance.dailyAmount;
    
    if (calculationMethod === 'HALF_ALLOWANCE_HALF_DAY' && isHalfDay) {
      baseTravelAllowance = settings.travelAllowance.dailyAmount / 2;
      console.log(`   🔸 Applicato 50% per mezza giornata: ${baseTravelAllowance.toFixed(2)}€`);
    }
    
    const finalAmount = baseTravelAllowance * workEntry.travelAllowancePercent;
    console.log(`   ✅ Importo finale: ${finalAmount.toFixed(2)}€`);
    
  } else {
    console.log(`\n❌ Indennità NON applicata per condizioni`);
  }
  
  // Verifica con metodo CCNL proporzionale
  console.log(`\n🎯 CON METODO CCNL PROPORZIONALE:`);
  const proportionalRate = Math.min(workEntry.workHours / 8, 1.0);
  const ccnlAmount = settings.travelAllowance.dailyAmount * proportionalRate;
  console.log(`   Proporzionale: ${workEntry.workHours}h / 8h = ${(proportionalRate * 100).toFixed(1)}%`);
  console.log(`   Importo CCNL: ${ccnlAmount.toFixed(2)}€`);
  console.log(`   Differenza: +${(ccnlAmount - 6.56).toFixed(2)}€`);
};

console.log('🚨 PROBLEMA IDENTIFICATO: SABATO TRATTATO COME MEZZA GIORNATA');
testSaturdayTravelAllowance();
