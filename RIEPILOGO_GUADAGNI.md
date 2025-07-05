# Implementazione del Riepilogo Guadagni

## Descrizione

Il componente "Riepilogo Guadagni" è stato implementato nel form di inserimento attività lavorative per mostrare in tempo reale il calcolo delle retribuzioni giornaliere secondo le regole del CCNL Metalmeccanico PMI.

## Funzionalità Implementate

1. **Visualizzazione Dinamica:**
   - Aggiornamento automatico mentre l'utente inserisce dati.
   - Suddivisione chiara delle categorie di guadagno.

2. **Logica CCNL Corretta:**
   - Prime 8 ore (lavoro + viaggio) in giornaliera al tasso giornaliero.
   - Viaggio extra oltre le 8h pagato con tasso di viaggio.
   - Lavoro extra oltre le 8h pagato con tasso orario.

3. **Gestione Reperibilità:**
   - Calcolo separato per interventi in reperibilità.
   - Distinzione tra lavoro diurno, notturno e festivo.
   - Viaggio durante reperibilità con compenso dedicato.
   - Indennità giornaliera di reperibilità.

4. **Indennità e Buoni:**
   - Trasferta (giornaliera o mezza giornata).
   - Buoni pasto (pranzo/cena, voucher/contanti).

## Struttura del Componente

Il componente è organizzato in sezioni:

1. **Attività Ordinarie:**
   - Lavoro ordinario e viaggio in giornaliera (prime 8h) - mostra tariffa giornaliera (es. 109,195 € x 1 giorno)
   - Viaggio extra (oltre 8h) - mostra tariffa oraria (es. 16,41 € x 2,5 ore)
   - Lavoro extra (oltre 8h) - mostra tariffa oraria (es. 16,41 € x 1,5 ore)

2. **Interventi Reperibilità:**
   - Lavoro diurno - mostra tariffa oraria con maggiorazione (es. 19,69 € x 2 ore)
   - Lavoro notturno - mostra tariffa oraria con maggiorazione (es. 22,15 € x 1,5 ore)
   - Lavoro festivo - mostra tariffa oraria con maggiorazione (es. 21,33 € x 3 ore)
   - Viaggio reperibilità - mostra tariffa oraria (es. 16,41 € x 2 ore)

3. **Indennità e Buoni:**
   - Indennità trasferta - mostra se giornata intera o mezza giornata
   - Indennità reperibilità - mostra indennità giornaliera da CCNL
   - Rimborso pasti - mostra dettaglio pranzo/cena e se buono o contanti

4. **Totale Guadagno Giornaliero:**
   - Somma complessiva di tutte le voci

## Logica di Calcolo

Il componente utilizza `CalculationService.calculateEarningsBreakdown()` che applica le seguenti regole:

1. **Segmentazione delle attività:**
   - Separazione tra attività ordinarie e reperibilità per evitare doppi conteggi.
   - Mappatura dei minuti per tipo di attività.

2. **Applicazione regole CCNL:**
   - Prime 8 ore riempite prima con lavoro ordinario, poi con viaggio ordinario.
   - Ore oltre le 8 considerate come viaggio extra o lavoro extra.
   - Viaggio durante reperibilità pagato secondo le impostazioni.

3. **Calcolo indennità:**
   - Indennità di trasferta basata sulle impostazioni dell'utente.
   - Buoni pasto attivati dal form.
   - Indennità di reperibilità se il giorno è marcato come tale.

## Come funziona il Riepilogo

1. Il componente `EarningsSummary` riceve i dati del form e le impostazioni utente.
2. Converte i dati del form in un oggetto `workEntry` compatibile con il servizio di calcolo.
3. Usa `CalculationService.calculateEarningsBreakdown()` per ottenere il dettaglio dei guadagni.
4. Visualizza solo le sezioni rilevanti (se ci sono ore ordinarie, interventi, indennità).
5. Formatta correttamente ore e importi per una visualizzazione chiara.

