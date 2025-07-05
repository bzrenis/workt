# Calcolo Proporzionale della Tariffa Giornaliera

## Implementazione del Calcolo Proporzionale per Giornate Parziali

In questa implementazione abbiamo aggiunto una nuova funzionalità che consente il calcolo proporzionale della tariffa giornaliera quando vengono lavorate meno di 8 ore. Questa modifica risponde alla necessità di avere un sistema di calcolo più equo per le giornate lavorative parziali.

## Logica di Calcolo

1. **Giornata Completa (≥ 8 ore)**:
   - Quando il totale delle ore lavorate e di viaggio è pari o superiore a 8 ore, viene applicata la tariffa giornaliera completa (€109.19 per il livello 5 CCNL Metalmeccanico PMI).

2. **Giornata Parziale (< 8 ore)**:
   - Quando il totale delle ore lavorate e di viaggio è inferiore a 8 ore, la tariffa giornaliera viene calcolata proporzionalmente:
   - `Tariffa Giornaliera * (Ore Totali / 8)`

## Esempio di Calcolo

- **Tariffa giornaliera**: €109.19
- **Ore lavorate**: 6 ore
- **Calcolo**: €109.19 × (6/8) = €109.19 × 0.75 = €81.89

## Modifiche al Codice

### 1. Modifica in `CalculationService.js`

Nel metodo `calculateEarningsBreakdown`, la logica per il calcolo della tariffa giornaliera è stata aggiornata per gestire il caso di giornate parziali:

```javascript
// Applica la retribuzione giornaliera in modo proporzionale se meno di 8 ore
if (totalOrdinaryMinutes > 0) {
  if (totalOrdinaryHours >= standardWorkDayHours) {
    // Se sono state lavorate 8 o più ore, paga la tariffa giornaliera completa
    dailyRateAmount = contract.dailyRate || 0;
  } else {
    // Se sono state lavorate meno di 8 ore, calcola la tariffa giornaliera come percentuale
    dailyRateAmount = (contract.dailyRate || 0) * (totalOrdinaryHours / standardWorkDayHours);
  }
}
```

### 2. Aggiornamento dell'Interfaccia in `TimeEntryForm.js`

L'interfaccia utente è stata aggiornata per mostrare il calcolo proporzionale:

- Per giornate complete: `109,19 € x 1 giorno = 109,19 €`
- Per giornate parziali: `109,19 € x 75% (6h / 8h) = 81,89 €`

## Vantaggi

1. **Equità**: Il compenso riflette ora il tempo effettivamente lavorato per giornate parziali.
2. **Trasparenza**: L'interfaccia utente mostra chiaramente come viene calcolata la tariffa giornaliera proporzionale.
3. **Conformità CCNL**: Il calcolo è conforme alle pratiche comuni di gestione delle giornate lavorative parziali.

## Limitazioni

- Il calcolo considera indistintamente sia le ore di lavoro che quelle di viaggio nel conteggio delle ore totali per la giornata.
- La proporzione si applica solo alla tariffa giornaliera base e non alle altre indennità come la reperibilità o i rimborsi pasti.
