# Fix: Autenticação Pendurada em events-kromi.html

**Data:** 2025-10-26 20:00  
**Problema:** A autenticação ficava "pendurada" após o log "🔐 Verificando autenticação...", impedindo o carregamento de eventos.

---

## 🔍 Diagnóstico

### Problema Raiz
O `auth-helper.js` aguardava `window.authSystem.supabase` que nunca era inicializado no novo sistema server-side (AuthClient), causando um loop infinito no `waitForAuthSystem()`.

### Sintomas
1. Log mostrava: "✅ Supabase pronto: true"
2. Seguido de: "🔐 Verificando autenticação..."
3. **Nunca aparecia:** "Resultado autenticação: true/false"
4. A página nunca chamava `loadEvents()`

---

## ✅ Correções Implementadas

### 1. **auth-helper.js** - Verificação Sempre Resolúvel

**Antes:**
```javascript
async function waitForAuthSystem() {
    // Aguardava window.authSystem.supabase (que nunca existia)
    if (window.authSystem && window.authSystem.supabase) {
        resolve();
    }
}
```

**Depois:**
```javascript
async function waitForAuthClient() {
    // Aguarda currentUser !== undefined (sinal que checkExistingSession terminou)
    if (window.authSystem && window.authSystem.currentUser !== undefined) {
        resolve(true);
    }
    // Timeout de 5s SEMPRE resolve (nunca fica pendurado)
    if (elapsedTime > maxWaitTime) {
        resolve(false);
    }
}
```

**Mudanças:**
- ✅ Timeout de 5s (era 10s)
- ✅ SEMPRE resolve (nunca rejeita)
- ✅ Verifica `currentUser !== undefined` (não `supabase`)
- ✅ Logs de motivo: "timeout", "sem sessão", "perfil não permitido", etc.

---

### 2. **auth-client.js** - Partilha de Sessão com Cliente de Dados

**Adicionado:**
```javascript
async syncSessionWithDataClient(sessionData) {
    if (sessionData && sessionData.access_token) {
        await window.supabaseClient.supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
        });
        console.log('✅ Sessão sincronizada com cliente de dados Supabase');
    }
}
```

**Quando é chamado:**
- Após `checkExistingSession()` encontrar sessão válida
- Após `signInWithEmail()` fazer login com sucesso

**Benefício:**
- O cliente de dados (`window.supabaseClient.supabase`) agora envia o JWT nas queries
- Políticas RLS funcionam corretamente
- Evita erros "permission denied"

---

### 3. **events-kromi.html** - Ordem de Scripts Corrigida

**Antes:**
```html
<script src="supabase.js?v=2025102620"></script>
<script src="auth-client.js?v=2025102616"></script>
<script src="universal-route-protection.js?v=2025102618"></script>
<script src="auth-helper.js?v=2025102619"></script>
```

**Depois:**
```html
<!-- Scripts de Autenticação - ORDEM IMPORTANTE -->
<script src="https://unpkg.com/@supabase/supabase-js@2"></script>
<script src="supabase.js?v=2025102620"></script>
<script src="auth-client.js?v=2025102620"></script>
<script src="auth-helper.js?v=2025102620"></script>
<!-- universal-route-protection.js NÃO é necessário (verificação manual) -->
```

**Mudanças:**
- ❌ Removido `universal-route-protection.js` (duplicado e desnecessário)
- ✅ Ordem: Supabase → AuthClient → AuthHelper
- ✅ Versões atualizadas para `v=2025102620`

---

### 4. **events-kromi.html** - Fluxo de Inicialização Melhorado

**Antes:**
```javascript
// Logs genéricos, sem numeração
await window.supabaseClient.init();
const autenticado = await verificarAutenticacao(['admin', 'moderator']);
loadEvents();
```

