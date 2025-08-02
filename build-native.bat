@echo off
REM Build nativa parallela WorkT (config: app-native.json)
REM Richiede EAS CLI installato (npm install -g eas-cli)

echo Building APK parallelo...
eas build --platform android --profile production --config app-native.json

echo.
echo Per iOS usa:
echo eas build --platform ios --profile production --config app-native.json
