# 🧪 Test Debug Modalità Viaggio

## Come testare le modalità di calcolo viaggio

### Test 1: Inserire ore di viaggio
1. Apri il form di inserimento orario
2. Inserisci questi dati di test:
   - **Partenza azienda**: 08:00
   - **Arrivo cantiere**: 09:00  
   - **Inizio lavoro 1**: 09:00
   - **Fine lavoro 1**: 17:00
   - **Partenza ritorno**: 17:00
   - **Arrivo azienda**: 18:00

### Test 2: Verificare calcoli diversi
Con i dati sopra dovresti avere:
- **Ore viaggio**: 2h (1h andata + 1h ritorno)
- **Ore lavoro**: 8h
- **Totale**: 10h

### Test 3: Cambiare modalità viaggio
1. Vai in **Menu → Impostazioni → Ore di Viaggio**
2. Prova le diverse modalità:
   - **TRAVEL_SEPARATE** (default): Viaggio separato
   - **AS_WORK**: Viaggio come lavoro
   - **EXCESS_AS_TRAVEL**: Eccedenza come viaggio
   - **EXCESS_AS_OVERTIME**: Eccedenza come straordinario

### Risultati attesi:

#### TRAVEL_SEPARATE (2h viaggio + 8h lavoro):
- Diaria: €109.195 (per le 8h di lavoro)
- Viaggio: 2h × €16.41 = €32.82
- **Totale: €142.015**

#### AS_WORK (10h totali come lavoro):
- 10h × €16.41 = **€164.10**

#### EXCESS_AS_TRAVEL (8h giornaliera + 2h eccedenza viaggio):
- Diaria: €109.195
- Eccedenza: 2h × €16.41 = €32.82
- **Totale: €142.015**

#### EXCESS_AS_OVERTIME (8h giornaliera + 2h straordinario):
- Diaria: €109.195
- Straordinario: 2h × €19.69 = €39.38
- **Totale: €148.575**

### Log da controllare nella console:
```
DEBUG impostazioni viaggio: {
  travelHoursSetting: "TRAVEL_SEPARATE",
  travelCompensationRate: 1.0,
  workHours: 8,
  travelHours: 2
}
```

Se non vedi differenze nei calcoli, il problema è nella lettura delle impostazioni o nel calcolo stesso.
