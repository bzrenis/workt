# WorkTracker - Script di Test e Avvio
# Questo script avvia l'app e verifica le correzioni database

Write-Host "🚀 WorkTracker - Database Fix Test" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Yellow

# Verifica prerequisiti
Write-Host "🔍 Verificando prerequisiti..." -ForegroundColor Cyan

# Controlla Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trovato. Installare Node.js prima di continuare." -ForegroundColor Red
    exit 1
}

# Controlla npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm non trovato." -ForegroundColor Red
    exit 1
}

# Controlla se siamo nella directory giusta
if (Test-Path "package.json") {
    Write-Host "✅ Directory progetto trovata" -ForegroundColor Green
} else {
    Write-Host "❌ package.json non trovato. Eseguire script dalla root del progetto." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 CORREZIONI IMPLEMENTATE:" -ForegroundColor Yellow
Write-Host "✅ Loop infinito database SQLite risolto" -ForegroundColor Green
Write-Host "✅ Navigazione post-salvataggio migliorata" -ForegroundColor Green
Write-Host "✅ Sistema monitoraggio salute database" -ForegroundColor Green
Write-Host "✅ Gestione errori robusta con retry limit" -ForegroundColor Green
Write-Host "✅ Throttling operazioni database" -ForegroundColor Green

Write-Host ""
Write-Host "📱 ISTRUZIONI TEST:" -ForegroundColor Yellow
Write-Host "1. Scansiona il QR code con Expo Go" -ForegroundColor White
Write-Host "2. Verifica Dashboard carica senza loop infinito" -ForegroundColor White
Write-Host "3. Test inserimento: TimeEntry → + → Form → Salva → TimeEntry" -ForegroundColor White
Write-Host "4. Verifica Dashboard si aggiorna automaticamente" -ForegroundColor White
Write-Host "5. Test gestione errori: app deve restare responsive" -ForegroundColor White

Write-Host ""
Write-Host "🚀 Avvio del server Expo..." -ForegroundColor Green
Write-Host ""

# Pulisce cache e avvia Expo
try {
    & npx expo start --clear
} catch {
    Write-Host "❌ Errore nell'avvio di Expo. Verifica le dipendenze." -ForegroundColor Red
    Write-Host "Prova: npm install" -ForegroundColor Yellow
    exit 1
}
