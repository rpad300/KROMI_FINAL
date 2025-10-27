# Testes Rápidos no DevTools - events-kromi.html

Execute estes comandos no console do DevTools (F12) para diagnosticar problemas:

## 1. Verificar Cliente Supabase Pronto

```javascript
await window.supabaseClient.ready(); 
console.log('✅ Supabase conectado:', window.supabaseClient.isConnected);
```

**Resultado esperado:** `✅ Supabase conectado: true`

---

## 2. Verificar Autenticação

```javascript
const resultado = await verificarAutenticacao(['admin', 'moderator']);
console.log('✅ Resultado autenticação:', resultado);
```

**Resultado esperado:** Deve retornar `true` em menos de 1 segundo
**Se demorar mais de 5s:** O timeout vai resolver com `false`

---

## 3. Testar Query de Eventos

```javascript
const { data, error } = await window.supabaseClient.supabase
    .from('events')
    .select('*')
    .limit(1);

if (error) {
    console.error('❌ Erro:', error);
} else {
    console.log('✅ Query OK:', data);
}
```

**Resultado esperado:** Array de dados (vazio ou com eventos)

**Se der erro "permission denied":**
- É problema de RLS (Row Level Security)
- Execute no Supabase SQL Editor:

```sql
-- Permitir SELECT na tabela events para utilizadores autenticados
CREATE POLICY "Allow authenticated SELECT on events"
ON events
FOR SELECT
TO authenticated
USING (true);
```

---

## 4. Verificar Sessão do AuthClient

```javascript
console.log('AuthClient:', {
    currentUser: window.authSystem.currentUser,
    userProfile: window.authSystem.userProfile,
    role: window.authSystem.userProfile?.role
});
```

**Resultado esperado:**
- `currentUser`: objeto com id e email
- `userProfile`: objeto com role definido
- `role`: 'admin' ou 'moderator'

---

## 5. Verificar Sessão Sincronizada com Supabase

```javascript
const { data: { session }, error } = await window.supabaseClient.supabase.auth.getSession();

if (session) {
    console.log('✅ Sessão Supabase ativa:', {
        user: session.user.email,
        expires: new Date(session.expires_at * 1000)
    });
} else {
    console.error('❌ Sem sessão no Supabase');
}
```

**Resultado esperado:** Sessão ativa com access_token

**Se não houver sessão:** O AuthClient não sincronizou corretamente

---

## 6. Teste Completo de Carregamento

```javascript
// Limpar e recarregar eventos
events = [];
await loadEvents();
console.log('Total eventos:', events.length);
```

**Resultado esperado:** Log mostra `[loadEvents] Iniciando...` até `[loadEvents] Fim da função`

---

## 7. Verificar Network Requests

Abra a aba **Network** no DevTools e filtre por:
- `events`: Deve mostrar `GET /rest/v1/events` com status **200**
- `/api/auth/session`: Deve retornar **200** com `authenticated: true`

---

## 8. Verificar Scripts Carregados

```javascript
console.log('Scripts carregados:', {
    supabaseClient: !!window.supabaseClient,
    authSystem: !!window.authSystem,
    verificarAutenticacao: typeof verificarAutenticacao,
    loadEvents: typeof loadEvents
});
```

**Resultado esperado:** Todos devem ser truthy ou 'function'

---

## 9. Forçar Re-autenticação

```javascript
// Limpar sessão e recarregar
await window.authSystem.checkExistingSession();
console.log('Sessão recarregada:', !!window.authSystem.currentUser);
```

---

## 10. Debug Completo da Inicialização

Execute este bloco para ver todo o fluxo:

```javascript
(async () => {
    console.group('🔍 DEBUG COMPLETO');
    
    console.log('1️⃣ Supabase:', {
        disponível: !!window.supabaseClient,
        conectado: window.supabaseClient?.isConnected,
        cliente: !!window.supabaseClient?.supabase
    });
    
    console.log('2️⃣ AuthClient:', {
        disponível: !!window.authSystem,
        currentUser: window.authSystem?.currentUser,
        userProfile: window.authSystem?.userProfile
    });
    
    console.log('3️⃣ Testando autenticação...');
    const auth = await verificarAutenticacao(['admin', 'moderator']);
    console.log('   Resultado:', auth);
    
    if (auth) {
        console.log('4️⃣ Testando query...');
        const { data, error } = await window.supabaseClient.supabase
            .from('events')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('   ❌ Erro:', error);
        } else {
            console.log('   ✅ OK:', data.length, 'evento(s)');
        }
    }
    
    console.groupEnd();
})();
```

---

## Critérios de Aceitação

### ✅ Tudo Funciona Se:

1. Log mostra: `✅ Resultado autenticação: true (motivo: perfil 'admin' permitido)`
2. A seguir: `📊 Passo 5: Carregando eventos e estatísticas...`
3. Network mostra: `GET /rest/v1/events` com **200**
4. Grid de eventos mostra cartões ou "Nenhum evento encontrado"
5. Não há erro "permission denied" ou "RLS"

### ❌ Problemas Comuns:

**Autenticação fica pendurada:**
- Timeout de 5s vai resolver com `false`
- Verificar se `window.authSystem.currentUser !== undefined`

**Erro "permission denied":**
- Falta política RLS no Supabase
- Executar SQL acima para criar política

**Erro "Cliente Supabase não disponível":**
- `supabase.js` não carregou ou falhou a inicializar
- Verificar `/api/config` retorna credenciais válidas

**Sessão não sincronizada:**
- `/api/auth/session` não retorna `session.access_token`
- Verificar backend retorna dados completos de sessão

