# ✅ SOLUÇÃO: Utilizador Já Existe

## 🎯 **SITUAÇÃO ATUAL:**
- ✅ Utilizador `Rdias300@gmail.com` já existe na tabela `auth.users`
- ❌ Erro: `duplicate key value violates unique constraint "users_email_partial_key"`
- ⚠️ **Falta**: Criar perfil na tabela `user_profiles`

## 🚀 **SOLUÇÃO IMEDIATA:**

### **Opção 1: Script Automático (Recomendado)**
Execute o arquivo "`../sql/create-profile-auto.sql":

```sql
-- Criar perfil automaticamente
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
AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
);
```

### **Opção 2: Script Passo a Passo**
Execute o arquivo "`../sql/create-profile-only.sql":

#### **Passo 1: Obter ID**
```sql
SELECT id FROM auth.users WHERE email = 'Rdias300@gmail.com';
```

#### **Passo 2: Criar Perfil**
```sql
INSERT INTO user_profiles (user_id, email, profile_type, is_active) 
VALUES ('ID_OBTIDO', 'Rdias300@gmail.com', 'admin', true);
```

## 🔧 **EXECUÇÃO COMPLETA:**

### **1. Desabilitar RLS (se ainda não fez)**
```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

### **2. Criar Perfil Admin**
```sql
-- Execute o script create-profile-auto.sql
```

### **3. Testar Login**
- **Email**: `Rdias300@gmail.com`
- **Password**: `1234876509`

## ✅ **VERIFICAÇÃO DE SUCESSO:**

### **No Console deve aparecer:**
```
✅ Supabase conectado
Sistema de autenticação conectado ao SupabaseClient existente
Estado de autenticação mudou: SIGNED_IN
```

### **NÃO deve aparecer:**
- ❌ `infinite recursion detected`
- ❌ `500 (Internal Server Error)`
- ❌ `Invalid login credentials`

## 📁 **Arquivos Disponíveis:**
- ✅ "`../sql/create-profile-auto.sql" - Criação automática
- ✅ "`../sql/create-profile-only.sql" - Passo a passo
- ✅ "`../sql/disable-rls-now.sql" - Desabilitar RLS

## 🎯 **RESULTADO ESPERADO:**
- ✅ Login funciona perfeitamente
- ✅ Utilizador é redirecionado para dashboard
- ✅ Sistema de autenticação completo
- ✅ Perfil admin carregado corretamente

**Execute o "`../sql/create-profile-auto.sql" e teste o login!** 🚀


