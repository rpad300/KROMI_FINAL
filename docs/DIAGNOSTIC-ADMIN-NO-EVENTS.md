# 🔍 Diagnóstico: Admin Não Vê Eventos

## ❓ Problema

User `rdias300@gmail.com` com role **admin** não está a ver eventos, mesmo havendo 1 evento (`teste1`) na base de dados.

**Evento na BD:**
```json
{
  "id": "a6301479-56c8-4269-a42d-aa8a7650a575",
  "name": "teste1",
  "organizer_id": "19f9222d-7f99-4a5e-836b-b97bdcd73a16"
}
```

## 🎯 Causas Possíveis

### 1. RLS Bloqueando Admin ⚠️ (MAIS PROVÁVEL)

**Problema:** 
- API usa ANON KEY (não service role)
- RLS está ativo na tabela `events`
- Não há policy que permite admin ver tudo

**Solução:**
```bash
# Executar no Supabase SQL Editor:
psql < fix-rls-admin-access.sql
```

Ou manualmente:
```sql
-- Criar policy para admin
CREATE POLICY "admin_all_events_select" 
ON events FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);
```

### 2. Service Role Key Não Configurada

**Verificar:**
```bash
# No servidor (onde roda Node.js)
echo $SUPABASE_SERVICE_ROLE_KEY

# Ou verificar arquivo .env
cat .env | grep SUPABASE_SERVICE_ROLE_KEY
```

**Se não estiver configurada:**
1. Ir para Supabase Dashboard → Settings → API
2. Copiar **service_role** key (NÃO é a anon key!)
3. Adicionar ao `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...sua-key-aqui
   ```
4. **Reiniciar servidor Node.js**

**Verificar logs do servidor:**
Procurar ao iniciar:
```
✅ Cliente Supabase (service role) inicializado - RLS bypassed
```

Ou:
```
⚠️ Cliente Supabase (anon key) inicializado - RLS ATIVO
```

### 3. User ID Não Coincide com Organizer ID

**Verificar:**
```sql
-- Ver ID do user admin
SELECT id, email FROM auth.users WHERE email = 'rdias300@gmail.com';

-- Ver organizer_id do evento
SELECT id, name, organizer_id FROM events WHERE name = 'teste1';

-- Ver se coincidem
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.organizer_id,
    u.id as user_id,
    u.email,
    CASE 
        WHEN e.organizer_id = u.id THEN '✅ Match'
        ELSE '❌ Diferente'
    END as status
FROM events e
CROSS JOIN auth.users u
WHERE u.email = 'rdias300@gmail.com'
AND e.name = 'teste1';
```

**Se não coincidirem e user for moderator:**
- Moderator só vê eventos onde `organizer_id = user.id`
- **Admin deveria ver TODOS** (independente do organizer_id)

## 🚀 Plano de Ação

### Passo 1: Verificar Service Role Key

```bash
# No servidor
cd /caminho/do/projeto
cat .env | grep SUPABASE_SERVICE_ROLE_KEY
```

**Se vazio ou não existir:**
1. Obter do Supabase Dashboard
2. Adicionar ao `.env`
3. **Reiniciar servidor**
4. Verificar logs mostram "service role"

### Passo 2: Executar SQL de Correção

No Supabase SQL Editor:
```sql
-- Copiar conteúdo de fix-rls-admin-access.sql
-- Executar
```

Ou usar CLI:
```bash
psql "postgresql://..." < fix-rls-admin-access.sql
```

### Passo 3: Testar no Browser

Abrir:
```
https://192.168.1.219:1144/test-events-direct.html
```

Executar testes:
1. Testar API REST
2. Testar Supabase Direto
3. Verificar User e Permissões
4. Testar RLS

**Ou no console de `events-kromi.html`:**
```javascript
// Testar API
await testAPI()

// Testar Supabase direto
await testSupabase()

// Debug completo
debugEvents()
```

### Passo 4: Verificar Logs

**No servidor Node.js**, procurar:
```
📋 [GET /api/events/list] Utilizador: rdias300@gmail.com Role: admin
👑 [GET /api/events/list] Admin - sem filtros (vê tudo)
✅ [GET /api/events/list] 1 evento(s) retornado(s) para admin
📊 [GET /api/events/list] Primeiro evento: { id: '...', name: 'teste1' }
```

**Se mostrar 0 eventos:**
```
✅ [GET /api/events/list] 0 evento(s) retornado(s) para admin
```

→ RLS está bloqueando!

## 🔧 Soluções Rápidas

### Solução Temporária (DEBUG APENAS)

**Desativar RLS temporariamente:**
```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
```

**Testar API novamente.**

**Se funcionar:**
- ✅ Confirmado: problema é RLS
- 🔧 Executar "`../sql/fix-rls-admin-access.sql"
- ✅ Reativar RLS:
  ```sql
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  ```

### Solução Definitiva

**Opção A: Usar Service Role (Recomendado)**
1. Configurar `SUPABASE_SERVICE_ROLE_KEY` no `.env`
2. Reiniciar servidor
3. RLS é bypassed automaticamente
4. Escopo é controlado no código (já implementado!)

**Opção B: Policies Corretas**
1. Manter ANON KEY
2. Executar "`../sql/fix-rls-admin-access.sql"
3. Policies permitem admin ver tudo
4. RLS continua ativo (mais seguro para client-side)

## ✅ Verificação Final

Após aplicar solução:

```javascript
// No console de events-kromi.html
await testAPI()
```

**Output esperado:**
```json
{
  "success": true,
  "events": [
    {
      "id": "a6301479-56c8-4269-a42d-aa8a7650a575",
      "name": "teste1",
      "organizer_id": "19f9222d-7f99-4a5e-836b-b97bdcd73a16",
      ...
    }
  ],
  "count": 1,
  "scope": "all"
}
```

**Na UI:**
- ✅ Card do evento "teste1" aparece
- ✅ Estatísticas mostram "1 Eventos Ativos"
- ✅ Click no card abre config do evento

## 📝 Resumo

**Problema:** Admin não vê eventos (0 retornados)  
**Causa:** RLS bloqueando + falta de policy para admin  
**Solução:** Executar "`../sql/fix-rls-admin-access.sql" OU configurar Service Role Key  
**Verificação:** `testAPI()` no console deve retornar eventos  

---

**Arquivos envolvidos:**
- `events-routes.js` - ✅ Corrigido (escopo por role)
- "`../sql/fix-rls-admin-access.sql" - 🆕 Criar policies corretas
- `test-events-direct.html` - 🆕 Ferramenta de diagnóstico
- `events-kromi.html` - ✅ Melhorado (debug commands)

