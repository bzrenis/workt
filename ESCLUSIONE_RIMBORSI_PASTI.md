# Esclusione Rimborsi Pasti dal Totale Guadagni

## Motivazione

I rimborsi pasti (buoni pasto o rimborsi cash) sono stati esclusi dal calcolo del totale guadagno giornaliero per i seguenti motivi:

1. **Natura fiscale**: I buoni pasto e i rimborsi per i pasti hanno un trattamento fiscale diverso rispetto alle altre voci di guadagno. Sono generalmente esenti da tassazione fino a determinati limiti (€8 per buoni pasto elettronici, €4 per buoni cartacei in Italia).

2. **Chiarezza contabile**: Separarli dal guadagno effettivo permette all'utente di avere una visione più chiara della propria retribuzione imponibile.

3. **Coerenza con buste paga**: Nelle buste paga ufficiali, i buoni pasto sono solitamente indicati a parte e non inclusi nel totale imponibile.

## Modifiche Implementate

1. **Modifica al calcolo**:
   - Nel `CalculationService.js` è stato modificato il calcolo del `totalAllowances` per escludere `allowances.meal`.

   ```javascript
   // Prima:
   let totalAllowances = (allowances.travel || 0) + (allowances.meal || 0);
   
   // Dopo:
   let totalAllowances = (allowances.travel || 0); // Solo trasferta
   ```

2. **Chiarimenti nell'interfaccia**:
   - Aggiunto un messaggio esplicativo sotto la voce "Rimborso pasti": "Non incluso nel totale giornaliero (voce non tassabile)"
   - Modificato il messaggio sotto il totale giornaliero per chiarire cosa include: "Include attività ordinarie, interventi in reperibilità e indennità di trasferta (esclusi rimborsi pasti)"

3. **Visualizzazione rimborsi cash**:
   - Aggiunto un helper `renderMealBreakdown` che mostra sia i buoni pasto che i rimborsi cash
   - Corretto l'accesso alle proprietà `mealLunchCash` e `mealDinnerCash` nell'oggetto work entry
   - La visualizzazione ora mostra la combinazione di buono pasto e rimborso cash quando entrambi sono presenti

4. **Documentazione**:
   - Aggiornato il file `RIEPILOGO_GUADAGNI.md` per includere queste modifiche nei miglioramenti recenti

## Comportamento Atteso

1. I buoni pasto vengono ancora visualizzati nel riepilogo per informazione dell'utente
2. Il loro importo è mostrato in modo chiaro, specificando tipo (pranzo/cena) e modalità (buono o contanti)
3. Quando sono presenti sia buoni pasto che rimborsi cash, entrambi vengono visualizzati con il relativo importo
4. Il valore totale (buono + cash) non viene sommato nel totale giornaliero
5. Un messaggio esplicativo chiarisce all'utente il perché questa voce è esclusa dal totale

Questa modifica rende più accurato il calcolo dei guadagni e riflette meglio il trattamento fiscale effettivo dei rimborsi pasti secondo la normativa italiana.
