# 🚀 Guia Rápido: Gerar APK

## Opção 1: Android Studio (Mais Fácil) ⭐

1. **Abrir Android Studio**
2. **File** → **Open** → Selecionar pasta `Android APP`
3. Aguardar Gradle sincronizar (pode demorar na primeira vez)
4. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
5. APK estará em: `app/build/outputs/apk/debug/app-debug.apk`

## Opção 2: Linha de Comando

### Primeiro: Instalar Gradle ou Usar Android Studio

Se não tiver Android Studio, você precisa:
- **Instalar Android Studio** OU
- **Instalar Gradle standalone** + **Android SDK**

### Com Android Studio instalado (usa Gradle Wrapper):

```powershell
# Windows PowerShell
cd "Android APP"

# Primeira vez: Android Studio cria o gradlew.bat
# Se não existir, abrir o projeto no Android Studio primeiro

# Gerar APK Debug
.\gradlew.bat assembleDebug
```

APK estará em: `app\build\outputs\apk\debug\app-debug.apk`

## ⚠️ IMPORTANTE: Configurar Supabase ANTES

Antes de gerar o APK, edite:

📁 `Android APP/app/src/main/java/com/visionkrono/detection/MainActivity.kt`

```kotlin
private val supabaseUrl = "https://seu-projeto.supabase.co"
private val supabaseServiceKey = "sua_service_role_key"
```

## 📱 Instalar APK

### Via USB (ADB):
```powershell
adb install "app\build\outputs\apk\debug\app-debug.apk"
```

### Via Transferência:
1. Copiar APK para o celular
2. Abrir arquivo no celular
3. Permitir "Instalar de fontes desconhecidas"
4. Instalar

## 🔧 Se não tiver Gradle Wrapper

Se o arquivo `gradlew.bat` não existir:

1. Abrir projeto no Android Studio
2. Android Studio vai criar automaticamente
3. OU instalar Gradle manualmente e usar comando `gradle` direto

## ❓ Problemas?

Ver documentação completa em: **BUILD_INSTRUCTIONS.md**


