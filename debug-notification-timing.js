// 🔧 CORREZIONE NOTIFICHE PROGRAMMATE
// Il problema è che le notifiche arrivano subito invece di essere programmate

console.log('🔧 === ANALISI PROBLEMA NOTIFICHE ===');

// Test le impostazioni di default e la logica di programmazione
async function analyzeNotificationProblem() {
  console.log('📊 Analisi logica programmazione...');
  
  // Simula le impostazioni utente tipiche
  const settings = {
    enabled: true,
    morningTime: '08:00',    // 8:00 del mattino
    eveningTime: '18:00',    // 6:00 di sera
    weekendsEnabled: false   // Solo giorni feriali
  };
  
  console.log('⚙️ Settings:', JSON.stringify(settings, null, 2));
  
  // Test data corrente
  const now = new Date();
  console.log('🕐 Ora corrente:', now.toLocaleString('it-IT'));
  console.log('📅 Giorno settimana:', now.getDay(), ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][now.getDay()]);
  
  // Test programmazione per domani mattina
  const [hours, minutes] = settings.morningTime.split(':').map(Number);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);
  
  console.log('🌅 Notifica programmata per:', tomorrow.toLocaleString('it-IT'));
  console.log('⏳ Tra:', Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10, 'giorni');
  console.log('⏰ Tra:', Math.round((tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10, 'ore');
  
  // Verifica che sia nel futuro
  const isInFuture = tomorrow > now;
  console.log('✅ È nel futuro:', isInFuture);
  
  if (!isInFuture) {
    console.log('❌ PROBLEMA: La data non è nel futuro!');
    
    // Debug: proviamo diverse ore
    for (let h = 6; h <= 22; h += 2) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1);
      testDate.setHours(h, 0, 0, 0);
      
      console.log(`   Test ${h}:00 →`, testDate.toLocaleString('it-IT'), 'Nel futuro:', testDate > now);
    }
  }
  
  // Test configurazione Expo Notifications
  console.log('📱 Configurazione trigger Expo:');
  const trigger = {
    date: tomorrow
  };
  console.log(JSON.stringify(trigger, null, 2));
  
  // Verifica se il problema è nel formato data
  console.log('🔍 Formati data:');
  console.log('   ISO:', tomorrow.toISOString());
  console.log('   Time:', tomorrow.getTime());
  console.log('   UTC:', tomorrow.toUTCString());
  
  // POSSIBILI CAUSE DEL PROBLEMA:
  console.log('🚨 === POSSIBILI CAUSE ===');
  console.log('1. ⏰ Timezone: React Native/Expo potrebbero interpretare male il timezone');
  console.log('2. 🔄 Impostazioni app: Notifiche potrebbero essere configurate per "test immediato"');
  console.log('3. 📱 Permessi: Notifiche programmate richiedono permessi speciali');
  console.log('4. 🛠️ Development mode: In sviluppo le notifiche si comportano diversamente');
  console.log('5. ⚙️ Handler: Manca configurazione corretta del notification handler');
  
  // SOLUZIONI SUGGERITE:
  console.log('💡 === SOLUZIONI ===');
  console.log('1. 🔧 Verificare permessi notifiche nelle impostazioni del telefono');
  console.log('2. 🧪 Testare in modalità produzione (expo build)');
  console.log('3. ⏰ Usare timestamp assoluti invece di oggetti Date');
  console.log('4. 📱 Verificare impostazioni "Do Not Disturb" del dispositivo');
  console.log('5. 🔄 Controllare recovery/reschedule automatico');
}

analyzeNotificationProblem().catch(console.error);
