# 📱 Kromi Native App - Guia do Desenvolvedor

## 🎯 Objetivo

Este documento explica **exatamente o que você precisa implementar** na app Android para integrar com o sistema Kromi de detecção de dorsais.

---

## 📋 O Que Você Precisa Implementar

### 1. Escanear QR Code do Dispositivo
### 2. Obter Informações do Dispositivo (Login)
### 3. Capturar Imagens e Tentar Ler Dorsal
### 4. Enviar Dados para o Sistema

---

## 🔐 Passo 1: Escanear QR Code

O QR code contém o **`access_code`** (6 caracteres alfanuméricos) do dispositivo.

**Exemplo de QR code:**
```
ABC123
```

**Implementação:**
- Use qualquer biblioteca de scanner de QR code (ZXing, ML Kit, etc.)
- Extraia o código escaneado
- Guarde em uma variável: `accessCode`

---

## 🔍 Passo 2: Obter Informações do Dispositivo

Após escanear o QR code, consulte as informações do dispositivo no Supabase.

### Função RPC: `get_device_info_by_qr`

```kotlin
// Chamar função RPC no Supabase
val response = supabase.rpc("get_device_info_by_qr") {
    set("p_access_code", accessCode)
}.decodeSingle<DeviceInfoResponse>()

// Resposta contém:
data class DeviceInfoResponse(
    val associationId: String,
    val accessCode: String,
    val devicePin: String?,
    val maxSessions: Int,
    val activeSessions: Int,
    
    // Informações do Evento
    val eventId: String,
    val eventName: String,
    val eventDescription: String?,
    val eventDate: String?,
    val eventLocation: String?,
    val eventType: String?,
    val eventStartedAt: String?,
    val eventStatus: String,
    
    // Informações do Dispositivo
    val deviceId: String,
    val deviceName: String,
    val deviceType: String,
    
    // Informações do Checkpoint (IMPORTANTE!)
    val checkpointName: String,
    val checkpointType: String,    // "start", "checkpoint", "finish", etc.
    val checkpointOrder: Int,         // 1, 2, 3, ...
    val role: String,
    val deviceAssignedAt: String,
    val deviceLastSeen: String,
    
    // Status
    val canCreateSession: Boolean,
    val statusMessage: String         // "ready", "device_busy", "event_inactive"
)
```

### Validar PIN (Opcional)

Se o dispositivo tiver PIN configurado (`devicePin != null`):

```kotlin
// Pedir PIN ao usuário
val userPin = showPinDialog()

// Validar PIN
val pinValid = supabase.rpc("validate_device_pin") {
    set("p_access_code", accessCode)
    set("p_pin", userPin)
}.decodeSingle<PinValidationResponse>()

if (!pinValid.success) {
    showError("PIN incorreto")
    return
}
```

---

## 📸 Passo 3: Capturar Imagens e Ler Dorsal

### Capturar Imagem

```kotlin
// Usar CameraX ou qualquer biblioteca de câmera
// Capturar imagem como Bitmap
val imageBitmap = captureImage()
```

### Tentar Ler Dorsal (Opcional)

```kotlin
// Tentar ler dorsal usando ML Kit, Tesseract, ou outra biblioteca
val dorsalNumber: Int? = try {
    readDorsalFromImage(imageBitmap)  // Retorna número ou null
} catch (e: Exception) {
    null  // Se não conseguir ler
}
```

**Importante:** Se não conseguir ler o dorsal, envie `null`. O sistema processará depois.

### Preparar Imagens

```kotlin
// Converter para Base64 com duas qualidades
val imageDataLow = bitmapToBase64(imageBitmap, quality = 70)    // Para IA
val imageDataHigh = bitmapToBase64(imageBitmap, quality = 90)  // Para visualização
```

---

## 📡 Passo 4: Enviar Dados para o Sistema

### 📤 Para Qual Tabela Enviar?

**A app NÃO envia diretamente para uma tabela!**

