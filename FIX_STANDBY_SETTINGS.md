# Risoluzione Errore "Property 'standbySettings' doesn't exist"

## Problema

L'applicazione mostrava un errore di rendering con il messaggio:

```text
Render Error
Property 'standbySettings' doesn't exist
```

Questo errore si verificava nel componente `EarningsSummary` quando tentava di accedere alla proprietà `settings.standbySettings` che poteva essere undefined in alcuni casi.

## Cause

1. Accesso non sicuro alla proprietà `settings.standbySettings` durante la creazione degli oggetti settings
2. Accesso diretto a `settings.contract` senza controlli di nullità in alcuni punti del codice
3. Merge non sicuro delle impostazioni che non gestiva correttamente il caso in cui `settings` fosse null o undefined

## Soluzione

La soluzione ha incluso:

1. **Accesso sicuro a settings**: Modificato il merge delle impostazioni utilizzando l'operatore di optional chaining (`?.`) e fornendo oggetti vuoti come fallback (`|| {}`) per evitare errori in caso di proprietà mancanti:

   ```javascript
   const safeSettings = {
     ...defaultSettings,
     ...(settings || {}),
     contract: { ...defaultSettings.contract, ...(settings?.contract || {}) },
     standbySettings: { ...defaultSettings.standbySettings, ...(settings?.standbySettings || {}) },
     mealAllowances: { ...defaultSettings.mealAllowances, ...(settings?.mealAllowances || {}) }
   };
   ```

2. **Correzioni accesso alle proprietà**: Sostituito tutti gli accessi diretti a `settings.contract` e `settings.contract.hourlyRate` con accessi sicuri:

   ```javascript
   // Prima
   {(settings.contract.hourlyRate * (settings.contract.overtimeRates?.holiday || 1.3)).toFixed(2)}
   
   // Dopo
   {((settings.contract?.hourlyRate || 16.41) * (settings.contract?.overtimeRates?.holiday || 1.3)).toFixed(2)}
   ```

## Miglioramenti Apportati

1. **Robustezza**: L'applicazione ora resiste a casi in cui `settings` o le sue sottoproprietà sono undefined o null
2. **Valori di fallback**: Aggiunti valori predefiniti per tutte le tariffe e impostazioni critiche
3. **Coerenza**: Utilizzato lo stesso approccio di accesso sicuro in tutto il codice

## Test

L'applicazione è stata testata e ora funziona correttamente senza mostrare l'errore "Property 'standbySettings' doesn't exist". Il componente EarningsSummary ora mostra tutti i dettagli di calcolo, incluse le indennità di reperibilità, senza errori.
