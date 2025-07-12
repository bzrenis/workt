# BACKUP COMPLETO APP WORK TRACKER - 05/01/2025

## Stato attuale applicazione

L'applicazione Work Hours Tracker è un'app React Native Expo per il tracking degli orari di lavoro con calcolo automatico dei salari basato sui contratti CCNL italiani.

### File principali

1. **App.js** - Entry point dell'applicazione con navigation
2. **src/screens/DashboardScreen.js** - Dashboard principale con riepilogo mensile
3. **src/screens/TimeEntryForm.js** - Form per inserimento orari (RIPRISTINATO con "Riepilogo Guadagni" completo)
4. **src/screens/TimeEntryScreen.js** - Lista orari inseriti
5. **src/screens/SettingsScreen.js** - Schermata impostazioni principali
6. **src/services/** - Servizi per database, calcoli, backup
7. **src/utils/** - Utilità varie
8. **src/constants/** - Costanti e configurazioni
9. **src/hooks/** - Custom hooks React

### Funzionalità principali implementate

1. ✅ **Gestione CCNL**: Calcolo salari basato su contratto metalmeccanico PMI Level 5
2. ✅ **Time Tracking**: Inserimento orari completi con viaggi, straordinari, notturni
3. ✅ **Database SQLite**: Storage offline con Expo SQLite
4. ✅ **Dashboard**: Riepilogo mensile dettagliato con analytics
5. ✅ **Backup System**: Backup e ripristino dati
6. ✅ **Reperibilità**: Gestione interventi in reperibilità con maggiorazioni
7. ✅ **Indennità**: Trasferta, pasti, reperibilità configurable
8. ✅ **Calcolo Netto**: Sistema per calcolo stipendio netto con trattenute

### Stato modifica UI recenti

- **TimeEntryForm.js**: RIPRISTINATO il "Riepilogo Guadagni" originale completo
- Il summary è ora visivamente moderno (ModernCard) ma funzionalmente identico all'originale
- Tutte le sezioni, breakdown, e spiegazioni dettagliate sono presenti
- Calcoli e logica business invariati

### Tecnologie utilizzate

- React Native 0.79.4
- Expo SDK ~53.0.12
- React Navigation 7.x
- SQLite con expo-sqlite
- React hooks personalizzati
- Expo vector icons
- AsyncStorage per preferences

### Configurazione sviluppo

```bash
npm install
npx expo start
```

### Database Schema

Il database include tabelle per:
- work_entries (orari di lavoro)
- settings (configurazioni app)
- calendar_standby (calendario reperibilità)
- backups (backup dati)

Questo backup documenta lo stato dell'app prima di qualsiasi modifica UI invasiva.
