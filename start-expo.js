// start-expo.js
// Avvia Expo con Node.js configurato per usare più memoria (6GB)
process.env.NODE_OPTIONS = "--max_old_space_size=6144";
const { execSync } = require('child_process');
execSync('npx expo start', { stdio: 'inherit' });
