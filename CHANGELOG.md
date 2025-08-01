# Changelog - WorkT Tracker Ore Lavoro


## [1.0.4] - 2025-01-16

### 🚀 Nuove funzionalità
- **Backup automatico in background**: ora l'app esegue backup automatici anche in background (solo build native), notificando l'utente ad ogni salvataggio.
- **Informativa privacy aggiornata**: aggiunto file INFORMATIVA_PRIVACY.md con dettagli su trattamento dati e privacy.

### 🐛 Correzioni
- **Fix calcolo MULTI_SHIFT_OPTIMIZED**: Risolto problema calcolo proporzionale per giornate parziali (6.6h ora = 90.94€ invece di 109.34€)
- **Aggiornamento daily rate CCNL**: Corretto da 107.69€ a 110.23€ per conformità METALMECCANICO_PMI_L5
- **Logica modalità viaggio**: Implementazione completa della modalità MULTI_SHIFT_OPTIMIZED con gestione eccedenze

### ✨ Miglioramenti
- **Calcolo proporzionale CCNL**: Per ore < 8h, calcolo preciso: dailyRate × (oreEffettive / 8)
- **Gestione ore eccedenti**: Per ore ≥ 8h, eccedenza pagata come compenso viaggio
- **Validazione matematica**: Verificata correttezza con formula: 110.23€ × (6.6/8) = 90.94€

### 🔧 Modifiche tecniche
- Aggiornato `CalculationService.js` con branch dedicato per MULTI_SHIFT_OPTIMIZED
- Corretti valori in `constants/index.js` per METALMECCANICO_PMI_L5
- Migliorato logging per debug modalità calcolo viaggio

## [1.0.2] - 2025-01-14
### Previous version fixes and improvements

## [1.0.1] - 2025-01-13  
### Initial release improvements

## [1.0.0] - 2025-01-12
### 🎉 Release iniziale
- Tracking ore lavoro con calcolo automatico stipendio CCNL
- Support per contratti Metalmeccanico PMI
- Gestione viaggi, reperibilità, straordinari
- Database SQLite offline-first
- Sistema backup e export
