# 📱 Native App - Sistema de Recolha de Dados Simplificado

## 🎯 Visão Geral

**A app nativa apenas recolhe dados** e envia tudo para uma **tabela única**.

Um **serviço backend** processa essa tabela e decide automaticamente:
- ✅ **Se tem dorsal** → Cria detecção diretamente (seguindo todas as regras)
- 📸 **Se não tem dorsal** → Envia para `image_buffer` para processamento por IA

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│  App Nativa     │
│                 │
│  1. Escaneia    │
│     QR Code     │
│                 │
│  2. Captura     │
│     Imagem      │
│                 │
│  3. Tenta ler   │
│     dorsal      │
│                 │
│  4. Envia TUDO  │
│     para        │
│     device_     │
│     detections  │
└────────┬────────┘
         │
         │ save_device_detection()
         │
         ▼
┌─────────────────┐
│ device_         │
│ detections      │
│                 │
│ - Com dorsal    │
│ - Sem dorsal    │
│ - Imagem        │
│ - GPS           │
│ - Metadata      │
└────────┬────────┘
         │
         │ Serviço Backend processa
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐     ┌──────────┐     ┌──────────┐
    │ Se tem  │     │ Se não   │     │ Se erro  │
    │ dorsal  │     │ tem      │     │           │
    │         │     │ dorsal   │     │           │
    └────┬────┘     └────┬─────┘     └────┬─────┘
         │               │                 │
         ▼               ▼                 ▼
    ┌─────────┐     ┌──────────┐     ┌──────────┐
    │detections│     │image_     │     │  Falha   │
    │         │     │buffer     │     │           │
    │         │     │           │     │           │
    │ Cria    │     │ Aguarda   │     │ Log de   │
    │ classifi│     │ processar │     │ erro     │
    │ cação   │     │ por IA    │     │           │
    │ auto    │     │           │     │           │
    └─────────┘     └───────────┘     └───────────┘
```

---

## 📋 Tabela: `device_detections`

Esta é a tabela única que recebe **todos os dados** da app nativa.

### Estrutura

```sql
device_detections
├── id (UUID)                    -- ID único
├── created_at                   -- Quando foi criado
├── access_code (VARCHAR(6))      -- QR code do dispositivo
├── session_id                   -- Sessão da app
├── dorsal_number (INTEGER)       -- NULL se não leu, INTEGER se leu ✅
├── image_data (TEXT)            -- Base64 (70% quality) - SEMPRE presente
├── display_image (TEXT)         -- Base64 (90% quality) - opcional
├── image_metadata (JSONB)        -- Metadados da imagem
├── latitude, longitude, accuracy -- GPS
├── captured_at                  -- Timestamp da captura
├── status                       -- pending, processing, processed, failed
├── processed_at                  -- Quando foi processado
├── processing_result (JSONB)    -- Resultado do processamento
├── processing_error (TEXT)      -- Erro se falhar
├── detection_id (UUID)          -- Se foi para detections
├── buffer_id (UUID)             -- Se foi para image_buffer
└── [cache de device info]       -- Preenchido pelo serviço
```

### Campos Importantes

- **`dorsal_number`**: 
  - `NULL` = app não conseguiu ler → vai para buffer
  - `INTEGER` = app leu → vai direto para detections

- **`image_data`**: Sempre presente, mesmo quando leu dorsal (prova)

- **`status`**: 
  - `pending` = aguardando processamento
  - `processing` = sendo processado
  - `processed` = processado com sucesso
  - `failed` = falhou

---

## ⚠️ Campos Obrigatórios

Quando a app envia dados, **DEVE sempre incluir**:

- ✅ **`p_image_data`**: Imagem em Base64 (sempre presente)
- ✅ **`p_latitude`**: GPS Latitude (-90 a 90) - **OBRIGATÓRIO**
- ✅ **`p_longitude`**: GPS Longitude (-180 a 180) - **OBRIGATÓRIO**
- ✅ **`p_captured_at`**: Timestamp ISO da captura - **OBRIGATÓRIO**

Opicionais:
- `p_dorsal_number`: Dorsal lido (NULL se não leu)
- `p_display_image`: Imagem alta qualidade
- `p_accuracy`: Precisão do GPS em metros

---

## 📱 App Nativa: Implementação

### Função Única: `save_device_detection()`

A app nativa **apenas chama esta função** com todos os dados:

```kotlin
// Depois de capturar imagem e tentar ler dorsal
// ⚠️ GPS e TIMESTAMP são OBRIGATÓRIOS!
val result = supabase.rpc("save_device_detection") {
    set("p_access_code", qrCode)           // QR code escaneado
    set("p_session_id", sessionId)
    set("p_dorsal_number", dorsalNumber)    // Pode ser NULL
    set("p_image_data", base64LowQuality)   // SEMPRE presente
    set("p_display_image", base64HighQuality) // Opcional
    set("p_image_metadata", jsonMetadata)  // {"width": 1920, ...}
    set("p_latitude", currentLatitude)      // ⚠️ OBRIGATÓRIO (-90 a 90)
    set("p_longitude", currentLongitude)    // ⚠️ OBRIGATÓRIO (-180 a 180)
    set("p_accuracy", gpsAccuracy)          // Opcional (precisão em metros)
    set("p_captured_at", capturedTimestamp) // ⚠️ OBRIGATÓRIO (ISO timestamp)
}.decodeSingle<SaveResponse>()

