# Configurazione Indennità Trasferta - Sabato e Giorni Speciali

## Problema Risolto
✅ **Correzione interfaccia utente completata**

### Problema Identificato
L'interfaccia utente nelle impostazioni dell'indennità trasferta mostrava un testo fuorviante che diceva:
> "Se attivo, l'indennità viene applicata anche nei giorni speciali (sabato, domenica e festivi)"

### Comportamento Effettivo del Codice
Il codice implementa correttamente le regole CCNL:
- **Sabato**: Sempre considerato giorno lavorativo normale → Indennità sempre applicabile
- **Domenica**: Giorno speciale → Indennità applicabile solo se toggle attivato
- **Festivi**: Giorni speciali → Indennità applicabile solo se toggle attivato

### Correzione Applicata
Il testo nell'interfaccia è stato corretto per riflettere il comportamento reale:

**PRIMA:**
```
Applica nei giorni speciali
Se attivo, l'indennità viene applicata anche nei giorni speciali (sabato, domenica e festivi).
```

**DOPO:**
```
Applica nei giorni speciali (domenica e festivi)
Se attivo, l'indennità viene applicata anche nelle domeniche e nei giorni festivi.
NOTA: Il sabato è sempre considerato un giorno lavorativo normale per l'indennità trasferta.
```

## Conformità CCNL Metalmeccanico PMI

### Trattamento del Sabato
Secondo il CCNL Metalmeccanico PMI:
- Il sabato è un giorno lavorativo normale (non festivo)
- È previsto un maggiorazione del +25% per le ore lavorate di sabato
- L'indennità trasferta si applica normalmente come in un giorno feriale
- Non richiede attivazioni speciali

### Logica di Applicazione
```javascript
// Nel CalculationService.js - Logica corretta implementata:
const applyOnSpecialDays = travelAllowanceSettings.applyOnSpecialDays || false;

// Controlla solo domenica e festivi, NON il sabato
if (attiva && (!(isSunday || isHoliday) || applyOnSpecialDays || manualOverride)) {
  // Applica indennità trasferta
  travelAllowance = baseTravelAllowance * travelAllowancePercent;
}
```

## Test di Verifica

Il test automatico `test-saturday-travel-allowance.js` conferma:

### Risultati Test
- **Sabato (toggle OFF)**: Indennità = 15€ ✅
- **Sabato (toggle ON)**: Indennità = 15€ ✅  
- **Domenica (toggle OFF)**: Indennità = 0€ ✅
- **Domenica (toggle ON)**: Indennità = 15€ ✅

### Conclusioni Test
✅ Il toggle `applyOnSpecialDays` NON influenza il sabato (comportamento corretto)
✅ Il toggle `applyOnSpecialDays` influenza correttamente domenica e festivi
✅ Il sabato è sempre trattato come giorno normale per l'indennità trasferta

## File Modificati
1. **src/screens/TravelAllowanceSettings.js**: Corretto testo interfaccia utente
2. **test-saturday-travel-allowance.js**: Creato test di verifica

## File Verificati (Nessuna modifica necessaria)
1. **src/services/CalculationService.js**: Logica già corretta
2. **src/screens/TimeEntryForm.js**: Definizione `isSpecialDay` già corretta

## Configurazione Finale
L'app ora presenta chiaramente che:
- Il **toggle "Applica nei giorni speciali"** controlla solo domeniche e festivi
- Il **sabato** è sempre considerato un giorno lavorativo normale
- L'**indennità trasferta** si applica sul sabato senza restrizioni speciali
- La **maggiorazione del +25%** per il sabato viene applicata correttamente sulle ore lavorate

La configurazione è ora completamente conforme al CCNL e l'interfaccia utente riflette accuratamente il comportamento del codice.