A app chama a **função RPC `save_device_detection()`** que:
1. Valida os dados
2. Salva automaticamente na tabela `device_detections`
3. Retorna sucesso

O sistema depois processa automaticamente e move os dados para:
- `detections` (se tem dorsal)
- `image_buffer` (se não tem dorsal)

**Você só precisa chamar a função RPC!**

### ⚠️ CAMPOS OBRIGATÓRIOS

Você **DEVE** sempre enviar:
- ✅ **Imagem** (`image_data`)
- ✅ **GPS Latitude** (`latitude`)
- ✅ **GPS Longitude** (`longitude`)
- ✅ **Timestamp** (`captured_at`)

### Função RPC: `save_device_detection`

```kotlin
// Obter GPS (OBRIGATÓRIO!)
val location = getCurrentLocation()  // GPS do dispositivo
if (location == null) {
    showError("GPS não disponível. Aguarde localização.")
    return
}

// Timestamp da captura (OBRIGATÓRIO!)
val capturedAt = Instant.now().toString()  // ISO 8601 format

// Preparar metadados
val metadata = mapOf(
    "width" to imageBitmap.width,
    "height" to imageBitmap.height,
    "device_type" to "android",
    "timestamp" to capturedAt
)

// Enviar dados
// ORDEM DOS PARÂMETROS (importante!):
// 1. Obrigatórios primeiro: access_code, session_id, image_data, latitude, longitude, captured_at
// 2. Opcionais depois: dorsal_number, display_image, image_metadata, accuracy
val result = supabase.rpc("save_device_detection") {
    // Parâmetros obrigatórios (ordem importa!)
    set("p_access_code", accessCode)              // QR code escaneado
    set("p_session_id", sessionId)                // ID único da sessão
    set("p_image_data", imageDataLow)              // Base64 (70% quality) - OBRIGATÓRIO
    set("p_latitude", location.latitude)           // ⚠️ OBRIGATÓRIO (-90 a 90)
    set("p_longitude", location.longitude)         // ⚠️ OBRIGATÓRIO (-180 a 180)
    set("p_captured_at", capturedAt)               // ⚠️ OBRIGATÓRIO (ISO timestamp)
    // Parâmetros opcionais (podem ser omitidos ou NULL)
    set("p_dorsal_number", dorsalNumber)           // null OU número lido
    set("p_display_image", imageDataHigh)          // Base64 (90% quality) - Opcional
    set("p_image_metadata", metadata)             // JSON com metadados
    set("p_accuracy", location.accuracy)          // Precisão GPS (opcional)
}.decodeSingle<SaveResponse>()

// Resposta
data class SaveResponse(
    val success: Boolean,
    val detectionId: String?,
    val message: String?
)

if (result.success) {
    // ✅ Dados enviados com sucesso
    showSuccess("Dados enviados! Aguardando processamento...")
} else {
    // ❌ Erro
    showError("Erro: ${result.message}")
}
```

---

## 🔄 Fluxo Completo

