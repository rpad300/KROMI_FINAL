# 🔧 CORREÇÃO: Gestão de Sessões Múltiplas

## ❌ PROBLEMA IDENTIFICADO

A página de eventos fica **bloqueada** quando acedida através do **login** ou quando há **múltiplas páginas abertas**.

### Sintomas:
- ✅ **Acesso direto** a `events.html` → **FUNCIONA**
- ❌ **Acesso via login** → **FICA BLOQUEADO**
- ❌ **Duas páginas abertas** → **FICA BLOQUEADO**

### Logs do Problema:
```
supabase.js:116 🔍 SupabaseClient criado: SupabaseClient {initialized: false}
kromi-sidebar-toggle.js:135 🔄 Estado restaurado: Sidebar visível
events:426 🚀 Inicializando página de eventos...
events:433 🔑 Inicializando Supabase...
supabase.js:24 🔍 Inicializando Supabase...
supabase.js:49 ✅ Supabase conectado
[FICA PARADO AQUI - NÃO AVANÇA]
```

### Causa Raiz:
1. **Múltiplas instâncias do AuthSystem**: Quando vens do login, o `auth-system.js` já está a correr
2. **Sessões simultâneas**: Duas páginas abertas criam conflito na inicialização do Supabase
3. **Loop infinito no `waitForAuthSystem()`**: A função aguarda indefinidamente porque o `window.authSystem` pode existir mas não ter o `supabase` pronto

## ✅ SOLUÇÃO APLICADA

### Mudanças no `events.html`:

#### 1. **Timeout mais curto** (5s → 3s):
```javascript
const maxAttempts = 30; // 3 segundos (era 50 = 5 segundos)
```

#### 2. **Verificação mais robusta**:
```javascript
// ANTES (❌):
while (!window.authSystem && attempts < maxAttempts) {
    // Só verificava se authSystem existia
}

// AGORA (✅):
while (attempts < maxAttempts) {
    if (window.authSystem && window.authSystem.supabase) {
        // Verifica se authSystem EXISTE E tem Supabase pronto
        return;
    }
    // ...
}
```

#### 3. **Logs detalhados de debug**:
```javascript
console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts} - AuthSystem:`, !!window.authSystem, 'Supabase:', !!window.authSystem?.supabase);
```

#### 4. **Erro com estado completo**:
```javascript
console.error('❌ AuthSystem não inicializado após 3 segundos');
console.error('🔍 Estado final:');
console.error('  - window.authSystem:', !!window.authSystem);
console.error('  - window.authSystem?.supabase:', !!window.authSystem?.supabase);
console.error('  - window.supabaseClient:', !!window.supabaseClient);
console.error('  - window.supabaseClient?.initialized:', window.supabaseClient?.initialized);
```

## 🎯 RESULTADO ESPERADO

### Logs Esperados:
```
🎯 DOMContentLoaded na página de eventos
🔍 window.supabaseClient: SupabaseClient {...}
🔍 window.supabaseClient?.initialized: true
🔍 window.authSystem: AuthSystem {...}
🔐 Iniciando autenticação na página de eventos...
⏳ Aguardando AuthSystem...
⏳ Tentativa 1/30 - AuthSystem: true Supabase: true
✅ AuthSystem pronto após 0 tentativas
🔍 AuthSystem.supabase: true
🔍 AuthSystem.currentUser: true
✅ Sistema de autenticação pronto
✅ Utilizador tem permissão para aceder a esta página
✅ Conteúdo principal exibido
```

### Se houver problema:
```
⏳ Tentativa 1/30 - AuthSystem: true Supabase: false
⏳ Tentativa 2/30 - AuthSystem: true Supabase: false
⏳ Tentativa 3/30 - AuthSystem: true Supabase: false
...
❌ AuthSystem não inicializado após 3 segundos
🔍 Estado final:
  - window.authSystem: true
  - window.authSystem?.supabase: false  ← PROBLEMA AQUI
  - window.supabaseClient: true
  - window.supabaseClient?.initialized: true
```

## 📋 PRÓXIMOS PASSOS

1. **Reiniciar o servidor**:
   ```bash
   Ctrl+C
   npm start
   ```

2. **Limpar cache do browser**:
   - `Ctrl + Shift + R` (hard refresh)
   - OU fechar todas as abas e reabrir

3. **Testar os 3 cenários**:

   #### Cenário 1: Acesso direto (deve funcionar):
   - Ir direto para `https://192.168.1.219:1144/events.html`
   - Verificar logs

   #### Cenário 2: Acesso via login (deve funcionar agora):
   - Ir para `https://192.168.1.219:1144/login.html`
   - Fazer login
   - Clicar em "Gestão de Eventos"
   - Verificar logs

   #### Cenário 3: Duas páginas abertas (deve funcionar agora):
   - Abrir duas abas com o VisionKrono
   - Fazer login em ambas
   - Ir para eventos em ambas
   - Verificar logs

4. **Partilhar logs**:
   - Copiar logs do console de cada cenário
   - Especialmente os logs de `⏳ Tentativa X/30`
   - Verificar se `AuthSystem.supabase: true`

## 🔍 VERIFICAÇÃO

Se ainda houver problemas, verificar:
- [ ] Se `window.authSystem?.supabase` é `true` antes de prosseguir
- [ ] Se não há erros no console
- [ ] Se o `auth-system.js` está a inicializar o Supabase corretamente
- [ ] Se não há múltiplas instâncias do Supabase sendo criadas

## 🚨 SE AINDA BLOQUEAR

Se mesmo após esta correção o browser ainda bloquear, o problema pode ser:
1. **Múltiplas inicializações do Supabase**: Verificar se `supabase.js` está sendo carregado múltiplas vezes
2. **Conflito de sessões**: Verificar se há múltiplas sessões ativas no Supabase
3. **Loop infinito no auth-system.js**: Adicionar timeout no `waitForSupabaseClient()`

Nesse caso, vou criar uma versão de emergência com inicialização simplificada.



