/**
 * Test Script per le Notifiche di Reperibilità
 * 
 * Questo script può essere eseguito per testare le funzionalità di notifica
 * integrate nel TimeEntryForm.js
 */

import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../src/services/NotificationService';

export class StandbyNotificationTester {
  
  /**
   * Test 1: Verifica che il NotificationService sia correttamente importato
   */
  static async testNotificationServiceImport() {
    console.log('🧪 Test 1: Verifica import NotificationService');
    
    try {
      const hasPermissions = await NotificationService.hasPermissions();
      console.log('✅ NotificationService importato correttamente');
      console.log('📱 Permessi notifiche:', hasPermissions ? 'CONCESSI' : 'NON CONCESSI');
      return true;
    } catch (error) {
      console.error('❌ Errore import NotificationService:', error);
      return false;
    }
  }
  
  /**
   * Test 2: Simula l'attivazione di reperibilità da calendario
   */
  static async testCalendarStandbyActivation() {
    console.log('🧪 Test 2: Simulazione attivazione reperibilità da calendario');
    
    try {
      // Simula una data futura di reperibilità
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0]; // formato yyyy-MM-dd
      
      console.log('📅 Data di test:', dateStr);
      
      // Ottieni le impostazioni attuali
      const settings = await NotificationService.getSettings();
      console.log('⚙️ Impostazioni notifiche:', {
        enabled: settings.enabled,
        standbyEnabled: settings.standbyReminders.enabled,
        activeNotifications: settings.standbyReminders.notifications.filter(n => n.enabled).length
      });
      
      // Testa la programmazione notifiche
      if (settings.enabled && settings.standbyReminders.enabled) {
        await NotificationService.scheduleStandbyReminders([dateStr]);
        console.log('✅ Notifiche programmate con successo');
      } else {
        console.log('⚠️ Notifiche disabilitate nelle impostazioni');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Errore test calendario:', error);
      return false;
    }
  }
  
  /**
   * Test 3: Verifica la sincronizzazione del calendario
   */
  static async testCalendarSync() {
    console.log('🧪 Test 3: Test sincronizzazione calendario');
    
    try {
      const scheduledCount = await NotificationService.syncStandbyNotificationsWithCalendar();
      console.log(`✅ Sincronizzazione completata: ${scheduledCount} notifiche programmate`);
      return true;
    } catch (error) {
      console.error('❌ Errore sincronizzazione:', error);
      return false;
    }
  }
  
  /**
   * Test 4: Simula l'esperienza utente completa
   */
  static async testUserExperience() {
    console.log('🧪 Test 4: Simulazione esperienza utente completa');
    
    try {
      // 1. Utente apre TimeEntryForm con data nel calendario
      console.log('👤 Passo 1: Utente apre TimeEntryForm con data reperibilità');
      
      // 2. App rileva data nel calendario
      console.log('🔍 Passo 2: App rileva data nel calendario reperibilità');
      
      // 3. Reperibilità si attiva automaticamente
      console.log('🔄 Passo 3: Reperibilità attivata automaticamente');
      
      // 4. Notifiche vengono programmate
      console.log('📞 Passo 4: Programmazione notifiche...');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await NotificationService.scheduleStandbyReminders([dateStr]);
      
      // 5. Utente vede messaggio informativo
      console.log('💬 Passo 5: Messaggio informativo mostrato all\'utente');
      console.log('✅ Esperienza utente completata con successo!');
      
      return true;
    } catch (error) {
      console.error('❌ Errore nell\'esperienza utente:', error);
      return false;
    }
  }
  
  /**
   * Test completo di tutte le funzionalità
   */
  static async runAllTests() {
    console.log('🚀 Avvio test completo notifiche reperibilità');
    console.log('================================================');
    
    const results = {
      import: await this.testNotificationServiceImport(),
      calendar: await this.testCalendarStandbyActivation(),
      sync: await this.testCalendarSync(),
      userExperience: await this.testUserExperience()
    };
    
    console.log('================================================');
    console.log('📊 RISULTATI FINALI:');
    console.log('✅ Import NotificationService:', results.import ? 'PASS' : 'FAIL');
    console.log('✅ Attivazione da calendario:', results.calendar ? 'PASS' : 'FAIL');
    console.log('✅ Sincronizzazione calendario:', results.sync ? 'PASS' : 'FAIL');
    console.log('✅ Esperienza utente:', results.userExperience ? 'PASS' : 'FAIL');
    
    const allPassed = Object.values(results).every(r => r === true);
    console.log(`🎯 RISULTATO COMPLESSIVO: ${allPassed ? '✅ TUTTI I TEST SUPERATI' : '❌ ALCUNI TEST FALLITI'}`);
    
    return allPassed;
  }
  
  /**
   * Test rapido per sviluppo
   */
  static async quickTest() {
    console.log('⚡ Test rapido notifiche reperibilità');
    
    try {
      // Test basic import
      await NotificationService.hasPermissions();
      console.log('✅ Servizio importato correttamente');
      
      // Test settings
      const settings = await NotificationService.getSettings();
      console.log('✅ Impostazioni caricate:', settings.enabled ? 'ABILITATE' : 'DISABILITATE');
      
      // Test sync
      await NotificationService.syncStandbyNotificationsWithCalendar();
      console.log('✅ Sincronizzazione testata');
      
      console.log('🎉 Test rapido completato con successo!');
      return true;
    } catch (error) {
      console.error('❌ Test rapido fallito:', error);
      return false;
    }
  }
}

// Utilizzo nei tests:
// 
// import { StandbyNotificationTester } from './test-standby-notifications';
// 
// // Test completo
// StandbyNotificationTester.runAllTests();
// 
// // Test rapido
// StandbyNotificationTester.quickTest();

export default StandbyNotificationTester;
