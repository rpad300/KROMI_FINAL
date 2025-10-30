# Configurar SUPABASE_DB_URL no .env

## Informações do seu projeto:
- **Project Ref:** `mdrvgbztadnluhrrnlob`
- **Região:** North EU (Stockholm) → `eu-north-1`

## Connection String (usando Pooler - Recomendado):

```
SUPABASE_DB_URL=postgresql://postgres.mdrvgbztadnluhrrnlob:[SENHA_DO_BANCO]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require
```

## Connection String (Direct Connection - Alternativa):

```
SUPABASE_DB_URL=postgresql://postgres.mdrvgbztadnluhrrnlob:[SENHA_DO_BANCO]@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=require
```

## Onde encontrar a SENHA_DO_BANCO:

1. Dashboard Supabase → **Settings** → **Database**
2. Procure por **"Database password"** ou **"Connection string"**
3. Se não souber a senha:
   - **Settings** → **Database** → **Reset database password**
   - Guarde a nova senha em local seguro

⚠️ **la senha é DIFERENTE da senha da sua conta Supabase!**
- ❌ NÃO é a senha para fazer login no dashboard
- ✅ É a senha do banco de dados PostgreSQL

## Exemplo completo (substitua [SENHA_DO_BANCO]):

```
SUPABASE_DB_URL=postgresql://postgres.mdrvgbztadnluhrrnlob:minhaSenhaSegura123@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require
```

## Depois de configurar:

Execute:
```bash
node scripts/run-sql.js sql/create-site-global-metadata-table.sql
```

