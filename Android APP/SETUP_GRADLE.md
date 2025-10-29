# 🔧 Setup do Gradle Wrapper

O Gradle Wrapper permite executar builds sem ter o Gradle instalado globalmente.

## ⚠️ Importante: Baixar gradle-wrapper.jar

O arquivo `gradlew.bat` precisa do `gradle-wrapper.jar` para funcionar.

### Opção 1: Usar Android Studio (Recomendado)

1. Abra o projeto no Android Studio
2. Android Studio vai criar automaticamente o `gradle-wrapper.jar`
3. Depois você pode usar `gradlew.bat` na linha de comando

### Opção 2: Baixar Manualmente

1. Baixe o Gradle Wrapper JAR:
   - URL: https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar
   - Salve em: `Android APP/gradle/wrapper/gradle-wrapper.jar`

2. OU execute (se tiver curl/wget):
```powershell
# Criar diretório
New-Item -ItemType Directory -Force -Path "gradle\wrapper"

# Baixar wrapper (requer curl ou PowerShell 5+)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar" -OutFile "gradle\wrapper\gradle-wrapper.jar"
```

### Opção 3: Instalar Gradle Globalmente

Se você tem Gradle instalado globalmente:

```powershell
# Verificar se tem Gradle
gradle --version

# Se tiver, use diretamente:
gradle assembleDebug
```

## ✅ Depois de configurar

Depois de ter o `gradle-wrapper.jar`, você pode usar:

```powershell
.\gradlew.bat assembleDebug
```

## 📝 Estrutura Esperada

```
Android APP/
├── gradlew.bat              ✅ (já criado)
├── gradlew                  (Linux/Mac)
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.properties ✅ (já criado)
│       └── gradle-wrapper.jar       ⚠️ (PRECISA BAIXAR)
```


