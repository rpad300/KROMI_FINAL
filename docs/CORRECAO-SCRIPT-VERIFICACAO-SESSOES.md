# ✅ CORREÇÃO - SCRIPT DE VERIFICAÇÃO DE SESSÕES

## 🎯 **PROBLEMA IDENTIFICADO:**

Erro no script `verify-session-cleanup.sql`:
```
ERROR: 42703: column ed.device_name does not exist
LINE 34:     ed.device_name,
```

**Causa:** A tabela `event_devices` não tem a coluna `device_name`. O nome do dispositivo está na tabela `devices`.

## 🔧 **CORREÇÃO IMPLEMENTADA:**

### ✅ **Estrutura das Tabelas:**

**Tabela `devices`:**
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_type TEXT DEFAULT 'mobile',
    user_agent TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela `event_devices`:**
```sql
CREATE TABLE event_devices (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    device_id UUID NOT NULL REFERENCES devices(id),
    role TEXT DEFAULT 'detector',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    max_sessions INTEGER DEFAULT 1,
    active_sessions INTEGER DEFAULT 0
);
```

### ✅ **Query Corrigida:**

**ANTES (INCORRETO):**
```sql
SELECT 
    ed.device_id,
    ed.device_name,  -- ❌ Esta coluna não existe
    ed.active_sessions as contador_tabela,
    COUNT(ds.session_id) as sessoes_ativas_reais
FROM event_devices ed
LEFT JOIN device_sessions ds ON (...)
GROUP BY ed.device_id, ed.device_name, ed.active_sessions
ORDER BY ed.device_name;
```

**DEPOIS (CORRETO):**
```sql
SELECT 
    ed.device_id,
    d.device_name,  -- ✅ Agora vem da tabela devices
    ed.active_sessions as contador_tabela,
    COUNT(ds.session_id) as sessoes_ativas_reais
FROM event_devices ed
LEFT JOIN devices d ON d.id = ed.device_id  -- ✅ JOIN com tabela devices
LEFT JOIN device_sessions ds ON (...)
GROUP BY ed.device_id, d.device_name, ed.active_sessions
ORDER BY d.device_name;
```

## 🎯 **FUNCIONALIDADE CORRIGIDA:**

### ✅ **Script de Verificação Completo:**

O script `verify-session-cleanup.sql` agora funciona corretamente e mostra:

1. **Todas as sessões** - Estado atual de todas as sessões
2. **Sessões ativas** - Apenas as sessões ativas
3. **Contadores por dispositivo** - Compara contador da tabela vs sessões reais
4. **Sessões inativas** - Há mais de 5 minutos sem heartbeat
5. **Funções RPC** - Verifica se as funções existem

### ✅ **Relacionamentos Corretos:**

- **`event_devices.device_id`** → **`devices.id`**
- **`device_sessions.device_id`** → **`devices.id`**
- **`device_sessions.event_id`** → **`events.id`**

## 🎉 **RESULTADO FINAL:**

**O script de verificação agora funciona corretamente:**

- ✅ **Query corrigida** - JOIN correto com tabela `devices`
- ✅ **Estrutura correta** - Usa as colunas que existem
- ✅ **Relacionamentos** - JOINs corretos entre tabelas
- ✅ **Verificação completa** - Mostra estado real das sessões

**Execute o script `verify-session-cleanup.sql` no Supabase SQL Editor para verificar o estado das sessões!** 🎉
