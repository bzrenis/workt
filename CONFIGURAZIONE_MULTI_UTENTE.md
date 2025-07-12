# 🏢 CONFIGURAZIONE MULTI-UTENTE - WorkT

## 📋 PANORAMICA
WorkT è progettato come applicazione multi-utente per il tracking delle ore di lavoro con calcolo automatico dello stipendio secondo i parametri del CCNL Metalmeccanico PMI.

## 🔧 PARAMETRI CONFIGURABILI

### Contratti Supportati
- **CCNL Metalmeccanico PMI**: Level 1-8 (default: Level 5)
- **Stipendi configurabili**: da €1,500 a €5,000 mensili
- **Tariffe orarie**: calcolate automaticamente dal mensile

### Configurazione Utente
Ogni utente può personalizzare:
- **Contratto di lavoro**: selezione del livello CCNL
- **Stipendio mensile**: inserimento manuale o standard CCNL
- **Ore lavorative**: 8h standard (configurabile 6-10h)
- **Giorni lavorativi**: 22 giorni mensili (configurabile)
- **Coefficienti netto**: personalizzabili per fascia di reddito

### Parametri Standard CCNL Level 5
- **Stipendio mensile**: €2,839.07
- **Tariffa oraria**: €16.41081
- **Tariffa giornaliera**: €109.195
- **Ore mensili**: 173.33
- **Giorni mensili**: 21.67

## 🎯 CALCOLI AUTOMATICI

### Tariffe Straordinarie
- **Diurno**: +20% (ore 6:00-18:00)
- **Serale**: +25% (ore 18:00-22:00)
- **Notturno**: +35% (ore 22:00-6:00)

### Indennità
- **Reperibilità**: configurabile per fascia oraria
- **Trasferta**: 100% della tariffa oraria (configurabile)
- **Rimborsi**: personalizzabili per km/pasto

## 🏗️ ARCHITETTURA MULTI-UTENTE

### Database Locale
- **SQLite**: database separato per ogni utente
- **Backup**: esportazione/importazione dati personali
- **Privacy**: nessuna condivisione dati tra utenti

### Configurazioni Personalizzate
```javascript
// Esempio configurazione utente
const userConfig = {
  contract: {
    type: 'CCNL_METALMECCANICO_PMI',
    level: 5,
    monthlyGrossSalary: 2839.07,
    customRate: false
  },
  workSchedule: {
    dailyHours: 8,
    monthlyDays: 22,
    weeklyDays: 5
  },
  allowances: {
    standbyRate: 1.0,
    travelRate: 1.0,
    mealAllowance: 7.00
  }
};
```

## 🔐 PRIVACY E SICUREZZA

### Dati Locali
- **Nessun server**: tutti i dati rimangono sul dispositivo
- **Backup opzionale**: export locale su richiesta utente
- **Nessun tracking**: zero raccolta dati personali

### Conformità
- **GDPR compliant**: nessun dato personale trasmesso
- **Privacy by design**: architettura locale-first
- **Controllo utente**: gestione completa dei propri dati

## 🚀 DEPLOYMENT

### Distribuzione
- **APK Android**: installazione diretta
- **Play Store**: (opzionale) distribuzione pubblica
- **Expo**: testing e development

### Aggiornamenti
- **OTA Updates**: via Expo (se abilitato)
- **Manuali**: download APK aggiornato
- **Configurazioni**: mantenute tra aggiornamenti

## 📱 UTILIZZO

### Setup Iniziale
1. **Installazione app**
2. **Configurazione contratto**: selezione CCNL e livello
3. **Personalizzazione**: stipendio e parametri di lavoro
4. **Test calcoli**: verifica tariffe e indennità

### Gestione Quotidiana
1. **Inserimento ore**: lavoro, viaggi, reperibilità
2. **Calcolo automatico**: stipendi e indennità
3. **Dashboard**: riepilogo mensile
4. **Backup**: esportazione dati periodica

## 🔧 SUPPORTO TECNICO

### Configurazioni Standard
- **Templates CCNL**: configurazioni pre-impostate
- **Validazione**: controllo coerenza parametri
- **Help in-app**: guide contestuali

### Personalizzazioni Avanzate
- **Formule custom**: calcoli personalizzati
- **Import/Export**: configurazioni condivisibili
- **API future**: integrazione sistemi aziendali

---

**Versione**: 1.0.1  
**Compatibilità**: Android 7.0+  
**Licenza**: Uso commerciale e privato  
**Supporto**: Multi-lingua (IT/EN)
