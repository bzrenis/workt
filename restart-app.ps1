# Script per riavviare l'app Expo con cache pulita
Write-Host "Stopping existing Expo processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Starting Expo with clear cache..."
npx expo start --clear
