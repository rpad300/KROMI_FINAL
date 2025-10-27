# 🚨 INSTRUÇÕES: Desativar RLS para Corrigir Erro

## ❌ PROBLEMA ATUAL

Erro ao carregar perfis e utilizadores:
```
infinite recursion detected in policy for relation "user_profiles"
```

Este erro aparece porque as **políticas RLS** (Row Level Security) estão em **loop infinito**.

---

## ✅ SOLUÇÃO RÁPIDA (2 MINUTOS)

### **PASSO 1: Ir para Supabase**

1. Abre o browser
2. Vai para:
   ```
   https://supabase.com/dashboard/project/mdrvgbztadnluhrrnlob/sql
   ```
3. Faz login se necessário

### **PASSO 2: Executar Script**

1. **Abre** o arquivo "`../sql/desativar-rls-user-profiles.sql" (está aberto no Cursor)

2. **Seleciona TUDO** (`Ctrl+A`)

3. **Copia** (`Ctrl+C`)

4. **No Supabase SQL Editor**:
   - Cola o código (`Ctrl+V`)
   - Clica em **RUN** (botão verde)

5. **Aguarda** execução (2-3 segundos)

6. **Verifica** se aparece:
   ```
   RLS desativado com sucesso! Tabela user_profiles acessível.
   ```

### **PASSO 3: Testar**

1. **Volta** para o VisionKrono

2. **Recarrega** a página (`F5` ou `Ctrl+R`)

3. **Verifica** se:
   - ✅ Tabela de utilizadores aparece
   - ✅ Mostra "Administrador" na lista
   - ✅ Botões funcionam

---

## 🔍 SE AINDA NÃO FUNCIONAR

### **Verificar no Supabase:**

Execute este comando no SQL Editor:

```sql
-- Verificar se RLS está desativado
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE tablename = 'user_profiles';
```

**Resultado esperado:**
```
tablename: user_profiles
rls_ativo: false  ← DEVE SER FALSE!
```

Se `rls_ativo = true`, executar novamente:
```sql
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
```

---

## 📊 TESTE RÁPIDO

Executar no SQL Editor para verificar dados:

```sql
-- Ver utilizadores na tabela
SELECT 
    id,
    user_id,
    name,
    email,
    role,
    status
FROM user_profiles
LIMIT 10;
```

**Se retornar dados** → Tabela está OK ✅
**Se retornar erro** → RLS ainda ativo ❌

---

## 🎯 APÓS DESATIVAR RLS

O sistema deve:
- ✅ Carregar perfil sem erro 500
- ✅ Mostrar utilizadores na tabela
- ✅ Botão "Adicionar Utilizador" abre modal
- ✅ Botão "Editar" abre formulário
- ✅ Sistema de gestão 100% funcional

---

**Executa o script "`../sql/desativar-rls-user-profiles.sql" no Supabase agora!** 🔧



