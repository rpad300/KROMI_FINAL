# 📱 Onde Encontrar o APK Gerado

## 📂 Localização Padrão

Quando você compila o projeto Android com Gradle, o APK é gerado em:

```
Android APP/app/build/outputs/apk/
```

### Estrutura de Pastas:

```
app/build/outputs/apk/
├── debug/              # Build de debug
│   └── app-debug.apk
│
└── release/            # Build de release (após assinatura)
    └── app-release.apk
```

## 🔍 Para Encontrar o APK

### Via Linha de Comando (PowerShell):

```powershell
# Listar todos os APKs
Get-ChildItem -Path "app\build\outputs\apk" -Recurse -Filter "*.apk"

# Mostrar caminho completo
(Get-ChildItem -Path "app\build\outputs\apk" -Recurse -Filter "*.apk").FullName
```

### Via Android Studio:

1. Vá para a aba **Build Variants** (geralmente no canto inferior esquerdo)
2. Compile o projeto (Build > Make Project ou Ctrl+F9)
3. Depois da compilação, clique com o botão direito no módulo `app`
4. Selecione **Open Module Settings** ou vá para **File > Project Structure**
5. Ou simplesmente navegue até: `app/build/outputs/apk/`

## 📦 Tipos de Build

### Debug APK (Desenvolvimento):
```
app/build/outputs/apk/debug/app-debug.apk
```
- **Características:**
  - Não assinado (pode instalar diretamente)
  - Contém código de debug
  - Permite logcat e debugging
  - Tamanho maior

### Release APK (Produção):
```
app/build/outputs/apk/release/app-release.apk
```
- **Características:**
  - Precisa ser assinado (com keystore)
  - Otimizado e minificado
  - Sem código de debug
  - Tamanho menor
  - Pronto para distribuição

## 🚀 Comandos para Gerar APK

### Debug APK:
```powershell
.\gradlew.bat assembleDebug
```
APK será gerado em: `app/build/outputs/apk/debug/app-debug.apk`

### Release APK:
```powershell
.\gradlew.bat assembleRelease
```
APK será gerado em: `app/build/outputs/apk/release/app-release.apk`

## 📋 Instalação no Dispositivo

### Via ADB (Android Debug Bridge):
```powershell
# Conectar dispositivo via USB com debug USB ativado
# Depois instalar:
adb install app\build\outputs\apk\debug\app-debug.apk
```

### Via Transferência Direta:
1. Copie o arquivo `app-debug.apk` do computador
2. Cole no dispositivo Android
3. Abra o arquivo no dispositivo
4. Permita instalação de fontes desconhecidas se solicitado
5. Instale

## ⚠️ Nota Importante

Se a pasta `build` não existir ou não houver APK, significa que o projeto ainda não foi compilado. Execute:

```powershell
.\gradlew.bat assembleDebug
```

Isso gerará o APK na localização mencionada acima.


