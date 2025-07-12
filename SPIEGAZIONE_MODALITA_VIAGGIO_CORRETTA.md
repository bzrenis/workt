# 🚗 SPIEGAZIONE DETTAGLIATA MODALITÀ DI CALCOLO ORE VIAGGIO

## Le Tre Modalità di Calcolo delle Ore Viaggio

### 1. **AS_WORK** - "Come ore lavorative"
- **Cosa significa**: Le ore di viaggio vengono trattate ESATTAMENTE come ore di lavoro normale
- **Calcolo**: Viaggio + Lavoro = Ore totali retribuite al 100%
- **Esempio pratico**: 
  - 2h viaggio + 6h lavoro = 8h totali
  - Retribuzione: 8h × €16.41 = €131.28
- **Quando usare**: Quando il contratto prevede che il viaggio sia equiparato al lavoro

### 2. **EXCESS_AS_TRAVEL** - "Eccedenza come retribuzione viaggio" ⭐ (Default)
- **Cosa significa**: Si pagano 8h di giornata normale, le ore eccedenti vengono pagate con tariffa viaggio
- **Calcolo**: 
  - Se (Viaggio + Lavoro) ≥ 8h → Paga giornaliera + eccedenza × tariffa viaggio
  - Se (Viaggio + Lavoro) < 8h → Solo ore effettive × tariffa base
- **Esempio pratico**:
  - **Caso A**: 2h viaggio + 8h lavoro = 10h totali
    - Retribuzione: €109.195 (giornaliera) + 2h × €16.41 × 100% = €142.015
  - **Caso B**: 1h viaggio + 5h lavoro = 6h totali
    - Retribuzione: 6h × €16.41 = €98.46

### 3. **EXCESS_AS_OVERTIME** - "Eccedenza come straordinario"
- **Cosa significa**: Si pagano 8h di giornata normale, le ore eccedenti vengono pagate come straordinario
- **Calcolo**:
  - Se (Viaggio + Lavoro) ≥ 8h → Paga giornaliera + eccedenza × tariffa straordinario
  - Se (Viaggio + Lavoro) < 8h → Solo ore effettive × tariffa base
- **Esempio pratico**:
  - **Caso A**: 2h viaggio + 8h lavoro = 10h totali
    - Retribuzione: €109.195 (giornaliera) + 2h × €19.69 (+20%) = €148.575
  - **Caso B**: 1h viaggio + 5h lavoro = 6h totali
    - Retribuzione: 6h × €16.41 = €98.46

## 💰 Confronto Economico (2h viaggio + 8h lavoro)

| Modalità | Calcolo | Totale |
|----------|---------|--------|
| **AS_WORK** | 10h × €16.41 | **€164.10** |
| **EXCESS_AS_TRAVEL** | €109.195 + 2h × €16.41 | **€142.015** |
| **EXCESS_AS_OVERTIME** | €109.195 + 2h × €19.69 | **€148.575** |

## 📋 Regole Specifiche dal Codice

### Soglia delle 8 Ore
```javascript
const standardWorkDay = getWorkDayHours(); // 8 ore
const totalRegularHours = workHours + travelHours;

if (totalRegularHours >= standardWorkDay) {
  // Paga giornaliera + logica eccedenza
  regularPay = dailyRate; // €109.195
  regularHours = standardWorkDay; // 8h
  const extraHours = totalRegularHours - standardWorkDay;
} else {
  // Paga solo ore effettive
  regularPay = baseRate * totalRegularHours;
  regularHours = totalRegularHours;
}
```

### Gestione Eccedenze
```javascript
if (travelHoursSetting === 'EXCESS_AS_TRAVEL') {
  // Eccedenza pagata come viaggio
  travelPay = extraHours * baseRate * travelCompensationRate;
} else if (travelHoursSetting === 'EXCESS_AS_OVERTIME') {
  // Eccedenza pagata come straordinario
  overtimePay = extraHours * overtimeBonusRate;
}
```

## 🎯 Quale Scegliere?

- **AS_WORK**: Massima retribuzione, ma non sempre conforme ai contratti
- **EXCESS_AS_TRAVEL**: Bilanciamento tra equità e conformità contrattuale (consigliata)
- **EXCESS_AS_OVERTIME**: Buona retribuzione per eccedenze, conforme alla logica straordinari

## ⚙️ Configurazione Attuale
- **Default**: EXCESS_AS_TRAVEL
- **Tariffa viaggio**: 100% della retribuzione oraria (configurabile)
- **Giornata standard**: 8 ore
- **Paga giornaliera CCNL**: €109.195

La modalità **EXCESS_AS_TRAVEL** è quella predefinita perché rappresenta il miglior compromesso tra equità retributiva e aderenza alle logiche contrattuali tipiche del settore metalmeccanico.
