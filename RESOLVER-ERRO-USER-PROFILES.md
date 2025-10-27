# 🔧 RESOLVER: Erro 500 na Tabela user_profiles

## ❌ PROBLEMA ATUAL

A tabela `user_profiles` está retornando **erro 500** porque o código está esperando colunas que não existem:

### Erro nos Logs:
```
Failed to load resource: the server responded with a status of 500
/rest/v1/user_profiles?select=id,user_id,name,email,phone,organization,role,status,...
```

### Colunas que o código espera:
- `id`, `user_id`, `email`, `phone` ✅ (existem)
- `name` ❌ (tabela tem `full_name`)
- `organization` ❌ (não existe)
- `role` ❌ (tabela tem `profile_type`)
- `status` ❌ (tabela tem `is_active`)
- `last_login`, `login_count` ❌ (não existem)

---

## ✅ SOLUÇÕES

### **SOLUÇÃO 1: Aplicar SQL de Correção (RECOMENDADO)**

Já tens o script pronto! Só precisas executar no Supabase:

#### **Passo a Passo:**

1. **Vai para Supabase**:
   ```
   https://supabase.com/dashboard/project/mdrvgbztadnluhrrnlob/sql
   ```

2. **Abre o arquivo** "`../sql/fix-essential.sql" ou "`../sql/apply-database-fix.sql"

3. **Copia TODO o conteúdo**

4. **Cola no SQL Editor** do Supabase

5. **Clica em RUN**

6. **Verifica** se aparece mensagem de sucesso

7. **Volta para o VisionKrono** e testa

#### **O que o script faz:**
- ✅ Adiciona coluna `role` (mapeia de `profile_type`)
- ✅ Adiciona coluna `status` (mapeia de `is_active`)
- ✅ Renomeia `full_name` para `name`
- ✅ Adiciona colunas: `organization`, `last_login`, `login_count`
- ✅ Migra dados existentes
- ✅ Cria índices para performance

---

### **SOLUÇÃO 2: Desativar Gestão de Utilizadores Temporariamente (APLICADA)**

Para o sistema funcionar **AGORA** sem aplicar SQL:

#### **O que fiz:**
- ✅ Comentei `user-management.js` no `index-kromi.html`
- ✅ Sistema de autenticação continua funcionando
- ✅ Login, sessão e navegação funcionam normalmente
- ❌ Gestão de utilizadores não funciona (até aplicar SQL)

#### **Arquivo alterado:**
```html
<!-- index-kromi.html -->
<!-- TEMPORARIAMENTE DESATIVADO ATÉ APLICAR fix-essential.sql NO SUPABASE -->
<!-- <script src="user-management.js?v=2025102608"></script> -->
```

---

## 🎯 SISTEMA ATUAL

### **O que FUNCIONA agora:**
- ✅ **Login** e autenticação
- ✅ **Persistência** de sessão (48h)
- ✅ **Return URL** (volta à página solicitada)
- ✅ **Navegação** entre páginas
- ✅ **9 páginas protegidas** com autenticação
- ✅ **index-kromi.html** sem loop
- ✅ **Dashboard básico** (sem gestão de utilizadores)

### **O que NÃO funciona (até aplicar SQL):**
- ❌ **Gestão de Utilizadores** (lista, criar, editar, eliminar)
- ❌ **Estatísticas de utilizadores** no dashboard
- ❌ **Perfil completo** do utilizador (usa perfil padrão admin)

---

## 📋 PRÓXIMOS PASSOS

### **Opção A: Aplicar SQL AGORA (5 minutos)**
1. Ir para Supabase SQL Editor
2. Executar "`../sql/fix-essential.sql" ou "`../sql/apply-database-fix.sql"
3. Descomentar `user-management.js` no `index-kromi.html`
4. Reiniciar servidor
5. **TUDO funciona!** ✅

### **Opção B: Usar sistema como está**
1. Reiniciar servidor
2. Sistema de autenticação funciona ✅
3. Navegação funciona ✅
4. Gestão de utilizadores desativada ❌
5. Aplicar SQL mais tarde quando quiseres

---

## 🔍 VERIFICAR SE SQL JÁ FOI APLICADO

Se quiser verificar se já aplicaste o SQL:

```sql
-- Verificar se coluna 'role' existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'role';
```

**Se retornar vazio** → SQL NÃO foi aplicado
**Se retornar 'role'** → SQL JÁ foi aplicado ✅

---

## ⚡ RECOMENDAÇÃO

**Aplica o SQL agora!** São apenas 5 minutos e depois tudo funciona perfeitamente, incluindo gestão de utilizadores.

**Qual queres fazer? Aplicar SQL ou deixar assim por agora?** 🔧