```kotlin
class DetectionActivity {
    private var accessCode: String? = null
    private var sessionId: String = UUID.randomUUID().toString()
    
    fun onQRCodeScanned(qrCode: String) {
        accessCode = qrCode
        
        // 1. Obter informações do dispositivo
        loadDeviceInfo(qrCode)
    }
    
    private fun loadDeviceInfo(accessCode: String) {
        val deviceInfo = supabase.rpc("get_device_info_by_qr") {
            set("p_access_code", accessCode)
        }.decodeSingle<DeviceInfoResponse>()
        
        // Validar se pode criar sessão
        if (!deviceInfo.canCreateSession) {
            showError("Dispositivo ocupado")
            return
        }
        
        // Mostrar informações na UI
        displayEventInfo(deviceInfo)
        
        // Validar PIN se necessário
        if (deviceInfo.devicePin != null) {
            validatePin(accessCode, deviceInfo.devicePin)
        }
    }
    
    fun captureAndSend() {
        // 1. Capturar imagem
        val image = captureImage()
        
        // 2. Tentar ler dorsal (opcional)
        val dorsal = tryReadDorsal(image)  // null ou número
        
        // 3. Obter GPS
        val location = getCurrentLocation()
        if (location == null) {
            showError("GPS não disponível")
            return
        }
        
        // 4. Preparar dados
        val imageDataLow = bitmapToBase64(image, quality = 70)
        val imageDataHigh = bitmapToBase64(image, quality = 90)
        val metadata = createMetadata(image)
        val capturedAt = Instant.now().toString()
        
        // 5. Enviar
        sendDetection(
            accessCode = accessCode!!,
            dorsalNumber = dorsal,
            imageDataLow = imageDataLow,
            imageDataHigh = imageDataHigh,
            metadata = metadata,
            location = location,
            capturedAt = capturedAt
        )
    }
    
    private fun sendDetection(
        accessCode: String,
        dorsalNumber: Int?,
        imageDataLow: String,
        imageDataHigh: String,
        metadata: Map<String, Any>,
        location: Location,
        capturedAt: String
    ) {
        val result = supabase.rpc("save_device_detection") {
            set("p_access_code", accessCode)
            set("p_session_id", sessionId)
            set("p_dorsal_number", dorsalNumber)
            set("p_image_data", imageDataLow)
            set("p_display_image", imageDataHigh)
            set("p_image_metadata", metadata)
            set("p_latitude", location.latitude)
            set("p_longitude", location.longitude)
            set("p_accuracy", location.accuracy)
            set("p_captured_at", capturedAt)
        }.decodeSingle<SaveResponse>()
        
        if (result.success) {
            showSuccess("✅ Enviado com sucesso!")
        } else {
            showError("❌ Erro: ${result.message}")
        }
    }
}
```

---

## 📝 Estrutura de Dados

### Request: `save_device_detection`

```json
{
  "p_access_code": "ABC123",
  "p_session_id": "session-uuid-123",
  "p_dorsal_number": 42,              // null OU número
  "p_image_data": "iVBORw0KGgo...",  // Base64 (OBRIGATÓRIO)
  "p_display_image": "iVBORw0KGgo...", // Base64 (opcional)
  "p_image_metadata": {
    "width": 1920,
    "height": 1080,
    "device_type": "android",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "p_latitude": 40.7128,              // ⚠️ OBRIGATÓRIO
  "p_longitude": -74.0060,            // ⚠️ OBRIGATÓRIO
  "p_accuracy": 10.5,                 // Opcional
  "p_captured_at": "2024-01-01T12:00:00Z"  // ⚠️ OBRIGATÓRIO (ISO 8601)
}
```

### Response: `save_device_detection`

```json
{
  "success": true,
  "detection_id": "uuid-here",
  "message": "Dados recebidos com sucesso. Aguardando processamento."
}
```

---

## ✅ Checklist de Implementação

- [ ] Implementar scanner de QR code
- [ ] Chamar `get_device_info_by_qr()` após escanear
- [ ] Exibir informações do evento/checkpoint na UI
- [ ] Validar PIN se necessário
- [ ] Implementar captura de imagem (CameraX)
- [ ] Tentar ler dorsal (ML Kit, Tesseract, ou similar)
- [ ] Implementar obtenção de GPS
- [ ] Converter imagem para Base64 (duas qualidades)
- [ ] Chamar `save_device_detection()` com TODOS os campos obrigatórios
- [ ] Tratar erros (GPS indisponível, QR inválido, etc.)
- [ ] Testar com QR code real
- [ ] Testar envio com dorsal lido
- [ ] Testar envio sem dorsal lido (deve enviar mesmo assim)

---

## 🔧 Funções Auxiliares

### Converter Bitmap para Base64

```kotlin
fun bitmapToBase64(bitmap: Bitmap, quality: Int): String {
    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
}
```

### Obter GPS

