# VisionKrono Detection - Android App

App Android nativa em Kotlin que replica todas as funcionalidades do sistema de detecção web.

## 📋 Funcionalidades

- ✅ **Validação por PIN do dispositivo** - Acesso controlado via PIN
- ✅ **Captura contínua de imagens** - A cada 2 segundos durante detecção ativa
- ✅ **GPS/Localização** - Captura coordenadas junto com cada imagem
- ✅ **Integração com Supabase** - Envio de imagens para buffer, gestão de sessões
- ✅ **CameraX** - Interface moderna de câmera com preview em tempo real
- ✅ **Flash controlável** - Ligar/desligar flash da câmera
- ✅ **Gestão de sessões** - Controle de sessões ativas por dispositivo
- ✅ **UI Moderna** - Jetpack Compose com Material 3

## 🏗️ Arquitetura

O código está **completamente separado** do projeto web:

```
android-app/
├── app/
│   └── src/main/java/com/visionkrono/detection/
│       ├── data/           # Modelos e repositórios
│       ├── domain/          # Lógica de negócio (Camera, Location)
│       ├── ui/              # Telas e ViewModels (Compose)
│       └── MainActivity.kt  # Ponto de entrada
```

## 🚀 Configuração

### 1. Supabase

**IMPORTANTE:** A app usa **Service Role Key** em vez de Anon Key para:
- Acessar lista de eventos sem autenticação
- Identificar dispositivos automaticamente
- Contornar RLS quando necessário

Edite `MainActivity.kt` e configure:

```kotlin
private val supabaseUrl = "https://seu-projeto.supabase.co"
private val supabaseServiceKey = "sua_service_role_key" // NÃO use Anon Key!
```

⚠️ **CUIDADO:** Service Role Key dá acesso completo ao banco. Mantenha segura!

**Ou** configure via `BuildConfig` para maior segurança:

```kotlin
// build.gradle.kts
android {
    buildTypes {
        release {
            buildConfigField("String", "SUPABASE_URL", "\"https://...\"")
            buildConfigField("String", "SUPABASE_KEY", "\"...\"")
        }
    }
}
```

### 2. Permissões

As permissões necessárias já estão no `AndroidManifest.xml`:
- `CAMERA` - Para captura de imagens
- `ACCESS_FINE_LOCATION` - Para GPS preciso
- `ACCESS_COARSE_LOCATION` - Para GPS alternativo
- `FLASHLIGHT` - Para controle do flash

### 3. Deep Links

A app suporta deep links:

```
visionkrono://detection?event=EVENT_ID&device=DEVICE_ID&eventName=EVENT_NAME
```

Ou via Intent extras:
```kotlin
val intent = Intent(context, MainActivity::class.java).apply {
    putExtra("event", eventId)
    putExtra("device", deviceId)
    putExtra("eventName", eventName)
}
```

## 📱 Uso

### Fluxo da Aplicação:

1. **Lista de Eventos**: App mostra eventos disponíveis (carregados do Supabase)
2. **Seleção de Evento**: Usuário seleciona um evento
3. **Identificação de Dispositivo**: App identifica automaticamente o dispositivo (primeiro disponível)
4. **PIN**: Usuário digita PIN do dispositivo para validar acesso
5. **Permissões**: App solicita permissões de câmera e GPS
6. **Detecção**: Usuário inicia detecção
7. **Captura**: App captura imagens a cada 2 segundos e envia para Supabase buffer
8. **Processamento**: Servidor processa imagens em background (como no web)

### Deep Link (Opcional)

Ainda suporta deep link para pular lista de eventos:
```
visionkrono://detection?event=EVENT_ID&device=DEVICE_ID&eventName=EVENT_NAME
```

### Gestão de Sessões

- App cria sessão no Supabase ao validar PIN
- Heartbeat enviado a cada 30 segundos
- Ao encerrar, sessão é marcada como inativa e contador decrementado

## 🔧 Dependências Principais

- **Jetpack Compose** - UI moderna
- **CameraX** - Câmera
- **Supabase Kotlin SDK** - Integração com Supabase
- **Google Play Services Location** - GPS
- **Retrofit** - Networking (se necessário para APIs adicionais)
- **Coroutines** - Programação assíncrona

## 🏃 Build e Execução

```bash
# Build
./gradlew build

# Instalar no dispositivo
./gradlew installDebug

# Executar testes
./gradlew test
```

## 📦 Estrutura do Banco de Dados

A app usa as mesmas tabelas do sistema web:

- `image_buffer` - Buffer de imagens a processar
- `device_sessions` - Sessões ativas de dispositivos
- `event_devices` - Dispositivos configurados por evento
- `devices` - Informações dos dispositivos

## 🔐 Segurança

- PIN do dispositivo validado antes de criar sessão
- Verificação de limite de sessões simultâneas
- Heartbeat para detectar sessões órfãs
- Imagens enviadas como Base64 para Supabase

## 📝 Notas de Implementação

### Captura de Imagem

A captura usa `CameraX` com `ImageCapture`. A implementação atual captura bitmap diretamente. Para produção, considere:

1. Usar `ImageProxy` para melhor performance
2. Processamento de imagem em background thread
3. Compressão otimizada antes de enviar

### Sincronização

- Imagens são enviadas diretamente para `image_buffer`
- Status inicial: `pending`
- Servidor processa em background (como no web)
- App não precisa processar detecção localmente

### Offline Support

Para suporte offline, adicionar:

1. Room Database para cache local
2. Worker para sincronização quando online
3. Queue de imagens pendentes

## 🔄 Diferenças do Web

1. **Navegador vs Nativo**: Performance melhor em Android nativo
2. **Permissões**: Sistema de permissões nativo do Android
3. **Câmera**: CameraX vs MediaStream API (melhor controle)
4. **GPS**: Google Play Services Location vs Geolocation API

## 📄 Licença

MIT License - Mesmo do projeto principal

## 🤝 Contribuição

Este é um módulo separado do projeto principal. Mantenha o código isolado e não compartilhe dependências com o web app.

