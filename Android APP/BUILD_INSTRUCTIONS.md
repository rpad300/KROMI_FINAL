# 📱 Como Gerar o APK - VisionKrono Detection

Este guia explica como compilar e gerar o APK da aplicação Android.

## 📋 Pré-requisitos

1. **Android Studio** instalado (recomendado)
   - Download: https://developer.android.com/studio
   - Ou usar apenas Android SDK + Gradle

2. **Java JDK 17** instalado
   - Verificar: `java -version`
   - Se não tiver, instalar: https://www.oracle.com/java/technologies/downloads/

3. **Android SDK** configurado
   - Via Android Studio (recomendado)
   - Ou instalar manualmente

## 🚀 Método 1: Via Android Studio (Mais Fácil)

1. **Abrir o projeto:**
   ```bash
   # Na raiz do projeto visionkrono
   # Abrir Android Studio e selecionar a pasta "Android APP"
   ```

2. **Configurar o projeto:**
   - Android Studio irá baixar dependências automaticamente
   - Aguardar sincronização do Gradle

3. **Configurar Supabase (IMPORTANTE!):**
   - Abrir `app/src/main/java/com/visionkrono/detection/MainActivity.kt`
   - Editar:
     ```kotlin
     private val supabaseUrl = "https://seu-projeto.supabase.co"
     private val supabaseServiceKey = "sua_service_role_key"
     ```

4. **Gerar APK Debug:**
   - Menu: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Ou usar o Gradle: `Build` → `Make Project` (Ctrl+F9)

5. **Localização do APK:**
   - Debug: `Android APP/app/build/outputs/apk/debug/app-debug.apk`

6. **Gerar APK Release:**
   - Menu: `Build` → `Generate Signed Bundle / APK`
   - Seguir wizard para criar keystore ou usar existente
   - APK estará em: `Android APP/app/build/outputs/apk/release/app-release.apk`

## 🛠️ Método 2: Via Linha de Comando (Gradle)

### Windows (PowerShell)

```powershell
# 1. Navegar para pasta do projeto
cd "C:\Users\rdias\Documents\GitHub\visionkrono\Android APP"

# 2. Verificar se tem Gradle Wrapper
.\gradlew.bat --version

# 3. Gerar APK Debug
.\gradlew.bat assembleDebug

# 4. Gerar APK Release (requer keystore configurado)
.\gradlew.bat assembleRelease
```

### Linux/Mac

```bash
# 1. Navegar para pasta do projeto
cd Android\ APP/

# 2. Dar permissão de execução ao Gradle Wrapper (se necessário)
chmod +x gradlew

# 3. Gerar APK Debug
./gradlew assembleDebug

# 4. Gerar APK Release
./gradlew assembleRelease
```

## 📦 APK Debug vs Release

### APK Debug (`app-debug.apk`)
- ✅ Mais rápido de gerar
- ✅ Não requer assinatura
- ✅ Permite debug
- ❌ Maior tamanho (não otimizado)
- ❌ Não pode instalar em dispositivos sem modo desenvolvedor

**Localização:** `Android APP/app/build/outputs/apk/debug/`

### APK Release (`app-release.apk`)
- ✅ Otimizado e menor
- ✅ Pronto para distribuição
- ✅ Requer keystore para assinar
- ❌ Processo mais complexo

**Localização:** `Android APP/app/build/outputs/apk/release/`

## 🔐 Gerar APK Release Assinado

### Criar Keystore (primeira vez)

```bash
# Windows
cd "Android APP"
keytool -genkey -v -keystore visionkrono-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias visionkrono

# Linux/Mac
cd Android\ APP/
keytool -genkey -v -keystore visionkrono-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias visionkrono
```

Seguir as instruções para criar o keystore (senha, informações, etc.)

### Configurar build.gradle.kts

Adicionar ao final de `Android APP/app/build.gradle.kts`:

```kotlin
android {
    // ... código existente ...
    
    signingConfigs {
        create("release") {
            storeFile = file("../visionkrono-release-key.jks")
            storePassword = "SUA_SENHA_DO_KEYSTORE"
            keyAlias = "visionkrono"
            keyPassword = "SUA_SENHA_DO_KEY"
        }
    }
    
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

**⚠️ IMPORTANTE:** 
- NÃO commitar o keystore no Git!
- Adicionar ao `.gitignore`: `Android APP/*.jks`
- Guardar o keystore em local seguro (perda = impossível atualizar app)

### Gerar APK Release

```bash
# Windows
.\gradlew.bat assembleRelease

# Linux/Mac
./gradlew assembleRelease
```

## 📱 Instalar APK no Dispositivo

### Via USB (ADB)

```bash
# 1. Conectar dispositivo via USB
# 2. Ativar "Depuração USB" nas opções de desenvolvedor
# 3. Instalar

# Windows
adb install "app\build\outputs\apk\debug\app-debug.apk"

# Linux/Mac
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via Transferência de Arquivo

1. Copiar APK para o dispositivo
2. Abrir no dispositivo
3. Permitir "Instalar de fontes desconhecidas" se necessário
4. Instalar

## 🔍 Verificar APK Gerado

```bash
# Listar conteúdo do APK
unzip -l app-debug.apk

# Ver informações do APK
aapt dump badging app-debug.apk
```

## 🐛 Problemas Comuns

### Erro: "SDK location not found"
**Solução:** Criar arquivo `Android APP/local.properties`:
```properties
sdk.dir=C\:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```
(Windows) ou
```properties
sdk.dir=/home/USUARIO/Android/Sdk
```
(Linux/Mac)

### Erro: "Gradle sync failed"
**Solução:**
```bash
cd "Android APP"
.\gradlew.bat clean
.\gradlew.bat build --refresh-dependencies
```

### Erro: "Could not resolve dependencies"
**Solução:**
- Verificar conexão com internet
- Verificar se URLs do Maven estão corretas em `settings.gradle.kts`
- Limpar cache: `.\gradlew.bat clean --refresh-dependencies`

### APK muito grande
**Solução:**
- Usar `assembleRelease` em vez de `assembleDebug`
- Configurar ProGuard para minificação
- Remover recursos não utilizados

## 📝 Checklist Antes de Gerar Release

- [ ] Configurar `supabaseUrl` e `supabaseServiceKey` no MainActivity.kt
- [ ] Testar app no dispositivo/emulador
- [ ] Verificar se todas as funcionalidades funcionam
- [ ] Criar keystore para assinatura
- [ ] Configurar build.gradle.kts com signing
- [ ] Gerar APK release
- [ ] Testar APK release instalado
- [ ] Verificar tamanho do APK
- [ ] Adicionar keystore ao .gitignore

## 🎯 Comandos Rápidos

```bash
# Limpar build anterior
.\gradlew.bat clean

# Build debug
.\gradlew.bat assembleDebug

# Build release
.\gradlew.bat assembleRelease

# Instalar no dispositivo conectado
adb install app\build\outputs\apk\debug\app-debug.apk

# Verificar dispositivo conectado
adb devices
```

## 📚 Recursos Adicionais

- [Documentação Android](https://developer.android.com/studio/build)
- [Assinar sua app](https://developer.android.com/studio/publish/app-signing)
- [Otimizar APK](https://developer.android.com/topic/performance/reduce-apk-size)


