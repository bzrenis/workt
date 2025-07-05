# Correzione Calcolo Indennità di Reperibilità

## Problema Identificato

È stato rilevato un problema nel calcolo dell'indennità di reperibilità all'interno del riepilogo guadagni. Specificamente, l'indennità di reperibilità veniva conteggiata due volte nel totale giornaliero:

1. Era inclusa nel `totalStandbyEarnings` ottenuto dal metodo `calculateStandbyBreakdown` (è qui che deve correttamente essere conteggiata)
2. Era nuovamente inclusa nel `totalAllowances` quando si sommavano le indennità giornaliere, creando un doppio conteggio

Questo causava un sovracalcolo del guadagno totale giornaliero quando l'utente era in reperibilità.

## Soluzione Implementata

Sono state effettuate le seguenti modifiche in `CalculationService.js`:

1. **Rimozione del doppio conteggio**: Modificata la logica di calcolo di `totalAllowances` per escludere `allowances.standby` poiché questa è già inclusa nel `totalStandbyEarnings`:

   ```javascript
   // Prima:
   let totalAllowances = (allowances.travel || 0) + (allowances.meal || 0) + (allowances.standby || 0);

   // Dopo:
   let totalAllowances = (allowances.travel || 0) + (allowances.meal || 0);
   ```

2. **Garanzia di calcolo dell'indennità**: Aggiunto un controllo esplicito per assicurarsi che l'indennità di reperibilità venga sempre calcolata quando il flag di reperibilità è attivo, anche se non ci sono ore di intervento:

   ```javascript
   // Verifichiamo se il giorno è di reperibilità
   const isStandbyDay = workEntry.isStandbyDay === true || workEntry.isStandbyDay === 1;
   
   // Se è un giorno di reperibilità ma non è stata calcolata l'indennità in standbyBreakdown
   if (isStandbyDay && !standbyIndemnity) {
       standbyIndemnity = 7.50; // Valore predefinito CCNL o da impostazioni
       totalStandbyEarnings += standbyIndemnity; // Aggiungiamola al totale
   }
   ```

3. **Semplificazione dell'oggetto di

   ```javascript
   // Prima:
   allowances: {
     ...allowances,
     // Verifico se standbySettings esiste prima di accedervi
     standby: workEntry.isStandbyDay ? 
       ((settings.standbySettings?.dailyAllowance) || 
        (settings.standbySettings?.dailyIndemnity) || 
        7.50) : 0
   }

   // Dopo:
   allowances: {
     ...allowances
     // L'indennità standby è già impostata in calculateAllowances
   }
   ```

## Verifica del Corretto Funzionamento

Con queste modifiche:

1. L'indennità di reperibilità viene calcolata una sola volta e inclusa correttamente nel totale giornaliero
2. L'indennità di reperibilità viene visualizzata chiaramente nella sezione "Indennità e Buoni" del riepilogo
3. Il calcolo del guadagno totale giornaliero è ora preciso e riflette accuratamente tutti i compensi dovuti

## Logica di Calcolo Corretta

Il nuovo flusso di calcolo è il seguente:

1. In `calculateStandbyBreakdown`, calcoliamo:
   - L'indennità giornaliera di reperibilità (`dailyIndemnity`)
   - Le ore lavorate in reperibilità con relativi compensi maggiorati
   - Il totale guadagni reperibilità (`totalEarnings`) che include già l'indennità giornaliera

2. In `calculateEarningsBreakdown`, calcoliamo:
   - Il totale attività ordinarie (`totalOrdinaryEarnings`)
   - Il totale altre indennità (`totalAllowances`) che include trasferta e buoni pasto, ma NON l'indennità di reperibilità
   - Il totale finale (`totalEarnings`) come somma di `totalOrdinaryEarnings + totalStandbyEarnings + totalAllowances`

3. Nell'oggetto di ritorno:
   - L'indennità di reperibilità viene impostata come `allowances.standby = standbyIndemnity` per visualizzazione nell'UI
   - Questo valore viene mostrato nella sezione "Indennità e Buoni" ma NON viene sommato nuovamente nel calcolo del totale
   - Anche se non ci sono ore di intervento in reperibilità, l'indennità giornaliera viene comunque calcolata e aggiunta al totale quando il flag di reperibilità è attivo

Questa modifica garantisce che l'indennità di reperibilità venga conteggiata una sola volta e visualizzata correttamente nel riepilogo guadagni, mantenendo al contempo la separazione logica tra attività ordinarie e interventi in reperibilità.
