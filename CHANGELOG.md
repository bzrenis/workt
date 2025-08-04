# Changelog - WorkT Tracker Ore Lavoro

## [1.3.1] - 2025-08-04

### ✨ **OTTIMIZZAZIONE SISTEMA - Performance e Continuità Servizio**

#### 📊 **Sistema Backup Intelligente Perfezionato**
- **RISOLTO: Statistiche backup sempre accurate**: Sistema fallback automatico che calcola correttamente il numero di backup quando il servizio principale restituisce 0
- **Pulizia automatica ottimizzata**: Cleanup intelligente ogni 30 secondi che mantiene solo il numero configurato (3, 5 o 10) di backup più recenti
- **Monitoraggio continuo**: Sistema di verifica automatica che garantisce sempre statistiche aggiornate senza intervento manuale
- **Performance migliorate**: Ridotto overhead con controlli intelligenti e cleanup proattivo

#### 🔄 **TimeEntry Aggiornamenti Fluidi**
- **RISOLTO: Eliminato refresh doppio**: Completamente risolto il problema di doppio aggiornamento che causava schermata bianca momentanea
- **Refresh intelligente**: Sistema debounce avanzato con timeout di 300ms per aggiornamenti fluidi e naturali
- **Focus management ottimizzato**: Aggiornamento automatico solo quando necessario (dopo modifiche o 30+ secondi)
- **UI pulita**: Rimosso bottone refresh duplicato, mantenuto solo pull-to-refresh nativo per esperienza più elegante

#### 📱 **Notifiche Continue Garantite**
- **RIVOLUZIONARIO: Notifiche persistenti settimane/mesi**: Nuovo sistema AppState listener che riprogramma automaticamente le notifiche quando l'app torna in primo piano
- **Estensione programmazione massiva**: Promemoria lavoro/orari estesi da 3 a 7 giorni, promemoria reperibilità da 3 a 14 giorni
- **Riprogrammazione intelligente**: Controllo automatico ogni apertura app (dopo 1+ ora) con soglia 5 notifiche rimanenti per riprogrammazione
- **Gestione memoria ottimizzata**: Cleanup corretto dei listener AppState per prevenire memory leak e garantire performance

#### � **Miglioramenti UI/UX**
- **Picker ottimizzati**: Etichette accorciate per visualizzazione completa su tutti i dispositivi
- **Performance visual**: Eliminati tutti i refresh visibili multipli per esperienza fluida
- **Feedback utente migliorato**: Sistema di notifiche più chiaro e meno intrusivo

#### ⚡ **Continuità e Stabilità Sistema**
- **Zero interruzioni**: Backup automatici sempre funzionanti con statistiche real-time
- **Aggiornamenti seamless**: TimeEntry si aggiorna senza disturbare l'utente
- **Notifiche affidabili**: Sistema che continua a funzionare per mesi senza riconfigurazione
- **Performance complessive**: Sistema completamente ottimizzato per uso quotidiano intensivo

---

## [1.3.0] - 2025-08-04

### 🎯 **AGGIORNAMENTO CRITICO - Sistema Backup Completo e PDF Avanzato**

#### 💾 **Backup Automatico Completo Rivoluzionato**
- **NUOVO: Backup completo con tutte le impostazioni di sistema**: Include work entries, impostazioni utente, giorni reperibilità e configurazioni CCNL
- **Sistema multi-formato intelligente**: Compatibilità automatica tra backup automatici e manuali con strutture diverse
- **Ripristino universale**: Gestione automatica di formati legacy e nuovi per massima compatibilità
- **Metadati arricchiti**: Informazioni dettagliate sui dati inclusi in ogni backup per trasparenza completa

