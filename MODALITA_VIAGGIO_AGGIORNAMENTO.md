# 🚗 SPIEGAZIONE AGGIORNATA MODALITÀ DI CALCOLO ORE VIAGGIO

## Le Quattro Modalità di Calcolo delle Ore Viaggio (AGGIORNAMENTO)

### 1. **AS_WORK** - "Come ore lavorative"
**Cosa significa**: Le ore di viaggio vengono trattate ESATTAMENTE come ore di lavoro normale

- **Calcolo**: Viaggio + Lavoro = Ore totali retribuite al 100%
- **Esempio**: 2h viaggio + 6h lavoro = 8h × €16.41 = **€131.28**

### 2. **TRAVEL_SEPARATE** - "Viaggio con tariffa separata" ⭐ (Default attuale)
**Cosa significa**: Il viaggio viene SEMPRE pagato separatamente con tariffa viaggio, indipendentemente dalle ore totali

- **Calcolo**: 
  - Viaggio → Sempre con tariffa viaggio (100% oraria)
  - Lavoro → Se ≥8h diaria, altrimenti ore effettive + straordinari se >8h
- **Esempi**:
  - 2h viaggio + 6h lavoro = 6h × €16.41 + 2h × €16.41 = **€131.28**
  - 2h viaggio + 10h lavoro = €109.195 (diaria) + 2h × €19.69 (straordinari) + 2h × €16.41 (viaggio) = **€181.775**

### 3. **EXCESS_AS_TRAVEL** - "Eccedenza come retribuzione viaggio"
**Cosa significa**: Si pagano 8h di giornata normale, le ore eccedenti vengono pagate con tariffa viaggio

- **Calcolo**: Se (Viaggio + Lavoro) ≥ 8h → Diaria + eccedenza × tariffa viaggio
- **Esempio**: 2h viaggio + 8h lavoro = €109.195 + 2h × €16.41 = **€142.015**

### 4. **EXCESS_AS_OVERTIME** - "Eccedenza come straordinario"
**Cosa significa**: Si pagano 8h di giornata normale, le ore eccedenti vengono pagate come straordinario

- **Calcolo**: Se (Viaggio + Lavoro) ≥ 8h → Diaria + eccedenza × tariffa straordinario
- **Esempio**: 2h viaggio + 8h lavoro = €109.195 + 2h × €19.69 = **€148.575**

## 💰 Confronto Economico

### Scenario 1: 2h viaggio + 8h lavoro
| Modalità | Calcolo | Totale |
|----------|---------|--------|
| **AS_WORK** | 10h × €16.41 | **€164.10** |
| **TRAVEL_SEPARATE** ⭐ | €109.195 + 2h × €16.41 | **€142.015** |
| **EXCESS_AS_TRAVEL** | €109.195 + 2h × €16.41 | **€142.015** |
| **EXCESS_AS_OVERTIME** | €109.195 + 2h × €19.69 | **€148.575** |

### Scenario 2: 2h viaggio + 10h lavoro
| Modalità | Calcolo | Totale |
|----------|---------|--------|
| **AS_WORK** | 12h × €16.41 | **€196.92** |
| **TRAVEL_SEPARATE** ⭐ | €109.195 + 2h × €19.69 + 2h × €16.41 | **€181.775** |
| **EXCESS_AS_TRAVEL** | €109.195 + 4h × €16.41 | **€174.835** |
| **EXCESS_AS_OVERTIME** | €109.195 + 4h × €19.69 | **€187.955** |

## 🎯 Differenza Chiave: TRAVEL_SEPARATE vs altre modalità

**TRAVEL_SEPARATE** è l'unica che tratta il viaggio come completamente separato:
- Il viaggio ha SEMPRE la sua tariffa dedicata (configurabile)
- Il lavoro segue le sue normali regole (diaria se ≥8h, straordinari se >8h)
- È la modalità più flessibile e intuitiva

**Le altre modalità** sommano viaggio + lavoro e poi applicano logiche di soglia.

## ⚙️ Configurazione Attuale
- **Default**: `TRAVEL_SEPARATE` (già implementata!)
- **Tariffa viaggio**: 100% della retribuzione oraria (configurabile all'80%, 90%, 120%, ecc.)
- **Accesso**: Menu → Impostazioni → Ore di Viaggio

**La modalità che desideravi è già quella predefinita dell'app!** 🎉
