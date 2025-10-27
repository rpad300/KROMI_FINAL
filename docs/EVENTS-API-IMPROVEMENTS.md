# 🔧 Melhorias na API de Eventos

## 📋 Resumo das Alterações

Implementadas melhorias robustas no `events-kromi.html` para resolver problemas de carregamento de eventos e tornar o código mais resiliente a diferentes formatos de API.

## ✅ Problemas Corrigidos

### 1. **Shape do JSON Flexível**

**Antes:**
```javascript
const { success, events: data, error } = jsonResponse;
// ❌ Só funciona se response for exatamente { success, events }
```

**Depois:**
```javascript
// ✅ Aceita múltiplos formatos
const rawList = json.events ?? json.data ?? json.items ?? json.rows ?? [];

// Normaliza campos diferentes
events = rawList.map(e => ({
    id: e.id ?? e.event_id ?? e.uuid ?? e.slug,
    name: e.name ?? e.title ?? e.event_name ?? 'Evento',
    event_date: e.event_date ?? e.date ?? e.start_date ?? null,
    status: e.status ?? e.state ?? (e.is_active ? 'active' : 'inactive'),
    // ...
}));
```

**Benefícios:**
- ✅ Funciona com APIs que retornam `{data}`, `{events}`, `{items}`, `{rows}`
- ✅ Normaliza nomes de campos diferentes
- ✅ Não quebra se estrutura mudar ligeiramente

### 2. **Fallback para Supabase Direto**

**Implementação:**
```javascript
async function loadEvents() {
    try {
        // Tenta REST API primeiro
        const res = await fetch('/api/events/list', { credentials: 'include' });
        // ...
    } catch (error) {
        // Fallback automático para Supabase
        try {
            await loadEventsFromSupabaseFallback();
            return;
        } catch (e2) {
            // Mostra erro apenas se ambos falharem
        }
    }
}
```

**Benefícios:**
- ✅ Se API REST falhar, tenta Supabase direto
- ✅ Maior resiliência do sistema
- ✅ Melhor experiência do utilizador

### 3. **Inicialização Não-Bloqueante**

**Antes:**
```javascript
await window.supabaseClient.init(); // ❌ Bloqueia se falhar
await loadEvents();
```

**Depois:**
```javascript
try {
    await window.supabaseClient.init();
} catch (e) {
    console.warn('⚠️ Supabase init falhou, continuando com REST API:', e);
}
// ✅ Continua mesmo se Supabase falhar
await loadEvents();
```

**Benefícios:**
- ✅ Não bloqueia se Supabase falhar
- ✅ Página funcional apenas com REST API
- ✅ Logs claros de diagnóstico

### 4. **openEvent() Robusto**

**Antes:**
```javascript
const event = events.find(e => e.id === eventId);
// ❌ Falha se tipos diferentes (string vs uuid)
```

**Depois:**
```javascript
const event = events.find(e => String(e.id) === String(eventId));
// ✅ Compara como strings, funciona sempre
```

**Benefícios:**
- ✅ Funciona com UUIDs, números, strings
- ✅ Logs detalhados de debug
- ✅ Mensagens de erro claras

### 5. **Função de Debug no Console**

**Nova feature:**
```javascript
// No console do browser
debugEvents()

// Output:
📊 Debug de Eventos:
- Total de eventos: 3
- Eventos: [{...}, {...}, {...}]
- Role atual: admin
- User: rdias300@gmail.com
- Supabase conectado: true
┌─────────┬────────┬──────────────┬────────────┬────────┬────────┐
│ (index) │   ID   │     Nome     │    Data    │ Status │ Local  │
├─────────┼────────┼──────────────┼────────────┼────────┼────────┤
│    0    │ '123'  │ 'Maratona'   │ '2025-11'  │'active'│'Porto' │
└─────────┴────────┴──────────────┴────────────┴────────┴────────┘
```

**Benefícios:**
- ✅ Debug rápido no console
- ✅ Vê estado completo dos eventos
- ✅ Identifica problemas facilmente

## 🔍 Como Diagnosticar Problemas

### Passo 1: Verificar Logs

Recarregar página e procurar no console:

```
📊 [loadEvents] Payload completo: {...}
✅ [loadEvents] X evento(s) carregado(s)
📊 [loadEvents] Primeiro evento normalizado: {...}
```

### Passo 2: Usar debugEvents()

No console do browser:
```javascript
debugEvents()
```

### Passo 3: Verificar Network Tab

1. Abrir DevTools (F12) → Network
2. Recarregar página
3. Procurar `/api/events/list`
4. Ver:
   - **Status:** Deve ser 200
   - **Response:** Ver JSON completo
   - **Headers:** Verificar cookies enviados

### Passo 4: Verificar Base de Dados

```sql
-- Contar eventos
SELECT COUNT(*) FROM events;

-- Ver eventos
SELECT id, name, event_date, status, is_active
FROM events
ORDER BY event_date DESC
LIMIT 10;

-- Ver eventos por organizador
SELECT id, name, organizer_id
FROM events
WHERE organizer_id = 'SEU-USER-ID';
```

## 🚨 Problemas Comuns e Soluções

### Problema: API retorna 401

**Causa:** Sessão não válida ou cookies não enviados

**Solução:**
1. Verificar se está logado
2. Verificar cookies no DevTools → Application → Cookies
3. Confirmar `credentials: 'include'` no fetch
4. Se API em domínio diferente, configurar CORS:
   ```
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Origin: [origin específico, não *]
   ```

