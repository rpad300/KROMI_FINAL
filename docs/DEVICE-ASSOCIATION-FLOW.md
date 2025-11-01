# 🔗 Fluxo de Associação de Dispositivo

## ✅ O Que Está Sendo Feito Automaticamente

**Sim, já estamos associando tudo automaticamente!** A app nativa **não precisa** enviar `event_id`, `device_id` ou `checkpoint_order`. Tudo é resolvido pelo `access_code`.

---

## 🔄 Fluxo Completo

### 1. App Nativa Envia Dados

**App envia apenas:**
```json
{
  "p_access_code": "ABC123",  // QR code escaneado
  "p_session_id": "session-123",
  "p_dorsal_number": 42,      // ou null
  "p_image_data": "...",
  "p_latitude": 40.7128,
  "p_longitude": -74.0060,
  "p_captured_at": "2024-01-01T12:00:00Z"
}
```

**App NÃO precisa enviar:**
- ❌ `event_id` (resolvido automaticamente)
- ❌ `device_id` (resolvido automaticamente)
- ❌ `checkpoint_order` (resolvido automaticamente)
- ❌ `checkpoint_name` (resolvido automaticamente)
- ❌ `checkpoint_type` (resolvido automaticamente)

---

### 2. Sistema Resolve Automaticamente

Quando `process_device_detection()` é chamado, ele:

1. **Busca informações pelo `access_code`:**
```sql
SELECT 
    ed.event_id,           -- ✅ Evento
    ed.device_id,          -- ✅ Dispositivo
    ed.checkpoint_order,   -- ✅ Ordem do checkpoint
    ed.checkpoint_name,    -- ✅ Nome do checkpoint
    ed.checkpoint_type     -- ✅ Tipo do checkpoint
FROM event_devices ed
JOIN events e ON e.id = ed.event_id
WHERE ed.access_code = 'ABC123'
```

2. **Atualiza `device_detections` com essas informações:**
```sql
UPDATE device_detections
SET 
    event_id = v_device_info.event_id,          -- ✅ Preenchido
    device_id = v_device_info.device_id,        -- ✅ Preenchido
    device_order = v_device_info.checkpoint_order,  -- ✅ Preenchido
    checkpoint_name = v_device_info.checkpoint_name,  -- ✅ Preenchido
    checkpoint_type = v_device_info.checkpoint_type   -- ✅ Preenchido
WHERE id = p_detection_id;
```

---

### 3. Quando Vai para `detections` (com dorsal)

```sql
INSERT INTO detections (
    event_id,        -- ✅ Preenchido automaticamente
    device_id,       -- ✅ Preenchido automaticamente
    device_order,    -- ✅ Preenchido automaticamente (checkpoint_order)
    number,
    timestamp,
    ...
) VALUES (
    v_device_info.event_id,           -- Do access_code
    v_device_info.device_id::TEXT,    -- Do access_code
    v_device_info.checkpoint_order,    -- Do access_code
    ...
);
```

**✅ Tudo associado:**
- `event_id` → Evento correto
- `device_id` → Dispositivo correto
- `device_order` → Checkpoint correto

---

### 4. Quando Vai para `image_buffer` (sem dorsal)

```sql
INSERT INTO image_buffer (
    event_id,        -- ✅ Preenchido automaticamente
    device_id,       -- ✅ Preenchido automaticamente
    session_id,
    image_data,
    ...
) VALUES (
    v_device_info.event_id,      -- Do access_code
    v_device_info.device_id::TEXT,  -- Do access_code
    ...
);
```

**✅ Tudo associado:**
- `event_id` → Evento correto
- `device_id` → Dispositivo correto

---

## 📊 Estrutura de Dados Final

### Tabela `device_detections`

