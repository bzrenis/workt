# Modifica Attivazione Indennità Trasferta

## Descrizione della Modifica

È stata implementata una modifica nella logica di attivazione dell'indennità di trasferta, in modo che questa venga pagata solo quando è presente almeno un'ora di viaggio oppure quando l'utente ha attivato manualmente il flag "Indennità trasferta" nel form di inserimento.

## Stato Precedente

Prima di questa modifica, l'indennità di trasferta veniva attivata in base a logiche multiple che non consideravano esclusivamente la presenza di ore di viaggio o l'attivazione manuale del flag. In particolare:

```javascript
// Logica precedente
if (travelSettings.enabled) {
    const totalHours = Object.values(hoursBreakdown).reduce((sum, h) => sum + h, 0);
    if (totalHours > 0) { // Attivazione se ci sono ore totali (lavoro + viaggio)
        allowances.travel = parseFloat(travelSettings.dailyAmount) || 0;
    }
}
```

Questa logica attivava l'indennità di trasferta se erano presenti ore totali (lavoro + viaggio), il che poteva causare l'attivazione anche in assenza di viaggio effettivo.

## Modifica Implementata

La nuova logica tiene conto più precisamente delle condizioni per l'attivazione dell'indennità di trasferta:

```javascript
// Nuova logica
if (travelSettings.enabled) {
    // Verifica se ci sono ore di viaggio
    const travelHours = (hoursBreakdown.viaggio_giornaliera || 0) + (hoursBreakdown.viaggio_extra || 0);
    
    // Attiva l'indennità solo se:
    // 1) ci sono ore di viaggio, OPPURE
    // 2) il flag travelAllowance è stato attivato manualmente nel form
    if (travelHours > 0 || (workEntry.travelAllowance === 1 || workEntry.travelAllowance === true)) {
        const percentuale = workEntry.travelAllowancePercent || 1.0;
        allowances.travel = (parseFloat(travelSettings.dailyAmount) || 0) * percentuale;
    }
}
```

## Modifiche al Riepilogo Guadagni

Il componente EarningsSummary è stato aggiornato per mostrare chiaramente la ragione dell'attivazione dell'indennità di trasferta:

- "Attivata per presenza di viaggio" - quando ci sono ore di viaggio registrate
- "Attivata manualmente" - quando l'utente ha attivato manualmente il flag senza ore di viaggio
- "Attivata per presenza di viaggio e flag manuale" - quando entrambe le condizioni sono vere

## Vantaggi della Modifica

1. **Maggiore Precisione**: L'indennità viene attivata solo quando realmente necessario (presenza di viaggio o scelta esplicita dell'utente)
2. **Trasparenza**: Il riepilogo mostra chiaramente perché è stata attivata l'indennità
3. **Conformità CCNL**: Allineamento con le normative che prevedono l'indennità di trasferta solo in presenza di effettivo spostamento o condizioni specifiche

## Esempi di Utilizzo

1. **Giornata con viaggio**: L'indennità si attiva automaticamente
2. **Giornata senza viaggio ma con flag attivo**: L'indennità si attiva perché esplicitamente richiesta
3. **Giornata senza viaggio e senza flag**: Nessuna indennità di trasferta
4. **Mezza giornata di trasferta**: L'indennità viene calcolata in proporzione (50% o altra percentuale configurata)

## Note per il Futuro

È possibile che in futuro si vogliano aggiungere ulteriori condizioni di attivazione dell'indennità di trasferta in base a requisiti specifici. La struttura del codice è stata progettata per essere facilmente estendibile a tali esigenze.