## Note Implementative

- L'aggiornamento è in tempo reale grazie all'uso di React hooks (useState, useEffect, useMemo).
- La formattazione usa funzioni helper per gestire valori undefined/null e formattare ore e valute.
- Il layout è ottimizzato per la leggibilità su dispositivi mobile.
- La logica evita il doppio conteggio tra attività ordinarie e di reperibilità.
- Ogni tipo di attività mostra la tariffa applicata e il calcolo dettagliato.

## Miglioramenti Recenti

- **Aggiunta visualizzazione delle tariffe**: Ora per ogni voce viene mostrata la tariffa applicata e il calcolo esatto (es. "109,19 € x 1 giorno = 109,19 €")
- **Migliorata leggibilità**: Ogni voce ora include dettagli esplicativi per maggiore chiarezza
- **Correzione di errori relativi a `toFixed()`**: Aggiunti controlli di sicurezza per prevenire errori con valori undefined/null
- **Separazione dettagli attività ordinarie**: Le ore in giornaliera sono ora separate da quelle extra
- **Dettaglio sui rimborsi pasti**: Ora mostra se è un buono o un rimborso in contanti
- **Correzione della duplicazione del componente**: Risolto problema per cui il riepilogo appariva due volte nel form
- **Correzione accesso a proprietà `standbySettings`**: Risolto l'errore "Property 'standbySettings' doesn't exist" aggiungendo controlli di sicurezza e valori di fallback per evitare accessi a proprietà di oggetti undefined
- **Correzione calcolo indennità reperibilità**: Risolto un problema per cui l'indennità di reperibilità veniva conteggiata due volte nel totale giornaliero. Ora il calcolo è corretto: l'indennità viene inclusa una sola volta (come parte del totale reperibilità) e viene mostrata chiaramente nella sezione "Indennità e Buoni"
- **Esclusione rimborsi pasti dal totale**: I rimborsi pasti vengono ora mostrati nel riepilogo ma non sono inclusi nel totale giornaliero, essendo voci non tassabili e non parte effettiva del guadagno
- **Visualizzazione dettagliata dei rimborsi pasti**: Ora vengono mostrati sia i buoni pasto che i rimborsi cash per pranzo e cena, con formato "buono di X,XX € + rimborso cash di Y,YY €" quando entrambi sono presenti
- **Gestione prioritaria dei rimborsi pasti**: Implementata logica che dà priorità ai rimborsi cash specifici inseriti nel form rispetto ai valori standard configurati nelle impostazioni. Se viene specificato un valore nel form, questo viene mostrato esclusivamente nel riepilogo come "valore specifico"
- **Correzione totale rimborsi pasti**: Corretto il calcolo del totale dei rimborsi pasti nel riepilogo per renderlo coerente con i dettagli visualizzati, applicando la stessa logica di priorità tra valori del form e valori delle impostazioni
- **Implementazione calcolo giornaliero proporzionale**: Aggiunta la funzionalità per calcolare la tariffa giornaliera in modo proporzionale (ore lavorate / 8) quando si effettuano meno di 8 ore
- **Completamento giornata lavorativa parziale**: Aggiunta la possibilità di specificare come gestire le ore mancanti (ferie, permesso, malattia, riposo compensativo) con relativa visualizzazione nel riepilogo
- **Condizioni attivazione indennità trasferta**: Modificata la logica di attivazione dell'indennità di trasferta per attivarla solo quando è presente del viaggio o quando il flag è attivato manualmente, con indicazione chiara del motivo di attivazione nel riepilogo
- **Cancellazione orari**: Implementata la possibilità di cancellare con un semplice click qualsiasi orario inserito nel form tramite un pulsante dedicato accanto a ogni campo orario

Per la risoluzione di eventuali problemi, riferirsi a `CalculationService.js` che contiene la logica dettagliata di calcolo.
