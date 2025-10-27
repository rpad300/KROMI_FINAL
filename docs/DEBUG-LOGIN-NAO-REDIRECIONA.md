# 🔍 DEBUG: Login Não Redireciona

## ❌ **PROBLEMA:**
- ✅ Login funciona (credenciais corretas)
- ❌ **Não redireciona** do login para o dashboard
- ❌ Fica sempre na página de login

## 🔍 **DIAGNÓSTICO:**

### **Passo 1: Verificar Base de Dados**
Execute o script "`../sql/debug-auth-system.sql" no Supabase:

```sql
-- Verificar se utilizador e perfil existem
SELECT u.id, u.email, p.profile_type, p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';

-- Verificar se RLS está desabilitado
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs');
```

### **Passo 2: Debug no Browser**
1. Abrir **Developer Tools** (F12)
2. Ir para **Console**
3. Fazer login
4. Verificar logs de erro

### **Passo 3: Adicionar Debug Temporário**
Adicionar este script ao `login.html` antes do `</body>`:

```html
<script src="debug-login.js"></script>
```

## 🔧 **POSSÍVEIS CAUSAS:**

### **1. RLS Ainda Ativo**
- **Sintoma**: Erro 403/42501 no console
- **Solução**: Executar "`../sql/disable-rls-only.sql"

### **2. Perfil Não Existe**
- **Sintoma**: Erro ao carregar perfil
- **Solução**: Executar "`../sql/create-profile-auto.sql"

### **3. Sessão Não Persiste**
- **Sintoma**: Login funciona mas não mantém sessão
- **Solução**: Verificar tabela `user_sessions`

### **4. Redirecionamento Bloqueado**
- **Sintoma**: Console mostra tentativa de redirecionamento mas não acontece
- **Solução**: Verificar se há JavaScript bloqueando

## 🚀 **SOLUÇÃO PASSO A PASSO:**

### **Passo 1: Verificar Base de Dados**
```sql
-- Executar no Supabase
SELECT 'Utilizador existe:' as status, COUNT(*) as total
FROM auth.users WHERE email = 'Rdias300@gmail.com';

SELECT 'Perfil existe:' as status, COUNT(*) as total
FROM user_profiles WHERE email = 'Rdias300@gmail.com';

SELECT 'RLS desabilitado:' as status, COUNT(*) as total
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs')
AND rowsecurity = false;
```

### **Passo 2: Debug no Console**
1. Fazer login
2. Verificar se aparece:
   - ✅ `Estado de autenticação mudou: SIGNED_IN`
   - ✅ `Perfil carregado com sucesso`
   - ✅ `Redirecionando admin para dashboard`

### **Passo 3: Verificar Redirecionamento**
Se aparecer `🔀 REDIRECIONAMENTO DETECTADO` mas não redirecionar:
- Verificar se há popup blocker
- Verificar se há JavaScript bloqueando
- Verificar se URL está correto

## 📁 **Arquivos de Debug:**
- ✅ "`../sql/debug-auth-system.sql" - Verificar base de dados
- ✅ `debug-login.js` - Debug no browser

## 🎯 **RESULTADO ESPERADO:**
- ✅ Login funciona
- ✅ Perfil carrega
- ✅ Redirecionamento acontece
- ✅ Dashboard carrega

**Execute os scripts de debug e partilhe os resultados!** 🔍


