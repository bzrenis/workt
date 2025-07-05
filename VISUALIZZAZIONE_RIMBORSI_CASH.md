# Visualizzazione Rimborsi Pasti Cash nel Riepilogo Guadagni

## Descrizione

È stata implementata la visualizzazione dettagliata dei rimborsi pasti nel componente "Riepilogo Guadagni", sia per i buoni pasto che per i rimborsi cash. Ora l'utente può vedere chiaramente entrambi i tipi di rimborso per pranzo e cena. Inoltre, è stata implementata una logica di priorità per gestire casi speciali di rimborso.

## Modifiche Implementate

1. **Miglioramento della funzione `renderMealBreakdown`**:
   - Refactoring per gestire sia i buoni pasto che i rimborsi cash
   - Visualizzazione combinata quando entrambi sono presenti
   - Aggiunta logica di priorità per i valori specifici di rimborso inseriti nel form

   ```javascript
   // Helper to render meal breakdown with both voucher and cash amounts if applicable
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

2. **Correzione accesso alle proprietà cash**:
   - Risolto un problema di accesso alle proprietà `mealLunchCash` e `mealDinnerCash` nell'oggetto `workEntry` del componente `EarningsSummary`

   ```javascript
   // Prima
   mealLunchCash: form.pasti.pranzoCash || 0,
   mealDinnerCash: form.pasti.cenaCash || 0,
   
   // Dopo
   mealLunchCash: form.mealLunchCash || 0,
   mealDinnerCash: form.mealDinnerCash || 0,
   ```

3. **Aggiornamento chiamate a `renderMealBreakdown`**:
   - Utilizzo delle proprietà corrette dell'oggetto `workEntry` per accedere ai valori cash
   - Passaggio sia dei valori specifici del form che di quelli configurati nelle impostazioni

   ```javascript
   {renderMealBreakdown(
     form.pasti.pranzo, 
     workEntry.mealLunchCash,  // Valore specifico dal form (alta priorità)
     settings.mealAllowances?.lunch?.voucherAmount,  // Valori dalle impostazioni (bassa priorità)
     settings.mealAllowances?.lunch?.cashAmount
   )}
   ```

## Comportamento Atteso

1. **Quando l'utente inserisce un valore specifico nel form**:
   - Viene visualizzato solo il valore specifico: "X,XX € (contanti - valore specifico)"
   - I valori dalle impostazioni vengono ignorati

2. **Quando l'utente non specifica un valore nel form**:
   - Se nelle impostazioni è configurato solo il buono pasto: "X,XX € (buono)"
   - Se nelle impostazioni è configurato solo il rimborso cash: "X,XX € (contanti)"
   - Se nelle impostazioni sono configurati entrambi: "X,XX € (buono) + Y,YY € (contanti)"

3. **In tutti i casi**:
   - Il valore totale dei rimborsi pasti continua a non essere incluso nel totale giornaliero, come da specifiche precedenti

## Vantaggi

1. **Maggiore trasparenza**: L'utente vede chiaramente quanto riceverà sia come buoni pasto che come rimborsi cash
2. **Chiarezza contabile**: La separazione tra buoni e rimborsi cash rispecchia il diverso trattamento fiscale
3. **User Experience migliorata**: Il dettaglio dei rimborsi fornisce all'utente tutte le informazioni necessarie senza dover controllare in altre schermate
4. **Flessibilità**: L'utente può gestire casi speciali inserendo valori specifici nel form, senza dover modificare le impostazioni generali
5. **Chiarezza operativa**: Il riepilogo indica esplicitamente quando si tratta di un "valore specifico" inserito manualmente

Questa modifica completa l'implementazione della gestione dei rimborsi pasti, garantendo una visualizzazione completa e accurata nel riepilogo guadagni.
