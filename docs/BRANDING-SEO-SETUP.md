# 🎨 Branding e SEO - Guia de Instalação

## 📋 Pré-requisitos

1. **Tabelas SQL criadas**: Execute `sql/create-branding-seo-system.sql` no Supabase SQL Editor
2. **Buckets de Storage**: Crie os 3 buckets necessários (ver `sql/create-branding-storage-buckets.sql`)
3. **Dependências NPM**: Execute `npm install` para instalar:
   - `multer` - Upload de ficheiros
   - `sharp` - Processamento de imagens
   - `openai` - Geração com IA (opcional)
   - `@google/generative-ai` - Geração com Gemini (opcional)

## 🗄️ Setup da Base de Dados

### 1. Criar Tabelas

Execute no Supabase SQL Editor:
```sql
-- Copiar conteúdo de sql/create-branding-seo-system.sql
```

Isto cria as seguintes tabelas:
- `site_brand_assets` - Logos e favicons
- `page_registry` - Registro de páginas
- `page_meta` - Metadados SEO por página
- `page_thumbnails` - Thumbnails para redes sociais
- `media_variants` - Variantes de imagens geradas
- `ai_generation_jobs` - Jobs de geração com IA
- `branding_audit_log` - Log de auditoria

### 2. Criar Buckets de Storage

No Supabase Dashboard > Storage, criar:

1. **media-originals**
   - Public: No
   - File size limit: 5 MB
   - Allowed MIME types: image/jpeg, image/png, image/svg+xml, image/webp, image/x-icon

2. **media-processed**
   - Public: Yes
   - File size limit: 5 MB
   - Allowed MIME types: image/webp, image/png

3. **favicons-and-manifest**
   - Public: Yes
   - File size limit: 2 MB
   - Allowed MIME types: image/x-icon, image/png

**Políticas RLS (Storage Policies):**

Para `media-originals`:
- SELECT: `authenticated` pode ler
- INSERT/UPDATE/DELETE: Apenas `role = 'admin'` ou `role = 'superadmin'`

Para `media-processed` e `favicons-and-manifest`:
- SELECT: `public` (todos)
- INSERT/UPDATE/DELETE: Apenas `role = 'admin'` ou `role = 'superadmin'`

## 🔑 Configuração de API Keys

Certifique-se de que o `.env` contém (pelo menos uma das opções):

```env
# Para geração com IA
OPENAI_API_KEY=your-openai-key
# OU
GEMINI_API_KEY=your-gemini-key
```

## 🚀 Uso

### Acesso à Página

A funcionalidade está acessível apenas para utilizadores com role `admin` ou `superadmin`:

```
https://your-domain/branding-seo
```

### Funcionalidades Disponíveis

1. **Logos** - Upload de logos primário, secundário, favicons e app icons
2. **Metadados Globais** - Título, descrição e configurações globais do site
3. **Metadados por Página** - SEO específico por página (title, description, OG, Twitter)
4. **Thumbnails** - Imagens para partilha em redes sociais (Open Graph e Twitter Cards)
5. **Geração com IA** - Gerar variações de títulos e descrições usando IA
6. **Media Library** - Biblioteca de todos os assets de branding
7. **Auditoria** - Histórico de alterações e versionamento

## 📝 Endpoints API

### Brand Assets
- `GET /api/branding/brand-assets` - Listar logos
- `POST /api/branding/upload-logo` - Upload de logo
- `DELETE /api/branding/brand-assets/:id` - Eliminar logo

### Pages
- `GET /api/branding/pages` - Listar páginas
- `POST /api/branding/pages` - Criar página

### Page Meta
- `GET /api/branding/page-meta/:pageId` - Obter metadados
- `POST /api/branding/page-meta` - Guardar metadados
- `POST /api/branding/publish-page-meta/:pageId` - Publicar metadados

### Thumbnails
- `GET /api/branding/thumbnails/:pageId` - Listar thumbnails
- `POST /api/branding/upload-thumbnail` - Upload thumbnail
- `POST /api/branding/publish-thumbnails/:pageId` - Publicar thumbnails

### AI Generation
- `POST /api/branding/generate-ai` - Gerar conteúdo com IA

### Media Library
- `GET /api/branding/media-library` - Listar toda a media

### Audit Log
- `GET /api/branding/audit-log` - Histórico de alterações

## 🔒 Permissões

- **Acesso**: Apenas `admin` e `superadmin`
- **RLS**: Configurado para permitir leitura de conteúdo publicado por todos
- **Storage**: Políticas RLS aplicadas nos buckets

## 🐛 Troubleshooting

### Erro: "Service Role Key não configurada"
Certifique-se de que `SUPABASE_SERVICE_ROLE_KEY` está no `.env`

### Erro: "Bucket não encontrado"
Crie os buckets no Supabase Dashboard > Storage

### Imagens não aparecem
Verifique:
1. Políticas RLS dos buckets estão corretas
2. URLs públicas estão a ser geradas corretamente
3. CORS configurado no Supabase

### IA não funciona
Verifique que pelo menos uma API key está configurada:
- `OPENAI_API_KEY` ou
- `GEMINI_API_KEY`

## 📚 Estrutura de Ficheiros

```
src/
  branding-seo.html       # Página principal
  branding-seo.js          # Lógica frontend
  branding-routes.js       # Endpoints backend

sql/
  create-branding-seo-system.sql        # Schema da base de dados
  create-branding-storage-buckets.sql   # Instruções para buckets
```

## ✅ Checklist de Instalação

- [ ] Tabelas SQL criadas
- [ ] 3 buckets de Storage criados
- [ ] Políticas RLS configuradas
- [ ] Dependências NPM instaladas (`npm install`)
- [ ] API keys configuradas (opcional, para IA)
- [ ] Testar acesso como admin em `/branding-seo`
- [ ] Testar upload de logo
- [ ] Testar criação de página e metadados

## 🎯 Próximos Passos

1. Carregar logos principais da plataforma
2. Definir metadados globais
3. Criar registros para páginas principais
4. Definir metadados e thumbnails por página
5. Testar geração com IA (se configurado)

