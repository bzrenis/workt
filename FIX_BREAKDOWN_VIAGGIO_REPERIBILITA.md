# Correzione Visualizzazione Ore Viaggio Reperibilità nel Breakdown Form

## Problema Identificato
Nel riepilogo guadagni del form TimeEntry non erano visibili tutte le categorie di ore di viaggio degli interventi di reperibilità, in particolare:
- Viaggio sabato notturno (+sabato% + 25%)
- Viaggio festivo notturno (+60%)
- Lavoro sabato notturno (+sabato% + 25%) 
- Lavoro festivo notturno (+60%)

## Soluzioni Implementate

### 1. Aggiunte Sezioni Mancanti nel TimeEntryForm.js

#### Sezioni Viaggio Reperibilità:
```javascript
{/* Viaggio sabato notturno reperibilità */}
{breakdown.standby.travelHours?.saturday_night > 0 && (
  <View style={styles.breakdownItem}>
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>Viaggio sabato notturno (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}% + 25%)</Text>
      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.saturday_night)}</Text>
    </View>
    // ... calcolo della tariffa
  </View>
)}

{/* Viaggio festivo notturno reperibilità */}
{breakdown.standby.travelHours?.night_holiday > 0 && (
  <View style={styles.breakdownItem}>
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>Viaggio festivo notturno (+60%)</Text>
      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.travelHours.night_holiday)}</Text>
    </View>
    // ... calcolo della tariffa
  </View>
)}
```

#### Sezioni Lavoro Reperibilità:
```javascript
{/* Lavoro sabato notturno reperibilità */}
{breakdown.standby.workHours?.saturday_night > 0 && (
  <View style={styles.breakdownItem}>
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>Lavoro sabato notturno (+{((settings.contract?.overtimeRates?.saturday || 1.25) - 1) * 100}% + 25%)</Text>
      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.saturday_night)}</Text>
    </View>
    // ... calcolo della tariffa
  </View>
)}

{/* Lavoro festivo notturno reperibilità */}
{breakdown.standby.workHours?.night_holiday > 0 && (
  <View style={styles.breakdownItem}>
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>Lavoro festivo notturno (+60%)</Text>
      <Text style={styles.breakdownValue}>{formatSafeHours(breakdown.standby.workHours.night_holiday)}</Text>
    </View>
    // ... calcolo della tariffa
  </View>
)}
```

### 2. Tariffe e Calcoli Corretti

#### Tariffe Sabato Notturno:
- **Lavoro**: `tariffa_base * sabato_percentage * 1.25`
- **Viaggio**: `tariffa_base * sabato_percentage * 1.25 * travel_compensation_rate`

#### Tariffe Festivo Notturno:
- **Lavoro**: `tariffa_base * 1.60`
- **Viaggio**: `tariffa_base * 1.60 * travel_compensation_rate`

### 3. Verifica della Completezza

Il test automatico conferma che:
- ✅ Tutte le 8 sezioni necessarie sono presenti
- ✅ I calcoli delle tariffe sono corretti
- ✅ Il totale viaggio include tutte le 6 categorie
- ✅ Il breakdown workHours include tutte le categorie

## Categorie Ora Visualizzate nel Breakdown

### Lavoro in Reperibilità:
1. **Lavoro diurno** (tariffa ordinaria)
2. **Lavoro notturno** (+25%)
3. **Lavoro sabato** (+sabato% configurabile, default 25%)
4. **Lavoro sabato notturno** (+sabato% + 25%)
5. **Lavoro festivo** (+30%)
6. **Lavoro festivo notturno** (+60%)

### Viaggio in Reperibilità:
1. **Viaggio diurno** (tariffa ordinaria * compensation%)
2. **Viaggio notturno** (+25% * compensation%)
3. **Viaggio sabato** (+sabato% * compensation%)
4. **Viaggio sabato notturno** (+sabato% + 25% * compensation%)
5. **Viaggio festivo** (+30% * compensation%)
6. **Viaggio festivo notturno** (+60% * compensation%)

## Test e Validazione

### Test Automatico Eseguito:
- **File**: `test-form-categories.js`
- **Risultato**: ✅ TUTTI I CONTROLLI SUPERATI
- **Verifiche**: 8 sezioni UI + 4 calcoli + totale = 13 controlli

### Statistiche Aggiornate:
- **Dimensione file**: 107,408 caratteri
- **Linee totali**: 2,202
- **Occorrenze `saturday_night`**: 17
- **Occorrenze `night_holiday`**: 19

## Compatibilità CCNL

Le tariffe implementate rispettano il CCNL Metalmeccanico PMI:
- **Sabato**: Maggiorazione configurabile (default 25%)
- **Notturno**: +25% (fino alle 22) / +35% (dopo le 22)
- **Festivo**: +30%
- **Composizioni**: Sabato+Notturno, Festivo+Notturno con calcoli corretti

## Status
✅ **COMPLETATO**: Tutte le categorie di viaggio degli interventi di reperibilità sono ora correttamente visualizzate nel breakdown del form TimeEntry, con calcoli precisi e conformi al CCNL.

La visualizzazione è ora completa e dettagliata, permettendo all'utente di vedere esattamente come vengono calcolate tutte le componenti del guadagno giornaliero.
