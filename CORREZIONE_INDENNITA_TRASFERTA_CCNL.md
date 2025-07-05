# CORREZIONE INDENNITÀ TRASFERTA - CALCOLO PROPORZIONALE CCNL

## Problema Identificato

Il calcolo dell'indennità di trasferta non era conforme al CCNL Metalmeccanico PMI. La logica precedente applicava:
- **50%** dell'indennità per giornate < 8 ore
- **100%** dell'indennità per giornate >= 8 ore

Questo non rispettava il principio di **proporzionalità** previsto dal CCNL.

## Correzione Implementata

È stata aggiunta una nuova opzione `PROPORTIONAL_CCNL` che calcola l'indennità in modo proporzionale alle ore lavorate:

```javascript
// Calcolo proporzionale CCNL
const proportionalRate = Math.min(totalWorked / 8, 1.0); // Max 100%
const indennita = importoGiornaliero * proportionalRate;
```

## Confronto Calcoli

### Caso 12/07/2025 (7 ore totali)
- **Logica precedente**: 50% → 15.00€ 
- **Nuova logica CCNL**: 87.5% → 26.25€
- **Differenza**: +11.25€ a favore del lavoratore

### Altri scenari (indennità base 30€)
| Ore | Logica Precedente | CCNL Proporzionale | Differenza |
|-----|-------------------|-------------------|------------|
| 4h  | 15.00€ (50%)     | 15.00€ (50%)      | +0.00€     |
| 6h  | 15.00€ (50%)     | 22.50€ (75%)      | +7.50€     |
| 7h  | 15.00€ (50%)     | 26.25€ (87.5%)    | +11.25€    |
| 8h  | 30.00€ (100%)    | 30.00€ (100%)     | +0.00€     |
| 9h  | 30.00€ (100%)    | 30.00€ (100%)     | +0.00€     |

## Implementazione Tecnica

### File Modificati
- `src/services/CalculationService.js`: Aggiunta logica `PROPORTIONAL_CCNL`

### Modifiche al Codice

#### 1. Metodo calculateDailyEarnings
```javascript
case 'PROPORTIONAL_CCNL':
  attiva = totalWorked > 0;
  break;

// Calcolo proporzionale CCNL
if (travelAllowanceOption === 'PROPORTIONAL_CCNL') {
  const standardWorkDay = 8;
  const proportionalRate = Math.min(totalWorked / standardWorkDay, 1.0);
  baseTravelAllowance = travelAllowanceAmount * proportionalRate;
}
```

#### 2. Metodo calculateEarningsBreakdown
```javascript
if (travelAllowanceOption === 'PROPORTIONAL_CCNL') {
  const standardWorkDay = 8;
  const proportionalRate = Math.min(totalOrdinaryHours / standardWorkDay, 1.0);
  baseTravelAllowance = travelAllowanceAmount * proportionalRate;
}
```

## Configurazione

Per utilizzare la nuova logica conforme al CCNL:

```javascript
// Nelle impostazioni dell'app
travelAllowance: {
  enabled: true,
  dailyAmount: 30.00,
  option: 'PROPORTIONAL_CCNL' // ← Nuova opzione
}
```

## Retrocompatibilità

La logica precedente (`HALF_ALLOWANCE_HALF_DAY`) rimane disponibile per mantenere la retrocompatibilità con configurazioni esistenti.

## Conformità CCNL

✅ **Conforme al CCNL Metalmeccanico PMI**  
✅ **Proporzionale alle ore lavorate**  
✅ **Più favorevole al lavoratore**  
✅ **Calcolo matematicamente corretto**

## Note per l'Utente

- La nuova logica deve essere attivata manualmente nelle impostazioni
- È consigliabile passare a `PROPORTIONAL_CCNL` per conformità CCNL
- Il calcolo sarà più favorevole per giornate parziali (< 8 ore)

## Test Disponibili

- `test-ccnl-semplificato.js`: Test della nuova logica
- `test-indennita-proporzionale.js`: Confronto logiche

---

**Data implementazione**: 4 Luglio 2025  
**Versione**: Correzione CCNL v1.0
