# 📦 Criar Buckets de Storage no Supabase

## 🎯 Problema

Erro ao carregar logo: `Bucket "media-originals" not found`

## ✅ Solução Rápida (2 minutos)

### Opção 1: Via Supabase Dashboard (MAIS FÁCIL)

1. **Abrir Supabase Dashboard:**
   - Ir para: https://supabase.com/dashboard
   - Selecionar o projeto Kromi/VisionKrono

2. **Ir para Storage:**
   - No menu lateral, clicar em **"Storage"**
   - Clicar em **"New bucket"**

3. **Criar os 3 buckets necessários:**

   **Bucket 1: media-originals**
   - **Name:** `media-originals`
   - **Public:** ❌ No (privado)
   - **File size limit:** 5242880 (5 MB)
   - **Allowed MIME types:**
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/svg+xml`
     - `image/svg`
     - `image/webp`
     - `image/x-icon`
     - `image/vnd.microsoft.icon`
   - Clicar em **"Create bucket"**

   **Bucket 2: media-processed**
   - **Name:** `media-processed`
   - **Public:** ✅ Yes (público - ficheiros processados podem ser servidos)
   - **File size limit:** 5242880 (5 MB)
   - **Allowed MIME types:**
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
   - Clicar em **"Create bucket"**

   **Bucket 3: favicons-and-manifest**
   - **Name:** `favicons-and-manifest`
   - **Public:** ✅ Yes (público - favicons devem ser públicos)
   - **File size limit:** 1048576 (1 MB)
   - **Allowed MIME types:**
     - `image/png`
     - `image/x-icon`
     - `image/vnd.microsoft.icon`
     - `image/svg+xml`
     - `application/json`
   - Clicar em **"Create bucket"**

4. **Verificar:**
   - Após criar todos, deve ver 3 buckets na lista
   - Recarregar a página de Branding & SEO
   - Tentar carregar logo novamente

### Opção 2: Via API (Avançado)

Se tiver acesso à **Service Role Key**, pode criar via API:

```bash
# Usar o endpoint do backend
curl -X POST https://192.168.1.219:1144/api/branding/create-buckets \
  -H "Cookie: sid=SEU_SESSION_ID" \
  -H "Content-Type: application/json"
```

Ou usar o script Node.js:
```bash
node scripts/create-storage-buckets.js
```

## 🔒 Configurar Políticas RLS (Opcional mas Recomendado)

Após criar os buckets, configure as políticas no Dashboard:

1. Ir para **Storage** > Selecionar bucket > **Policies**

2. **Para `media-originals`床边:**
   - **SELECT:** Permitir para autenticados
   - **INSERT/UPDATE/DELETE:** Apenas admins

3. **Para `media-processed`:**
   - **SELECT:** Público (todos podem ler)
   - **INSERT/UPDATE:** Apenas sistema
   - **DELETE:** Apenas admins

4. **Para `favicons-and-manifest`:**
   - **SELECT:** Público (todos podem ler)
   - **INSERT/UPDATE/DELETE:** Apenas admins

## ✅ Verificação

Após criar os buckets:
1. Recarregar a página de Branding & SEO
2. Tentar carregar um logo
3. Deve funcionar sem erros! ✅

## 📝 Notas

- Os buckets são criados no **Supabase Storage**, não na base de dados PostgreSQL
- Não é possível criar buckets via SQL - apenas via Dashboard ou API REST
- Se usar Service Role Key, o backend pode verificar/criar automaticamente

