# 🚨 SOLUÇÃO IMEDIATA: Erro de Recursão Infinita

## ⚠️ **PROBLEMA ATUAL:**
- Erro: `infinite recursion detected in policy for relation "user_profiles"`
- Login falha porque não consegue carregar o perfil do utilizador
- Políticas RLS estão causando loop infinito

## 🔧 **SOLUÇÃO IMEDIATA:**

### **Passo 1: Desabilitar RLS**
1. Abrir **Supabase Dashboard**
2. Ir para **SQL Editor**
3. Executar o script "`../sql/disable-rls-now.sql":

```sql
-- Desabilitar RLS na tabela user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Verificar se funcionou
SELECT COUNT(*) as total_profiles FROM user_profiles;
```

### **Passo 2: Verificar/Criar Utilizador Admin**
1. Executar o script "`../sql/create-admin-user.sql":

```sql
-- Verificar se o utilizador existe
SELECT id, email FROM auth.users WHERE email = 'Rdias300@gmail.com';

-- Criar perfil se necessário
INSERT INTO user_profiles (
    user_id,
    email,
    profile_type,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    u.id,
    'Rdias300@gmail.com',
    'admin',
    true,
    now(),
    now()
FROM auth.users u 
WHERE u.email = 'Rdias300@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    profile_type = 'admin',
    is_active = true;
```

### **Passo 3: Testar Login**
1. Recarregar a página de login
2. Tentar login com:
   - **Email**: `Rdias300@gmail.com`
   - **Password**: `1234876509`

## ✅ **VERIFICAÇÃO DE SUCESSO:**

### **No Console do Browser deve aparecer:**
```
✅ Supabase conectado
Sistema de autenticação conectado ao SupabaseClient existente
Estado de autenticação mudou: SIGNED_IN
```

### **NÃO deve aparecer:**
- ❌ `infinite recursion detected`
- ❌ `500 (Internal Server Error)`
- ❌ `Invalid login credentials`

## 🎯 **RESULTADO ESPERADO:**
- Login funciona sem erros
- Utilizador é redirecionado para dashboard
- Perfil do utilizador carrega corretamente
- Sistema de autenticação funciona completamente

## 📁 **Arquivos para Executar:**
1. "`../sql/disable-rls-now.sql" - Desabilitar RLS
2. "`../sql/create-admin-user.sql" - Verificar/criar admin

## ⚡ **EXECUTAR AGORA:**
1. **Supabase Dashboard** → **SQL Editor**
2. **Executar** "`../sql/disable-rls-now.sql"
3. **Executar** "`../sql/create-admin-user.sql"
4. **Testar** login na aplicação

**O sistema deve funcionar imediatamente após executar estes scripts!** 🚀


