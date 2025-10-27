# 🚨 CORREÇÃO CRÍTICA: Múltiplos Listeners de Autenticação

## ❌ PROBLEMA RAIZ IDENTIFICADO

O sistema estava criando **MÚLTIPLOS LISTENERS** de autenticação (`onAuthStateChange`) **CADA VEZ** que uma página era carregada, causando:

1. **Loops de redirecionamento**
2. **Bloqueio total do browser**
3. **Conflitos de sessões múltiplas**

### Como Acontecia:

```javascript
// ANTES (❌):
setupAuthListeners() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await this.handleSignIn(session);  // ← EXECUTAVA EM TODAS AS PÁGINAS!
        }
    });
}
```

### Cenário Problemático:

1. Utilizador faz **login** em `login.html`
   - Listener criado: `Listener #1`
   - `SIGNED_IN` → `handleSignIn()` → Redireciona para `index-kromi.html`

2. Página `index-kromi.html` carrega
   - Listener criado: `Listener #2` (DUPLICADO!)
   - Supabase já tem sessão → dispara `SIGNED_IN` novamente
   - `SIGNED_IN` → `handleSignIn()` → Tenta redirecionar novamente

3. Utilizador vai para `events.html`
   - Listener criado: `Listener #3` (TRIPLICADO!)
   - Supabase já tem sessão → dispara `SIGNED_IN` novamente
   - `SIGNED_IN` → `handleSignIn()` → **LOOP INFINITO E BLOQUEIO!**

## ✅ SOLUÇÃO APLICADA

### 1. **Prevenir Múltiplos Listeners**:

```javascript
setupAuthListeners() {
    // Prevenir múltiplos listeners
    if (this.authListener) {
        console.log('⚠️ Listener de autenticação já existe - não criar outro');
        return;
    }
    
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(...);
    
    // Guardar subscription para evitar duplicação
    this.authListener = subscription;
    console.log('✅ Listener de autenticação configurado');
}
```

### 2. **Processar `SIGNED_IN` APENAS em `login.html`**:

```javascript
if (event === 'SIGNED_IN' && session) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log('🔍 SIGNED_IN detectado na página:', currentPage);
    
    // Apenas processar handleSignIn se estivermos na página de login
    if (currentPage === 'login.html') {
        console.log('✅ Processando handleSignIn porque estamos em login.html');
        await this.handleSignIn(session);
    } else {
        console.log('⏸️ Ignorando SIGNED_IN porque não estamos em login.html');
        // Apenas atualizar currentUser e userProfile sem redirecionar
        this.currentUser = session.user;
        if (!this.userProfile) {
            await this.loadUserProfile().catch(err => console.error('Erro ao carregar perfil:', err));
        }
    }
}
```

### 3. **Inicializar `authListener` no Constructor**:

```javascript
constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.userProfile = null;
    this.sessionTimeout = 48 * 60 * 60 * 1000;
    this.authListener = null; // Guardar subscription do listener
    this.init();
}
```

## 🎯 RESULTADO ESPERADO

### Cenário Correto:

#### 1. **Login em `login.html`**:
```
✅ Listener de autenticação configurado  (Listener #1 criado)
Estado de autenticação mudou: SIGNED_IN
🔍 SIGNED_IN detectado na página: login.html
✅ Processando handleSignIn porque estamos em login.html
→ Redireciona para index-kromi.html
```

#### 2. **Carregamento de `index-kromi.html`**:
```
⚠️ Listener de autenticação já existe - não criar outro  (Listener #1 reutilizado)
Estado de autenticação mudou: INITIAL_SESSION
(Não dispara SIGNED_IN novamente)
```

#### 3. **Navegação para `events.html`**:
```
⚠️ Listener de autenticação já existe - não criar outro  (Listener #1 reutilizado)
Estado de autenticação mudou: INITIAL_SESSION
(Não dispara SIGNED_IN novamente)
✅ Página carrega normalmente!
```

## 📋 LOGS ESPERADOS

