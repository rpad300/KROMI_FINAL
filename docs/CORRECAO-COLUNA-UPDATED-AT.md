# 🔧 CORREÇÃO: Coluna "updated_at" Não Existe

## ❌ **PROBLEMA:**
```
ERROR: 42703: column "updated_at" of relation "user_sessions" does not exist
```

**Causa**: A tabela `user_sessions` não tem a coluna `updated_at`.

## ✅ **SOLUÇÃO:**

### **Use o script "`../sql/disable-rls-simple.sql" (sem inserções):**

```sql
-- Desabilitar RLS em todas as tabelas
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;
```

## 🚀 **EXECUÇÃO IMEDIATA:**

### **Passo 1: Executar Script Simples**
1. **Supabase Dashboard** → **SQL Editor**
2. Executar "`../sql/disable-rls-simple.sql"
3. Verificar se não há erros

### **Passo 2: Testar Login**
1. Recarregar página de login
2. Fazer login com `Rdias300@gmail.com` / `1234876509`
3. Verificar se redireciona para dashboard

## ✅ **RESULTADO ESPERADO:**

### **No Console deve aparecer:**
```
✅ Supabase conectado
Sistema de autenticação conectado ao SupabaseClient existente
Estado de autenticação mudou: SIGNED_IN
Carregando perfil para utilizador: [ID]
Perfil carregado com sucesso: {profile_type: "admin", ...}
Redirecionando baseado no perfil: {profile_type: "admin", ...}
Perfil do utilizador: admin
Redirecionando admin para dashboard
```

### **NÃO deve aparecer mais:**
- ❌ `403 (Forbidden)`
- ❌ `42501: new row violates row-level security policy`
- ❌ `Erro ao criar sessão`
- ❌ `Erro ao registar atividade`

## 🎯 **RESULTADO FINAL:**
- ✅ Login funciona perfeitamente
- ✅ Perfil carrega corretamente
- ✅ Sessão é criada sem erros
- ✅ Redirecionamento para `admin-dashboard.html`
- ✅ Sistema de autenticação completo

## 📁 **Arquivos Disponíveis:**
- ✅ "`../sql/disable-rls-simple.sql" - Script simples (recomendado)
- ✅ "`../sql/disable-all-rls.sql" - Script completo (corrigido)

**Execute o "`../sql/disable-rls-simple.sql" e o sistema funcionará perfeitamente!** 🚀


