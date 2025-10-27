# ⚡ Fix Rápido: Admin Não Vê Eventos

## 🎯 Problema
User `rdias300@gmail.com` (admin) não vê o evento `teste1` que existe na BD.

## 🔧 Soluções (Escolher UMA)

### ✅ Solução 1: Service Role Key (RECOMENDADO - 2 min)

**No servidor Node.js:**

1. **Verificar se service role está configurada:**
   ```bash
   cat .env | grep SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Se não estiver:**
   - Ir para Supabase Dashboard → Settings → API
   - Copiar **service_role** secret (NÃO anon!)
   - Adicionar ao `.env`:
     ```env
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

3. **Reiniciar servidor:**
   ```bash
   # Parar servidor (Ctrl+C)
   npm start
   # ou
   node server.js
   ```

4. **Verificar logs mostram:**
   ```
   ✅ Cliente Supabase (service role) inicializado - RLS bypassed
   ```

5. **Recarregar página** (`Ctrl+F5`)

**Por que funciona:**
- Service role bypassa RLS automaticamente
- Admin vê TODOS os eventos
- Código já tem escopo implementado (admin=all, moderator=own)

---

### ✅ Solução 2: Policies RLS (se não tiver service role - 5 min)

**No Supabase SQL Editor:**

```sql
-- Criar policy para admin ver TUDO
CREATE POLICY "admin_all_events_select" 
ON events FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- Ativar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

**Ou executar o arquivo completo:**
```bash
psql "sua-connection-string" < fix-rls-admin-access.sql
```

---

### ✅ Solução 3: Debug Temporário (NÃO PARA PRODUÇÃO - 30 seg)

**Apenas para confirmar que é RLS:**

```sql
-- Desativar RLS temporariamente
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
```

**Recarregar página** → eventos devem aparecer

**Se funcionar:**
- ✅ Confirmado: era RLS
- 🔧 Aplicar Solução 1 ou 2
- ✅ Reativar RLS:
  ```sql
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  ```

## 🧪 Testar

### No Browser Console:

```javascript
// Testar API
await testAPI()

// Deve retornar:
{
  success: true,
  events: [{ id: "a6301479...", name: "teste1", ... }],
  count: 1,
  scope: "all"
}

// Testar Supabase direto
await testSupabase()

// Debug completo
debugEvents()
```

### Ou abrir página de teste:
```
https://192.168.1.219:1144/test-events-direct.html
```

## ✅ Resultado Esperado

**Console de events-kromi.html:**
```
📋 [GET /api/events/list] Utilizador: rdias300@gmail.com Role: admin ID: ...
👑 [GET /api/events/list] Admin - sem filtros (vê tudo)
✅ [GET /api/events/list] 1 evento(s) retornado(s) para admin
📊 [GET /api/events/list] Primeiro evento: { id: 'a6301479...', name: 'teste1', organizer_id: '19f9222d...' }
```

**Na UI:**
- ✅ Card "teste1" aparece
- ✅ Estatísticas: "1 Eventos Ativos"
- ✅ Click abre evento

## 🎓 Entendendo o Problema

### RLS (Row Level Security)

**Com ANON KEY (client browser):**
- RLS **está ativo**
- Cada query verifica policies
- Se não há policy para admin → retorna 0 eventos

**Com SERVICE ROLE KEY (server Node.js):**
- RLS **é bypassed** automaticamente
- Vê todos os dados
- Escopo é controlado no código

### Escopo Implementado

**events-routes.js agora tem:**
```javascript
if (userRole === 'admin') {
    // Sem filtro - vê TUDO
} else if (userRole === 'moderator') {
    // Filtro por organizer_id - vê só seus eventos
    query = query.eq('organizer_id', userId);
}
```

## 📊 Checklist de Verificação

- [ ] Verificar service role key configurada no `.env`
- [ ] Reiniciar servidor Node.js
- [ ] Verificar logs mostram "service role" (não "anon key")
- [ ] **OU** executar "`../sql/fix-rls-admin-access.sql" no Supabase
- [ ] Recarregar página com `Ctrl+F5`
- [ ] Executar `testAPI()` no console
- [ ] Verificar eventos aparecem na grid
- [ ] Testar click em evento

## 🆘 Se Ainda Não Funcionar

1. **Verificar perfil do user:**
   ```sql
   SELECT up.*, au.email
   FROM user_profiles up
   JOIN auth.users au ON au.id = up.user_id
   WHERE au.email = 'rdias300@gmail.com';
   ```
   
   **Deve retornar:**
   ```
   role: admin
   ```

2. **Verificar logs do servidor:**
   - Mostram role correto?
   - Mostram query sem erros?
   - Mostram quantos eventos retornados?

3. **Testar query SQL diretamente:**
   ```sql
   -- No SQL Editor (como serviço autenticado)
   SELECT * FROM events;
   ```
   
   **Deve retornar o evento teste1**

4. **Partilhar:**
   - Output de `testAPI()` no console
   - Logs do servidor Node.js
   - Output do SQL: `SELECT * FROM events;`

---

**TL;DR:** 
Configurar `SUPABASE_SERVICE_ROLE_KEY` no servidor → Reiniciar → Admin vê tudo! ⚡

