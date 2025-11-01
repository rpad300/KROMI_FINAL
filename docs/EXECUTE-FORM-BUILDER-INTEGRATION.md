# 🚀 Executar Integração Form Builder - Instructions

## ⚠️ IMPORTANTE

Você precisa ter acesso ao **Supabase Dashboard** para executar os SQLs.

Eu **não posso executar** SQL diretamente no seu Supabase porque:
1. Não tenho acesso ao Service Role Key no contexto desta sessão
2. Por segurança, você deve executar manualmente

---

## 📋 Passos para Executar

### 1️⃣ Acessar Supabase

```
1. Abra: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em "SQL Editor" no menu lateral
4. Clique em "New Query"
```

### 2️⃣ Executar Schema do Form Builder

**SE AINDA NÃO EXECUTOU:**

```sql
-- Copie TODO o conteúdo de:
-- sql/create-form-builder-system.sql

-- Cole no SQL Editor
-- Clique em "Run" ou Ctrl+Enter
```

**Verificar:**
```sql
SELECT COUNT(*) FROM form_field_catalog;
-- Deve retornar: 10 (campos iniciais)
```

### 3️⃣ Executar Integração com Participants

**Copie TODO o conteúdo de:**
```
sql/integrate-form-builder-with-participants.sql
```

**Cole no SQL Editor e execute:**

```sql
-- O SQL vai:
-- 1. Adicionar 8 colunas à tabela participants
-- 2. Criar 3 funções SQL
-- 3. Criar 2 triggers
-- 4. Criar 1 view
-- 5. Adicionar 1 RLS policy
-- 6. Criar índices

-- Aguarde alguns segundos
```

### 4️⃣ Verificar Sucesso

Execute estas queries de verificação:

```sql
-- 1. Verificar colunas adicionadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'participants'
AND column_name IN (
    'registration_status', 'payment_status', 'is_free',
    'payment_amount', 'payment_date', 'payment_id',
    'form_submission_id', 'notes'
)
ORDER BY ordinal_position;

-- Deve retornar 8 linhas

-- 2. Verificar funções criadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
    'update_participant_registration_status',
    'create_participant_from_submission',
    'can_participate_in_classifications'
);

-- Deve retornar 3 linhas

-- 3. Verificar triggers
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname IN (
    'trigger_update_participant_registration_status',
    'trigger_validate_payment_consistency'
);

-- Deve retornar 2 linhas (status 'O' = enabled)

-- 4. Verificar view
SELECT * FROM information_schema.views
WHERE table_name = 'participants_qualified';

-- Deve retornar 1 linha

-- 5. Testar trigger - atualizar participante
-- (Substitua 'xxx' por um ID real de participante se tiver)
UPDATE participants 
SET payment_status = 'paid'
WHERE id IN (SELECT id FROM participants LIMIT 1);

-- Verificar se registration_status foi atualizado
SELECT id, payment_status, registration_status, is_free
FROM participants
WHERE id IN (SELECT id FROM participants LIMIT 1);
```

### 5️⃣ Testar Criação de Participante via Submissão

**Se já tiver uma submissão de formulário:**

```sql
-- Buscar uma submissão para testar
SELECT id, event_id, submission_data
FROM form_submissions
LIMIT 1;

-- Testar criação de participante (substitua ID real)
SELECT create_participant_from_submission('submission-uuid-aqui');

-- Verificar se foi criado
SELECT * FROM participants
WHERE form_submission_id = 'submission-uuid-aqui';
```

---

## 🔄 Se Houver Erros

### Erro: "relation does not exist"

**Causa:** Tabela `form_submissions` não existe.

**Solução:** Execute primeiro `sql/create-form-builder-system.sql`

### Erro: "column already exists"

**Causa:** Colunas já foram adicionadas anteriormente.

**Solução:** O SQL usa `IF NOT EXISTS`, então é seguro re-executar. Ignore o erro.

### Erro: "duplicate key value"

**Causa:** Trigger criado duas vezes.

**Solução:** O SQL usa `DROP TRIGGER IF EXISTS`, então é seguro re-executar.

### Erro: "function already exists"

**Causa:** Função já foi criada.

**Solução:** O SQL usa `CREATE OR REPLACE FUNCTION`, então é seguro re-executar.

---

## ✅ Checklist Final

Marque quando completar:

- [ ] Acessei o Supabase Dashboard
- [ ] Executei `sql/create-form-builder-system.sql`
- [ ] Verifiquei que `form_field_catalog` tem 10 registros
- [ ] Executei `sql/integrate-form-builder-with-participants.sql`
- [ ] Verifiquei que 8 colunas foram adicionadas
- [ ] Verifiquei que 3 funções foram criadas
- [ ] Verifiquei que 2 triggers estão ativos
- [ ] Verifiquei que a view existe
- [ ] Testei atualização de payment_status
- [ ] Verifiquei trigger funciona (registration_status atualiza)
- [ ] Li a documentação: `FORM-BUILDER-INTEGRATION-GUIDE.md`

---

## 📚 Próximos Passos

Após executar com sucesso:

1. **Reiniciar servidor:**
   ```bash
   node server.js
   ```

2. **Testar API:**
   - Criar formulário via API
   - Adicionar campos
   - Publicar
   - Submeter
   - Ver participante criado

3. **Ler documentação:**
   - `FORM-BUILDER-QUICK-START.md`
   - `FORM-BUILDER-INTEGRATION-GUIDE.md`
   - `README-FORM-BUILDER.md`

---

**🎉 Pronto! O sistema está integrado!**

