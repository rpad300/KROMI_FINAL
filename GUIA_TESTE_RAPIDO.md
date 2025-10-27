# Guia de Teste Rápido - Opção B Implementada

## ✅ Implementação Completa

Todos os arquivos foram modificados e a **Opção B (Server-Side First)** está pronta!

---

## 🚀 Passo a Passo para Testar

### 1. Reiniciar Servidor

```bash
# Parar servidor se estiver rodando (Ctrl+C)
# Iniciar novamente
node server.js
```

**Logs esperados no terminal:**
```
📋 Carregando rotas de eventos...
✅ Cliente Supabase (service role) inicializado para eventos
✅ Rotas de eventos carregadas:
   GET    /api/events/list
   GET    /api/events/stats
   GET    /api/events/:id
   POST   /api/events/create
   PUT    /api/events/:id
   DELETE /api/events/:id
🚀 VisionKrono servidor iniciado!
```

Se ver esses logs: ✅ **Backend OK**

---

### 2. Testar no Browser

#### 2.1. Fazer Login

1. Abrir: `https://localhost:1144/login.html`
2. Login como **admin** ou **moderator**
3. Após login, navegar para: `https://localhost:1144/events`

#### 2.2. Verificar Logs no Console (F12)

**Logs esperados:**
```
🚀 Inicializando página de eventos...
🔑 Passo 1: Inicializando Supabase...
✅ Supabase pronto: true
🔐 Passo 2: Verificando autenticação...
✅ AuthClient pronto após XXXms
✅ Resultado autenticação: true (motivo: perfil 'admin' permitido)
✅ Autenticado! Continuando inicialização...
📊 Passo 5: Carregando eventos e estatísticas...
📊 [loadEvents] Iniciando carregamento de eventos...
📊 [loadEvents] Chamando GET /api/events/list...
📊 [loadEvents] Response status: 200
✅ [loadEvents] X evento(s) carregado(s)
📊 [loadStats] Chamando GET /api/events/stats...
✅ [loadStats] Estatísticas carregadas: {...}
✅ Página completamente inicializada
```

Se ver esses logs: ✅ **Frontend OK**

---

#### 2.3. Verificar Network Tab (F12 → Network)

Filtrar por `api/events`:

**Requests esperados:**
- ✅ `GET /api/events/list` → Status **200** (verde)
- ✅ `GET /api/events/stats` → Status **200** (verde)

**Ver Response:**
```json
{
  "success": true,
  "events": [...],
  "count": X
}
```

Se ver Status 200 e `success: true`: ✅ **API OK**

---

### 3. Testar Criar Evento

1. Clicar em **"➕ Novo Evento"**
2. Preencher:
   - Nome: `Teste Server-Side`
   - Descrição: `Evento criado via REST API`
   - Data: `2025-12-01`
   - Localização: `Lisboa`
3. Clicar **"Criar Evento"**

**Resultado esperado:**
- ✅ Alert: `"Evento criado com sucesso!"`
- ✅ Modal fecha
- ✅ Grid atualiza com novo evento

**Logs no console:**
```
📝 [handleEventSubmit] Criando evento: {...}
📝 [handleEventSubmit] Chamando POST /api/events/create...
✅ [handleEventSubmit] Evento criado: {...}
📊 [loadEvents] Chamando GET /api/events/list...
✅ [loadEvents] X evento(s) carregado(s)
```

**Logs no servidor (terminal):**
```
📝 [POST /api/events/create] Criando evento: Teste Server-Side
👤 [POST /api/events/create] Por: admin@example.com
✅ [POST /api/events/create] Evento criado: abc123...
```

Se tudo funcionar: ✅ **Criar Evento OK**

---

### 4. Testar Autorização

#### 4.1. Sem sessão (401)

1. Abrir aba anónima/privada
2. Tentar aceder: `https://localhost:1144/events`

**Resultado esperado:**
- ✅ Mostra painel "Sem Sessão ou Permissões"
- ✅ Botão "🔐 Iniciar Sessão"

**Logs no console:**
```
⚠️ Resultado autenticação: false (motivo: sem sessão)
⚠️ Não autenticado - mostrando painel de acesso negado
```

---

#### 4.2. Role não permitido (403)

1. Criar utilizador com role `user` (participante)
2. Fazer login como esse utilizador
3. Tentar aceder: `https://localhost:1144/events`

**Resultado esperado:**
- ✅ Mostra painel "Sem Sessão ou Permissões"
- ✅ Mensagem: "Esta página requer perfil de Admin ou Moderador"

**Logs no console:**
```
🔍 Perfil detectado: user
🔍 Perfis requeridos: ["admin","moderator"]
⚠️ Resultado autenticação: false (motivo: perfil 'user' não permitido)
```

---

## 🧪 Testes Avançados (Opcional)

