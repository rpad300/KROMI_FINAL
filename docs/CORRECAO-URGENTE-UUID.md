# 🚨 Correção Urgente: UUID Error

## ❌ Erro Reportado

```
[DeviceDetectionProcessor] ❌ Erro: column "device_id" is of type uuid but expression is of type text
```

## 🔧 Problema

A função `process_device_detection` estava tentando inserir TEXT em uma coluna UUID (`device_detections.device_id`).

## ✅ Solução Aplicada

### Correção na Query SELECT

**Antes:**
```sql
SELECT ed.event_id, ed.device_id, ...
```

**Depois:**
```sql
SELECT ed.event_id, 
       ed.device_id::UUID as device_id,  -- ✅ Conversão explícita na query
       ...
```

### Correção no UPDATE

**Antes:**
```sql
SET device_id = v_device_info.device_id  -- Podia estar como TEXT
```

**Depois:**
```sql
v_device_id_uuid := v_device_info.device_id::UUID;  -- Garantir tipo UUID
SET device_id = v_device_id_uuid  -- ✅ UUID para UUID
```

---

## 🚀 Como Aplicar

### Execute este SQL no Supabase:

**Arquivo:** `sql/FIX-UUID-ERROR-URGENT.sql`

Ou execute diretamente:

```sql
-- Copiar conteúdo de sql/FIX-UUID-ERROR-URGENT.sql
-- e executar no Supabase Dashboard → SQL Editor
```

---

## ✅ Verificação

Após aplicar a correção, o processamento deve funcionar sem erros.

O processador vai conseguir:
1. ✅ Buscar `device_id` como UUID
2. ✅ Atualizar `device_detections` corretamente (UUID)
3. ✅ Inserir em `detections` (UUID → TEXT)
4. ✅ Inserir em `image_buffer` (UUID → TEXT)

---

**Execute o SQL para corrigir o erro!**

