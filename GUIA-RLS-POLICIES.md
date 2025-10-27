# 🔒 Guia de RLS Policies - VisionKrono

## 📊 Estrutura da Tabela `user_profiles`

```
✅ Colunas disponíveis:
- id (uuid, PK)
- user_id (uuid) → referência a auth.users
- email (text, NOT NULL)
- profile_type (text, NOT NULL) → 'admin', 'event_manager', 'user'
- role (text, nullable, default 'user') → duplicado/legacy
- organization (text) → texto livre, não relação
- is_active (boolean, default true)
- status (text, default 'active')
- created_at, updated_at, last_login
- name, phone, avatar_url
- preferences (jsonb)

❌ Colunas que NÃO existem:
- organizer_id (uuid)
```

## 🎯 Policies Implementadas

### **1. event_configurations**

| Operação | Quem Pode | Condição |
|----------|-----------|----------|
| SELECT | Todos autenticados | `auth.uid() IS NOT NULL` |
| INSERT | admin, event_manager | `role/profile_type IN ('admin', 'event_manager')` |
| UPDATE | admin, event_manager | `role/profile_type IN ('admin', 'event_manager')` |
| DELETE | admin apenas | `role/profile_type = 'admin'` |

### **2. events**

| Operação | Quem Pode | Condição |
|----------|-----------|----------|
| SELECT | Todos autenticados | `auth.uid() IS NOT NULL` |
| INSERT | admin, event_manager | `role/profile_type IN ('admin', 'event_manager')` |
| UPDATE | admin, event_manager | `role/profile_type IN ('admin', 'event_manager')` |
| DELETE | admin apenas | `role/profile_type = 'admin'` |

## 🚀 Como Executar

### **Opção 1: Script Simplificado (RECOMENDADO)**

```bash
# Ficheiro: setup-rls-policies-simplified.sql
```

1. Vai ao **Supabase Dashboard** → **SQL Editor**
2. Clica em **New query**
3. Cola o conteúdo de "`../sql/setup-rls-policies-simplified.sql"
4. Clica em **Run** (ou `Ctrl+Enter`)

### **Opção 2: Linha a Linha (Debugging)**

Se queres testar passo a passo:

```sql
-- 1. Adicionar constraint
ALTER TABLE event_configurations 
ADD CONSTRAINT uniq_event_config UNIQUE (event_id, config_type);

-- 2. Habilitar RLS
ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 3. Criar policy de leitura
CREATE POLICY "read_event_configurations"
ON event_configurations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ... (continua com as outras)
```

## ✅ Verificação

### **Ver policies criadas:**

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('event_configurations', 'events')
ORDER BY tablename, policyname;
```

**Output esperado:**
```
schemaname | tablename              | policyname                    | cmd
-----------+------------------------+-------------------------------+--------
public     | event_configurations   | delete_event_configurations   | DELETE
public     | event_configurations   | insert_event_configurations   | INSERT
public     | event_configurations   | read_event_configurations     | SELECT
public     | event_configurations   | update_event_configurations   | UPDATE
public     | events                 | delete_events                 | DELETE
public     | events                 | insert_events                 | INSERT
public     | events                 | read_events                   | SELECT
public     | events                 | update_events                 | UPDATE
```

### **Testar policy de leitura:**

```sql
-- Deve retornar dados (se estás autenticado)
SELECT * FROM event_configurations LIMIT 5;
SELECT * FROM events LIMIT 5;
```

### **Testar policy de escrita:**

```sql
-- Deve funcionar se tens role='admin' ou 'event_manager'
INSERT INTO event_configurations (event_id, config_type, config_data)
VALUES (
    'a6301479-56c8-4269-a42d-aa8a7650a575',
    'test_config',
    '{"test": true}'::jsonb
);
```

## 🔧 Troubleshooting

### **Erro: "relation does not exist"**
```
ERROR: 42P01: relation "calibrations" does not exist
```
**Solução:** A tabela `calibrations` não existe. As calibrações estão guardadas em `event_configurations` com `config_type='calibration_complete'`.

### **Erro: "column does not exist"**
```
ERROR: 42703: column up.organizer_id does not exist
```
**Solução:** Usa o script simplificado que não depende de `organizer_id`.

### **Erro: "new row violates row-level security policy"**
```
ERROR: new row violates row-level security policy for table "event_configurations"
```
**Possíveis causas:**
1. Não estás autenticado (`auth.uid()` é NULL)
2. Teu `role`/`profile_type` não é 'admin' nem 'event_manager'
3. Policy mal configurada

**Verificar teu perfil:**
```sql
SELECT 
    user_id,
    email,
    role,
    profile_type
FROM user_profiles
WHERE user_id = auth.uid();
```

## 📝 Tipos de Configuração Suportados

Em `event_configurations`, o campo `config_type` pode ter:

| config_type | Descrição | Usado em |
|-------------|-----------|----------|
| `calibration_complete` | Calibração completa com resultados | calibration-kromi.html |
| `ai_config` | Configuração da IA | calibration-kromi.html |
| `number_area` | Área de detecção do número | calibration-kromi.html |
| `dorsal_nomenclature` | Nomenclatura dos dorsais | calibration-kromi.html |

## 🔐 Níveis de Acesso

### **Admin**
- ✅ Ler tudo
- ✅ Criar/Editar/Apagar tudo
- ✅ Gerir utilizadores
- ✅ Gerir todos os eventos

### **Event Manager**
- ✅ Ler tudo
- ✅ Criar/Editar eventos
- ✅ Configurar eventos
- ❌ Apagar eventos (só admin)
- ❌ Gerir utilizadores

### **User**
- ✅ Ler eventos/configurações
- ❌ Criar/Editar/Apagar
- ❌ Gerir utilizadores

## 🚧 Melhorias Futuras

### **Adicionar Multi-Tenancy (por organizador)**

Se quiseres implementar controlo por organizador:

```sql
-- 1. Criar tabela de organizadores
CREATE TABLE organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar coluna em user_profiles
ALTER TABLE user_profiles 
ADD COLUMN organizer_id UUID REFERENCES organizers(id);

-- 3. Adicionar coluna em events
ALTER TABLE events 
ADD COLUMN organizer_id UUID REFERENCES organizers(id);

-- 4. Atualizar policies para verificar organizer_id
-- (usar setup-rls-policies.sql em vez do simplificado)
```

### **Adicionar Audit Trail**

```sql
-- Ver quem fez o quê
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📞 Suporte

Se encontrares erros:

1. Verifica os logs do Supabase
2. Confirma que RLS está habilitado: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
3. Verifica teu perfil: `SELECT * FROM user_profiles WHERE user_id = auth.uid();`
4. Testa as queries manualmente no SQL Editor

---

**Última atualização:** 2025-10-26
**Versão do script:** setup-rls-policies-simplified.sql v1.0

