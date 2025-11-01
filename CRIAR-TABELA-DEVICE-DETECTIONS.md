# 🚨 Tabela device_detections Não Existe - Como Criar

## ✅ Solução Rápida

Execute estes scripts SQL no **Supabase Dashboard → SQL Editor** (na ordem):

### Passo 1: Criar Tabela Base

```sql
-- Execute: sql/create-device-detections-table.sql
-- Ou copie e cole o conteúdo completo do arquivo
```

**Arquivo:** `sql/create-device-detections-table.sql`

---

### Passo 2: Criar Funções RPC

```sql
-- Execute: sql/native-app-detections-table.sql
-- Este cria as funções RPC que a app vai usar
```

**Arquivo:** `sql/native-app-detections-table.sql`

---

### Passo 3: Criar View e Sistema de Login

```sql
-- Execute: sql/native-app-qr-code-system.sql
-- Este cria a view device_qr_info para login via QR code
```

**Arquivo:** `sql/native-app-qr-code-system.sql`

---

### Passo 4: Criar Triggers Automáticos

```sql
-- Execute: sql/auto-fill-device-info-on-create.sql
-- Este garante que dispositivos têm todas as informações
```

**Arquivo:** `sql/auto-fill-device-info-on-create.sql`

---

## 🔍 Como Verificar

Após executar os scripts, execute esta query no Supabase:

```sql
-- Verificar se tabela existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'device_detections'
) as tabela_existe;
```

Deve retornar: `tabela_existe: true`

---

## 📋 Checklist

- [ ] Script 1 executado (`create-device-detections-table.sql`)
- [ ] Script 2 executado (`native-app-detections-table.sql`)
- [ ] Script 3 executado (`native-app-qr-code-system.sql`)
- [ ] Script 4 executado (`auto-fill-device-info-on-create.sql`)
- [ ] Tabela verificada (query acima)
- [ ] Rodar: `node scripts/verify-native-app-setup.js`

---

## 🐛 Se Ainda Não Funcionar

1. **Verificar erros no Supabase:**
   - Vá em SQL Editor
   - Veja se há mensagens de erro em vermelho

2. **Verificar permissões:**
   - Certifique-se que está usando a Service Role Key ou tem permissões adequadas

3. **Verificar se já existe parcialmente:**
   ```sql
   -- Ver o que existe
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%device%';
   ```

---

## 🚀 Depois de Criar

1. **Reiniciar servidor:**
   ```bash
   node server.js
   ```

2. **Verificar logs:**
   Deve aparecer:
   ```
   ✅ Processador de device detections ativo
   ```

3. **Testar:**
   Execute `sql/test-native-app-flow.sql` no Supabase para testar o fluxo completo.

---

**✅ Execute os 4 scripts SQL e a tabela será criada!**

