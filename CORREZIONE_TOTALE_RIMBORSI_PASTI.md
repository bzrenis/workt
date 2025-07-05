# Correzione del Totale dei Rimborsi Pasti nel Riepilogo Guadagni

## Descrizione del problema

Nel riepilogo guadagni, i dettagli dei rimborsi pasti (buono e cash) venivano visualizzati correttamente, ma il totale mostrato nella sezione "Rimborso pasti" non era sempre coerente con i valori effettivamente visualizzati, in particolare:

1. Quando erano presenti sia buoni pasto che rimborsi cash dalle impostazioni, solo il valore del buono veniva considerato nel totale
2. Quando era specificato un valore cash nel form, questo veniva aggiunto ma non sostituiva i valori delle impostazioni come avrebbe dovuto

## Modifica implementata

È stata corretta la funzione `calculateAllowances` nel `CalculationService.js` per gestire correttamente il calcolo del totale dei rimborsi pasti, implementando la stessa logica di priorità già presente nella visualizzazione:

```javascript
// Logica Buoni Pasto (aggiornata)
// Gestisce correttamente i casi con valori specifici nel form (priorità) e quelli dalle impostazioni

// Pranzo: valori specifici nel form hanno priorità sui valori dalle impostazioni
if(workEntry.mealLunchCash > 0) {
  // Se c'è un valore specifico nel form, usa solo quello
  allowances.meal += workEntry.mealLunchCash;
} else if (workEntry.mealLunchVoucher) {
  // Altrimenti usa i valori standard dalle impostazioni
  allowances.meal += settings.mealAllowances?.lunch?.voucherAmount || 0;
  allowances.meal += settings.mealAllowances?.lunch?.cashAmount || 0;
}

// Cena: stesso approccio del pranzo
if(workEntry.mealDinnerCash > 0) {
  // Se c'è un valore specifico nel form, usa solo quello
  allowances.meal += workEntry.mealDinnerCash;
} else if (workEntry.mealDinnerVoucher) {
  // Altrimenti usa i valori standard dalle impostazioni
  allowances.meal += settings.mealAllowances?.dinner?.voucherAmount || 0;
  allowances.meal += settings.mealAllowances?.dinner?.cashAmount || 0;
}
```

## Comportamento atteso

Con questa modifica, il totale mostrato nella sezione "Rimborso pasti" è ora coerente con i dettagli visualizzati:

1. **Quando è specificato un valore nel form**:
   - Nel totale viene considerato solo il valore specificato nel form
   - I valori dalle impostazioni (buono e cash) vengono ignorati

2. **Quando non è specificato alcun valore nel form**:
   - Nel totale vengono considerati tutti i valori dalle impostazioni (buono e cash)

3. **In tutti i casi**:
   - Il totale mostrato riflette esattamente la somma dei valori descritti nei dettagli

## Vantaggi della correzione

1. **Coerenza**: Il totale mostrato è ora sempre coerente con i dettagli visualizzati
2. **Precisione**: Il calcolo riflette correttamente le priorità tra i valori specificati nel form e quelli dalle impostazioni
3. **Chiarezza**: L'utente può facilmente verificare che il totale corrisponda alla somma dei dettagli mostrati

Questa modifica completa l'implementazione della gestione prioritaria dei rimborsi pasti, garantendo che non solo la visualizzazione ma anche il calcolo del totale rispecchi accuratamente le regole di priorità.
