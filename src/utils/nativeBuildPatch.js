// 🚀 PATCH PER BUILD NATIVA - NOTIFICHE PULITE
// Questo file disabilita tutti i test automatici in build nativa

console.log('🔧 Applicando patch build nativa...');

// Verifica ambiente
const isNativeBuild = !__DEV__ && typeof __DEV__ !== 'undefined';
const isExpoGo = typeof expo !== 'undefined';

console.log('📱 Ambiente rilevato:', {
  isNativeBuild,
  isExpoGo,
  __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined'
});

if (isNativeBuild) {
  console.log('🔔 MODALITÀ BUILD NATIVA ATTIVA');
  console.log('✅ Test automatici DISABILITATI');
  console.log('✅ Recovery gentile ATTIVO');
  console.log('✅ Notifiche immediate BLOCCATE');
  console.log('');
  console.log('📅 Le notifiche arriveranno SOLO agli orari programmati:');
  console.log('   - Mattina: 07:30 (promemoria lavoro)');
  console.log('   - Sera: 18:30 (inserimento orari)');
  console.log('   - Reperibilità: 1 ora prima dell\'inizio');
  console.log('');
  console.log('🎯 PIANO TEST BUILD NATIVA:');
  console.log('1. 📱 Installa APK dal link EAS');
  console.log('2. 🔔 Accetta permessi notifiche');
  console.log('3. ⚙️ Configura orari nelle impostazioni');
  console.log('4. 📴 Chiudi app completamente');
  console.log('5. ⏰ Aspetta domani mattina alle 07:30');
}

module.exports = {
  isNativeBuild,
  disableAutoTests: isNativeBuild,
  enableGentleRecovery: isNativeBuild,
  quietLogs: isNativeBuild
};
