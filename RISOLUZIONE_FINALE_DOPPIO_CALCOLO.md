# 🔧 RISOLUZIONE FINALE: Doppio Calcolo Indennità Trasferta

## 📋 PROBLEMA IDENTIFICATO

Il sistema attualmente applica **ENTRAMBE** le logiche di calcolo dell'indennità di trasferta quando sono selezionate simultaneamente le opzioni:
- ✅ "Calcolo proporzionale CCNL (ore/8 × indennità)" 
- ❌ "Mezza giornata (50%)"

### Esempio Concreto: Sabato 12/07/2025
- **Ore lavorate**: 7h
- **Calcolo errato attuale**: 6.56€
  1. Proporzionale CCNL: 15€ × (7/8) = 13.13€
  2. Riduzione 50%: 13.13€ × 50% = 6.56€ ❌
- **Calcolo corretto CCNL**: 13.13€
  1. Solo proporzionale: 15€ × (7/8) = 13.13€ ✅

### Impatto su Altri Scenari
| Ore Lavorate | Doppio Calcolo (Errato) | Solo CCNL (Corretto) | Differenza |
|---------------|--------------------------|----------------------|------------|
| 4h            | 3.75€                   | 7.50€                | +3.75€     |
| 6h            | 5.63€                   | 11.25€               | +5.62€     |
| 7h            | 6.56€                   | 13.13€               | +6.57€     |
| 8h            | 7.50€                   | 15.00€               | +7.50€     |

## ✅ SOLUZIONE IMMEDIATA

### Passo 1: Correggere le Impostazioni App
1. Aprire l'app Work Hours Tracker
2. Andare in **Impostazioni** → **Indennità di Trasferta**
3. **DISATTIVARE** l'opzione "Mezza giornata (50%)"
4. **MANTENERE ATTIVA** solo l'opzione "Calcolo proporzionale CCNL"

### Passo 2: Verificare la Correzione
Dopo aver cambiato le impostazioni:
- Controllare che il sabato 12/07/2025 mostri **13.13€** invece di 6.56€
- Verificare che il calcolo sia: `(ore totali / 8) × 15€`

## 🔍 SPIEGAZIONE TECNICA

### Logica Attuale (Problematica)
```javascript
// 1. Calcolo base
let allowance = 15€

// 2. Se PROPORTIONAL_CCNL è attivo
if (opzioni.includes('PROPORTIONAL_CCNL')) {
  allowance = allowance * (7/8) = 13.13€
}

// 3. Se HALF_ALLOWANCE_HALF_DAY è attivo
if (opzioni.includes('HALF_ALLOWANCE_HALF_DAY')) {
  allowance = allowance * 0.5 = 6.56€  // ❌ PROBLEMA!
}
```

### Logica Corretta (Solo CCNL)
```javascript
// 1. Calcolo base
let allowance = 15€

// 2. Solo PROPORTIONAL_CCNL attivo
if (opzioni.includes('PROPORTIONAL_CCNL')) {
  allowance = allowance * (7/8) = 13.13€  // ✅ CORRETTO!
}
```

## 📊 CONFORMITÀ AL CCNL

### Principio CCNL Metalmeccanico PMI
> L'indennità di trasferta deve essere calcolata **proporzionalmente** alle ore effettivamente lavorate rispetto alla giornata lavorativa standard (8 ore).

### Formula Conforme
```
Indennità = (Ore Totali / 8) × Indennità Giornaliera
```

Dove:
- **Ore Totali** = Ore Lavoro + Ore Viaggio
- **Indennità Giornaliera** = 15€ (configurabile)

## 🔄 PROSSIMI PASSI

### Immediati (Utente)
1. ✅ Correggere le impostazioni come descritto sopra
2. ✅ Verificare i calcoli corretti
3. ✅ Confermare che tutti i giorni di trasferta siano calcolati correttamente

### Futuri (Sviluppo)
1. 🔧 Implementare controllo UI per evitare selezioni conflittuali
2. 🔧 Aggiungere warning quando si selezionano opzioni incompatibili
3. 🔧 Migliorare la descrizione delle opzioni per chiarezza

## 📁 FILE INTERESSATI

### Logica di Calcolo
- `src/services/CalculationService.js` - Implementazione del calcolo
- `src/utils/calculateEarningsBreakdown.js` - Breakdown dettagliato

### Interfaccia Utente
- `src/screens/TravelAllowanceSettings.js` - Schermata impostazioni indennità

### Test e Documentazione
- `test-simulazione-doppio-calcolo.js` - Test di verifica problema
- `IMPLEMENTAZIONE_COMPLETA_CCNL.md` - Documentazione tecnica completa

## ⚠️ NOTA IMPORTANTE

Questo problema si verifica **SOLO** quando sono attive simultaneamente entrambe le opzioni. Il calcolo proporzionale CCNL da solo funziona perfettamente e garantisce la conformità normativa.

La soluzione richiede semplicemente di **usare una sola opzione alla volta**, preferendo quella conforme al CCNL per massima correttezza legale.

---
*Documento creato il 04/01/2025 - Risoluzione definitiva problema doppio calcolo indennità trasferta*
