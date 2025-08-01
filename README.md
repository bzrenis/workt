# WorkTracker - App Tracciamento Ore di Lavoro

Un'applicazione React Native per Android per il tracciamento delle ore di lavoro con calcolo automatico della retribuzione basato sui contratti CCNL italiani.

## 🚀 Caratteristiche Principali

- **Tracciamento Ore Completo**: Registrazione di ore lavoro, viaggio, reperibilità e doppi turni
- **Modifica Flessibile**: Possibilità di cancellare facilmente qualsiasi orario inserito
- **Calcolo Automatico CCNL**: Retribuzione calcolata automaticamente basata su CCNL Metalmeccanico PMI Livello 5
- **Verifica Conformità**: Validazione automatica dei dati con CCNL Metalmeccanico PMI
- **Database Locale SQLite**: Archiviazione dati offline sicura e veloce
- **Sistema Backup Avanzato**: Backup locale automatico e ripristino dati con esportazione
- **Dashboard Intelligente**: Panoramica mensile dettagliata con statistiche e analisi progressi
- **Configurazione Flessibile**: Impostazioni complete per contratti, viaggi, reperibilità e rimborsi
- **Calcolo Straordinari**: Gestione automatica di straordinari diurni, notturni, festivi e domenicali secondo CCNL
- **Progressione Carriera**: Monitoraggio avanzamento da Livello 3 a Livello 5 CCNL

## ✅ Stato del Progetto

**L'app è COMPLETA e PRONTA per l'uso!** 🎉

### ✅ Funzionalità Implementate

- ✅ **Database SQLite**: Completamente funzionale con tutte le tabelle
- ✅ **Calcoli CCNL**: Implementati e verificati secondo CCNL Metalmeccanico PMI
- ✅ **Tutte le schermate**: Dashboard, inserimento orari, impostazioni complete
- ✅ **Sistema backup**: Locale con esportazione e ripristino
- ✅ **Validazione dati**: Controlli automatici e verifica conformità CCNL
- ✅ **Configurazione**: Impostazioni complete per tutti gli aspetti lavorativi
- ✅ **Modifica dati**: Possibilità di cancellazione rapida di qualsiasi orario inserito

### 🚀 Pronto per il Test

L'app può essere immediatamente testata su Android tramite Expo Go. Tutti i calcoli sono basati sui parametri standard del CCNL Metalmeccanico PMI Level 5.

## 📱 Installazione e Avvio

### Prerequisiti

- Node.js (versione 14 o superiore)
- npm o yarn
- Expo CLI
- Dispositivo Android o emulatore

### Installazione

```bash
# Clona il repository
git clone <repository-url>
cd workt

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npx expo start
```

### Test su Android

1. Installa l'app **Expo Go** dal Google Play Store
2. Scansiona il QR code mostrato nel terminale con l'app Expo Go
3. L'app si aprirà direttamente sul tuo telefono

## 🏗️ Struttura del Progetto

```text
src/
├── components/       # Componenti riutilizzabili
├── screens/         # Schermate dell'app
├── services/        # Servizi (Database, Calcoli, Backup)
├── utils/           # Funzioni utility
├── constants/       # Costanti e configurazioni
└── hooks/           # Hook personalizzati React
```

## 💼 Funzionalità CCNL

### Contratto Supportato

- **CCNL Metalmeccanico PMI - Livello 5 (Operaio Qualificato Specializzato)** (default)
- Possibilità di scegliere altri contratti o importarli in qualsiasi momento dalle impostazioni
- Retribuzione mensile: €2,800.00 (CCNL Metalmeccanico PMI Level 5)
- Retribuzione giornaliera: €107.69 (mensile/26)
- Retribuzione oraria: €16.15 (mensile/173)
- Progressione di carriera: Livello 3 → Livello 5 (+2 livelli di avanzamento! 🎉)
- Calcolo automatico di tariffe giornaliere e orarie
- Verifica automatica conformità CCNL
- **Gestione automatica dei festivi nazionali**: i giorni festivi italiani (inclusi Pasqua e Pasquetta) sono riconosciuti e le maggiorazioni CCNL applicate automaticamente.
- **Personalizzazione maggiorazioni**: puoi modificare le percentuali delle maggiorazioni CCNL dalle impostazioni contratto.
- **Importazione contratti**: puoi aggiungere nuovi contratti CCNL da file o da URL in qualsiasi momento, senza obbligo al primo avvio.

> **Nota:** L’importazione di nuovi contratti è facoltativa e sempre disponibile dalle impostazioni. Puoi continuare a usare solo i contratti predefiniti o aggiungerne di nuovi quando vuoi.

#### Maggiorazioni CCNL applicate automaticamente

| Tipo Lavoro                        | Maggiorazione | Tariffa Applicata         |
|-------------------------------------|:-------------:|--------------------------|
| Ordinario                          |     0%        | €16.15                   |
| Straordinario diurno                |   +20%        | €19.38                   |
| Straordinario notturno (fino 22h)   |   +25%        | €20.19                   |
| Straordinario notturno (dopo 22h)   |   +35%        | €21.80                   |
| Straordinario festivo/domenicale    |   +50%        | €24.23                   |
| Lavoro ordinario notturno           |   +25%        | €20.19                   |
| Lavoro ordinario festivo/domenicale |   +30%        | €20.99                   |
| Lavoro notturno festivo/domenicale  |   +60%        | €25.84                   |
| Viaggio                             |  Configurabile| Default: €16.15          |

> **Nota:** Le maggiorazioni vengono applicate automaticamente in base a tipologia di lavoro, orario, giorno della settimana e festività. La logica segue le regole ufficiali CCNL Metalmeccanico PMI. Tutte le tariffe sono calcolate dinamicamente e mostrate nella schermata "Impostazioni Contratto". I festivi nazionali sono riconosciuti in automatico secondo il calendario italiano.

