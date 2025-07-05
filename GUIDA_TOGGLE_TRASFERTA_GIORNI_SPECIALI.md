# 🏢 Indennità Trasferta - Guida al Toggle "Applica nei giorni speciali"

## 📋 Panoramica

L'impostazione "Applica nei giorni speciali" nella configurazione dell'indennità trasferta determina se l'indennità viene applicata anche nei giorni **domenicali e festivi**.

## ⚙️ Come Funziona

### 🔴 Toggle DISATTIVATO (Comportamento CCNL Standard)
- **Lunedì - Sabato**: Indennità applicata se presenti le condizioni ✅
- **Domenica**: Indennità **NON** applicata ❌
- **Festivi**: Indennità **NON** applicata ❌

Questo rispetta la normativa CCNL Metalmeccanico PMI standard che esclude l'indennità trasferta nei giorni domenicali e festivi.

### 🟢 Toggle ATTIVATO (Accordo Aziendale Speciale)
- **Lunedì - Domenica**: Indennità applicata se presenti le condizioni ✅
- **Festivi**: Indennità applicata se presenti le condizioni ✅

Questo permette l'applicazione dell'indennità anche nei giorni speciali, utile per accordi aziendali specifici.

## 📅 Definizione di "Giorni Speciali"

### ✅ Considerati Giorni Speciali:
- **Domenica** (giorno 0 della settimana)
- **Festivi nazionali italiani** (Capodanno, Epifania, Pasqua, Liberazione, Festa del Lavoro, Repubblica, Ferragosto, Ognissanti, Immacolata, Natale, Santo Stefano)

### ❌ NON Considerati Giorni Speciali:
- **Sabato** (considerato giorno lavorativo normale per l'indennità trasferta)
- **Lunedì - Venerdì** (giorni feriali normali)

## 🛠️ Funzionalità Aggiuntive

### 🔧 Override Manuale
Anche con il toggle disattivato, è possibile forzare l'applicazione dell'indennità per un giorno specifico tramite:
- Attivazione manuale nel form di inserimento orario
- Campo `trasfertaManualOverride` per casi eccezionali

### 📊 Esempi Pratici

| Giorno | Tipo | Toggle OFF | Toggle ON | Override |
|--------|------|------------|-----------|----------|
| Lunedì | Feriale | ✅ 15.00€ | ✅ 15.00€ | ✅ 15.00€ |
| Sabato | Lavorativo | ✅ 15.00€ | ✅ 15.00€ | ✅ 15.00€ |
| Domenica | Speciale | ❌ 0.00€ | ✅ 15.00€ | ✅ 15.00€ |
| Ferragosto | Speciale | ❌ 0.00€ | ✅ 15.00€ | ✅ 15.00€ |

## 📖 Quando Utilizzare Questa Impostazione

### 🔴 Mantieni DISATTIVATO se:
- La tua azienda segue il CCNL standard
- Non hai accordi speciali per domeniche/festivi
- Vuoi rispettare la normativa contrattuale tradizionale

### 🟢 Attiva se:
- Hai un accordo aziendale che prevede indennità anche in domenica/festivi
- La tua azienda ha politiche più favorevoli del CCNL base
- Lavori regolarmente in trasferta nei weekend e festivi

## ⚠️ Note Importanti

1. **Il sabato NON è considerato giorno speciale** - l'indennità si applica sempre
2. **L'override manuale ha sempre priorità** - permette eccezioni caso per caso
3. **Solo domeniche e festivi nazionali** sono considerati giorni speciali
4. **La configurazione è globale** - si applica a tutti i futuri inserimenti

## 🔧 Configurazione Consigliata

Per la maggior parte delle aziende con CCNL Metalmeccanico PMI:
- **Toggle: DISATTIVATO** ⬅️ Raccomandato
- **Attivazione automatica: ATTIVATO**
- **Regola: Solo se presenti ore di viaggio**

Questa configurazione rispetta la normativa standard e applica l'indennità automaticamente nei giorni appropriati.
