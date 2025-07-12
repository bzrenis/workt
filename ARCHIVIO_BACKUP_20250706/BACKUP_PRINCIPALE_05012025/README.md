# BACKUP COMPLETO WORK TRACKER APP
**Data backup**: 05 Gennaio 2025
**Versione**: Pre-modifiche UI invasive

## Contenuto del backup

### File principali
- `App.js` - Entry point dell'applicazione
- `package.json` - Dipendenze e configurazione npm
- `app.json` - Configurazione Expo
- `index.js` - Bootstrap dell'app

### Cartella src/ completa
```
src/
├── components/          # Componenti UI riutilizzabili
│   ├── AnimatedComponents.js
│   └── SwipeNavigator.js
├── constants/           # Costanti e configurazioni
│   ├── holidays.js      # Festività italiane
│   └── index.js         # Esportazioni costanti
├── hooks/               # Custom React hooks
│   ├── index.js         # Hook principali (useSettings, useDatabase)
│   └── useCalculationService.js
├── screens/             # Tutte le schermate dell'app
│   ├── DashboardScreen.js           # Dashboard principale
│   ├── TimeEntryForm.js             # Form inserimento orari (RIPRISTINATO)
│   ├── TimeEntryScreen.js           # Lista orari
│   ├── SettingsScreen.js            # Impostazioni
│   ├── ContractSettingsScreen.js    # Impostazioni CCNL
│   ├── BackupScreen.js              # Backup e ripristino
│   ├── StandbySettingsScreen.js     # Impostazioni reperibilità
│   ├── MealSettingsScreen.js        # Impostazioni pasti
│   ├── TravelSettingsScreen.js      # Impostazioni viaggio
│   ├── TravelAllowanceSettings.js   # Impostazioni indennità trasferta
│   ├── NetCalculationSettingsScreen.js # Calcolo netto
│   ├── LoadingScreen.js             # Schermata di caricamento
│   └── MonthlySummary.js            # Riepilogo mensile
├── services/            # Servizi business logic
│   ├── DatabaseService.js           # Gestione SQLite
│   ├── CalculationService.js        # Calcoli salari CCNL
│   ├── BackupService.js             # Sistema backup
│   ├── NetEarningsCalculator.js     # Calcolo netto
│   ├── RealPayslipCalculator.js     # Calcolo busta paga
│   ├── MultiUserTaxCalculator.js    # Calcolo tasse
│   ├── DatabaseHealthService.js     # Monitoraggio DB
│   └── DatabaseLockManager.js       # Gestione concorrenza DB
└── utils/               # Utilità varie
    ├── index.js         # Funzioni di utilità generali
    └── earningsHelper.js # Helper per calcoli guadagni
```

## Stato delle funzionalità

### ✅ Implementato e funzionante
1. **Sistema CCNL completo** - Calcolo salari metalmeccanico PMI Level 5
2. **Time tracking avanzato** - Orari, viaggi, straordinari, notturni
3. **Database SQLite** - Storage offline con backup/ripristino
4. **Dashboard analytics** - Riepilogo mensile con metriche avanzate
5. **Gestione reperibilità** - Calendario e calcolo interventi
6. **Sistema indennità** - Trasferta, pasti, reperibilità configurabili
7. **Calcolo netto** - Stima stipendio netto con trattenute IRPEF/INPS
8. **UI moderna** - Componenti modulari e design consistente

### 🔄 Stato modifiche recenti
- **TimeEntryForm.js**: Ripristinato il "Riepilogo Guadagni" originale completo
- Mantiene la UI moderna (ModernCard) ma con tutta la logica business originale
- Tutti i breakdown dettagliati, calcoli e spiegazioni sono presenti
- Nessuna perdita di funzionalità rispetto alla versione originale

### 💾 Come utilizzare questo backup

1. **Ripristino completo**:
   ```bash
   # Sostituisci la cartella src attuale
   rm -rf src/
   cp -r BACKUP_PRINCIPALE_05012025/src ./
   
   # Ripristina i file principali se necessario
   cp BACKUP_PRINCIPALE_05012025/App.js ./
   cp BACKUP_PRINCIPALE_05012025/package.json ./
   ```

2. **Ripristino selettivo**:
   ```bash
   # Solo un file specifico
   cp BACKUP_PRINCIPALE_05012025/src/screens/TimeEntryForm.js src/screens/
   ```

3. **Verifica integrità**:
   ```bash
   npm install
   npx expo start
   ```

### 🔧 Configurazione sviluppo

**Requisiti**:
- Node.js 18+
- Expo CLI
- Android Studio (per Android)
- Xcode (per iOS)

**Setup**:
```bash
npm install
npx expo start
```

**Scripts disponibili**:
- `npm start` - Avvia server sviluppo
- `npm run android` - Build Android
- `npm run ios` - Build iOS

### 📊 Database Schema

Le tabelle principali includono:
- `work_entries` - Orari di lavoro con tutti i dettagli
- `settings` - Configurazioni app (CCNL, indennità, etc.)
- `calendar_standby` - Calendario reperibilità
- `backup_history` - Storico backup

### 🚨 Note importanti

1. **Questo backup preserva lo stato funzionale completo** dell'app prima di modifiche UI invasive
2. **TimeEntryForm.js è stato ripristinato** alla versione originale con tutti i dettagli
3. **Tutti i calcoli CCNL sono accurati** e testati
4. **La logica business è intatta** e non deve essere modificata
5. **L'UI è moderna** ma mantiene tutte le funzionalità originali

### 🔄 Cronologia modifiche

- **05/01/2025**: Backup completo pre-modifiche UI
- **Precedente**: Ripristino "Riepilogo Guadagni" completo in TimeEntryForm.js
- **Precedente**: Implementazione calcolo netto con trattenute IRPEF/INPS
- **Precedente**: Sistema reperibilità con calendario e maggiorazioni
- **Precedente**: Dashboard analytics con metriche avanzate
