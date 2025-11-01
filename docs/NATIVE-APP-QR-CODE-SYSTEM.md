# 📱 Native App - Sistema de QR Code e Duas Opções de Funcionamento

## 🎯 Visão Geral

Este sistema permite que a app nativa funcione de **duas formas**:

1. **✅ Modo Direto**: App lê o dorsal e envia o número diretamente → Salva em `detections`
2. **📸 Modo Buffer**: App não consegue ler → Envia imagem para `image_buffer` → Processa depois

Ambos os modos obtêm **todas as informações necessárias** através do QR code do dispositivo.

---

## 🔐 Sistema de Autenticação via QR Code

### Como Funciona

1. **QR Code contém**: `access_code` (6 caracteres alfanuméricos)
2. **App escaneia QR code**
3. **App chama função** `get_device_info_by_qr()` para obter:
   - Informações do evento
   - Informações do dispositivo
   - Ordem do checkpoint
   - Tipo de checkpoint
   - Configurações

### Estrutura do QR Code

```json
{
  "access_code": "ABC123",
  "url": "https://kromi.online/qr/ABC123"  // Opcional
}
```

O `access_code` já existe na tabela `event_devices` e é gerado automaticamente.

---

## 📊 Fluxo Completo

### Passo 1: Escanear QR Code

```kotlin
// App nativa escaneia QR code
val qrCode = "ABC123"  // Código escaneado
```

### Passo 2: Buscar Informações do Dispositivo

```kotlin
// Chamar função RPC no Supabase
val response = supabase.rpc("get_device_info_by_qr") {
    set("p_access_code", qrCode)
}.decodeSingle<DeviceInfo>()

// Resposta contém:
data class DeviceInfo(
    val eventId: String,
    val eventName: String,
    val deviceId: String,
    val checkpointName: String,
    val checkpointType: String,  // "start", "checkpoint", "finish"
    val checkpointOrder: Int,
    val devicePin: String?,
    val maxSessions: Int,
    val activeSessions: Int,
    val canCreateSession: Boolean,
    val statusMessage: String
)
```

### Passo 3: Validar PIN (Opcional)

Se o dispositivo tiver PIN configurado:

```kotlin
val pinValid = supabase.rpc("validate_device_pin") {
    set("p_access_code", qrCode)
    set("p_pin", userEnteredPin)
}.decodeSingle<PinValidationResponse>()

if (!pinValid.success) {
    // Mostrar erro
    return
}
```

### Passo 4a: Opção 1 - Enviar Dorsal Diretamente ✅

Quando a app **conseguiu ler o dorsal**:

```kotlin
val result = supabase.rpc("save_detection_direct") {
    set("p_access_code", qrCode)
    set("p_dorsal_number", 42)  // Dorsal lido pela app
    set("p_session_id", sessionId)
    set("p_latitude", currentLatitude)
    set("p_longitude", currentLongitude)
    set("p_accuracy", gpsAccuracy)
    set("p_proof_image", base64Image)  // Opcional
    set("p_detection_method", "native_app")
}.decodeSingle<DetectionResponse>()

if (result.success) {
    // ✅ Detecção salva diretamente em detections
    // Sistema vai criar classificação automaticamente
}
```

### Passo 4b: Opção 2 - Enviar Imagem para Buffer 📸

Quando a app **NÃO conseguiu ler o dorsal**:

```kotlin
val result = supabase.rpc("save_image_to_buffer") {
    set("p_access_code", qrCode)
    set("p_session_id", sessionId)
    set("p_image_data", base64LowQuality)  // 70% quality
    set("p_display_image", base64HighQuality)  // 90% quality
    set("p_image_metadata", jsonMetadata)  // {"width": 1920, "height": 1080, ...}
    set("p_latitude", currentLatitude)
    set("p_longitude", currentLongitude)
    set("p_accuracy", gpsAccuracy)
}.decodeSingle<BufferResponse>()

if (result.success) {
    // ✅ Imagem salva no image_buffer
    // Será processada depois pelo sistema de IA
}
```

---

## 📝 Estrutura de Dados

### Request: `save_detection_direct`

```json
{
  "p_access_code": "ABC123",
  "p_dorsal_number": 42,
  "p_session_id": "session-abc-123",
  "p_latitude": 40.7128,
  "p_longitude": -74.0060,
  "p_accuracy": 10.5,
  "p_proof_image": "iVBORw0KGgo...",  // Opcional
  "p_detection_method": "native_app"
}
```

### Response: `save_detection_direct`

```json
{
  "success": true,
  "detection_id": "uuid-here",
  "event_id": "uuid-here",
  "device_order": 1,
  "checkpoint_name": "Meta Principal",
  "checkpoint_type": "finish",
  "message": "Detecção salva com sucesso"
}
```

### Request: `save_image_to_buffer`