Após processamento, contém:
```sql
device_detections
├── access_code           -- Enviado pela app
├── event_id              -- ✅ Preenchido automaticamente
├── device_id             -- ✅ Preenchido automaticamente
├── device_order          -- ✅ Preenchido automaticamente (checkpoint_order)
├── checkpoint_name       -- ✅ Preenchido automaticamente
├── checkpoint_type       -- ✅ Preenchido automaticamente
├── dorsal_number         -- Enviado pela app (ou null)
├── image_data            -- Enviado pela app
└── ...
```

### Tabela `detections`

Quando tem dorsal:
```sql
detections
├── event_id              -- ✅ Do access_code
├── device_id             -- ✅ Do access_code
├── device_order          -- ✅ Do access_code (identifica checkpoint)
├── number                -- Dorsal detectado
└── ...
```

### Tabela `image_buffer`

Quando não tem dorsal:
```sql
image_buffer
├── event_id              -- ✅ Do access_code
├── device_id             -- ✅ Do access_code
├── session_id            -- Enviado pela app
└── ...
```

---

## ✅ Garantias

1. **Toda imagem sabe de qual dispositivo veio**
   - `device_id` sempre preenchido
   - Associado via `access_code` → `event_devices`

2. **Toda imagem sabe de qual evento veio**
   - `event_id` sempre preenchido
   - Associado via `access_code` → `event_devices` → `events`

3. **Toda imagem sabe de qual checkpoint veio**
   - `device_order` (checkpoint_order) sempre preenchido
   - `checkpoint_name` e `checkpoint_type` também preenchidos

4. **Rastreabilidade completa**
   - Pode rastrear: Evento → Dispositivo → Checkpoint → Imagem

---

## 🔍 Como Verificar

### Ver associações em `device_detections`

```sql
SELECT 
    id,
    access_code,
    event_id,        -- ✅ Preenchido
    device_id,       -- ✅ Preenchido
    device_order,    -- ✅ Preenchido
    checkpoint_name, -- ✅ Preenchido
    checkpoint_type, -- ✅ Preenchido
    dorsal_number,
    status
FROM device_detections
WHERE status = 'processed'
ORDER BY processed_at DESC
LIMIT 10;
```

### Ver associações em `detections`

```sql
SELECT 
    d.id,
    d.event_id,      -- ✅ Do access_code
    d.device_id,     -- ✅ Do access_code
    d.device_order,  -- ✅ Do access_code (checkpoint)
    d.number,
    d.timestamp
FROM detections d
JOIN device_detections dd ON dd.detection_id = d.id
WHERE dd.access_code = 'ABC123';
```

### Ver associações em `image_buffer`

```sql
SELECT 
    ib.id,
    ib.event_id,     -- ✅ Do access_code
    ib.device_id,    -- ✅ Do access_code
    ib.status,
    dd.checkpoint_name,
    dd.checkpoint_order
FROM image_buffer ib
JOIN device_detections dd ON dd.buffer_id = ib.id
WHERE dd.access_code = 'ABC123';
```

---

## 🎯 Resumo

**✅ SIM, já estamos fazendo tudo automaticamente!**

- App envia apenas `access_code`
- Sistema resolve tudo:
  - `event_id` ✅
  - `device_id` ✅
  - `checkpoint_order` (device_order) ✅
  - `checkpoint_name` ✅
  - `checkpoint_type` ✅

**✅ Rastreabilidade completa garantida!**

Toda imagem sabe:
- De qual dispositivo veio (`device_id`)
- De qual evento veio (`event_id`)
- De qual checkpoint veio (`device_order`, `checkpoint_name`, `checkpoint_type`)

---

## 📝 Nota Importante

**App nativa não precisa enviar:**
- `event_id`
- `device_id`
- `checkpoint_order`
- Qualquer informação do checkpoint

**Apenas precisa enviar:**
- `access_code` (QR code escaneado)
- `session_id`
- `dorsal_number` (ou null)
- `image_data`
- GPS (`latitude`, `longitude`, `accuracy`)
- `captured_at`

**Tudo o resto é resolvido automaticamente pelo sistema!**