```kotlin
suspend fun getCurrentLocation(): Location? = suspendCancellableCoroutine { continuation ->
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    
    val locationListener = object : LocationListener {
        override fun onLocationChanged(location: android.location.Location) {
            locationManager.removeUpdates(this)
            continuation.resume(Location(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy
            ))
        }
    }
    
    try {
        locationManager.requestLocationUpdates(
            LocationManager.GPS_PROVIDER,
            0L,
            0f,
            locationListener
        )
    } catch (e: SecurityException) {
        continuation.resume(null)
    }
}
```

### Criar Metadados

```kotlin
fun createMetadata(bitmap: Bitmap): Map<String, Any> {
    return mapOf(
        "width" to bitmap.width,
        "height" to bitmap.height,
        "device_type" to "android",
        "timestamp" to Instant.now().toString()
    )
}
```

---

## ⚠️ Importantes

1. **GPS é OBRIGATÓRIO**: Não envie sem GPS. Aguarde até ter localização válida.

2. **Timestamp é OBRIGATÓRIO**: Use o momento exato da captura, não o momento do envio.

3. **Dorsal pode ser NULL**: Se não conseguir ler, envie `null`. O sistema processará depois.

4. **Sempre enviar imagem**: Mesmo que tenha lido o dorsal, envie a imagem (prova).

5. **Duas qualidades de imagem**:
   - `image_data`: 70% quality (para processamento IA)
   - `display_image`: 90% quality (para visualização, opcional)

6. **Session ID**: Use um UUID único por sessão da app.

---

## 🧪 Testes

### Teste 1: QR Code Válido

```kotlin
val testQRCode = "ABC123"  // Substitua por QR code real
loadDeviceInfo(testQRCode)
// Deve retornar informações do dispositivo
```

### Teste 2: Envio com Dorsal

```kotlin
sendDetection(
    accessCode = "ABC123",
    dorsalNumber = 42,  // Dorsal lido
    ...
)
// Deve salvar diretamente em detections
```

### Teste 3: Envio sem Dorsal

```kotlin
sendDetection(
    accessCode = "ABC123",
    dorsalNumber = null,  // Não conseguiu ler
    ...
)
// Deve salvar no buffer para processamento depois
```

### Teste 4: GPS Indisponível

```kotlin
val location = getCurrentLocation()
if (location == null) {
    // Não deve enviar - mostrar erro ao usuário
    showError("GPS não disponível")
}
```

---

## 🐛 Tratamento de Erros

### Erro: "QR code inválido"

**Causa**: QR code não existe no sistema
**Solução**: Verificar se dispositivo foi criado no sistema web

### Erro: "Latitude inválida" ou "Longitude inválida"

**Causa**: Valores GPS fora do range válido
**Solução**: Validar GPS antes de enviar (-90 a 90 para latitude, -180 a 180 para longitude)

### Erro: "GPS não disponível"

**Causa**: GPS não conseguido a tempo
**Solução**: Aguardar mais tempo ou pedir permissão de localização

### Erro: "Dispositivo ocupado"

**Causa**: Limite de sessões atingido
**Solução**: Aguardar ou usar outro dispositivo

---

## 📚 Documentação Adicional

- `docs/NATIVE-APP-DATA-COLLECTION.md` - Detalhes técnicos completos
- `docs/CREATE-DEVICE-WITH-ALL-INFO.md` - Como dispositivos são criados
- `sql/native-app-detections-table.sql` - Estrutura da base de dados

---

## 💬 Dúvidas?

Se tiver dúvidas sobre:
- Estrutura de dados
- Formatos esperados
- Validações necessárias
- Integração com Supabase

Consulte a documentação técnica ou entre em contato.

---

## ✅ Resumo Rápido

1. **Escanear QR code** → obter `access_code`
2. **Chamar `get_device_info_by_qr()`** → obter informações
3. **Capturar imagem** → tentar ler dorsal (opcional)
4. **Obter GPS** → ⚠️ obrigatório
5. **Chamar `save_device_detection()`** → enviar todos os dados
6. **Pronto!** → sistema processa automaticamente

---

**Boa sorte com a implementação! 🚀**

