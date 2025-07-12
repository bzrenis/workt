# start-expo.ps1
# Avvia Expo con Node.js configurato per usare più memoria (6GB)
$env:NODE_OPTIONS="--max_old_space_size=6144"
npx expo start