```json
{
  "p_access_code": "ABC123",
  "p_session_id": "session-abc-123",
  "p_image_data": "iVBORw0KGgo...",  // Base64, 70% quality
  "p_display_image": "iVBORw0KGgo...",  // Base64, 90% quality (opcional)
  "p_image_metadata": {
    "width": 1920,
    "height": 1080,
    "device_type": "android",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "p_latitude": 40.7128,
  "p_longitude": -74.0060,
  "p_accuracy": 10.5
}
```

### Response: `save_image_to_buffer`

```json
{
  "success": true,
  "buffer_id": "uuid-here",
  "event_id": "uuid-here",
  "device_order": 1,
  "checkpoint_name": "Meta Principal",
  "checkpoint_type": "finish",
  "message": "Imagem salva no buffer com sucesso"
}
```

---

## 🔄 Lógica de Decisão na App

```kotlin
fun handleDetection(dorsalNumber: Int?, image: Bitmap?) {
    when {
        // ✅ Opção 1: Conseguiu ler dorsal
        dorsalNumber != null -> {
            saveDetectionDirect(
                accessCode = qrCode,
                dorsalNumber = dorsalNumber,
                proofImage = image?.toBase64()  // Opcional
            )
        }
        
        // 📸 Opção 2: Não conseguiu ler, enviar para buffer
        image != null -> {
            saveImageToBuffer(
                accessCode = qrCode,
                imageData = image.toBase64LowQuality(),
                displayImage = image.toBase64HighQuality()
            )
        }
        
        // ❌ Erro: Nenhuma informação
        else -> {
            showError("Não foi possível detectar dorsal nem capturar imagem")
        }
    }
}
```

---

## 🗂️ Informações Retornadas pelo QR Code

Quando a app chama `get_device_info_by_qr()`, recebe:

### Informações do Evento
- `event_id`: UUID do evento
- `event_name`: Nome do evento
- `event_description`: Descrição
- `event_date`: Data do evento
- `event_location`: Localização
- `event_type`: Tipo (running, cycling, triathlon, etc.)
- `event_started_at`: Quando o evento começou
- `event_status`: Status (active, paused, etc.)

### Informações do Dispositivo
- `device_id`: UUID do dispositivo
- `device_name`: Nome do dispositivo
- `device_type`: Tipo (mobile, tablet)
- `device_pin`: PIN para autenticação (opcional)
- `device_last_seen`: Última vez que foi visto

### Informações do Checkpoint
- `checkpoint_name`: Nome do checkpoint (ex: "Meta Principal")
- `checkpoint_type`: Tipo (start, checkpoint, finish, lap_counter, etc.)
- `checkpoint_order`: Ordem no percurso (1, 2, 3, ...)
- `role`: Papel do dispositivo (detector, viewer)

### Configurações
- `max_sessions`: Máximo de sessões simultâneas
- `active_sessions`: Sessões ativas atualmente
- `can_create_session`: Se pode criar nova sessão
- `status_message`: Mensagem de status (ready, device_busy, event_inactive)

---

## ✅ Vantagens desta Solução

1. **🎯 Duas Opções**: App decide automaticamente como enviar
2. **📱 Informações Completas**: Uma única chamada retorna tudo
3. **🔐 Segurança**: PIN opcional para autenticação
4. **⚡ Performance**: Detecção direta é mais rápida
5. **🔄 Fallback**: Se não ler dorsal, ainda salva no buffer
6. **📊 Rastreabilidade**: Todas as informações ficam associadas

---

## 🧪 Testes

### 1. Verificar QR codes disponíveis

```sql
SELECT access_code, checkpoint_name, checkpoint_order
FROM device_qr_info
LIMIT 10;
```

### 2. Testar busca por QR code

```sql
SELECT * FROM get_device_info_by_qr('ABC123');
```

### 3. Testar salvamento direto

```sql
SELECT save_detection_direct(
    'ABC123',
    42,
    'session-test',
    40.7128,
    -74.0060,
    10.5,
    NULL,
    'test'
);
```

### 4. Testar salvamento no buffer

```sql
SELECT save_image_to_buffer(
    'ABC123',
    'session-test',
    'iVBORw0KGgo...',  -- Base64 real
    'iVBORw0KGgo...',  -- Base64 real
    '{"width": 1920, "height": 1080}'::JSONB,
    40.7128,
    -74.0060,
    10.5
);
```

---

## 📋 Checklist para Desenvolvedor Android

- [ ] Implementar scanner de QR code
- [ ] Chamar `get_device_info_by_qr()` após escanear
- [ ] Validar PIN se necessário
- [ ] Implementar lógica de detecção de dorsal
- [ ] Implementar `save_detection_direct()` quando ler dorsal
- [ ] Implementar `save_image_to_buffer()` quando não ler
- [ ] Tratar erros (QR inválido, dispositivo ocupado, etc.)
- [ ] Exibir informações do checkpoint na UI
- [ ] Testar ambos os fluxos

---

## 🔗 Arquivos Relacionados

- `sql/native-app-qr-code-system.sql` - Script SQL completo
- `sql/native-app-buffer-setup.sql` - Setup do buffer
- `docs/NATIVE-APP-SQL-COMPATIBILITY.md` - Compatibilidade SQL

