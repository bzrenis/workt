// 🚀 SCRIPT PUBBLICAZIONE AGGIORNAMENTO OTA
// Uso: node publish-ota-update.js [messaggio]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function publishOTAUpdate() {
  try {
    console.log('🚀 ========================================');
    console.log('🚀 PUBBLICAZIONE AGGIORNAMENTO OTA');
    console.log('🚀 ========================================');
    
    // Leggi versione corrente
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
    
    console.log(`📦 Versione corrente: ${packageJson.version}`);
    console.log(`📱 App versione: ${appJson.expo.version}`);
    
    // Verifica che le versioni siano sincronizzate
    if (packageJson.version !== appJson.expo.version) {
      console.error('❌ ERRORE: Versioni non sincronizzate!');
      console.error(`📦 package.json: ${packageJson.version}`);
      console.error(`📱 app.json: ${appJson.expo.version}`);
      process.exit(1);
    }
    
    // Messaggio di rilascio
    const releaseMessage = process.argv[2] || `Aggiornamento v${packageJson.version} - Miglioramenti sistema backup e notifiche`;
    
    console.log(`📝 Messaggio rilascio: "${releaseMessage}"`);
    console.log('');
    console.log('⬆️ Pubblicazione in corso...');
    
    // Esegui comando EAS update
    const command = `eas update --branch production --message "${releaseMessage}"`;
    console.log(`🔧 Comando: ${command}`);
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'inherit' 
      });
      
      console.log('');
      console.log('✅ ========================================');
      console.log('✅ AGGIORNAMENTO OTA PUBBLICATO CON SUCCESSO!');
      console.log('✅ ========================================');
      console.log(`🎯 Versione: ${packageJson.version}`);
      console.log(`📝 Messaggio: ${releaseMessage}`);
      console.log('📱 Gli utenti riceveranno l\'aggiornamento automaticamente');
      console.log('');
      console.log('🧪 Per testare:');
      console.log('🧪 1. Apri l\'app su un dispositivo con build nativa');
      console.log('🧪 2. Aspetta qualche minuto per la propagazione');
      console.log('🧪 3. Riavvia l\'app o usa checkForUpdates() nella console');
      
    } catch (error) {
      console.error('❌ Errore durante pubblicazione:', error.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Errore script:', error.message);
    process.exit(1);
  }
}

// Verifica che EAS CLI sia installato
try {
  execSync('eas --version', { encoding: 'utf8' });
} catch (error) {
  console.error('❌ ERRORE: EAS CLI non installato!');
  console.error('💡 Installa con: npm install -g @expo/eas-cli');
  process.exit(1);
}

publishOTAUpdate();