#### 📄 **Sistema Stampa PDF Professionale**
- **NUOVO: Stampa PDF perfetta con calcoli identici al form**: Risolto bug critico dove PDF mostrava calcoli diversi dal form
- **Campo reperibilità corretto**: Risolto mapping campi form.reperibilita vs form.standby per display accurato indennità
- **Switch indicator preciso**: Visualizzazione corretta "ATTIVA"/"NON ATTIVA" per reperibilità automatica e manuale
- **Layout A4 professionale**: Formattazione ottimizzata per stampa con filename personalizzato app+data

#### 🔧 **Miglioramenti Tecnici Avanzati**
- **DatabaseService.restoreFromBackup() multi-formato**: Supporto automatico per backup automatici, manuali e array diretti
- **BackupService.validateBackupFormat() intelligente**: Riconoscimento automatico tipo backup senza errori
- **Field mapping unificato**: Correzione sistematica riferimenti campi tra form e PDF template
- **Debug logging completo**: Tracciamento dettagliato backup e ripristino per troubleshooting

#### 🛠️ **Correzioni Critiche Sistema**
- **Eliminato errore "Formato backup non valido"**: Risolto problema importazione backup automatici dalla lista
- **PDF field matching perfetto**: Tutti i campi form ora corrispondono esattamente alla visualizzazione PDF
- **Backup destinazioni multiple**: Gestione robusta percorsi custom, cloud e memoria per backup automatici
- **AutoBackupService.getAllData() integration**: Utilizzo corretto metodi database per backup completo

---

## [1.2.2] - 2025-08-03

### 🚀 **AGGIORNAMENTO CRITICO - Backup Automatico App Chiusa**

#### 💾 **Sistema Backup Rivoluzionario**
- **NUOVO: Backup automatico con app completamente chiusa**: Funziona anche quando l'app non è in esecuzione (solo build native)
- **Task background automatico**: Registrazione automatica di expo-background-fetch all'avvio per persistenza backup
- **Sistema ibrido intelligente**: Native per build produzione + JavaScript fallback per Expo Dev
- **Compatibilità universale**: Rilevamento automatico ambiente di esecuzione

#### 🔧 **Integrazione Tecnica Avanzata**
- **registerBackgroundBackupTask()**: Integrato in App.js per attivazione automatica all'avvio
- **Gestione errori robusta**: Fallback automatico tra sistemi nativi e JavaScript
- **Background fetch configurato**: Intervallo ottimizzato per backup periodici senza impatto performance
- **Cross-platform support**: Android e iOS con configurazioni specifiche per ciascuna piattaforma

#### 📱 **Esperienza Utente Migliorata**
- **Backup garantito**: Sistema backup funziona sempre, anche con device spento/app chiusa
- **Notifiche informative**: Conferme backup completato in background
- **Zero configurazione**: Sistema auto-attivante senza intervento utente
- **Compatibilità preservata**: Funziona identico su Expo Go per sviluppo

#### 🛠️ **Correzioni e Ottimizzazioni**
- **Error handling avanzato**: Gestione errori specifica per ciascun ambiente
- **Logging dettagliato**: Tracciamento completo attività background task
- **Performance ottimizzate**: Registrazione task solo quando necessario
- **Memoria efficiente**: Cleanup automatico task vecchi/non necessari

---

## [1.2.1] - 2025-08-02

### 🎉 AGGIORNAMENTO MAGGIORE - Sistema Notifiche Completo

#### 🔔 **Sistema Notifiche Reperibilità Rivoluzionato**
- **UI configurazione completamente rinnovata**: Interfaccia intuitiva con time picker per configurare notifiche reperibilità
- **Notifiche multiple personalizzabili**: Supporto per più promemoria per ogni giorno di reperibilità (oggi, domani, etc.)
- **Logging dettagliato**: Visualizzazione completa di quando le notifiche vengono programmate con date e orari specifici
- **Database query ottimizzato**: Risolto accesso alle impostazioni reperibilità per programmazione automatica

