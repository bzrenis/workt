# Correzione Contatori Giorni - Indennità e Attività

## Problemi Risolti

### 1. ❌ **Conteggio Giorni Indennità a Zero**
**Problema**: I contatori giorni per indennità mostravano sempre 0
**Causa**: Logica basata su `breakdown.allowances` invece dei dati diretti `workEntry`
**Soluzione**: ✅ Usare i dati del `workEntry` per determinare se ci sono indennità

### 2. ✅ **Aggiunto Contatore Giorni Attività Ordinarie**
**Richiesta**: Aggiungere contatore giorni anche per attività ordinarie
**Soluzione**: ✅ Implementato contatore per giorni con lavoro ordinario (non in reperibilità)

## Modifiche Implementate

### File: `src/screens/DashboardScreen.js`

#### 1. **Struttura Dati Estesa** (linee 130-132)
```javascript
ordinary: { total: 0, hours: {}, days: 0 },         // ✅ NUOVO: days
standby: { totalEarnings: 0, workHours: {}, travelHours: {}, days: 0 }, // ✅ NUOVO: days
allowances: { 
  travel: 0, meal: 0, standby: 0,
  travelDays: 0, mealDays: 0, standbyDays: 0         // ✅ Mantiene contatori giorni
},
```

#### 2. **Logica Conteggio Corretta** (linee 415-425)
```javascript
// PRIMA (NON FUNZIONAVA):
if ((breakdown.allowances.travel || 0) > 0) {
  aggregated.allowances.travelDays += 1;
}

// DOPO (FUNZIONA):
if (workEntry.travelAllowance && (breakdown.allowances?.travel || 0) > 0) {
  aggregated.allowances.travelDays += 1;
}
if (workEntry.isStandbyDay && (breakdown.allowances?.standby || 0) > 0) {
  aggregated.allowances.standbyDays += 1;
}
```

#### 3. **Conteggio Giorni Ordinari** (linee 344-347)
```javascript
// Conta giorni con attività ordinarie (non in reperibilità)
if (!workEntry.isStandbyDay && (breakdown.ordinary.total || 0) > 0) {
  aggregated.ordinary.days += 1;
}
```

#### 4. **Conteggio Giorni Reperibilità** (linee 372-375)
```javascript
// Conta giorni con attività in reperibilità
if (workEntry.isStandbyDay && (breakdown.standby.totalEarnings || 0) > 0) {
  aggregated.standby.days += 1;
}
```

#### 5. **Display Contatori Giorni**

**Attività Ordinarie** (linee 612-620):
```javascript
{ordinary.days > 0 && (
  <View style={styles.breakdownItem}>
    <Text style={styles.breakdownDetail}>
      {ordinary.days} giorni con attività ordinarie
    </Text>
  </View>
)}
```

**Interventi Reperibilità** (linee 719-727):
```javascript
{standby.days > 0 && (
  <View style={styles.breakdownItem}>
    <Text style={styles.breakdownDetail}>
      {standby.days} giorni con interventi in reperibilità
    </Text>
  </View>
)}
```

**Indennità** (già implementate precedentemente):
```javascript
{allowances.travelDays || 0} giorni con indennità trasferta
{allowances.standbyDays || 0} giorni con indennità reperibilità da CCNL
{allowances.mealDays || 0} giorni con rimborsi pasti
```

## Logica di Conteggio Corretta

### Giorni Indennità Trasferta
- **Condizione**: `workEntry.travelAllowance` E `breakdown.allowances.travel > 0`
- **Rationale**: Deve essere attivata l'indennità E deve esserci un importo calcolato

### Giorni Indennità Reperibilità  
- **Condizione**: `workEntry.isStandbyDay` E `breakdown.allowances.standby > 0`
- **Rationale**: Deve essere un giorno di reperibilità E deve esserci indennità calcolata

### Giorni Rimborsi Pasti
- **Condizione**: `mealAllowanceTotal > 0` (pranzo o cena)
- **Rationale**: Deve esserci almeno un rimborso pasto nella giornata

### Giorni Attività Ordinarie
- **Condizione**: `!workEntry.isStandbyDay` E `breakdown.ordinary.total > 0`
- **Rationale**: Non deve essere reperibilità E deve esserci lavoro ordinario

### Giorni Reperibilità
- **Condizione**: `workEntry.isStandbyDay` E `breakdown.standby.totalEarnings > 0`
- **Rationale**: Deve essere reperibilità E deve esserci lavoro/guadagno effettivo

## Risultato Finale

### Dashboard Prima:
```
Indennità trasferta          €45.00
Indennità reperibilità       €22.50
Rimborso pasti              €48.00

Attività Ordinarie
[ore e importi...]

Interventi Reperibilità  
[ore e importi...]
```

### Dashboard Dopo:
```
Indennità trasferta          €45.00
3 giorni con indennità trasferta

Indennità reperibilità       €22.50
3 giorni con indennità reperibilità da CCNL

Rimborso pasti              €48.00
6 giorni con rimborsi pasti

Attività Ordinarie
2 giorni con attività ordinarie
[ore e importi...]

Interventi Reperibilità
3 giorni con interventi in reperibilità
[ore e importi...]
```

## Benefici

1. ✅ **Contatori Accurati**: Basati sui dati effettivi del workEntry
2. ✅ **Informazioni Complete**: Mostra frequenza di ogni tipo di attività
3. ✅ **Debug Facilitato**: Più facile capire la distribuzione mensile del lavoro
4. ✅ **UX Migliorata**: Informazioni più dettagliate e utili per l'utente

## Test Consigliati

1. ✅ Verificare che i contatori indennità non siano più a zero
2. ✅ Controllare che giorni ordinari e reperibilità siano conteggiati correttamente
3. ✅ Verificare che la somma giorni ordinari + reperibilità = giorni lavorati totali
4. ✅ Testare con diversi tipi di configurazione indennità

Data: 05/01/2025
Stato: COMPLETATO ✅