if (result.success) {
    // ✅ Dados enviados com sucesso
    // O serviço backend vai processar depois
} else {
    // ❌ Erro: Verificar se GPS e timestamp foram enviados
    Log.e("Detection", "Erro: ${result.error}")
}
```

### Lógica da App

```kotlin
fun handleDetection(image: Bitmap) {
    // 1. Tentar ler dorsal (opcional)
    val dorsalNumber = tryReadDorsal(image)
    
    // 2. Preparar imagens
    val lowQuality = image.toBase64(quality = 70)
    val highQuality = image.toBase64(quality = 90)
    
    // 3. Obter GPS (OBRIGATÓRIO!)
    val location = getCurrentLocation()
    if (location == null) {
        showError("GPS não disponível. Aguarde localização.")
        return
    }
    
    // 4. Timestamp OBRIGATÓRIO (momento da captura)
    val capturedAt = Instant.now().toString()
    
    // 5. Enviar TUDO para a tabela única
    saveDeviceDetection(
        accessCode = qrCode,
        sessionId = sessionId,
        dorsalNumber = dorsalNumber,  // NULL se não leu
        imageData = lowQuality,
        displayImage = highQuality,
        metadata = mapOf(
            "width" to image.width,
            "height" to image.height,
            "device_type" to "android"
        ),
        latitude = location.latitude,      // ⚠️ OBRIGATÓRIO
        longitude = location.longitude,     // ⚠️ OBRIGATÓRIO
        accuracy = location.accuracy,     // Opcional
        capturedAt = capturedAt             // ⚠️ OBRIGATÓRIO
    )
    
    // ✅ Pronto! App não precisa decidir nada
}
```

---

## ⚙️ Serviço Backend: Processamento

### Função: `process_device_detection()`

Esta função é chamada pelo serviço backend para processar cada registro:

1. Busca informações do dispositivo (via `access_code`)
2. Verifica se evento está ativo
3. **Decide o caminho:**
   - Se `dorsal_number IS NOT NULL` → Cria detecção diretamente
   - Se `dorsal_number IS NULL` → Envia para `image_buffer`

### Função: `process_pending_detections()`

Processa um lote de registros pendentes:

```sql
SELECT process_pending_detections(10);  -- Processa até 10 registros
```

### Serviço Node.js

Um serviço Node.js roda continuamente processando registros:

```bash
# Processar continuamente (a cada 5 segundos)
node scripts/process-device-detections.js start

# Verificar pendentes
node scripts/process-device-detections.js check

# Ver estatísticas
node scripts/process-device-detections.js stats

