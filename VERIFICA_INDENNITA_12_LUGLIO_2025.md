# 🔍 VERIFICA INDENNITÀ TRASFERTA - 12/07/2025 (50%)

## 📅 Analisi Data
- **Data**: 12 luglio 2025
- **Giorno**: Sabato (giorno lavorativo normale secondo CCNL)
- **Tipo giorno**: NON speciale (domenica/festivo)
- **Maggiorazione CCNL**: +25% sulle ore lavorate

## ❌ PROBLEMA IDENTIFICATO
L'indennità trasferta al **50%** per il sabato **NON è corretta** secondo il CCNL Metalmeccanico PMI, a meno che non ricada in uno degli scenari specifici elencati sotto.

## 🔍 CAUSE POSSIBILI PER 50%

### 1. ✅ MEZZA GIORNATA + REGOLA "HALF_ALLOWANCE_HALF_DAY"
**Scenario legittimo se:**
- Ore totali lavorate < 8h (lavoro + viaggio)
- Impostazione "Metà indennità se mezza giornata" attivata
- **Giustificazione**: Configurazione aziendale per mezze giornate

### 2. ⚠️ CAMPO "travelAllowancePercent" = 0.5
**Scenario da verificare se:**
- Il campo è stato impostato manualmente a 50%
- Potrebbe essere un errore di inserimento
- **Giustificazione**: Solo se intenzionale per caso specifico

### 3. ❌ ERRORE DI CONFIGURAZIONE
**Scenario errato se:**
- Giornata piena (≥ 8h) con indennità ridotta
- Nessuna regola specifica per mezza giornata
- **Problema**: Violazione delle regole CCNL standard

## 📋 VERIFICA NECESSARIA

### 🔧 Controlli da Effettuare:
1. **Ore Totali**: Lavoro + Viaggio = ? (se ≥ 8h = giornata piena)
2. **Regole Attivazione**: Quale opzione è selezionata?
3. **Campo Percentuale**: `travelAllowancePercent` = ?
4. **Override Manuale**: Ci sono modifiche manuali?

### 📊 Dati Specifici da Controllare:
```javascript
// Nell'entry del 12/07/2025 verificare:
{
  workHours: ?, // Ore lavoro
  travelHours: ?, // Ore viaggio  
  travelAllowancePercent: ?, // Dovrebbe essere 1.0 se 100%
  // Nelle impostazioni verificare:
  travelAllowance: {
    option: ?, // Es: 'HALF_ALLOWANCE_HALF_DAY'
    dailyAmount: ?, // Es: 15.00
    enabled: true
  }
}
```

## ✅ COMPORTAMENTO CCNL CORRETTO

### 🎯 Per il Sabato 12/07/2025:
- **Indennità standard**: 100% dell'importo configurato
- **Maggiorazione ore**: +25% su tutte le ore lavorate
- **Trattamento**: Come giorno lavorativo normale
- **Eccezioni**: Solo se mezza giornata con regola specifica

### 📝 Regole CCNL Metalmeccanico PMI:
1. **Sabato** = Giorno lavorativo normale
2. **Indennità trasferta** = 100% se condizioni soddisfatte  
3. **Domenica/Festivi** = Giorni speciali (richiedono toggle)
4. **Mezze giornate** = Possibili riduzioni se configurate

## 🔧 AZIONI CORRETTIVE

### Se è una **Giornata Piena** (≥ 8h):
```
❌ Attuale: 50% indennità
✅ Corretto: 100% indennità
🔧 Azione: Rimuovere riduzione non giustificata
```

### Se è una **Mezza Giornata** (< 8h):
```
✅ Possibile: 50% indennità (se regola attiva)
🔧 Verifica: Controllare se la regola è voluta
📋 Opzioni: 'HALF_ALLOWANCE_HALF_DAY' vs 'FULL_ALLOWANCE_HALF_DAY'
```

### Se è un **Errore di Inserimento**:
```
❌ Problema: travelAllowancePercent = 0.5
✅ Correzione: travelAllowancePercent = 1.0
🔧 Azione: Modificare il valore nell'entry
```

## 🎯 RACCOMANDAZIONE FINALE

**Per il 12/07/2025 (Sabato):**

1. **Se giornata piena** → Indennità deve essere **100%**
2. **Se mezza giornata** → Verificare se regola 50% è voluta
3. **In ogni caso** → Maggiorazione +25% sulle ore lavorate deve essere applicata

L'indennità al 50% è **giustificata solo** se si tratta di una mezza giornata con regola aziendale specifica, altrimenti rappresenta un **errore** rispetto al CCNL Metalmeccanico PMI.