**Depois:**
```javascript
// Passos numerados e logs detalhados
console.log('🔑 Passo 1: Inicializando Supabase...');
await window.supabaseClient.init();
await window.supabaseClient.ready();
console.log('✅ Supabase pronto:', window.supabaseClient.isConnected);

console.log('🔐 Passo 2: Verificando autenticação...');
const autenticado = await verificarAutenticacao(['admin', 'moderator']);
console.log('🔐 Resultado autenticação:', autenticado);

if (!autenticado) {
    // Mostrar painel de acesso negado e PARAR
    return;
}

console.log('📍 Passo 3: Inicializando navegação...');
// ...

console.log('📊 Passo 5: Carregando eventos e estatísticas...');
await loadEvents();
await loadStats();
console.log('✅ Página completamente inicializada');
```

**Benefícios:**
- Fácil diagnosticar onde o fluxo para
- Logs numerados (Passo 1, 2, 3...)
- Sempre mostra "Resultado autenticação: true/false"
- Painel de acesso negado se não autenticado

---

### 5. **loadEvents()** - Mensagens de Erro Visíveis

**Antes:**
```javascript
if (error) {
    eventsGrid.innerHTML = `<div>❌ Erro: ${error.message}</div>`;
}
```

**Depois:**
```javascript
if (error) {
    eventsGrid.innerHTML = `
        <div style="grid-column: 1/-1;">
            <div style="font-size: 48px;">❌</div>
            <h3>Erro ao Carregar Eventos</h3>
            <p>${error.message}</p>
            <details>
                <summary>Detalhes do erro</summary>
                <pre>${JSON.stringify(error, null, 2)}</pre>
            </details>
            <button onclick="loadEvents()">🔄 Tentar Novamente</button>
        </div>
    `;
    
    // Se erro de RLS, mostrar SQL para corrigir
    if (error.code === '42501' || error.message.includes('permission')) {
        console.error('❌ [RLS] Erro de permissão! Verifique as políticas RLS:');
        console.error('   CREATE POLICY "Allow authenticated SELECT" ON events FOR SELECT TO authenticated USING (true);');
    }
}
```

**Benefícios:**
- Erro visível ao utilizador (não fica em "Carregando...")
- Detalhes expandíveis para debug
- Botão "Tentar Novamente"
- Sugestão de SQL se for erro de RLS

---

### 6. **handleEventSubmit()** - Corrigido Nomes dos Campos

**Antes:**
```javascript
const formData = new FormData(e.target);
const eventData = {
    name: formData.get('eventName'),  // ❌ Campo tem id="eventName" não name="eventName"
    // ...
};
```

**Depois:**
```javascript
const eventData = {
    name: document.getElementById('eventName').value,
    description: document.getElementById('eventDescription').value || null,
    event_date: document.getElementById('eventDate').value || null,
    location: document.getElementById('eventLocation').value || null,
    status: 'active'
};
```

**Benefício:**
- Eventos criados com valores corretos (não `null`)

---

### 7. **Ordenação de Eventos** - Validada

**Query:**
```javascript
const { data, error } = await window.supabaseClient.supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });
```

**Nota:**
- Se `created_at` não existir, o erro será exibido ao utilizador
- Comentário documenta alternativas: `event_date` ou `id`

---

## 📋 Critérios de Aceitação

### ✅ Sucesso - Logs Esperados

```
🚀 Inicializando página de eventos...
🔑 Passo 1: Inicializando Supabase...
✅ Supabase pronto: true
🔐 Passo 2: Verificando autenticação...
✅ AuthClient pronto após XXXms
🔍 Perfil detectado: admin
🔍 Perfis requeridos: ["admin","moderator"]
✅ Resultado autenticação: true (motivo: perfil 'admin' permitido)
✅ Autenticado! Continuando inicialização...
📍 Passo 3: Inicializando navegação...
✅ Navegação inicializada
🔧 Passo 4: Configurando event listeners...
✅ Event listeners configurados
📊 Passo 5: Carregando eventos e estatísticas...
📊 [loadEvents] Iniciando carregamento de eventos...
📊 [loadEvents] Executando query na tabela events...
✅ [loadEvents] X evento(s) carregado(s)
📊 [loadEvents] Fim da função loadEvents()
✅ Página completamente inicializada
```

