# 🔧 RISOLUZIONE BUG: Trattenute 12.4% invece di 32%

## 🎯 PROBLEMA IDENTIFICATO
La dashboard mostrava una percentuale di trattenute del 12.4% invece del valore atteso (~32%) per il CCNL Metalmeccanico Livello 5.

## 🔍 CAUSA ROOT
Il problema era nel passaggio delle impostazioni alle funzioni di calcolo netto nella dashboard:

**PRIMA (SBAGLIATO):**
```javascript
// Dashboard passava l'intero oggetto settings
getDeductionPercentage(grossAmount, settings)

// settings = {
//   contract: { ... },
//   netCalculation: { method: 'irpef', customDeductionRate: 25 },
//   overtime: { ... },
//   travel: { ... }
// }
// 
// ❌ settings.method = undefined (non esiste al livello root)
// ❌ settings.customDeductionRate = undefined
```

**DOPO (CORRETTO):**
```javascript
// Dashboard ora passa solo la sezione netCalculation
getDeductionPercentage(grossAmount, settings?.netCalculation)

// settings.netCalculation = {
//   method: 'irpef',
//   customDeductionRate: 25
// }
//
// ✅ netSettings.method = 'irpef'  
// ✅ netSettings.customDeductionRate = 25
```

## 🛠️ CORREZIONI APPLICATE

### File: `src/screens/DashboardScreen.js`

Modificate 3 funzioni helper per passare solo `settings?.netCalculation`:

1. **`calculateNetFromGross`** (linea ~50)
2. **`calculateDeductions`** (linea ~58)  
3. **`getDeductionPercentage`** (linea ~67)

**Codice corretto:**
```javascript
const getDeductionPercentage = (grossAmount, settings = null) => {
  if (!grossAmount || grossAmount <= 0) return '0.0';
  const { RealPayslipCalculator } = require('../services/RealPayslipCalculator');
  // ✅ Passa solo la sezione netCalculation delle impostazioni
  const netSettings = settings?.netCalculation || null;
  const calculation = RealPayslipCalculator.calculateNetFromGross(grossAmount, netSettings);
  return (calculation.deductionRate * 100).toFixed(1);
};
```

## 📊 RISULTATO ATTESO

Con la correzione, per un lordo di €2.839,07 (CCNL Metalmeccanico L5):

- **PRIMA:** ~12.4% di trattenute (valore errato)
- **DOPO:** ~32% di trattenute (valore corretto IRPEF reale)
- **Netto atteso:** ~€1.930

## ✅ VERIFICA COMPLETATA

- ✅ Analisi del flusso di calcolo netto
- ✅ Identificazione della causa (passaggio impostazioni)
- ✅ Correzione del codice dashboard  
- ✅ Verifica che altri screen siano corretti (`NetCalculationSettingsScreen.js`)
- ✅ Test logico della correzione
- ✅ Documentazione del fix

## 🚀 PROSSIMI PASSI

1. **Testare l'app reale** per confermare che la percentuale sia ora corretta
2. La dashboard dovrebbe mostrare ~32% di trattenute invece di 12.4%
3. Il calcolo netto dovrebbe essere accurato per il CCNL Metalmeccanico L5

## 📝 NOTE TECNICHE

- Il `RealPayslipCalculator` si aspetta un oggetto con proprietà `method` e `customDeductionRate`
- Le impostazioni complete hanno una struttura nested con sezione `netCalculation`
- Il hook `useSettings` carica correttamente la struttura nidificata
- Solo la dashboard aveva il problema del passaggio impostazioni

---
**Data:** 5 Luglio 2025  
**Status:** ✅ RISOLTO  
**Testato:** Da verificare in app reale
