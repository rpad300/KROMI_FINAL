# AI Cost Stats - Guia de Debugging

## Como Investigar Problemas

### 1. Abrir DevTools Console (F12)

Todos os logs da página começam com `[AI-COST]` para facilitar identificação.

### 2. Sequência Normal de Inicialização

Quando a página carrega corretamente, você deve ver:

```
[AI-COST] Inicializando AI Cost Stats...
[AI-COST] Aguardando sistema de autenticação...
[AI-COST] Aguardando AuthClient...
[AI-COST] ✅ AuthClient pronto
[AI-COST] ✅ UserProfile carregado: admin
[AI-COST] ✅ Utilizador autenticado: seu@email.com
[AI-COST] ✅ Perfil: {role: 'admin', ...}
[AI-COST] 📊 Carregando indicadores...
[AI-COST] 📡 Fazendo requisição para: /api/ai-costs/indicators
[AI-COST] 📡 Resposta: 200 OK
[AI-COST] ✅ Indicadores recebidos: {...}
[AI-COST] ✅ Indicadores renderizados
[AI-COST] 📈 Carregando timeline...
[AI-COST] 📡 Fazendo requisição para: /api/ai-costs/aggregate
[AI-COST] 📡 Resposta: 200 OK
[AI-COST] ✅ Dados timeline recebidos: X pontos
[AI-COST] ✅ Gráfico timeline renderizado
[AI-COST] ✅ AI Cost Stats inicializado com sucesso
```

### 3. Quando Clica em "Por Evento"

```
[AI-COST] Mudando para tab: events
[AI-COST] 📊 Carregando custos por evento...
[AI-COST] Fazendo requisição para aggregate (dimension: event)
[AI-COST] 📡 Fazendo requisição para: /api/ai-costs/aggregate
[AI-COST] 📡 Resposta: 200 OK
[AI-COST] ✅ Eventos recebidos: X eventos
[AI-COST] ✅ Eventos renderizados
[AI-COST] ✅ Tab carregada: events
```

### 4. Problemas Comuns e Diagnóstico

#### Problema: "Redireciona para index-kromi"

**Logs a procurar:**
- `❌ Não autorizado (401)` → Sessão expirada
- `❌ Acesso negado (403)` → Não é admin
- `❌ Erro ao carregar eventos` → Erro na API

**Causas possíveis:**

1. **API retorna 401/403**
   - Verificar no Network tab (F12 → Network) se a requisição para `/api/ai-costs/aggregate` está com status 401 ou 403
   - Se sim, verificar se o token está válido

2. **UserProfile não tem role 'admin'**
   - Verificar no console: `window.AuthClient.userProfile`
   - Deve mostrar `{role: 'admin', ...}` ou `{profile_type: 'admin', ...}`

3. **Erro no backend**
   - Ver logs do servidor Node.js
   - Procurar por erros nas rotas `/api/ai-costs/*`

#### Problema: "Página fica em branco"

**Verificar:**
1. Console tem erros JavaScript?
2. Network tab mostra requisições falhando?
3. AuthClient está inicializado? `window.AuthClient.isReady`

### 5. Comandos Úteis no Console

```javascript
// Ver estado do AuthClient
console.log('AuthClient:', window.AuthClient);
console.log('Session:', window.AuthClient.session);
console.log('UserProfile:', window.AuthClient.userProfile);

// Ver filtros atuais
console.log('Filtros:', currentFilters);

// Testar token
console.log('Token:', getAuthToken());

// Testar requisição manual
authenticatedFetch('/api/ai-costs/indicators')
  .then(r => r.json())
  .then(d => console.log('Dados:', d));
```

### 6. Verificar Backend

No terminal onde o servidor está rodando, procurar por:

```
📊 [GET /api/ai-costs/indicators] Utilizador: seu@email.com
✅ [POST /api/ai-costs/aggregate] ...
```

Se aparecer erros tipo:
```
❌ Erro ao obter indicadores: ...
Erro na verificação de administrador: ...
```

Então o problema está no backend, não no frontend.

### 7. Verificar Base de Dados

```sql
-- Ver se as tabelas existem
SELECT tablename FROM pg_tables 
WHERE tablename IN ('ai_cost_stats', 'ai_cost_sync_log');

-- Ver se há policies
SELECT * FROM pg_policies 
WHERE tablename = 'ai_cost_stats';

-- Ver se há dados
SELECT COUNT(*) FROM ai_cost_stats;
```

### 8. Inserir Dados de Teste

Se a tabela estiver vazia, inserir dados de teste:

```sql
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_total)
VALUES 
  (NOW() - INTERVAL '1 hour', 'openai', 'gpt-4', 'us-east-1', 0.045, 1500),
  (NOW() - INTERVAL '2 hours', 'anthropic', 'claude-3-sonnet', 'us-east-1', 0.032, 1200),
  (NOW() - INTERVAL '5 hours', 'openai', 'gpt-4-turbo', 'eu-west-1', 0.028, 1000),
  (NOW() - INTERVAL '12 hours', 'google-ai', 'gemini-pro', 'us-east-1', 0.015, 800);
```

### 9. Reset Completo

Se tudo falhar:

```javascript
// No console do browser
localStorage.clear();
sessionStorage.clear();
location.href = '/login.html';
```

Depois faça login novamente e teste.