#### 🛠️ **Correzioni Tecniche Critiche**
- **Fix database query**: Corretto accesso a `standbySettings` via `appSettings` invece di query diretta
- **Import/Export patterns**: Risolti conflitti tra dynamic require() e ES6 modules
- **Constructor-based imports**: Implementato pattern robusto per DatabaseService
- **Field parsing UI**: Corretta conversione formati dati per time picker

#### 🔧 **Miglioramenti Sistema Backup**
- **Backup automatico ottimizzato**: Sistema ibrido Nativo + JavaScript per massima compatibilità
- **Background tasks migliorati**: Gestione backup anche con app chiusa (build native)
- **Logging backup avanzato**: Tracciamento dettagliato operazioni backup con dimensioni e timestamp

#### 📱 **Aggiornamenti OTA e Build Native**
- **Expo Updates integrato**: Sistema aggiornamenti automatici per build native
- **Configurazione multi-ambiente**: Separazione completa tra development e production
- **Build pipeline ottimizzata**: Script automatici per bump versioni e deploy

#### 🎯 **Esperienza Utente**
- **Notifiche intelligenti**: Sistema promemoria reperibilità con anticipo configurabile
- **UI responsiva**: Interfaccia ottimizzata per Android con Material Design
- **Feedback visivo**: Indicatori chiari per stato notifiche e configurazioni attive

### 🔧 **Modifiche Tecniche Dettagliate**
- `SuperNotificationService.js`: Aggiunto `scheduleStandbyReminders()` con logging completo
- `NotificationSettingsScreen.js`: Refactor completo UI configurazione notifiche
- `DatabaseService.js`: Pattern import ottimizzato per compatibilità moduli
- `App.js`: Integrazione expo-updates per OTA automatic updates
- `eas.json`: Configurazione build native separata da development

### 📊 **Statistiche Aggiornamento**
- **375 oggetti** caricati nel repository
- **2.42 MB** di codice ottimizzato
- **15+ file core** aggiornati
- **100% compatibilità** con versioni precedenti

## [1.0.4] - 2025-01-16

### 🚀 Nuove funzionalità
- **Backup automatico in background**: ora l'app esegue backup automatici anche in background (solo build native), notificando l'utente ad ogni salvataggio.
- **Informativa privacy aggiornata**: aggiunto file INFORMATIVA_PRIVACY.md con dettagli su trattamento dati e privacy.

### 🐛 Correzioni
- **Fix calcolo MULTI_SHIFT_OPTIMIZED**: Risolto problema calcolo proporzionale per giornate parziali (6.6h ora = 90.94€ invece di 109.34€)
- **Aggiornamento daily rate CCNL**: Corretto da 107.69€ a 110.23€ per conformità METALMECCANICO_PMI_L5
- **Logica modalità viaggio**: Implementazione completa della modalità MULTI_SHIFT_OPTIMIZED con gestione eccedenze

### ✨ Miglioramenti
- **Calcolo proporzionale CCNL**: Per ore < 8h, calcolo preciso: dailyRate × (oreEffettive / 8)
- **Gestione ore eccedenti**: Per ore ≥ 8h, eccedenza pagata come compenso viaggio
- **Validazione matematica**: Verificata correttezza con formula: 110.23€ × (6.6/8) = 90.94€

### 🔧 Modifiche tecniche
- Aggiornato `CalculationService.js` con branch dedicato per MULTI_SHIFT_OPTIMIZED
- Corretti valori in `constants/index.js` per METALMECCANICO_PMI_L5
- Migliorato logging per debug modalità calcolo viaggio

## [1.0.2] - 2025-01-14
### Previous version fixes and improvements

## [1.0.1] - 2025-01-13  
### Initial release improvements

## [1.0.0] - 2025-01-12
### 🎉 Release iniziale
- Tracking ore lavoro con calcolo automatico stipendio CCNL
- Support per contratti Metalmeccanico PMI
- Gestione viaggi, reperibilità, straordinari
- Database SQLite offline-first
- Sistema backup e export
