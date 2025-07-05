/**
 * RESET FORZATO DELLE IMPOSTAZIONI
 * Cancella tutto e ripristina i valori di default
 */

import DatabaseService from './src/services/DatabaseService.js';
import { DEFAULT_SETTINGS } from './src/constants/index.js';

async function forceReset() {
  try {
    console.log('🔥 RESET FORZATO - Eliminazione tutte le impostazioni...');
    await DatabaseService.ensureInitialized();
    
    // Cancella le impostazioni esistenti
    await DatabaseService.deleteSetting('appSettings');
    console.log('✅ Impostazioni eliminate');
    
    // Ripristina i default
    await DatabaseService.setSetting('appSettings', DEFAULT_SETTINGS);
    console.log('✅ Impostazioni default ripristinate');
    
    // Verifica
    const newSettings = await DatabaseService.getSetting('appSettings');
    console.log('📋 Verifico nuove impostazioni:');
    console.log('Contract valid:', !!newSettings.contract);
    console.log('NetCalculation:', newSettings.netCalculation);
    
    console.log('🎉 RESET COMPLETATO CON SUCCESSO!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante il reset:', error);
    process.exit(1);
  }
}

forceReset();