### No Login:
```
✅ Listener de autenticação configurado
Estado de autenticação mudou: SIGNED_IN {access_token: '...', ...}
🔍 SIGNED_IN detectado na página: login.html
✅ Processando handleSignIn porque estamos em login.html
AUTH EVENT: Iniciando handleSignIn
INFO: Carregando perfil do utilizador...
Perfil carregado com sucesso: {profile_type: 'admin', ...}
INFO: Login processado - aguardando redirecionamento do universal-route-protection
SUCCESS: handleSignIn concluído com sucesso
🚀 Redirecionando de login.html para index-kromi.html
```

### Ao Carregar Outras Páginas:
```
⚠️ Listener de autenticação já existe - não criar outro
Estado de autenticação mudou: INITIAL_SESSION {access_token: '...', ...}
(SEM redirecionamento - carrega página normalmente)
```

### Se SIGNED_IN Disparar em Página Protegida (não deveria):
```
Estado de autenticação mudou: SIGNED_IN {access_token: '...', ...}
🔍 SIGNED_IN detectado na página: events.html
⏸️ Ignorando SIGNED_IN porque não estamos em login.html
(Apenas atualiza currentUser e userProfile - SEM redirecionamento)
```

## 🔍 VERIFICAÇÃO

### Testes a Fazer:

#### 1. **Login Normal**:
- [ ] Ir para `login.html`
- [ ] Fazer login
- [ ] Verificar que aparece **APENAS 1** mensagem "✅ Listener de autenticação configurado"
- [ ] Verificar que redireciona para `index-kromi.html`
- [ ] Verificar que **NÃO** fica em loop

#### 2. **Navegação entre Páginas**:
- [ ] Após login, ir para diferentes páginas
- [ ] Verificar que aparece "⚠️ Listener de autenticação já existe"
- [ ] Verificar que **NÃO** dispara `SIGNED_IN` novamente
- [ ] Verificar que as páginas carregam normalmente

#### 3. **Múltiplas Abas**:
- [ ] Abrir 2 abas do VisionKrono
- [ ] Fazer login em ambas
- [ ] Verificar que cada aba tem **APENAS 1** listener
- [ ] Verificar que **NÃO** há conflitos entre abas

#### 4. **Acesso Direto a Páginas Protegidas**:
- [ ] Ir direto para `events.html` (sem fazer login)
- [ ] Verificar que redireciona para `login.html`
- [ ] Fazer login
- [ ] Verificar que volta para `index-kromi.html` (não para `events.html`)

## 📋 PRÓXIMOS PASSOS

1. **Reiniciar o servidor**:
   ```bash
   Ctrl+C
   npm start
   ```

2. **Limpar COMPLETAMENTE o cache do browser**:
   - Fechar **TODAS** as abas do VisionKrono
   - Fechar o browser completamente
   - Reabrir o browser
   - OU: `Ctrl + Shift + Delete` → Limpar cache e cookies

3. **Testar sequencialmente**:
   - Login
   - Navegação para index
   - Navegação para events
   - **Partilhar logs de CADA passo!**

4. **Verificar logs específicos**:
   - Contar quantas vezes aparece "✅ Listener de autenticação configurado" (deve ser **1**)
   - Verificar se aparece "⚠️ Listener de autenticação já existe" nas outras páginas
   - Verificar se **NÃO** aparece "🔍 SIGNED_IN detectado na página: events.html"

## 🚨 SE AINDA HOUVER PROBLEMAS

Se mesmo após esta correção ainda houver bloqueios, o problema pode ser:

1. **Cache do browser não limpo**: O browser ainda está usando o `auth-system.js` antigo
2. **Múltiplas instâncias do AuthSystem**: Verificar se `window.authSystem` está sendo criado múltiplas vezes
3. **Outro código a criar listeners**: Verificar se há outros arquivos criando listeners de autenticação

Nesse caso, partilha:
- Todos os logs desde o login até o bloqueio
- Quantas vezes aparece "✅ Listener de autenticação configurado"
- Se aparece "⚠️ Listener de autenticação já existe"



