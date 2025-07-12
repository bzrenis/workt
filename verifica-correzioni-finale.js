#!/usr/bin/env node

/**
 * VERIFICA FINALE CORREZIONI SISTEMA NOTIFICHE
 * Script di controllo per confermare che tutte le modifiche sono state applicate
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICA FINALE CORREZIONI SISTEMA NOTIFICHE');
console.log('================================================');
console.log('');

const checks = [
  {
    name: '1. Import AsyncStorage in hooks',
    file: 'src/hooks/index.js',
    search: "import AsyncStorage from '@react-native-async-storage/async-storage';"
  },
  {
    name: '2. updateSettings salva in AsyncStorage',
    file: 'src/hooks/index.js', 
    search: "await AsyncStorage.setItem('settings', JSON.stringify(newSettings));"
  },
  {
    name: '3. loadSettings sincronizza AsyncStorage',
    file: 'src/hooks/index.js',
    search: "await AsyncStorage.setItem('settings', JSON.stringify(appSettings));"
  },
  {
    name: '4. Import NotificationService in calendario',
    file: 'src/screens/StandbySettingsScreen.js',
    search: "import NotificationService from '../services/NotificationService';"
  },
  {
    name: '5. onDayPress aggiorna notifiche automaticamente',
    file: 'src/screens/StandbySettingsScreen.js',
    search: "await NotificationService.updateStandbyNotifications();"
  },
  {
    name: '6. Import Notifications in debug screen',
    file: 'src/screens/DebugSettingsScreen.js',
    search: "import * as Notifications from 'expo-notifications';"
  }
];

let allChecksOk = true;

checks.forEach((check, index) => {
  try {
    const fullPath = path.join(__dirname, check.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes(check.search)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name} - MANCANTE`);
      allChecksOk = false;
    }
  } catch (error) {
    console.log(`⚠️  ${check.name} - FILE NON TROVATO: ${check.file}`);
    allChecksOk = false;
  }
});

console.log('');
console.log('================================================');

if (allChecksOk) {
  console.log('🎉 TUTTE LE CORREZIONI SONO STATE APPLICATE CORRETTAMENTE!');
  console.log('');
  console.log('📋 PROSSIMI PASSI:');
  console.log('1. Avvia l\'app con: npx expo start');
  console.log('2. Vai su Impostazioni → Reperibilità');
  console.log('3. Seleziona alcuni giorni nel calendario');
  console.log('4. Vai su Impostazioni → Debug Notifiche');
  console.log('5. Testa "AsyncStorage" e "Programmazione Notifiche"');
  console.log('');
  console.log('✅ Il sistema di notifiche dovrebbe ora funzionare perfettamente!');
} else {
  console.log('❌ ALCUNE CORREZIONI SONO MANCANTI');
  console.log('Controlla i file sopra indicati e riapplica le modifiche necessarie.');
}

console.log('================================================');