# Processar um registro específico
node scripts/process-device-detections.js process <uuid>
```

---

## 🔄 Fluxo Completo

### 1. App Nativa Captura

```kotlin
// App captura imagem e tenta ler dorsal
val dorsal = readDorsal(image)  // Pode retornar null
```

### 2. App Envia para Tabela Única

```kotlin
save_device_detection(
    access_code = "ABC123",
    dorsal_number = dorsal,  // null ou número
    image_data = base64Image,
    ...
)
```

### 3. Serviço Backend Processa

```javascript
// Serviço roda continuamente
setInterval(async () => {
    await processPendingDetections(10);
}, 5000);
```

### 4. Decisão Automática

```sql
-- Dentro de process_device_detection()
IF dorsal_number IS NOT NULL THEN
    -- Criar detecção diretamente
    INSERT INTO detections (...);
    -- Sistema cria classificação automaticamente (via triggers)
ELSE
    -- Enviar para buffer
    INSERT INTO image_buffer (...);
    -- IA processa depois
END IF;
```

---

## ✅ Vantagens desta Abordagem

1. **🎯 App Simples**: Apenas recolhe e envia, não decide nada
2. **⚙️ Lógica Centralizada**: Toda lógica no backend
3. **🔄 Flexível**: Fácil adicionar novas regras de processamento
4. **📊 Rastreável**: Todos os dados ficam na tabela com histórico
5. **🛡️ Resiliente**: Se processar falhar, dados não se perdem
6. **📈 Escalável**: Processamento assíncrono permite alta carga

---

## 📝 Exemplo Completo

### App Nativa (Kotlin)

```kotlin
class DetectionService {
    suspend fun captureAndSend(image: Bitmap, qrCode: String) {
        // Tentar ler dorsal (opcional)
        val dorsal = mlKit.readDorsal(image)
        
        // Preparar dados
        val entry = DeviceDetectionEntry(
            accessCode = qrCode,
            sessionId = sessionId,
            dorsalNumber = dorsal,  // null se não leu
            imageData = image.toBase64(quality = 70),
            displayImage = image.toBase64(quality = 90),
            metadata = ImageMetadata(
                width = image.width,
                height = image.height,
                deviceType = "android"
            ),
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy
        )
        
        // Enviar (apenas uma chamada!)
        supabase.rpc("save_device_detection") {
            set("p_access_code", entry.accessCode)
            set("p_session_id", entry.sessionId)
            set("p_dorsal_number", entry.dorsalNumber)
            set("p_image_data", entry.imageData)
            set("p_display_image", entry.displayImage)
            set("p_image_metadata", entry.metadata)
            set("p_latitude", entry.latitude)
            set("p_longitude", entry.longitude)
            set("p_accuracy", entry.accuracy)
        }
    }
}
```

### Serviço Backend (Node.js)

```javascript
// Rodar como serviço (PM2, systemd, etc.)
const processor = require('./scripts/process-device-detections');

// Iniciar processamento contínuo
processor.startContinuousProcessing();
```

---

## 🔍 Verificação

### Ver registros pendentes

```sql
SELECT * FROM pending_device_detections LIMIT 10;
```

### Processar um registro específico

```sql
SELECT process_device_detection('uuid-aqui');
```

### Ver estatísticas

```sql
SELECT 
    status,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE dorsal_number IS NOT NULL) as with_dorsal,
    COUNT(*) FILTER (WHERE dorsal_number IS NULL) as without_dorsal
FROM device_detections
GROUP BY status;
```

---

## 📋 Checklist

- [ ] Executar `sql/native-app-detections-table.sql` no Supabase
- [ ] Configurar serviço backend (Node.js script)
- [ ] Implementar `save_device_detection()` na app nativa
- [ ] Testar envio com dorsal (deve ir para detections)
- [ ] Testar envio sem dorsal (deve ir para buffer)
- [ ] Configurar serviço para rodar continuamente
- [ ] Monitorar processamento

---

## 🔗 Arquivos

- `sql/native-app-detections-table.sql` - Script SQL completo
- `scripts/process-device-detections.js` - Serviço de processamento
- `docs/NATIVE-APP-DATA-COLLECTION.md` - Esta documentação

