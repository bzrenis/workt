# COME USARE IL CALCOLO PROPORZIONALE CCNL PER L'INDENNITÀ TRASFERTA

## Problema Risolto

Il tuo caso del 12/07/2025 ha evidenziato che il calcolo dell'indennità trasferta non era conforme al CCNL. Con 7 ore totali (lavoro + viaggio), l'app calcolava il 50% dell'indennità (metà giornata), ma secondo il CCNL dovrebbe essere proporzionale: 7/8 = 87.5% dell'indennità.

## Soluzione Implementata

È stata aggiunta una nuova opzione di calcolo `PROPORTIONAL_CCNL` che:

- **Calcola proporzionalmente** l'indennità in base alle ore effettive
- **È conforme al CCNL** Metalmeccanico PMI
- **È più favorevole** al lavoratore per giornate parziali

## Come Attivare la Nuova Logica

### Nell'App (se hai accesso alle impostazioni)

1. Vai in **Impostazioni** → **Indennità Trasferta**
2. Cambia l'opzione da `HALF_ALLOWANCE_HALF_DAY` a `PROPORTIONAL_CCNL`
3. Salva le modifiche

### Nel Codice (per sviluppatori)

Modifica il file delle impostazioni:

```javascript
travelAllowance: {
  enabled: true,
  dailyAmount: 30.00, // La tua indennità giornaliera
  option: 'PROPORTIONAL_CCNL', // ← Cambia questa opzione
  applyOnSpecialDays: false
}
```

## Confronto Risultati

### Il Tuo Caso (12/07/2025 - 7 ore)

| Metodo | Calcolo | Risultato |
|--------|---------|-----------|
| **Precedente** | 50% fisso per < 8h | 15.00€ |
| **CCNL Nuovo** | 7h ÷ 8h = 87.5% | 26.25€ |
| **Guadagno** | Differenza | **+11.25€** |

### Altri Esempi (con indennità base 30€)

- **6 ore**: da 15€ a 22.50€ (+7.50€)
- **7 ore**: da 15€ a 26.25€ (+11.25€)  
- **8 ore**: rimane 30€ (nessun cambiamento)

## Vantaggi della Nuova Logica

✅ **Conforme al CCNL** - Rispetta le normative contrattuali  
✅ **Matematicamente corretta** - Proporzionale alle ore reali  
✅ **Più equa** - Riconosce il lavoro effettivo svolto  
✅ **Favorevole al lavoratore** - Aumenta l'indennità per giornate parziali  

## Retrocompatibilità

- La logica precedente rimane disponibile
- Puoi sempre tornare indietro se necessario
- Non influisce sui calcoli passati (a meno di ricalcolo manuale)

## Quando Usare Quale Opzione

### `PROPORTIONAL_CCNL` (Consigliato)
- ✅ Per essere conformi al CCNL
- ✅ Se lavori spesso giornate parziali
- ✅ Per un calcolo più equo e preciso

### `HALF_ALLOWANCE_HALF_DAY` (Precedente)
- ⚠️ Solo per retrocompatibilità
- ⚠️ Se l'azienda ha accordi specifici diversi dal CCNL

## Nota Importante

**Il cambio è retroattivo solo se ricalcoli manualmente i giorni precedenti.** I calcoli già effettuati rimangono con la logica utilizzata al momento dell'inserimento.

---

**💡 Suggerimento**: Attiva `PROPORTIONAL_CCNL` per essere conforme al CCNL e ottenere calcoli più favorevoli per le tue giornate parziali!
