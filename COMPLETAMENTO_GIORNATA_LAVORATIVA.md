# Implementazione del Completamento Giornata Lavorativa

## Descrizione della Funzionalità

La funzionalità di "Completamento Giornata Lavorativa" consente all'utente di specificare come gestire le ore mancanti quando il totale delle ore lavorate e di viaggio è inferiore alle 8 ore standard di una giornata lavorativa completa secondo il CCNL.

## Opzioni di Completamento

L'utente può scegliere tra le seguenti modalità di completamento:

1. **Nessuno**: Le ore lavorate vengono pagate proporzionalmente (come percentuale di una giornata completa)
2. **Ferie**: Le ore mancanti vengono coperte da ferie
3. **Permesso**: Le ore mancanti vengono coperte da permessi
4. **Malattia**: Le ore mancanti vengono coperte da malattia
5. **Riposo compensativo**: Le ore mancanti vengono coperte da riposo compensativo

## Funzionamento

### Interfaccia Utente

Nel form di inserimento attività è stata aggiunta una nuova sezione "Completamento Giornata" che:

- È sempre visibile
- Mostra le diverse opzioni di completamento
- Permette all'utente di selezionare una modalità

### Calcolo Retribuzione

La logica di calcolo è stata modificata nel seguente modo:

1. **Se le ore totali lavorate ≥ 8 ore**:
   - La giornata è considerata completa
   - Viene applicata la tariffa giornaliera piena
   - Le ore extra sono pagate come straordinario o viaggio extra

2. **Se le ore totali lavorate < 8 ore**:
   - **Con opzione "Nessuno"**: La retribuzione è proporzionale alle ore lavorate
     - Formula: `tariffa_giornaliera * (ore_lavorate / 8)`
   - **Con altra opzione** (Ferie, Permesso, ecc.): La retribuzione è completa
     - La giornata è considerata completa (8 ore)
     - Le ore mancanti sono contabilizzate nella modalità selezionata

### Visualizzazione nel Riepilogo

Nel componente "Riepilogo Guadagni" è stata aggiunta una sezione specifica che mostra:

1. **Ore lavorate**: Confronto tra ore effettivamente lavorate e le 8 ore standard
2. **Ore mancanti**: Quante ore mancano per completare la giornata
3. **Modalità di completamento**: Come vengono gestite le ore mancanti
4. **Effetto sul totale**: Se la retribuzione è proporzionale o completa

## Implementazione Tecnica

1. **Nuovi stati nel form**:
   - `completamentoGiornata`: Memorizza l'opzione selezionata ('nessuno', 'ferie', 'permesso', ecc.)

2. **Modifiche in CalculationService**:
   - Aggiunta del calcolo delle ore mancanti
   - Logica condizionale per gestire diversi tipi di completamento
   - Inclusione delle informazioni di completamento nel risultato

3. **Modifiche in EarningsSummary**:
   - Visualizzazione delle ore lavorate vs. ore standard
   - Mostra dettagli sul completamento giornata se pertinenti
   - Spiegazione della modalità di calcolo retributivo nel totale

## Considerazioni Contrattuali

Questa funzionalità rispetta le regole del CCNL Metalmeccanico PMI, che prevede:

- La possibilità di giorni parziali
- La gestione combinata di lavoro e altri tipi di assenze nella stessa giornata
- La retribuzione proporzionale per frazioni di giornate lavorate

## Esempi Pratici

1. **6 ore lavorate, opzione "Nessuno"**:
   - Retribuzione: 109,19 € × 75% (6h / 8h) = 81,89 €
   - Non vengono utilizzate ferie o permessi

2. **6 ore lavorate, opzione "Permesso"**:
   - Retribuzione: 109,19 € (giornata completa)
   - 2 ore di permesso utilizzate

3. **4 ore lavorate, opzione "Ferie"**:
   - Retribuzione: 109,19 € (giornata completa)
   - 4 ore di ferie utilizzate

## Persistenza Dati

La scelta della modalità di completamento viene salvata nel database insieme agli altri dati dell'inserimento, consentendo un'accurata reportistica e una corretta gestione delle assenze nel tempo.
