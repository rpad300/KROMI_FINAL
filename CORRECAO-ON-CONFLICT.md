# 🔧 CORREÇÃO: Erro ON CONFLICT

## ❌ **PROBLEMA:**
```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Causa**: A tabela `user_profiles` não tem constraint única para `user_id`, então o `ON CONFLICT` não funciona.

## ✅ **SOLUÇÃO:**

### **Opção 1: Script Corrigido**
Use o arquivo "`../sql/create-admin-user.sql" (já corrigido) - remove o `ON CONFLICT` e usa `NOT EXISTS`.

### **Opção 2: Script Passo a Passo (Recomendado)**
Use o arquivo "`../sql/create-admin-step-by-step.sql":

#### **Passo 1: Verificar Utilizador**
```sql
SELECT id, email FROM auth.users WHERE email = 'Rdias300@gmail.com';
```

#### **Passo 2: Se não existir, criar**
```sql
INSERT INTO auth.users (id, email, encrypted_password, ...) VALUES (...);
```

#### **Passo 3: Obter ID**
```sql
SELECT id FROM auth.users WHERE email = 'Rdias300@gmail.com';
```

#### **Passo 4: Criar Perfil**
```sql
INSERT INTO user_profiles (user_id, email, profile_type, is_active) 
VALUES ('ID_OBTIDO_NO_PASSO_3', 'Rdias300@gmail.com', 'admin', true);
```

## 🚀 **EXECUÇÃO RÁPIDA:**

### **1. Primeiro: Desabilitar RLS**
```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

### **2. Depois: Executar Script Passo a Passo**
1. Executar "`../sql/create-admin-step-by-step.sql"
2. Seguir cada bloco sequencialmente
3. Substituir `USER_ID` pelo ID real obtido

### **3. Testar Login**
- **Email**: `Rdias300@gmail.com`
- **Password**: `1234876509`

## 📁 **Arquivos Disponíveis:**
- ✅ "`../sql/create-admin-user.sql" - Corrigido (sem ON CONFLICT)
- ✅ "`../sql/create-admin-step-by-step.sql" - Passo a passo
- ✅ "`../sql/disable-rls-now.sql" - Desabilitar RLS

## 🎯 **RESULTADO ESPERADO:**
- ✅ Login funciona sem erros
- ✅ Utilizador admin criado
- ✅ Sistema de autenticação funcional
- ✅ Redirecionamento para dashboard

**Execute primeiro o "`../sql/disable-rls-now.sql" e depois o "`../sql/create-admin-step-by-step.sql"!** 🚀


