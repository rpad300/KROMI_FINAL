# ✅ Correção: Device ID UUID Conversion

## 🔧 Problema Identificado

A equipe de desenvolvimento da app reportou:
- `device_id` retornado por `get_device_info_by_qr` é UUID: `"7d76e379-d4cd-4f69-9cc4-a95c4c113f72"`
- Quando o backend usa esse valor em `process_device_detection`, precisa garantir conversão explícita para UUID

## ✅ Solução Implementada

### 1. Função `process_device_detection` Atualizada

**Antes:**
```sql
UPDATE device_detections
SET device_id = v_device_info.device_id,  -- Sem conversão explícita
```

**Depois:**
```sql
-- Conversão explícita para UUID
v_device_id_uuid := v_device_info.device_id::UUID;

UPDATE device_detections
SET device_id = v_device_id_uuid,  -- Usar variável UUID explícita
```

### 2. Conversões para Tabelas Diferentes

**device_detections:** Usa UUID (mantém UUID)
```sql
device_id = v_device_id_uuid  -- UUID
```

**detections:** Usa TEXT (converte UUID → TEXT)
```sql
device_id = v_device_id_uuid::TEXT  -- UUID → TEXT
```

**image_buffer:** Usa TEXT (converte UUID → TEXT)
```sql
device_id = v_device_id_uuid::TEXT  -- UUID → TEXT
```

---

## 📋 Tipos de Dados por Tabela

| Tabela | device_id Type | Conversão Necessária |
|--------|---------------|---------------------|
| `device_qr_info` (view) | UUID | ✅ Já é UUID |
| `event_devices` | UUID | ✅ Já é UUID |
| `device_detections` | UUID | ✅ Usa UUID diretamente |
| `detections` | TEXT | 🔄 UUID → TEXT |
| `image_buffer` | TEXT | 🔄 UUID → TEXT |

---

## 🔍 Queries de Verificação

Execute no Supabase SQL Editor para verificar tipos:

```sql
-- Ver estrutura da view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'device_qr_info' 
AND column_name = 'device_id';

-- Ver estrutura das tabelas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('device_detections', 'detections', 'image_buffer')
AND column_name = 'device_id'
ORDER BY table_name;

-- Ver dados de exemplo
SELECT access_code, device_id, pg_typeof(device_id) as device_id_type
FROM device_qr_info 
LIMIT 5;
```

---

## ✅ Arquivos Atualizados

1. **`sql/SETUP-COMPLETO-APP-NATIVA.sql`** - Função `process_device_detection` corrigida
2. **`sql/FIX-DEVICE-ID-UUID-CONVERSION.sql`** - Script standalone de correção

---

## 🚀 Como Aplicar

### Opção 1: Executar Script de Correção (Recomendado)

```bash
node scripts/run-sql.js sql/FIX-DEVICE-ID-UUID-CONVERSION.sql
```

Ou execute diretamente no Supabase Dashboard → SQL Editor.

### Opção 2: Executar Script Completo Novamente

```bash
node scripts/run-sql.js sql/SETUP-COMPLETO-APP-NATIVA.sql
```

(O script principal já foi atualizado com a correção)

---

## ✅ Resultado

Agora a função `process_device_detection`:
1. ✅ Converte `device_id` explicitamente para UUID antes de usar
2. ✅ Garante tipo correto em `device_detections` (UUID)
3. ✅ Converte para TEXT ao inserir em `detections` (TEXT)
4. ✅ Converte para TEXT ao inserir em `image_buffer` (TEXT)

**Problema resolvido!** 🎉

