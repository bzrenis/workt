# Rimborsi Pasti: Priorità tra Valori Specifici e Valori Standard

## Descrizione

È stata implementata una logica di priorità per la visualizzazione dei rimborsi pasti nel riepilogo guadagni. Il componente distingue ora tra rimborsi standard (configurati nelle impostazioni) e rimborsi specifici inseriti direttamente nel form per casi particolari.

## Comportamento implementato

1. **Rimborso specifico nel form**:
   - Se l'utente inserisce un importo specifico per il rimborso pasto (cash) direttamente nel form di inserimento ore, questo valore ha priorità assoluta
   - In questo caso, nel riepilogo guadagni viene mostrato solo il valore specifico inserito, con l'etichetta "(contanti - valore specifico)"
   - I valori configurati nelle impostazioni (buono e cash) vengono ignorati

2. **Valori standard dalle impostazioni**:
   - Se l'utente non inserisce alcun valore specifico nel form, vengono utilizzati i valori configurati nelle impostazioni dell'app
   - In questo caso, il riepilogo mostra:
     - Solo il buono pasto, se nelle impostazioni è configurato solo il valore del buono
     - Solo il rimborso cash, se nelle impostazioni è configurato solo il valore cash
     - Entrambi i valori (buono + cash) se nelle impostazioni sono configurati entrambi

## Implementazione tecnica

La logica è stata implementata nella funzione `renderMealBreakdown` del componente `EarningsSummary`:

```javascript
const renderMealBreakdown = (isActive, cashAmountFromForm, voucherAmountFromSettings, cashAmountFromSettings) => {
  if (!isActive) return "Non attivo";
  
  // Se nel form è stato specificato un rimborso cash specifico, mostra solo quello
  // ignorando i valori configurati nelle impostazioni
  if (cashAmountFromForm > 0) {
    return `${formatSafeAmount(cashAmountFromForm)} (contanti - valore specifico)`;
  }
  
  // Altrimenti usa i valori dalle impostazioni (standard)
  const voucher = parseFloat(voucherAmountFromSettings) || 0;
  const cash = parseFloat(cashAmountFromSettings) || 0;
  
  if (voucher > 0 && cash > 0) {
    return `${formatSafeAmount(voucher)} (buono) + ${formatSafeAmount(cash)} (contanti)`;
  } else if (voucher > 0) {
    return `${formatSafeAmount(voucher)} (buono)`;
  } else if (cash > 0) {
    return `${formatSafeAmount(cash)} (contanti)`;
  } else {
    return "Valore non impostato";
  }
};
```

## Casi d'uso

1. **Utilizzo quotidiano standard**:
   - L'utente attiva i buoni pasto nel form (pranzo e/o cena)
   - Il riepilogo mostra i valori configurati nelle impostazioni (buono e/o cash)

2. **Rimborso speciale**:
   - L'utente attiva il buono pasto nel form ma specifica anche un valore specifico di rimborso cash
   - Il riepilogo ignora i valori delle impostazioni e mostra solo il valore specifico inserito

Questa logica garantisce la massima flessibilità, permettendo sia l'utilizzo dei valori standard configurati nelle impostazioni per il caso d'uso più comune, sia la possibilità di specificare rimborsi speciali caso per caso.

## Vantaggi

1. **Flessibilità**: Supporto per rimborsi specifici (casi speciali) senza necessità di modificare le impostazioni generali
2. **Chiarezza**: Il riepilogo indica esplicitamente quando si tratta di un valore specifico inserito nel form
3. **Efficienza**: Nelle normali operazioni quotidiane, l'utente può semplicemente attivare i buoni pasto senza dover specificare valori
