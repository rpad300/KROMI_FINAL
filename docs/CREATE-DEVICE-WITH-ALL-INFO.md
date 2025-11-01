# 📱 Criar Dispositivo com Todas as Informações

## 🎯 Visão Geral

Quando você cria um dispositivo e o associa a um evento, **todas as informações necessárias** são preenchidas automaticamente para que a app nativa possa fazer login via QR code.

---

## ✅ O que é Preenchido Automaticamente

Quando cria/atualiza um dispositivo em `event_devices`, o sistema garante:

1. ✅ **`access_code`** - Código QR gerado automaticamente (6 caracteres)
2. ✅ **`checkpoint_name`** - Nome do checkpoint (padrão se não fornecido)
3. ✅ **`checkpoint_type`** - Tipo do checkpoint (padrão: 'checkpoint')
4. ✅ **`checkpoint_order`** - Ordem no percurso (calculado automaticamente)
5. ✅ **`max_sessions`** - Máximo de sessões (padrão: 1)
6. ✅ **`active_sessions`** - Sessões ativas (padrão: 0)

---

## 🔧 Como Criar Dispositivo

### Opção 1: Usando a Função Auxiliar (Recomendado)

```sql
SELECT create_device_for_event(
    p_event_id := 'uuid-do-evento',
    p_device_name := 'iPhone João',
    p_device_type := 'mobile',
    p_checkpoint_name := 'Meta Principal',     -- Opcional
    p_checkpoint_type := 'finish',             -- Opcional
    p_checkpoint_order := 1,                    -- Opcional (calcula automaticamente)
    p_device_pin := '123456',                  -- Opcional
    p_max_sessions := 1                        -- Opcional (padrão: 1)
);
```

### Opção 2: INSERT Direto (Trigger Preenche Automaticamente)

```sql
-- 1. Criar dispositivo
INSERT INTO devices (device_name, device_type)
VALUES ('Samsung Maria', 'mobile')
RETURNING id;

-- 2. Associar ao evento (trigger preenche tudo automaticamente)
INSERT INTO event_devices (
    event_id,
    device_id,
    checkpoint_name,      -- Opcional (se não fornecer, usa padrão)
    checkpoint_type,      -- Opcional (se não fornecer, usa 'checkpoint')
    checkpoint_order,     -- Opcional (calcula automaticamente)
    device_pin,           -- Opcional
    max_sessions          -- Opcional (padrão: 1)
) VALUES (
    'uuid-do-evento',
    'uuid-do-device',
    'Meta Principal',
    'finish',
    1,
    '123456',
    1
);
```

### Opção 3: Via Interface Web

Quando você cria dispositivo pela interface web (`devices-kromi.html`), ele já chama o INSERT e o trigger preenche automaticamente.

---

## 📋 Campos que Devem ser Preenchidos

### Obrigatórios (preenchidos automaticamente)

- `access_code` - Gerado pelo trigger
- `checkpoint_name` - Padrão: 'Checkpoint #N'
- `checkpoint_type` - Padrão: 'checkpoint'
- `checkpoint_order` - Calculado automaticamente
- `max_sessions` - Padrão: 1
- `active_sessions` - Padrão: 0

### Opcionais (recomendados preencher)

- `checkpoint_name` - Nome descritivo (ex: "Meta Principal", "Km 21")
- `checkpoint_type` - Tipo específico ('start', 'checkpoint', 'finish', 'lap_counter')
- `checkpoint_order` - Ordem no percurso (1, 2, 3, ...)
- `device_pin` - PIN de segurança (6 dígitos)
- `max_sessions` - Máximo de sessões simultâneas

---

## 🔍 Verificar Informações do Dispositivo

### Ver todos os dispositivos de um evento

```sql
SELECT * FROM device_qr_info
WHERE event_id = 'uuid-do-evento'
ORDER BY checkpoint_order;
```

### Ver dispositivo específico pelo QR code

```sql
SELECT * FROM device_qr_info
WHERE access_code = 'ABC123';
```

### Ver dispositivos com informações incompletas

