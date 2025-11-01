# 📱 Native App - Compatibilidade SQL

## ❌ Problemas no Script Original Fornecido

O script SQL fornecido pelo desenvolvedor **NÃO é compatível** com o sistema atual. Aqui estão os problemas:

### 🚨 Campos FALTANDO (Críticos!)

1. **`display_image` (TEXT)** - ❌ FALTANDO
   - **Uso**: Versão da imagem em alta qualidade (90%) para visualização
   - **Crítico**: O HTML e o app Android enviam este campo
   - **Sem ele**: Não será possível visualizar as imagens capturadas

2. **`image_metadata` (JSONB)** - ❌ FALTANDO
   - **Uso**: Metadados da imagem (width, height, device_type, timestamp, etc.)
   - **Crítico**: Usado pelo sistema de processamento
   - **Sem ele**: Perda de informações importantes

3. **`status` (TEXT)** - ❌ FALTANDO
   - **Uso**: Controle de processamento (`pending`, `processing`, `processed`, `discarded`)
   - **Crítico**: Sistema de processamento depende deste campo
   - **Sem ele**: Imagens não podem ser processadas

### ⚠️ Campos DESNECESSÁRIOS (Pode causar confusão)

1. **`event_name` (TEXT)**
   - **Problema**: Dado redundante (já existe na tabela `events`)
   - **Solução**: Buscar da tabela `events` quando necessário

2. **`capture_point` (TEXT)**
   - **Problema**: Não é usado pelo sistema atual
   - **Observação**: Informação está em `event_devices.checkpoint_name`

3. **`device_model` (TEXT)**
   - **Problema**: Não é usado pelo sistema atual
   - **Observação**: Pode ser armazenado em `image_metadata` se necessário

### ✅ Campos CORRETOS

- `id`, `created_at` ✅
- `event_id` ✅
- `device_id` ✅ (mas deve ser TEXT, não UUID)
- `session_id` ✅
- `image_data` ✅
- `captured_at` ✅
- `latitude`, `longitude`, `accuracy` ✅

## 📊 Comparação: HTML vs Script Original

### O que o `detection-kromi.html` ENVIA:

```javascript
{
    event_id: UUID,
    device_id: TEXT,
    session_id: TEXT,
    image_data: "base64...",      // ✅ 70% quality para IA
    display_image: "base64...",    // ❌ FALTANDO no script original
    image_metadata: {              // ❌ FALTANDO no script original
        width: 1920,
        height: 1080,
        device_type: "mobile",
        timestamp: "2024-01-01T12:00:00Z",
        gps_updated: true
    },
    captured_at: "2024-01-01T12:00:00Z",
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10.5,
    status: "pending"              // ❌ FALTANDO no script original
}
```

### O que o Script Original CRIA:

```sql
CREATE TABLE image_buffer (
    id UUID,
    created_at TIMESTAMPTZ,
    event_id UUID,                ✅
    session_id TEXT,              ✅
    event_name TEXT,              ❌ Não usado
    capture_point TEXT,           ❌ Não usado
    device_id TEXT,               ✅
    device_model TEXT,            ❌ Não usado
    image_data TEXT,              ✅
    captured_at TIMESTAMPTZ,      ✅
    latitude DECIMAL,             ✅
    longitude DECIMAL,            ✅
    accuracy DECIMAL              ✅
    -- display_image FALTANDO     ❌
    -- image_metadata FALTANDO    ❌
    -- status FALTANDO            ❌
);
```

## ✅ Solução: Script Corrigido

Foi criado o arquivo `sql/native-app-buffer-setup.sql` que:

1. ✅ **Inclui TODOS os campos necessários**
   - `display_image`
   - `image_metadata`
   - `status`
   - Campos de processamento (`processed_at`, `detection_results`, etc.)

2. ✅ **Remove campos desnecessários**
   - `event_name` (buscar da tabela `events`)
   - `capture_point` (buscar de `event_devices`)
   - `device_model` (pode ir em `image_metadata`)

3. ✅ **Mantém compatibilidade total**
   - Funciona com `detection-kromi.html`
   - Funciona com Android Native App
   - Funciona com sistema de processamento existente

## 🔧 O que o Desenvolvedor Android Precisa Fazer

### 1. Usar o Script Corrigido

```sql
-- Execute este script no Supabase SQL Editor:
-- sql/native-app-buffer-setup.sql
```

### 2. Estrutura de Dados para Inserção

O app Android deve inserir dados com esta estrutura:

```kotlin
data class ImageBufferEntry(
    val eventId: String,           // UUID do evento
    val deviceId: String,          // ID do dispositivo
    val sessionId: String,         // ID da sessão
    val imageData: String,         // Base64 (70% quality)
    val displayImage: String,      // Base64 (90% quality)
    val imageMetadata: Map<String, Any>, // Metadados
    val capturedAt: String,        // ISO timestamp
    val latitude: Double?,         // Opcional
    val longitude: Double?,        // Opcional
    val accuracy: Double?,         // Opcional
    val status: String = "pending" // Status inicial
)
```

### 3. Exemplo de Inserção (Kotlin)

```kotlin
val entry = ImageBufferEntry(
    eventId = state.eventId,
    deviceId = state.deviceId,
    sessionId = state.sessionId,
    imageData = aiVersion,  // 70% quality
    displayImage = displayVersion,  // 90% quality
    imageMetadata = mapOf(
        "width" to bitmap.width,
        "height" to bitmap.height,
        "device_type" to "android",
        "timestamp" to Instant.now().toString()
    ),
    capturedAt = Instant.now().toString(),
    latitude = currentPosition?.latitude,
    longitude = currentPosition?.longitude,
    accuracy = currentPosition?.accuracy,
    status = "pending"
)

supabase.from("image_buffer")
    .insert(entry)
    .execute()
```

## 🔍 Verificação

Após executar o script, verifique:

```sql
-- Verificar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'image_buffer' 
ORDER BY ordinal_position;

-- Testar inserção (substitua valores reais)
INSERT INTO image_buffer (
    event_id, device_id, session_id,
    image_data, display_image, image_metadata,
    captured_at, status
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'test-device',
    'test-session',
    'iVBORw0KGgo...',  -- Base64 real
    'iVBORw0KGgo...',  -- Base64 real
    '{"width": 1920, "height": 1080, "device_type": "android"}',
    NOW(),
    'pending'
);
```

## 📝 Resumo

| Item | Script Original | Script Corrigido | Status |
|------|----------------|------------------|--------|
| `display_image` | ❌ Faltando | ✅ Presente | **Crítico** |
| `image_metadata` | ❌ Faltando | ✅ Presente | **Crítico** |
| `status` | ❌ Faltando | ✅ Presente | **Crítico** |
| `event_name` | ✅ Presente | ❌ Removido | Redundante |
| `capture_point` | ✅ Presente | ❌ Removido | Não usado |
| `device_model` | ✅ Presente | ❌ Removido | Não usado |
| Índices | ✅ Básicos | ✅ Completos | Melhorado |
| Views | ✅ Presentes | ✅ Melhoradas | Melhorado |

## ✅ Conclusão

**SIM, faz sentido desenvolver a app nativa**, mas o script SQL fornecido precisa ser corrigido.

Use o arquivo `sql/native-app-buffer-setup.sql` que está 100% compatível com o sistema atual.