### ✅ Network Requests

- `GET /rest/v1/events` → **200 OK**
- `GET /api/auth/session` → **200 OK** com `{ authenticated: true }`

### ✅ UI

- Grid de eventos mostra:
  - Cartões de eventos (se houver dados)
  - "Nenhum evento encontrado" (se vazio)
  - Mensagem de erro clara (se falhar)
- **Nunca fica** em "Carregando eventos..."

---

## 🧪 Testes de Validação

### No DevTools Console (F12)

```javascript
// 1. Supabase conectado
await window.supabaseClient.ready(); 
window.supabaseClient.isConnected // → true

// 2. Autenticação resolve em <1s
await verificarAutenticacao(['admin','moderator']) // → true

// 3. Query funciona
const { data, error } = await window.supabaseClient.supabase
    .from('events')
    .select('*')
    .limit(1);
console.log(data); // → [] ou [{ ... }]
```

Ver **DEVTOOLS_TESTS.md** para mais testes.

---

## 🐛 Problemas Conhecidos e Soluções

### Erro: "permission denied" na query de eventos

**Causa:** Falta política RLS no Supabase

**Solução:** Executar no Supabase SQL Editor:
```sql
CREATE POLICY "Allow authenticated SELECT on events"
ON events
FOR SELECT
TO authenticated
USING (true);
```

---

### Erro: "Cliente Supabase não disponível"

**Causa:** `supabase.js` não inicializou corretamente

**Verificar:**
1. `/api/config` retorna `SUPABASE_URL` e `SUPABASE_ANON_KEY`
2. Credenciais estão corretas (não `your_supabase_url`)

---

### Autenticação retorna false apesar de logado

**Causa:** Backend não retorna `session.access_token` em `/api/auth/session`

**Verificar resposta esperada:**
```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "...",
    "role": "admin"
  },
  "session": {
    "access_token": "eyJhbGc...",
    "refresh_token": "..."
  }
}
```

---

## 📦 Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `auth-helper.js` | ✅ Timeout garantido, logs de motivo |
| `auth-client.js` | ✅ Sincronização de sessão com cliente de dados |
| `events-kromi.html` | ✅ Ordem scripts, fluxo numerado, erros visíveis, form corrigido |
| `DEVTOOLS_TESTS.md` | 🆕 Criado (testes de validação) |
| `FIX_AUTENTICACAO_PENDURADA.md` | 🆕 Criado (esta documentação) |

---

## 🎯 Próximos Passos Recomendados

1. **Testar em produção:**
   - Fazer login como admin/moderator
   - Abrir `events-kromi.html`
   - Verificar logs no console
   - Confirmar eventos carregam

2. **Configurar RLS se necessário:**
   - Executar SQL de política se der "permission denied"

3. **Aplicar fix em outras páginas:**
   - Outras páginas KROMI podem ter o mesmo problema
   - Verificar ordem de scripts em:
     - `index-kromi.html`
     - `participants-kromi.html`
     - `classifications-kromi.html`
     - etc.

4. **Backend: Garantir retorno de session:**
   - Endpoint `/api/auth/session` deve retornar `access_token`
   - Necessário para sincronização funcionar

---

## ✅ Conclusão

A autenticação não fica mais "pendurada". O sistema:

- ✅ **SEMPRE resolve** em max 5 segundos
- ✅ **Loga o motivo** do resultado (true/false)
- ✅ **Sincroniza sessão** entre Auth e Data
- ✅ **Mostra erros claros** ao utilizador
- ✅ **Ordem de scripts** correta
- ✅ **Sem duplicação** de scripts

**Status:** 🟢 Pronto para testes