```sql
SELECT 
    ed.id,
    ed.access_code,
    ed.checkpoint_name,
    ed.checkpoint_type,
    ed.checkpoint_order,
    e.name as event_name
FROM event_devices ed
JOIN events e ON e.id = ed.event_id
WHERE ed.access_code IS NULL 
   OR ed.checkpoint_name IS NULL 
   OR ed.checkpoint_type IS NULL 
   OR ed.checkpoint_order IS NULL;
```

---

## 🔄 Atualizar Informações de Dispositivo Existente

```sql
UPDATE event_devices
SET 
    checkpoint_name = 'Meta Principal',
    checkpoint_type = 'finish',
    checkpoint_order = 3,
    device_pin = '654321',
    max_sessions = 2
WHERE event_id = 'uuid-do-evento'
  AND device_id = 'uuid-do-device';
```

---

## ✅ Checklist ao Criar Dispositivo

- [ ] Dispositivo criado na tabela `devices`
- [ ] Associado ao evento na tabela `event_devices`
- [ ] `access_code` gerado automaticamente (verificar com `SELECT access_code FROM event_devices WHERE device_id = '...'`)
- [ ] `checkpoint_name` preenchido (mesmo que seja padrão)
- [ ] `checkpoint_type` definido corretamente
- [ ] `checkpoint_order` definido (sequencial)
- [ ] `device_pin` definido (se necessário)
- [ ] Testar login na app com QR code

---

## 📱 App Nativa: Login com QR Code

Depois de criar dispositivo, a app nativa pode fazer login:

```kotlin
// 1. Escanear QR code
val qrCode = "ABC123"  // access_code

// 2. Buscar informações
val deviceInfo = supabase.rpc("get_device_info_by_qr") {
    set("p_access_code", qrCode)
}.decodeSingle<DeviceInfo>()

// deviceInfo contém:
// - event_id, event_name
// - device_id, device_name
// - checkpoint_name, checkpoint_type, checkpoint_order
// - device_pin
// - max_sessions, active_sessions
// - can_create_session
```

---

## 🔧 Troubleshooting

### Problema: access_code não foi gerado

**Solução:**
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'trigger_auto_generate_access_code';

-- Gerar manualmente se necessário
UPDATE event_devices
SET access_code = generate_access_code()
WHERE access_code IS NULL;
```

### Problema: Informações incompletas

**Solução:**
```sql
-- Executar script de preenchimento
-- sql/auto-fill-device-info-on-create.sql
```

### Problema: App não consegue fazer login

**Solução:**
1. Verificar se `access_code` existe:
```sql
SELECT access_code FROM event_devices WHERE device_id = '...';
```

2. Verificar se view retorna dados:
```sql
SELECT * FROM device_qr_info WHERE access_code = 'ABC123';
```

3. Verificar se todas as informações estão preenchidas:
```sql
SELECT 
    access_code,
    checkpoint_name,
    checkpoint_type,
    checkpoint_order
FROM event_devices
WHERE device_id = '...';
```

---

## 📝 Exemplo Completo

```sql
-- 1. Criar evento (se não existir)
INSERT INTO events (name, event_date, status)
VALUES ('Corrida 2024', '2024-06-15', 'active')
RETURNING id;

-- 2. Criar dispositivo completo
SELECT create_device_for_event(
    p_event_id := (SELECT id FROM events WHERE name = 'Corrida 2024'),
    p_device_name := 'iPhone Checkpoint 1',
    p_device_type := 'mobile',
    p_checkpoint_name := 'Meta Principal',
    p_checkpoint_type := 'finish',
    p_checkpoint_order := 1,
    p_device_pin := '123456',
    p_max_sessions := 1
);

-- 3. Verificar QR code gerado
SELECT access_code, checkpoint_name, checkpoint_order
FROM device_qr_info
WHERE event_name = 'Corrida 2024';

-- 4. Testar login (app nativa)
-- Escanear QR code com access_code retornado acima
```

---

## 🔗 Arquivos Relacionados

- `sql/auto-fill-device-info-on-create.sql` - Script de preenchimento automático
- `sql/add-access-code.sql` - Sistema de QR codes
- `sql/native-app-detections-table.sql` - Sistema de recolha de dados
- `docs/NATIVE-APP-DATA-COLLECTION.md` - Documentação completa