#### Esempio di calcolo automatico

- 2h straordinario diurno: 2 × €19.38 = €38.76
- 1h straordinario notturno dopo le 22: 1 × €21.80 = €21.80
- 3h lavoro festivo: 3 × €20.99 = €62.97

### Modalità Calcolo Ore Viaggio

1. **Come ore lavorative**: Viaggio = ore lavoro normali
2. **Eccedenza come retribuzione viaggio**: Oltre 8h totali pagate con tariffa viaggio
3. **Eccedenza come straordinario**: Oltre 8h totali pagate come straordinario

## 📊 Dashboard Features

- Ore totali mensili (lavoro + viaggio)
- Dettaglio straordinari per tipologia
- Giorni lavorati e reperibilità
- Calcolo guadagno totale
- Rimborsi pasti e indennità
- Cronologia giornaliera

## 🛠️ Configurazione

### 1. Contratto CCNL

- Imposta retribuzione mensile
- Visualizza tabella maggiorazioni CCNL aggiornata
- Configura percentuale retribuzione viaggio
- Visualizza tariffe calcolate automaticamente

### 2. Ore di Viaggio

- Scegli modalità di calcolo
- Configura retribuzione viaggio
- Esempi pratici per ogni opzione

### 3. Reperibilità

- Imposta indennità giornaliera
- Configura orari reperibilità
- Calendario giorni reperibilità

### 4. Rimborsi Pasti

- Buoni pasto pranzo/cena
- Rimborsi in contanti
- Attivazione automatica in base agli orari


## 💾 Sistema Backup

- **Backup Locale**: Salvataggio file JSON sul dispositivo
- **Esportazione**: Condivisione backup via email/cloud
- **Ripristino**: Importazione dati da file backup
- **Auto-backup**: Backup automatici periodici
- **Backup automatico in background**: Su build native, l'app esegue backup automatici anche in background tramite task periodici, notificando l'utente ad ogni salvataggio completato.

Per dettagli sulla privacy e la gestione dei dati consulta il file [INFORMATIVA_PRIVACY.md](./INFORMATIVA_PRIVACY.md).

## 🔧 Tecnologie Utilizzate

- **React Native** con Expo
- **SQLite** per database locale
- **React Navigation** per navigazione
- **AsyncStorage** per preferenze app
- **Expo File System** per gestione file
- **React Native Calendars** per calendario

## 📝 Inserimento Orario

Form completo per registrare:

- Data e cantiere
- Orari partenza/arrivo azienda-cantiere
- Turni di lavoro (doppio turno supportato)
- Interventi reperibilità
- Rimborsi pasti automatici
- Calcolo guadagno giornaliero in tempo reale
- **Ferie e permessi**: possibilità di segnare un giorno come ferie o permesso (esclusi dal calcolo retribuzione, conteggiati separatamente)

## 🎯 Prossimi Sviluppi

### 🔄 Miglioramenti Potenziali

- [ ] **Backup cloud**: Integrazione Google Drive, Dropbox per sincronizzazione automatica
- [ ] **Export PDF**: Generazione report mensili in formato PDF per la contabilità
- [ ] **CCNL multipli**: Supporto per altri contratti collettivi (Edile, Commercio, ecc.)
- [ ] **Notifiche smart**: Promemoria automatici per inserimento orari e scadenze
- [ ] **Multi-dispositivo**: Sincronizzazione dati tra telefono e tablet
- [ ] **Analytics avanzati**: Grafici dettagliati di produttività e trend retributivi
- [ ] **Gestione ferie**: Tracciamento giorni di ferie e permessi
- [ ] **Integrazione calendario**: Sincronizzazione con Google Calendar/Outlook
- [ ] **Festività nazionali automatiche**: Riconoscimento automatico dei giorni festivi italiani

### 📊 Statistiche Avanzate

- [ ] **Confronto periodi**: Analisi mese vs mese, anno vs anno
- [ ] **Proiezioni**: Calcolo stipendio stimato fine mese
- [ ] **Efficienza**: Analisi produttività per cantiere/cliente
- [ ] **Trends**: Grafici evoluzione carriera e retribuzione

**Nota**: L'app è già completamente funzionale. Questi sviluppi sono opzionali per migliorare ulteriormente l'esperienza utente.

## 🏆 Punti di Forza dell'App

### ✨ **Precisione Calcoli**

- Basata su **parametri standard CCNL** Metalmeccanico PMI
- **Verifica automatica** conformità CCNL Metalmeccanico PMI
- **Calcoli certificati** per straordinari, viaggi e reperibilità
- **Maggiorazioni CCNL** applicate automaticamente e mostrate in modo trasparente nelle impostazioni

### 🎯 **Facilità d'Uso**

- **Interfaccia intuitiva** progettata per lavoratori sul campo
- **Inserimento rapido** orari con validazione automatica
- **Dashboard chiara** con tutte le informazioni essenziali

### 🔒 **Affidabilità**

- **Database locale SQLite** - i tuoi dati rimangono sul tuo dispositivo
- **Backup sicuri** con possibilità di esportazione
- **Funzionamento offline** completo - nessuna connessione internet richiesta

### 📈 **Crescita Professionale**

- **Monitoraggio progressione** da Livello 3 a Livello 5 CCNL
- **Analisi performance** mensili per valutare la crescita
- **Pianificazione obiettivi** per avanzamento al Livello 6

## 🐛 Bug Report e Supporto

Per segnalare bug o richiedere nuove funzionalità, apri una issue nel repository.

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file LICENSE per dettagli.

---

**Sviluppato per semplificare il tracciamento delle ore di lavoro e il calcolo automatico delle retribuzioni secondo i contratti CCNL italiani.**
