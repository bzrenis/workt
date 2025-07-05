# Cancellazione Orari nel Time Entry Form

## Funzionalità Implementata

È stata implementata la possibilità di cancellare qualsiasi dato orario inserito nel form di inserimento orari. Questa funzionalità rende più facile la correzione di errori di inserimento o la rimozione di orari non più validi senza dover ricaricare o resettare l'intero modulo.

## Come Usare

1. In qualsiasi campo orario contenente un valore (es. "Partenza azienda", "Arrivo cantiere", ecc.), viene mostrata un'icona a forma di "X" rossa accanto all'icona dell'orologio.
2. Fare click sull'icona "X" per cancellare immediatamente quell'orario.
3. Non è necessaria alcuna conferma: l'orario viene cancellato con un singolo click.
4. Il riepilogo guadagni si aggiorna automaticamente dopo la cancellazione.

## Disponibilità

La cancellazione è disponibile per tutti i tipi di campi orario nel form:

- Orari di viaggio (partenza/arrivo azienda, partenza/arrivo cantiere)
- Orari di lavoro (inizio/fine primo turno, inizio/fine secondo turno)
- Orari di intervento durante reperibilità

## Implementazione Tecnica

- Il componente `TimeField` è stato migliorato per supportare la cancellazione degli orari.
- La cancellazione avviene tramite un pulsante con icona "close-circle" che appare solo quando un valore è presente nel campo.
- Quando premuto, il pulsante di cancellazione:
  1. Arresta la propagazione dell'evento per evitare di aprire il selettore orario
  2. Resetta il valore del campo nel modulo
  3. Aggiorna lo stato del form per riflettere la modifica
  
- Per l'accessibilità sono stati inclusi attributi:
  - `accessibilityLabel`: "Cancella orario [nome campo]"
  - `accessibilityHint`: "Cancella l'orario [nome campo] impostato a [valore]"

## Note

- La cancellazione di orari può influire sul calcolo del guadagno giornaliero (viaggio, lavoro, straordinari, ecc.)
- Il riepilogo guadagni si aggiorna automaticamente dopo la cancellazione di un orario
- La cancellazione di un orario non rimuove altri dati correlati nel form
