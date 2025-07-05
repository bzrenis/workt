/**
 * Script per ripristinare le impostazioni del database
 * Esegui questo dopo aver modificato la struttura delle impostazioni
 */

import DatabaseService from '../src/services/DatabaseService.js';
import { DEFAULT_SETTINGS } from '../src/constants/index.js';

async function resetSettings() {
  try {
    console.log('🔄 Inizializzazione database...');
    await DatabaseService.ensureInitialized();
    
    console.log('📋 Impostazioni correnti:');
    const currentSettings = await DatabaseService.getSetting('appSettings');
    console.log(JSON.stringify(currentSettings, null, 2));
    
    console.log('🔧 Ripristino impostazioni default...');
    await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
    
    console.log('✅ Impostazioni ripristinate con successo!');
    console.log('📋 Nuove impostazioni:');
    const newSettings = await DatabaseService.getSetting('appSettings');
    console.log(JSON.stringify(newSettings, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante il ripristino:', error);
    process.exit(1);
  }
}

resetSettings();
