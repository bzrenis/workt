# 📅 Trattamento del Sabato nel CCNL Metalmeccanico PMI

## 📋 Panoramica Normativa

Nel **CCNL Metalmeccanico PMI** per aziende con orario di lavoro **Lunedì-Venerdì** (40 ore settimanali), il **sabato è considerato giorno di riposo settimanale** e pertanto tutte le ore lavorate sono **straordinarie**.

## ⚖️ Normativa CCNL

### 🏢 Orario Standard
- **Settimana lavorativa**: Lunedì-Venerdì
- **Ore settimanali**: 40 ore (8 ore/giorno)
- **Sabato**: Giorno di riposo settimanale
- **Domenica**: Giorno di riposo settimanale

### 💰 Maggiorazioni Retributive

| Giorno | Tipologia | Maggiorazione | Tariffa Oraria |
|--------|-----------|---------------|----------------|
| Lun-Ven | Ordinario | Base | 16.41€ |
| **Sabato** | **Straordinario** | **+25%** | **20.51€** |
| Domenica | Straordinario | +30% | 21.33€ |
| Festivi | Straordinario | +30% | 21.33€ |

## 🎯 Implementazione nel Sistema

### ✅ Calcolo Ore Lavorate - Sabato

```javascript
// Esempio: 8 ore di lavoro il sabato
const baseRate = 16.41;        // €/h
const saturdayMultiplier = 1.25; // +25%
const hours = 8;

const earnings = hours * baseRate * saturdayMultiplier;
// Risultato: 8 × 16.41 × 1.25 = 164.10€
// vs feriale: 8 × 16.41 = 131.28€ (+32.82€ di maggiorazione)
```

### 🚗 Indennità Trasferta - Sabato

Il **sabato NON è considerato "giorno speciale"** per l'indennità trasferta:

- ✅ **Lunedì-Sabato**: Indennità applicata se presenti le condizioni
- ❌ **Domenica/Festivi**: Indennità NON applicata (salvo toggle "Applica nei giorni speciali")

### 🟡 Reperibilità - Sabato

Il trattamento dipende dalla configurazione aziendale:

#### Opzione 1: "Sabato come giorno lavorativo"
- **Indennità giornaliera**: Tariffa feriale (€7.03 per 24h, €4.22 per 16h)
- **Interventi**: Maggiorazione +25% sulle ore lavorate

#### Opzione 2: "Sabato come giorno di riposo" 
- **Indennità giornaliera**: Tariffa festiva (€10.63 per 24h)
- **Interventi**: Maggiorazione +25% sulle ore lavorate

## 📊 Esempi Pratici

### 💼 Scenario 1: Giornata Sabato Completa
```
Lavoro: 8 ore il sabato
• Tariffa base: 16.41€/h
• Maggiorazione: +25%
• Totale: 8h × 16.41€ × 1.25 = 164.10€
• Bonus sabato: +32.82€ rispetto al feriale
```

### 🚛 Scenario 2: Sabato con Trasferta
```
Lavoro: 8 ore + 2 ore viaggio
• Ore lavoro: 8h × 20.51€ = 164.10€
• Ore viaggio: 2h × 20.51€ = 41.02€  
• Indennità trasferta: 15.00€ ✅ (applicata)
• Totale: 220.12€
```

### 📱 Scenario 3: Reperibilità Sabato
```
Reperibilità + intervento 2 ore
• Indennità giornaliera: 7.03€ (se lavorativo) o 10.63€ (se riposo)
• Intervento: 2h × 20.51€ = 41.02€
• Totale: 48.05€ o 51.65€
```

## 🔧 Configurazione Consigliata

### ⚙️ Per la Maggior Parte delle Aziende
1. **Maggiorazione sabato**: ✅ +25% (già configurata)
2. **Indennità trasferta**: ✅ Applicata normalmente
3. **Reperibilità sabato**: Configurabile come "lavorativo" o "riposo"

### 📝 Impostazioni nel Sistema
```javascript
overtimeRates: {
  saturday: 1.25, // +25% conforme CCNL
}
travelAllowance: {
  applyOnSpecialDays: false, // Sabato NON è speciale
}
standbySettings: {
  saturdayAsRest: false, // true se sabato = riposo
}
```

## ⚠️ Note Importanti

1. **Normativa di riferimento**: CCNL Metalmeccanico PMI per orario Lun-Ven
2. **Accordi aziendali**: Possono prevedere condizioni migliorative
3. **Sabato lavorativo**: Se l'azienda adotta orario Lun-Sab, il sabato diventa ordinario
4. **Indennità trasferta**: Sabato è sempre considerato giorno normale
5. **Reperibilità**: Configurazione aziendale determina se sabato = lavorativo o riposo

## 🎯 Conformità CCNL

✅ **Il sistema implementa correttamente**:
- Maggiorazione +25% per lavoro sabato
- Sabato NON speciale per indennità trasferta  
- Configurabilità reperibilità sabato
- Differenziazione vs domenica/festivi (+30%)

Il trattamento del sabato è **conforme al CCNL Metalmeccanico PMI** per aziende con settimana lavorativa Lunedì-Venerdì.
