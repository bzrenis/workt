#!/usr/bin/env node

/**
 * Script per correggere gli accessi non sicuri a breakdown nel componente EarningsSummary
 * Aggiunge l'operatore optional chaining (?.) per evitare errori con breakdown undefined
 */

const fs = require('fs');
const path = require('path');

const filePath = 'src/screens/TimeEntryForm.js';

console.log('🔧 Applicazione correzioni di sicurezza per breakdown...');

// Leggi il file
let content = fs.readFileSync(filePath, 'utf8');

// Lista delle correzioni da applicare (solo quelle che mancano ancora dell'optional chaining)
const fixes = [
  // Debug log fix
  { from: 'breakdownAllowances: breakdown.allowances,', to: 'breakdownAllowances: breakdown?.allowances,' },
  { from: 'standbyInBreakdown: breakdown.allowances?.standby || 0', to: 'standbyInBreakdown: breakdown?.allowances?.standby || 0' },
  
  // Sezione ferie/permessi/giorni fissi
  { from: 'breakdown.isFixedDay && (', to: 'breakdown?.isFixedDay && (' },
  { from: 'TypeIcon type={breakdown.dayType}', to: 'TypeIcon type={breakdown?.dayType}' },
  { from: 'breakdown.dayType === \'ferie\'', to: 'breakdown?.dayType === \'ferie\'' },
  { from: 'breakdown.dayType === \'malattia\'', to: 'breakdown?.dayType === \'malattia\'' },
  { from: 'breakdown.dayType === \'permesso\'', to: 'breakdown?.dayType === \'permesso\'' },
  { from: 'breakdown.dayType === \'riposo\'', to: 'breakdown?.dayType === \'riposo\'' },
  { from: 'breakdown.dayType === \'festivo\'', to: 'breakdown?.dayType === \'festivo\'' },
  { from: 'breakdown.fixedEarnings)', to: 'breakdown?.fixedEarnings)' },
  
  // Sezione ore ordinarie
  { from: '!breakdown.isFixedDay && hasOrdinaryHours', to: '!breakdown?.isFixedDay && hasOrdinaryHours' },
  { from: '!breakdown.details?.isSaturday', to: '!breakdown?.details?.isSaturday' },
  { from: '!breakdown.details?.isSunday', to: '!breakdown?.details?.isSunday' },
  { from: '!breakdown.details?.isHoliday', to: '!breakdown?.details?.isHoliday' },
  { from: 'breakdown.ordinary.hours.lavoro_giornaliera', to: 'breakdown?.ordinary?.hours?.lavoro_giornaliera' },
  { from: 'breakdown.ordinary.hours.viaggio_giornaliera', to: 'breakdown?.ordinary?.hours?.viaggio_giornaliera' },
  { from: 'breakdown.ordinary.hours.lavoro_extra', to: 'breakdown?.ordinary?.hours?.lavoro_extra' },
  { from: 'breakdown.ordinary.hours.viaggio_extra', to: 'breakdown?.ordinary?.hours?.viaggio_extra' },
  { from: 'breakdown.ordinary.earnings.giornaliera', to: 'breakdown?.ordinary?.earnings?.giornaliera' },
  { from: 'breakdown.ordinary.hours.lavoro_domenica', to: 'breakdown?.ordinary?.hours?.lavoro_domenica' },
  { from: 'breakdown.ordinary.hours.lavoro_festivo', to: 'breakdown?.ordinary?.hours?.lavoro_festivo' },
  { from: 'breakdown.ordinary.hours.lavoro_sabato', to: 'breakdown?.ordinary?.hours?.lavoro_sabato' },
  
  // Giorni speciali (sabato, domenica, festivi)
  { from: 'breakdown.details?.isSaturday ||', to: 'breakdown?.details?.isSaturday ||' },
  { from: 'breakdown.details?.isSunday ||', to: 'breakdown?.details?.isSunday ||' },
  { from: 'breakdown.details?.isHoliday)', to: 'breakdown?.details?.isHoliday)' },
  { from: 'breakdown.details?.isSunday &&', to: 'breakdown?.details?.isSunday &&' },
  { from: 'breakdown.details?.isHoliday &&', to: 'breakdown?.details?.isHoliday &&' },
  
  // Totale e sezioni finali
  { from: 'breakdown.isFixedDay ?', to: 'breakdown?.isFixedDay ?' },
  { from: 'breakdown.details?.isPartialDay', to: 'breakdown?.details?.isPartialDay' },
  { from: 'breakdown.details?.completamentoTipo', to: 'breakdown?.details?.completamentoTipo' },
  { from: 'breakdown.details.missingHours', to: 'breakdown?.details?.missingHours' },
  { from: 'breakdown.details.completamentoTipo', to: 'breakdown?.details?.completamentoTipo' },
];

let appliedFixes = 0;

// Applica le correzioni
for (const fix of fixes) {
  if (content.includes(fix.from) && !content.includes(fix.to)) {
    content = content.replace(new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.to);
    appliedFixes++;
    console.log(`✅ Applicata: ${fix.from} → ${fix.to}`);
  }
}

// Scrivi il file aggiornato
fs.writeFileSync(filePath, content);

console.log(`\n🎉 Completato! Applicate ${appliedFixes} correzioni di sicurezza.`);
console.log('💡 Ora breakdown sarà accessibile in modo sicuro con optional chaining.');
