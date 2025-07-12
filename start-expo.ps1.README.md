# Avvio Expo con memoria aumentata

Per evitare crash dovuti a limiti di memoria di Node.js/Expo, usa questo script per avviare Expo con 6GB di RAM (puoi aumentare o diminuire il valore in base alla RAM disponibile sul tuo PC).

## Windows PowerShell

Apri PowerShell nella cartella del progetto e lancia:

$env:NODE_OPTIONS="--max_old_space_size=6144"
npx expo start

## Script automatico (PowerShell)

Puoi usare lo script qui sotto per avviare Expo con la variabile già impostata:

```powershell
# start-expo.ps1
$env:NODE_OPTIONS="--max_old_space_size=6144"
npx expo start
```

Salva questo file come `start-expo.ps1` nella root del progetto. Per avviare Expo:

```powershell
./start-expo.ps1
```

## Script automatico (JavaScript)

Se preferisci uno script Node.js/JavaScript per avviare Expo con la variabile impostata:

```js
// start-expo.js
process.env.NODE_OPTIONS = "--max_old_space_size=6144";
const { execSync } = require('child_process');
execSync('npx expo start', { stdio: 'inherit' });
```

Esegui con:

```powershell
node start-expo.js
```

---

Se vuoi cambiare la quantità di RAM, modifica il valore di `6144` (es: `4096` per 4GB, `8192` per 8GB).
