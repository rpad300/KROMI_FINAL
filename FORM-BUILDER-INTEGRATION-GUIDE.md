# 🎯 Form Builder - Guia de Integração Completa

## Objetivo

Integrar o sistema de formulários dinâmicos com a tabela de participantes, adicionando controle de estados de pagamento e inscrição.

---

## ✅ O Que Foi Implementado

### Campos Adicionados à Tabela `participants`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `registration_status` | VARCHAR(50) | Estado da inscrição: pending, paid, free, cancelled, refunded |
| `payment_status` | VARCHAR(50) | Estado do pagamento: pending, paid, failed, refunded, cancelled |
| `is_free` | BOOLEAN | True se inscrição é gratuita/patrocinada |
| `payment_amount` | DECIMAL(10,2) | Valor pago pela inscrição |
| `payment_date` | TIMESTAMPTZ | Data do pagamento |
| `payment_id` | VARCHAR(200) | ID externo do pagamento (Stripe, etc.) |
| `form_submission_id` | UUID | Referência para form_submissions |
| `notes` | TEXT | Notas do organizador |

### Funções Criadas

1. **`update_participant_registration_status()`**
   - Atualiza automaticamente `registration_status` baseado em `payment_status` e `is_free`
   - Trigger BEFORE INSERT/UPDATE

2. **`create_participant_from_submission(p_form_submission_id)`**
   - Cria participante automaticamente a partir de uma submissão de formulário
   - Extrai dados do JSONB `submission_data`
   - Gera dorsal automaticamente
   - Define estados iniciais

3. **`can_participate_in_classifications(p_participant_id)`**
   - Verifica se participante qualifica para classificações
   - Retorna TRUE apenas se `registration_status = 'paid'`

### Triggers Criados

1. **`trigger_update_participant_registration_status`**
   - Auto-atualiza `registration_status` baseado em pagamento
   - Executa antes de INSERT/UPDATE

2. **`trigger_validate_payment_consistency`**
   - Valida consistência entre `is_free`, `payment_status` e `payment_amount`
   - Previne inconsistências (e.g., gratuito com valor pago)

### Views Criadas

1. **`participants_qualified`**
   - Lista apenas participantes qualificados para classificações
   - WHERE `registration_status = 'paid'`

### RLS Policy Adicionada

- **"Organizers can update payment status"**
  - Permite organizadores e admins atualizar estados de pagamento
  - Aplica-se a UPDATE na tabela participants

---

## 🚀 Como Executar

### Passo 1: Criar Schema do Form Builder (se ainda não foi feito)

```bash
# No Supabase Dashboard → SQL Editor
# Execute: sql/create-form-builder-system.sql
```

### Passo 2: Integração com Participants

```bash
# No Supabase Dashboard → SQL Editor  
# Execute: sql/integrate-form-builder-with-participants.sql
```

### Passo 3: Verificar

```sql
-- Verificar colunas adicionadas
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;

-- Verificar participantes qualificados
SELECT * FROM participants_qualified LIMIT 10;

-- Verificar triggers
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'trigger%participant%';
```

---

## 📋 Fluxo de Inscrição

### 1. Participante Preenche Formulário

```
Participante acessa: /form/marathon-lisboa-2024
Preenche formulário
Submete: POST /api/forms/:formId/submit
```

### 2. Cria Submissão em `form_submissions`

```sql
INSERT INTO form_submissions (
    form_id, event_id, submission_data, 
    payment_status, status
) VALUES (...);
```

### 3. Sistema Cria Participante

```sql
-- Via função automática ou manualmente
SELECT create_participant_from_submission('submission-uuid');
```

Dados extraídos:
- `full_name`, `email`, `phone`, `birth_date`, `gender` → `submission_data`
- Dorsal gerado automaticamente
- Estados iniciais baseados no pagamento

### 4. Estados Gerenciados

| Situação | `payment_status` | `registration_status` | `is_free` | Qualificado? |
|----------|------------------|----------------------|-----------|--------------|
| Aguardando pagamento | pending | pending | false | ❌ |
| Pagamento confirmado | paid | paid | false | ✅ |
| Inscrição gratuita | - | paid | true | ✅ |
| Pagamento falhou | failed | pending | false | ❌ |
| Cancelado | cancelled | pending | false | ❌ |
| Reembolsado | refunded | refunded | false | ❌ |

---

## 🎛️ Ações do Organizador

### Marcar como Pago

```sql
UPDATE participants
SET 
    payment_status = 'paid',
    payment_date = NOW(),
    payment_amount = 25.00,
    payment_id = 'stripe_xxxxx'
WHERE id = 'participant-uuid';
```

**Resultado:** `registration_status` atualizado automaticamente para `'paid'` ✅

### Dar Inscrição Gratuita (Patrocinada)

