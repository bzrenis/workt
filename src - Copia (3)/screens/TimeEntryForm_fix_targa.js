// TimeEntryForm_fix_targa.js
// Versione aggiornata per salvataggio corretto del campo targa_veicolo

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
  StatusBar,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, formatTime, formatCurrency } from '../utils';
import { useSettings } from '../hooks';
import DatabaseService from '../services/DatabaseService';
import { useCalculationService } from '../hooks';
import { createWorkEntryFromData } from '../utils/earningsHelper';

// ...existing code for ModernCard, SectionHeader, InputRow, ModernSwitch, ModernButton, InfoBadge, TimeFieldModern, EarningsSummary, veicoloOptions, dayTypes, iconsConfig, TypeIcon, completamentoOptions, categoryLabels ...

const TimeEntryForm = ({ route, navigation }) => {
  // ...existing state and hooks...

  // ...existing useEffect for edit and calendar...

  // ...existing handlers...

  // ...existing renderViaggio, addIntervento, togglePasto, toggleTrasferta, toggleReperibilita, etc...

  // Salvataggio (fix: aggiunta targaVeicolo)
  const handleSave = async () => {
    try {
      const viaggi = form.viaggi[0] || {};
      const entry = {
        date: (() => {
          const [d, m, y] = form.date.split('/');
          return `${y}-${m}-${d}`;
        })(),
        siteName: form.site_name || '',
        vehicleDriven: form.veicolo || '',
        vehiclePlate: form.targa_veicolo || '',
        targaVeicolo: form.targa_veicolo || '', // <--- FIX: aggiunto campo per DatabaseService
        departureCompany: viaggi.departure_company || '',
        arrivalSite: viaggi.arrival_site || '',
        workStart1: viaggi.work_start_1 || '',
        workEnd1: viaggi.work_end_1 || '',
        workStart2: viaggi.work_start_2 || '',
        workEnd2: viaggi.work_end_2 || '',
        departureReturn: viaggi.departure_return || '',
        arrivalCompany: viaggi.arrival_company || '',
        interventi: form.interventi || [],
        mealLunchVoucher: form.pasti.pranzo && !(mealCash.pranzo && parseFloat(mealCash.pranzo) > 0) ? 1 : 0,
        mealLunchCash: mealCash.pranzo && parseFloat(mealCash.pranzo) > 0 ? parseFloat(mealCash.pranzo.replace(',','.')) : 0,
        mealDinnerVoucher: form.pasti.cena && !(mealCash.cena && parseFloat(mealCash.cena) > 0) ? 1 : 0,
        mealDinnerCash: mealCash.cena && parseFloat(mealCash.cena) > 0 ? parseFloat(mealCash.cena.replace(',','.')) : 0,
        travelAllowance: form.trasferta ? 1 : 0,
        travelAllowancePercent: form.trasfertaPercent || 1.0,
        trasfertaManualOverride: form.trasfertaManualOverride || false,
        standbyAllowance: form.reperibilita ? 1 : 0,
        isStandbyDay: form.reperibilita ? 1 : 0,
        reperibilityManualOverride: form.reperibilityManualOverride || false,
        completamentoGiornata: form.completamentoGiornata || 'nessuno',
        totalEarnings: 0,
        notes: form.note || '',
        dayType,
      };
      const settingsObj = settings || {};
      const result = calculationService.calculateEarningsBreakdown(entry, settingsObj);
      entry.totalEarnings = result.totalEarnings || 0;
      const { validateWorkEntry } = require('../utils');
      const { isValid, errors } = validateWorkEntry(entry);
      if (!isValid) {
        const firstError = Object.values(errors)[0];
        Alert.alert('Errore', firstError || 'Dati non validi');
        return;
      }
      if (isEdit) {
        await DatabaseService.updateWorkEntry(entryId, entry);
        Alert.alert('Aggiornamento', 'Inserimento aggiornato con successo!');
      } else {
        await DatabaseService.insertWorkEntry(entry);
        Alert.alert('Salvataggio', 'Inserimento salvato su database!');
      }
      navigation.navigate('TimeEntryScreen', { refresh: true, refreshDashboard: true });
    } catch (e) {
      console.error('Save Error:', e);
      Alert.alert('Errore', `Errore durante il salvataggio su database: ${e.message}`)
    }
  };

  // ...existing render and return code, sostituendo l'onPress del pulsante Salva con handleSave ...
};

export default TimeEntryForm;
