# Debug Modalità Viaggio - Log Dettagliati

## Obiettivo
Verificare che la modalità di calcolo viaggio selezionata nelle impostazioni venga applicata correttamente nei calcoli di retribuzione.

## Log Aggiunti

### 1. TimeEntryForm.js - EarningsSummary
- ✅ Log dati viaggi inseriti dall'utente
- ✅ Log impostazioni viaggio passate al CalculationService
- ✅ Merge esplicito di travelHoursSetting e travelCompensationRate

### 2. Hook index.js - loadSettings
- ✅ Log impostazioni viaggio caricate dal database
- ✅ Verifica travelHoursSetting e travelCompensationRate

### 3. CalculationService.js - calculateDailyEarnings
- ✅ Log modalità di calcolo viaggio utilizzata
- ✅ Log ramo di calcolo applicato (TRAVEL_SEPARATE vs logiche esistenti)
- ✅ Log dettagli ore lavoro/viaggio e modalità applicata

## Test da Eseguire

### 1. Verifica Caricamento Impostazioni
1. Avvia l'app
2. Controlla nei log: `🚗 HOOK - Travel Settings:`
3. Verifica che `travelHoursSetting` sia presente

### 2. Verifica Calcolo Form
1. Vai al form di inserimento orario
2. Inserisci orari di lavoro e viaggio
3. Controlla nei log del CalculationService:
   - `[CalculationService] calculateDailyEarnings - Modalità calcolo viaggio:`
   - `[CalculationService] Applicazione modalità viaggio:`
   - Quale ramo viene eseguito

### 3. Test Cambio Modalità
1. Vai nelle Impostazioni → Viaggi
2. Cambia la modalità di calcolo viaggio
3. Torna al form e inserisci nuovi orari
4. Verifica che nei log cambi la modalità utilizzata

## Modalità di Calcolo Disponibili

### TRAVEL_SEPARATE (Default)
- Viaggio pagato separatamente con tariffa viaggio
- Lavoro: se ≥8h → diaria, altrimenti ore effettive
- Log atteso: `Applicando modalità TRAVEL_SEPARATE`

### EXCESS_AS_TRAVEL
- Ore oltre 8h (lavoro+viaggio) pagate come viaggio
- Log atteso: `Ore extra (Xh) pagate come viaggio`

### EXCESS_AS_OVERTIME  
- Ore oltre 8h (lavoro+viaggio) pagate come straordinario
- Log atteso: `Ore extra (Xh) pagate come straordinario`

### AS_WORK
- Tutto considerato come lavoro normale
- Log atteso: `Modalità AS_WORK: tutto come lavoro normale`

## Possibili Problemi da Verificare

1. **Impostazioni non caricate**: Hook non mostra travelHoursSetting
2. **Impostazioni non propagate**: Form non riceve le impostazioni corrette
3. **Modalità non applicata**: CalculationService usa sempre il default
4. **Cambio modalità non salvato**: Le modifiche nelle impostazioni non persistono

## Log da Cercare

```
🚗 HOOK - Travel Settings: { travelHoursSetting: "...", ... }
[TimeEntryForm] Travel settings passed to calculator: { travelHoursSetting: "..." }
[CalculationService] calculateDailyEarnings - Modalità calcolo viaggio: ...
[CalculationService] Applicazione modalità viaggio: ...
[CalculationService] Applicando modalità ...
```

## Note
- Se tutti i log sono presenti e corretti, il problema è risolto
- Se manca qualche log, il problema è nella propagazione delle impostazioni
- I calcoli dovrebbero cambiare visibilmente tra le diverse modalità
