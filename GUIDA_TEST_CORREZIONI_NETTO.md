# 🧪 GUIDA TEST CORREZIONI IMPOSTAZIONI NETTO

## Problema Risolto
- **PRIMA**: Dashboard mostrava sempre metodo "irpef" e percentuale "32%" anche dopo aver salvato impostazioni personalizzate
- **CAUSA**: NetCalculationSettingsScreen non chiamava `refreshSettings()` dopo il salvataggio
- **SOLUZIONE**: Aggiunto `refreshSettings()` dopo `updateSettings()` + logging dettagliato

## Test da Eseguire

### 📱 TEST 1: Salvataggio Impostazioni Personalizzate
1. **Apri l'app** e vai alla Dashboard
2. **Nota i valori attuali** delle trattenute (dovrebbero essere ~32% o ~12.4%)
3. **Vai a Impostazioni → Calcolo Netto**
4. **Cambia le impostazioni:**
   - Metodo: "Personalizzato"
   - Percentuale: 28%
   - Modalità: "Cifra presente" (se disponibile)
5. **Salva** le impostazioni
6. **Torna alla Dashboard**
7. **Verifica che la percentuale sia cambiata** da 32% a 28%

### 🔍 TEST 2: Persistenza Impostazioni
1. **Dopo il Test 1**, chiudi completamente l'app
2. **Riapri l'app** e vai alla Dashboard
3. **Verifica che mostri ancora 28%** (non 32%)
4. **Vai a Impostazioni → Calcolo Netto**
5. **Verifica che mostri:**
   - Metodo: "Personalizzato" (selezionato)
   - Percentuale: 28%
   - Modalità corretta

### 📊 TEST 3: Logging Console
Durante i test, controlla i log della console per:

#### Al salvataggio:
```
🔧 SALVATAGGIO IMPOSTAZIONI NETTO:
- Metodo: custom
- Percentuale: 28
- Usa cifra presente: true
✅ Salvataggio completato, ricarico impostazioni...
🔄 HOOK - refreshSettings chiamato, ricaricando da database...
🔍 HOOK - loadSettings: Caricamento da database...
🔍 HOOK - loadSettings: Dati caricati dal database
- NetCalculation trovato: {
  "method": "custom",
  "customDeductionRate": 28,
  "useActualAmount": true
}
✅ Impostazioni ricaricate, tutto completato
```

#### Alla dashboard:
```
🔍 DASHBOARD - Impostazioni per calcolo netto:
- Settings disponibili: true
- Metodo utilizzato: custom
- Percentuale utilizzata: 28
- Usa cifra presente: true
```

## ✅ Risultati Attesi

### Test 1 - SUCCESSO se:
- Dashboard mostra nuova percentuale (28% invece di 32%)
- Calcolo netto usa il nuovo metodo
- Non ci sono errori in console

### Test 2 - SUCCESSO se:
- App riaperta mantiene le impostazioni
- Dashboard continua a mostrare 28%
- Schermata impostazioni mostra valori salvati

### Test 3 - SUCCESSO se:
- Log mostrano "NetCalculation trovato" con valori corretti
- Dashboard log mostra "Metodo utilizzato: custom"
- Nessun fallback a valori di default

## ❌ Problemi Possibili

### Se la percentuale rimane 32%:
- Controllare log console per errori di salvataggio
- Verificare che `refreshSettings` sia chiamato
- Controllare che `updateSettings` non fallisca

### Se le impostazioni non sono persistenti:
- Problema di salvataggio nel database
- Controllare log `DatabaseService.setSetting`

### Se i log mostrano "NetCalculation NON trovato":
- Database non sta salvando correttamente
- Problema con la chiave 'appSettings'

## 🔧 Debug Aggiuntivo

Se i test falliscono, eseguire:
```bash
node debug-impostazioni-persistenti.js
```

Questo script aiuterà a identificare dove si interrompe il flusso di salvataggio/caricamento.

## 📝 Note Tecniche

- **useSettings hook**: Ora ha logging dettagliato su loadSettings e refreshSettings
- **NetCalculationSettingsScreen**: Chiama refreshSettings dopo updateSettings
- **Dashboard**: Usa settings.netCalculation con fallback appropriati
- **Backward compatibility**: Mantiene compatibilità con strutture dati precedenti