### Teste 1: DevTools Console

```javascript
// 1. Testar endpoint diretamente
const res = await fetch('/api/events/list', { credentials: 'include' });
const data = await res.json();
console.log(data);
// → { success: true, events: [...], count: X }

// 2. Testar estatísticas
const statsRes = await fetch('/api/events/stats', { credentials: 'include' });
const stats = await statsRes.json();
console.log(stats);
// → { success: true, stats: { totalEvents: X, ... } }

// 3. Verificar autenticação resolve rápido
const inicio = Date.now();
const auth = await verificarAutenticacao(['admin', 'moderator']);
const tempo = Date.now() - inicio;
console.log(`Autenticação: ${auth} em ${tempo}ms`);
// → Deve ser < 1000ms
```

---

### Teste 2: cURL (Terminal)

**Obter SESSION ID:**
1. No browser, F12 → Application → Cookies
2. Copiar valor do cookie `sid`

**Testar endpoint:**
```bash
curl -X GET https://localhost:1144/api/events/list \
  --cookie "sid=COLAR_SID_AQUI" \
  --insecure
```

**Response esperada:**
```json
{
  "success": true,
  "events": [...]
}
```

---

### Teste 3: Postman

1. Criar request: `GET https://localhost:1144/api/events/list`
2. Em **Headers**, adicionar:
   - `Cookie: sid=COLAR_SID_AQUI`
3. **Send**

**Status esperado:** `200 OK`

---

## ✅ Checklist de Validação

Marcar ✅ conforme testa:

- [ ] Servidor inicia sem erros
- [ ] Logs mostram "Rotas de eventos carregadas"
- [ ] Login funciona
- [ ] `/events` carrega sem erros
- [ ] Console mostra "Resultado autenticação: true"
- [ ] Console mostra "loadEvents" + "loadStats"
- [ ] Network mostra `/api/events/list` → 200
- [ ] Network mostra `/api/events/stats` → 200
- [ ] Grid mostra eventos ou "Nenhum evento encontrado"
- [ ] Estatísticas aparecem (Eventos Ativos, Dispositivos, Detecções)
- [ ] Botão "Novo Evento" abre modal
- [ ] Criar evento funciona
- [ ] Alert de sucesso aparece
- [ ] Grid atualiza com novo evento
- [ ] Sem sessão redireciona para login
- [ ] Role não permitido mostra painel de acesso negado

**Se todos marcados:** 🎉 **IMPLEMENTAÇÃO PERFEITA!**

---

## ❌ Troubleshooting

### Erro: "Cannot find module './events-routes'"

**Causa:** Servidor não encontra `events-routes.js`

**Solução:**
```bash
# Verificar se arquivo existe
ls -la events-routes.js

# Se não existir, criar arquivo conforme documentação
```

---

### Erro: "SUPABASE_SERVICE_ROLE_KEY not configured"

**Causa:** Falta variável de ambiente

**Solução:**
1. Abrir `.env`
2. Adicionar:
```
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
```
3. Reiniciar servidor

---

### Erro: 401 em /api/events/list

**Causa:** Sessão não válida ou expirada

**Solução:**
1. Fazer logout
2. Fazer login novamente
3. Tentar novamente

---

### Erro: 403 em /api/events/list

**Causa:** Utilizador não tem role permitido

**Solução:**
1. Verificar role no Supabase:
```sql
SELECT email, role FROM user_profiles WHERE email = 'seu@email.com';
```
2. Se necessário, atualizar:
```sql
UPDATE user_profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

---

### Eventos não aparecem

**Causa:** Tabela `events` vazia

**Solução:**
1. Criar evento manualmente via UI
2. Ou inserir via SQL:
```sql
INSERT INTO events (name, description, event_date, location, status)
VALUES ('Evento Teste', 'Descrição teste', '2025-12-01', 'Lisboa', 'active');
```

---

## 📞 Suporte

**Logs úteis:**
- Browser Console (F12)
- Browser Network Tab (F12 → Network)
- Terminal do servidor (logs em tempo real)

**Documentação:**
- `IMPLEMENTACAO_OPCAO_B_COMPLETA.md` → Detalhes técnicos
- `PLANO_CORRECAO_DEFINITIVO.md` → Análise completa
- `DECISAO_RAPIDA.md` → Guia de decisão

---

## 🎯 Resultado Esperado Final

**Após todos os testes:**
- ✅ Autenticação funciona sem ficar pendurada
- ✅ Eventos carregam via REST API
- ✅ Zero JWT no browser
- ✅ Sistema 100% server-side
- ✅ Segurança máxima
- ✅ Logs claros e detalhados
- ✅ Erros tratados adequadamente

**Status:** 🟢 **SISTEMA FUNCIONANDO PERFEITAMENTE**

