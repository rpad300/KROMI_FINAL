# Como Executar SQL no Supabase

## Opção 1: Via Script Node.js (Direto)

**Requisitos:**
- Variável `SUPABASE_DB_URL` no `.env` com formato:
  ```
  SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  ```

**Executar:**
```bash
node scripts/run-sql.js sql/create-site-global-metadata-table.sql
```

**Onde encontrar a connection string:**
1. Dashboard Supabase → Settings → Database
2. Connection String → Transaction mode
3. Copiar a string e substituir `[YOUR-PASSWORD]` pela password real

---

## Opção 2: Via Dashboard Supabase (Recomendado)

1. Aceder ao Dashboard: https://supabase.com/dashboard/project/[PROJECT_REF]
2. SQL Editor → New Query
3. Colar o conteúdo do ficheiro SQL
4. Run

**Ficheiros SQL a executar:**
- `sql/create-site-global-metadata-table.sql` ✅ **NECESSÁRIO**
- `sql/add-platform-context.sql` (se ainda não executou)
- `sql/add-social-platforms-thumbnails.sql` (se ainda não executou)
- `sql/add-social-platforms-metadata.sql` (se ainda não executou)

---

## Opção 3: Via API do Servidor (Requer servidor rodando)

**Se o servidor estiver rodando:**
```bash
# Primeiro, autenticar no sistema
# Depois, fazer POST para:
POST https://localhost:1144/api/admin/execute-sql
Body: { "script": "create-site-global-metadata-table" }
```

---

## Status

✅ **Implementação Frontend:** Completa
✅ **Implementação Backend:** Completa  
✅ **SQL Scripts:** Criados
⏳ **Execução SQL:** Pendente (execute via Dashboard ou configure SUPABASE_DB_URL)