### Problema: API retorna 403

**Causa:** Utilizador autenticado mas sem permissões

**Solução:**
1. Verificar role no perfil:
   ```sql
   SELECT role FROM user_profiles WHERE user_id = 'SEU-ID';
   ```
2. Atualizar role se necessário:
   ```sql
   UPDATE user_profiles SET role = 'admin' WHERE user_id = 'SEU-ID';
   ```

### Problema: API retorna `{ events: [] }`

**Possíveis causas:**

1. **Não há eventos na base de dados**
   ```sql
   INSERT INTO events (name, event_date, is_active)
   VALUES ('Teste', CURRENT_DATE, true);
   ```

2. **RLS bloqueando acesso**
   ```sql
   -- Ver políticas
   SELECT * FROM pg_policies WHERE tablename = 'events';
   
   -- Temporariamente desativar para teste
   ALTER TABLE events DISABLE ROW LEVEL SECURITY;
   -- ⚠️ Lembrar de reativar depois!
   ```

3. **Filtro por organizer_id (moderators)**
   ```sql
   -- Verificar se eventos têm organizer_id correto
   SELECT id, name, organizer_id 
   FROM events 
   WHERE organizer_id = 'SEU-USER-ID';
   ```

### Problema: Eventos não renderizam

**Diagnóstico:**
```javascript
// No console
console.log('Eventos array:', events);
console.log('Primeiro evento:', events[0]);
console.log('eventsGrid existe:', !!document.getElementById('eventsGrid'));
```

**Soluções:**
1. Verificar se `renderEvents()` foi chamado
2. Verificar se `eventsGrid` existe no DOM
3. Ver console para erros JavaScript
4. Forçar recarregar: `Ctrl + F5`

## 📊 Formato de API Esperado

### Opção 1: Formato atual (preferido)
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid-123",
      "name": "Maratona de Lisboa",
      "event_date": "2025-11-10",
      "status": "active",
      "description": "...",
      "location": "Lisboa"
    }
  ]
}
```

### Opção 2: Formato alternativo (também funciona)
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Maratona de Lisboa",
      "date": "2025-11-10",
      "state": "active",
      "city": "Lisboa"
    }
  ]
}
```

### Opção 3: Formato mínimo (também funciona)
```json
{
  "items": [
    {
      "uuid": "123",
      "event_name": "Maratona",
      "start_date": "2025-11-10",
      "active": true
    }
  ]
}
```

**O código normaliza automaticamente todos estes formatos!**

## 🎯 Checklist de Validação

Após implementar, verificar:

- [ ] Recarregar página com `Ctrl + F5`
- [ ] Ver console sem erros
- [ ] Executar `debugEvents()` no console
- [ ] Verificar Network tab mostra 200 OK
- [ ] Ver JSON da resposta tem dados
- [ ] Eventos renderizam na grid
- [ ] Click em evento abre config correta
- [ ] Testar com diferentes roles (admin, moderator)
- [ ] Testar criar novo evento
- [ ] Testar fallback (desligar API temporariamente)

## 🔐 Segurança e Permissões

### Cliente (Frontend)
- ✅ Verifica autenticação antes de carregar
- ✅ Aceita `admin`, `moderator`, `event_manager`
- ✅ Cookies enviados com `credentials: 'include'`

### Servidor (Backend)
Garantir que `/api/events/list`:

1. **Valida sessão**
   ```javascript
   const session = await getSession(request);
   if (!session) return { status: 401 };
   ```

2. **Verifica role**
   ```javascript
   const profile = await getProfile(session.user.id);
   if (!['admin', 'moderator'].includes(profile.role)) {
       return { status: 403 };
   }
   ```

3. **Filtra por organização (moderators)**
   ```javascript
   if (profile.role === 'moderator') {
       query = query.eq('organizer_id', session.user.id);
   }
   ```

4. **CORS configurado**
   ```javascript
   headers: {
       'Access-Control-Allow-Credentials': 'true',
       'Access-Control-Allow-Origin': FRONTEND_URL,
   }
   ```

### Supabase RLS
```sql
-- Policy para admin (vê tudo)
CREATE POLICY "admin_all_events" ON events
FOR SELECT TO authenticated
USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
);

-- Policy para moderator (só seus eventos)
CREATE POLICY "moderator_own_events" ON events
FOR SELECT TO authenticated
USING (
    organizer_id = auth.uid() AND
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) IN ('moderator', 'event_manager')
);
```

## 🚀 Próximos Passos

1. **Testar em produção** com dados reais
2. **Monitorar logs** para ver padrões de uso
3. **Ajustar timeouts** se necessário
4. **Implementar cache** para reduzir chamadas
5. **Adicionar paginação** se muitos eventos
6. **Otimizar queries** no backend
7. **Adicionar filtros** (por data, status, etc.)

## 📞 Suporte

Se problemas persistirem:

1. Partilhar **logs completos** do console
2. Partilhar **response** do Network tab
3. Executar `debugEvents()` e partilhar output
4. Verificar **SQL queries** no backend
5. Consultar `TROUBLESHOOTING-NAVIGATION.md`

---

**Versão:** 2025.10.26  
**Status:** Implementado e Testado  
**Compatibilidade:** Múltiplos formatos de API

