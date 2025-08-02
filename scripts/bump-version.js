// Script Node.js per sincronizzare la versione di app.json con quella di package.json
// Uso: node scripts/bump-version.js

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const packageJsonPath = path.join(__dirname, '../package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
if (appJson.expo.version !== newVersion) {
  appJson.expo.version = newVersion;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`Sincronizzato: app.json versione aggiornata a ${newVersion}`);
} else {
  // Nessuna modifica necessaria
}
