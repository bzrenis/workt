# Guida Completa: Build APK WorkT v1.0.0

Questa guida ti permetterà di creare un APK installabile della tua app WorkT.

## 🚀 Opzioni di Build

### Opzione 1: Build EAS (Raccomandato)
Utilizza i server Expo per creare build professionali.

#### Prerequisiti
1. Account Expo gratuito
2. EAS CLI installato (`npm install -g eas-cli`)

#### Procedura
```bash
# 1. Login a EAS
eas login

# 2. Configura il progetto (se non fatto)
eas build:configure

# 3. Build APK per installazione diretta
eas build --platform android --profile production

# 4. Scarica l'APK quando pronto
```

### Opzione 2: Build Locale con Turtle CLI (Alternativo)
```bash
# 1. Installa Turtle CLI
npm install -g @expo/turtle-cli

# 2. Build locale
turtle build:android --keystore-path ./android.jks --keystore-alias alias_name
```

### Opzione 3: Expo Development Build (Per Testing)
```bash
# 1. Installa dev client
npx expo install expo-dev-client

# 2. Build development
eas build --profile development --platform android

# 3. Installa e testa
```

## 📱 Configurazione Completa

### 1. Generazione Keystore Android (Opzionale)
```bash
# Genera keystore per firma APK
keytool -genkey -v -keystore workt-release-key.keystore -alias workt -keyalg RSA -keysize 2048 -validity 10000

# Informazioni suggerite:
# - First and Last Name: WorkT
# - Organizational Unit: Development
# - Organization: Your Company
# - City: Your City
# - State: Your State
# - Country Code: IT
```

### 2. File eas.json Ottimizzato
Il nostro file è già configurato con:
- Build APK per installazione diretta
- Build AAB per Google Play Store
- Configurazioni di sviluppo e preview

### 3. App.json Ottimizzato
Il nostro file include:
- Metadati completi dell'app
- Permessi Android necessari
- Configurazione icone e splash screen
- Plugin necessari

## 🔧 Processo di Build Completo

### Step 1: Preparazione
```bash
# Verifica che tutto sia installato
npm install
expo doctor

# Test locale
npx expo start
```

### Step 2: Build Produzione
```bash
# Login (una sola volta)
eas login

# Inizializza progetto EAS (se necessario)
eas build:configure

# Build APK
eas build --platform android --profile production

# Monitora il build
eas build:list
```

### Step 3: Download e Installazione
1. Scarica l'APK dal link fornito
2. Trasferisci sul dispositivo Android
3. Abilita "Sorgenti sconosciute" nelle impostazioni
4. Installa l'APK

## 📋 Checklist Pre-Build

### ✅ Configurazione
- [ ] Account Expo configurato
- [ ] EAS CLI installato
- [ ] File app.json aggiornato
- [ ] File eas.json configurato
- [ ] Dipendenze installate

### ✅ Test
- [ ] App funziona in sviluppo
- [ ] Database si inizializza correttamente
- [ ] Backup/ripristino funziona
- [ ] Calcoli CCNL corretti
- [ ] UI responsive su diversi schermi

### ✅ Assets
- [ ] Icona app (512x512)
- [ ] Splash screen
- [ ] Icona adattiva Android
- [ ] Favicon per web

## 🚀 Build Automatico con GitHub Actions (Bonus)

Crea `.github/workflows/build.yml`:
```yaml
name: Build APK
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm install -g eas-cli
      - run: eas build --platform android --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## 📦 Distribuzione

### Per Testing Interno
1. **Build Preview**: `eas build --profile preview`
2. **Condivisione**: Link diretto o QR code
3. **Installazione**: APK diretto

### Per Produzione
1. **Build Production**: `eas build --profile production`
2. **Google Play Store**: AAB upload
3. **Distribuzione Diretta**: APK sideload

## 🔍 Troubleshooting

### Errori Comuni

#### "Build failed: Android build"
```bash
# Verifica configurazione
eas build:configure --platform android

# Controlla log
eas build:list --limit 1
```

#### "Keystore not found"
```bash
# Genera nuovo keystore
eas credentials:configure
```

#### "Module not found"
```bash
# Reinstalla dipendenze
rm -rf node_modules package-lock.json
npm install
```

### Logs e Debug
```bash
# Visualizza log build
eas build:view [BUILD_ID]

# Lista builds
eas build:list --limit 10

# Cancella build fallite
eas build:cancel [BUILD_ID]
```

## 📱 Installazione su Dispositivo

### Metodo 1: Download Diretto
1. Apri il link del build su Android
2. Scarica l'APK
3. Installa dalla cartella Download

### Metodo 2: QR Code
1. Usa l'app Expo Go per scansionare
2. Download automatico
3. Installazione guidata

### Metodo 3: ADB (Per Sviluppatori)
```bash
# Installa via ADB
adb install workt-v1.0.0.apk

# Verifica installazione
adb shell pm list packages | grep workt
```

## 🏷️ Versioning e Release

### Aggiornamento Versione
1. Modifica `version` in `app.json`
2. Commit modifiche
3. Tag release: `git tag v1.0.1`
4. Build nuova versione

### Note di Release
- Documenta nuove funzionalità
- Lista bug fix
- Istruzioni di migrazione
- Breaking changes

## 📊 Metriche Build

### Dimensioni Tipiche
- APK base: ~25-30 MB
- APK con assets: ~35-45 MB
- AAB Google Play: ~20-25 MB

### Tempi Build
- Build EAS: 5-15 minuti
- Build locale: 10-30 minuti
- Re-build (cache): 2-5 minuti

---

## 🎯 Build Rapido (TL;DR)

Per chi ha fretta:
```bash
# Setup una tantum
npm install -g eas-cli
eas login

# Build APK
eas build --platform android --profile production

# Attendi notifica email con link download
# Installa APK su Android
```

**Tempo totale**: 10-15 minuti + tempo di build (5-15 min)

---

Segui questa guida passo per passo per ottenere la tua app WorkT v1.0.0 installabile su Android! 🚀
