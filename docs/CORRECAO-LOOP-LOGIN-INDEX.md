# 🔧 CORREÇÃO: Loop Entre Login e Index

## ❌ PROBLEMA IDENTIFICADO

Sistema estava em **loop infinito** entre `login.html` e `index-kromi.html`:

### Logs do Problema:
```
[INFO] [13] ❌ Utilizador não autenticado
[INFO] [14] 📍 URL de retorno guardada: https://192.168.1.219:1144/index-kromi.html
[INFO] [15] 🚀 Redirecionando para login...
[CARREGA LOGIN]
[INFO] [57] 📍 URL de retorno encontrada: https://192.168.1.219:1144/index-kromi.html
[INFO] [59] 🚀 Redirecionando para URL de retorno: https://192.168.1.219:1144/index-kromi.html
[VOLTA PARA INDEX]
[INFO] [13] ❌ Utilizador não autenticado
[LOOP INFINITO!]
```

### Causa Raiz:
1. `index-kromi.html` estava na lista de **páginas protegidas**
2. Ao carregar, sistema detectava "sem sessão" (porque ainda estava inicializando)
3. Guardava returnUrl = index-kromi.html
4. Redirecionava para login
5. Após login, voltava para index-kromi.html
6. **LOOP INFINITO**

### Problema Secundário:
```
[ERROR] [33] Erro ao carregar perfil
[ERROR] [45] ERROR: Erro/Timeout ao carregar perfil (5s)
```

O perfil dava timeout ao carregar, indicando problema na query do Supabase.

## ✅ SOLUÇÃO APLICADA

### 1. **Adicionar index-kromi.html às páginas públicas**:

```javascript
// Em universal-route-protection.js
this.publicPages = [
    'login.html',
    'register.html', 
    'forgot-password.html',
    'reset-password.html',
    'auth/callback.html',
    'index-kromi.html'  // ← ADICIONADO!
];
```

### Comportamento Agora:
- ✅ `index-kromi.html` é tratada como página **pública**
- ✅ Se **TEM sessão** → Redireciona para dashboard apropriado
- ✅ Se **NÃO TEM sessão** → Permite ver index (homepage pública)
- ✅ **NÃO entra em loop**!

### 2. **Cache-buster atualizado**:
- `universal-route-protection.js?v=2025102608`

## 🎯 RESULTADO ESPERADO

### Cenário 1: Abrir index-kromi.html SEM sessão
```
1. Vai para: https://192.168.1.219:1144/index-kromi.html
2. Sistema detecta: Página pública
3. Verifica sessão: NÃO TEM
4. Permite acesso → Mostra homepage pública ✅
```

### Cenário 2: Abrir index-kromi.html COM sessão
```
1. Vai para: https://192.168.1.219:1144/index-kromi.html
2. Sistema detecta: Página pública
3. Verifica sessão: TEM (admin)
4. Redireciona para: index-kromi.html (mesma página - sem redirecionamento)
OU
4. Mostra dashboard de admin ✅
```

### Cenário 3: Abrir página protegida SEM sessão
```
1. Vai para: https://192.168.1.219:1144/events.html
2. Sistema detecta: Página protegida
3. Verifica sessão: NÃO TEM
4. Guarda returnUrl: events.html
5. Redireciona para: login.html
6. Faz login
7. Usa returnUrl: events.html ✅
```

### Cenário 4: Abrir página protegida COM sessão
```
1. Vai para: https://192.168.1.219:1144/events.html
2. Sistema detecta: Página protegida
3. Verifica sessão: TEM
4. Carrega página DIRETAMENTE ✅
5. SEM redirecionamento
```

## 🔍 PROBLEMA SECUNDÁRIO: Erro ao Carregar Perfil

Os logs mostram:
```
[ERROR] Erro ao carregar perfil
[WARN] Erro ao carregar perfil - usando perfil padrão admin
```

Isto indica que a query do perfil está falhando. Possíveis causas:
1. Tabela `user_profiles` não existe ou está mal estruturada
2. RLS bloqueando query
3. Coluna `profile_type` não existe

### Verificação Necessária:
Executar no Supabase SQL Editor:
```sql
-- Verificar estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- Verificar se existe perfil para o utilizador
SELECT * FROM user_profiles 
WHERE user_id = '8d772aff-15f2-4484-9dec-5e1646a1b863';
```

## 📋 PRÓXIMOS PASSOS

1. **Reiniciar servidor**:
   ```bash
   Ctrl+C
   npm start
   ```

2. **Testar index-kromi.html**:
   - Ir para: `https://192.168.1.219:1144/index-kromi.html`
   - **NÃO deve** entrar em loop
   - Deve carregar homepage

3. **Testar login**:
   - Fazer login
   - Verificar se redireciona corretamente

4. **Investigar erro de perfil**:
   - Verificar logs para identificar erro específico
   - Verificar estrutura da tabela user_profiles no Supabase

**Reinicia o servidor e testa! O loop deve estar resolvido!** 🔧



