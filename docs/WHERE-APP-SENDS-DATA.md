# 📤 Para Qual Tabela a App Envia Dados?

## ✅ Resposta Direta

**A app nativa envia dados para:**

### 1. **Função RPC: `save_device_detection()`**

A app **NÃO** envia diretamente para uma tabela. Ela chama uma **função RPC**:

```kotlin
supabase.rpc("save_device_detection") {
    // dados aqui
}
```

### 2. **A função salva na tabela: `device_detections`**

A função `save_device_detection()` recebe os dados e **salva na tabela `device_detections`**:

```sql
INSERT INTO device_detections (
    access_code,
    session_id,
    dorsal_number,    -- pode ser NULL
    image_data,
    display_image,
    image_metadata,
    latitude,
    longitude,
    accuracy,
    captured_at,
    status           -- sempre inicia como 'pending'
)
```

---

## 🔄 Fluxo Completo

```
┌─────────────────┐
│  App Nativa     │
│                 │
│  Chama função   │
│  RPC:           │
│  save_device_   │
│  detection()    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Função save_device_     │
│ detection()             │
│                         │
│ Salva na tabela:        │
│ device_detections       │
│ status = 'pending'      │
└────────┬────────────────┘
         │
         │ Aguarda processamento
         │
         ▼
┌─────────────────────────┐
│ DeviceDetectionProcessor │
│ (roda a cada 5s)        │
│                         │
│ Chama:                  │
│ process_pending_        │
│ detections()            │
└────────┬────────────────┘
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

## 📋 Detalhamento

### Tabela: `device_detections` (PRIMEIRA PARADA)

**É aqui que a app envia os dados:**

```sql
device_detections
├── id (UUID)
├── access_code (VARCHAR)      -- QR code escaneado
├── session_id (TEXT)          -- Sessão da app
├── dorsal_number (INTEGER)    -- NULL ou número lido
├── image_data (TEXT)          -- Base64 imagem
├── display_image (TEXT)       -- Base64 alta qualidade (opcional)
├── image_metadata (JSONB)     -- Metadados
├── latitude (DECIMAL)         -- GPS
├── longitude (DECIMAL)        -- GPS
├── accuracy (DECIMAL)         -- GPS precisão
├── captured_at (TIMESTAMPTZ)  -- Timestamp captura
├── status (TEXT)              -- 'pending' → 'processing' → 'processed'
├── event_id (UUID)            -- ✅ Preenchido automaticamente depois
├── device_id (UUID)           -- ✅ Preenchido automaticamente depois
├── device_order (INTEGER)     -- ✅ Preenchido automaticamente depois
├── detection_id (UUID)        -- Se foi para detections
└── buffer_id (UUID)          -- Se foi para image_buffer
```

**Status inicial:** `pending`

---

### Depois: Processamento Automático

O sistema **processa automaticamente** e move os dados:

#### Opção A: Se tem dorsal → Vai para `detections`

```sql
detections
├── id (UUID)
├── event_id (UUID)            -- ✅ Do access_code
├── device_id (TEXT)           -- ✅ Do access_code
├── device_order (INTEGER)     -- ✅ Do access_code (checkpoint)
├── number (INTEGER)           -- Dorsal detectado
├── timestamp (TIMESTAMPTZ)
├── latitude (DECIMAL)
├── longitude (DECIMAL)
├── proof_image (TEXT)
└── ...
```

**Status em `device_detections`:** `processed` + `detection_id` preenchido

---

#### Opção B: Se não tem dorsal → Vai para `image_buffer`

```sql
image_buffer
├── id (UUID)
├── event_id (UUID)            -- ✅ Do access_code
├── device_id (TEXT)           -- ✅ Do access_code
├── session_id (TEXT)
├── image_data (TEXT)
├── display_image (TEXT)
├── status (TEXT)              -- 'pending' → será processado por IA
└── ...
```

**Status em `device_detections`:** `processed` + `buffer_id` preenchido

---

## 📝 Resumo para o Desenvolvedor

### O Que a App Faz

```kotlin
// App chama FUNÇÃO RPC (não envia direto para tabela)
supabase.rpc("save_device_detection") {
    set("p_access_code", qrCode)
    set("p_session_id", sessionId)
    set("p_dorsal_number", dorsalNumber)  // null ou número
    set("p_image_data", base64Image)
    set("p_latitude", latitude)
    set("p_longitude", longitude)
    set("p_captured_at", timestamp)
}
```

### O Que Acontece

1. ✅ Função recebe dados
2. ✅ Valida `access_code` (QR code)
3. ✅ Valida GPS
4. ✅ Salva na tabela `device_detections` (status = 'pending')
5. ✅ Retorna sucesso para app

### O Que Acontece Depois (Automático)

1. ⚙️ Serviço processa (a cada 5 segundos)
2. ⚙️ Busca informações pelo `access_code`:
   - `event_id`
   - `device_id`
   - `checkpoint_order`
3. ⚙️ Decide caminho:
   - **Com dorsal** → Cria em `detections`
   - **Sem dorsal** → Cria em `image_buffer`
4. ✅ Atualiza `device_detections` (status = 'processed')

---

## 🎯 Resposta Final

**Para qual tabela a app envia?**

**Resposta:** A app **não envia diretamente para tabela**. Ela chama a função RPC `save_device_detection()` que salva na tabela **`device_detections`**.

**Fluxo:**
```
App → save_device_detection() → device_detections (pending)
                                  ↓
                         Processamento automático
                                  ↓
                    ┌─────────────┴─────────────┐
                    │                           │
            Se tem dorsal              Se não tem dorsal
                    │                           │
                    ▼                           ▼
            detections                  image_buffer
```

**Tabelas finais:**
- `detections` - Se app leu dorsal
- `image_buffer` - Se app não leu dorsal (será processado por IA)

**Tabela intermediária:**
- `device_detections` - Onde app envia (tabela de recolha)

---

## ✅ Tudo Assosiado Automaticamente

Mesmo não enviando diretamente:
- ✅ `event_id` - Preenchido automaticamente
- ✅ `device_id` - Preenchido automaticamente
- ✅ `checkpoint_order` - Preenchido automaticamente

**Tudo rastreável!**