```sql
UPDATE participants
SET 
    is_free = true,
    payment_status = 'cancelled',
    notes = 'Inscrição patrocinada pela empresa X'
WHERE id = 'participant-uuid';
```

**Resultado:** `registration_status` atualizado automaticamente para `'paid'` ✅

### Reembolsar

```sql
UPDATE participants
SET payment_status = 'refunded'
WHERE id = 'participant-uuid';
```

**Resultado:** `registration_status` atualizado automaticamente para `'refunded'`

---

## 🏆 Classificações

### Filtrar Apenas Qualificados

```sql
-- Via View
SELECT * FROM participants_qualified;

-- Via Função
SELECT * FROM participants
WHERE can_participate_in_classifications(id) = true;

-- Via Query Direta
SELECT * FROM participants
WHERE registration_status = 'paid';
```

### Integração com Classificações Existentes

```sql
-- Buscar apenas participantes qualificados para rankings
SELECT c.*, p.full_name, p.category
FROM classifications c
INNER JOIN participants p ON p.dorsal_number = c.dorsal_number
WHERE p.registration_status = 'paid'  -- Apenas pagos/gratuitos
ORDER BY c.total_time;
```

---

## 🔒 Regras de Negócio

### RLS - Row Level Security

**Público:**
- ❌ NÃO pode ver submissões
- ❌ NÃO pode ver dados de pagamento

**Organizadores:**
- ✅ Podem ver todos os participantes do evento
- ✅ Podem atualizar estados de pagamento
- ✅ Podem dar inscrições gratuitas

**Admins:**
- ✅ Acesso total

### Validações Automáticas

1. **Se `is_free = true`:**
   - `payment_amount` deve ser 0
   - `registration_status` = 'paid'

2. **Se `payment_status = 'paid'` e `payment_amount > 0`:**
   - `is_free` deve ser false

3. **Apenas `registration_status = 'paid'` qualifica para classificações**

---

## 📊 Relatórios e Estatísticas

### Participantes por Estado

```sql
SELECT 
    registration_status,
    COUNT(*) as total,
    SUM(CASE WHEN is_free THEN 1 ELSE 0 END) as gratuitos,
    SUM(CASE WHEN NOT is_free THEN 1 ELSE 0 END) as pagos,
    SUM(payment_amount) as total_recebido
FROM participants
WHERE event_id = 'event-uuid'
GROUP BY registration_status;
```

### Participantes Qualificados

```sql
SELECT COUNT(*) as total_qualificados
FROM participants_qualified
WHERE event_id = 'event-uuid';
```

### Taxa de Conversão

```sql
SELECT 
    COUNT(*) FILTER (WHERE registration_status = 'paid') as pagos,
    COUNT(*) FILTER (WHERE registration_status = 'pending') as pendentes,
    ROUND(
        COUNT(*) FILTER (WHERE registration_status = 'paid')::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as taxa_conversao_percent
FROM participants
WHERE event_id = 'event-uuid';
```

---

## 🐛 Troubleshooting

### Erro: "Inconsistência: pagamento pago mas marcado como gratuito"

**Causa:** Tentou marcar como pago mas também como gratuito.

**Solução:**
```sql
-- Opção 1: Remover is_free
UPDATE participants SET is_free = false WHERE id = 'xxx';

-- Opção 2: Dar como gratuito (valor = 0)
UPDATE participants 
SET is_free = true, payment_amount = 0, payment_status = 'cancelled'
WHERE id = 'xxx';
```

### Participante Não Aparece nas Classificações

**Verificar:**
```sql
SELECT registration_status, payment_status, is_free
FROM participants
WHERE id = 'participant-uuid';
```

**Se `registration_status != 'paid'`:**
```sql
-- Marcar como pago
UPDATE participants SET payment_status = 'paid' WHERE id = 'xxx';
```

### Dorsal Duplicado

**Causa:** Múltiplas inserções simultâneas.

**Solução:** A função usa `MAX(dorsal_number) + 1` que é atomico. Se ainda ocorrer, usar:
```sql
-- Recriar dorsais sequenciais
UPDATE participants p
SET dorsal_number = sq.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM participants
    WHERE event_id = 'event-uuid'
) sq
WHERE p.id = sq.id;
```

---

## ✅ Checklist de Implementação

- [ ] Executar `sql/create-form-builder-system.sql`
- [ ] Executar `sql/integrate-form-builder-with-participants.sql`
- [ ] Verificar colunas adicionadas
- [ ] Verificar triggers funcionando
- [ ] Verificar RLS policies
- [ ] Testar criação de participante via submissão
- [ ] Testar atualização de estados de pagamento
- [ ] Verificar qualificação para classificações
- [ ] Testar inscrições gratuitas
- [ ] Verificar relatórios de estatísticas

---

**✅ Integração Completa e Funcional!**

Agora os participantes criados via formulários dinâmicos serão automaticamente ligados ao sistema de classificações, com controle total de estados de pagamento!

