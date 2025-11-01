# 📋 Form Builder para Eventos - Implementação

## ✅ Status da Implementação

### Completed Tasks ✅

1. ✅ **Schema SQL Completo** (`sql/create-form-builder-system.sql`)
   - Tabelas: `form_field_catalog`, `event_forms`, `event_form_fields`, `form_submissions`, `form_submission_files`, `event_form_slug_redirects`, `event_form_version_history`, `form_builder_audit_logs`
   - Funções: `generate_event_form_slug`, `create_form_slug_redirect`, `update_updated_at_column`, `log_form_builder_action`, `validate_submission_payment`
   - Triggers: Atualização automática de timestamps, criação de redirecionamentos de slugs
   - RLS Policies: Segurança baseada em roles (admin, moderator, event_manager)
   - Dados iniciais: Catálogo com 10 campos padrão

2. ✅ **Backend API Routes** (`src/form-builder-routes.js`)
   - Catálogo: GET, POST
   - Formulários: GET lista, POST criar, GET detalhes, PUT atualizar, POST publicar, DELETE remover
   - Campos: GET lista, POST adicionar, PUT atualizar, POST reordenar, DELETE remover
   - Submissões: POST submeter (público), GET listar (organizadores), GET confirmar
   - Público: GET /form/:slug (formulário público), GET /form-redirect/:oldSlug (redirecionamento)
   - Rate limiting: Anti-spam básico
   - Auditoria: Logs automáticos de todas as ações

3. ✅ **Integração no Server** (`server.js`)
   - Rotas carregadas automaticamente
   - Integração com sistema de autenticação existente
   - Compatibilidade com RLS policies

### Pending Tasks ⏳

4. ⏳ **Interface HTML do Form Builder** (`src/form-builder-kromi.html`)
   - Drag-and-drop para ordenação de campos
   - CRUD de campos
   - Preview em tempo real
   - Configuração de validações e lógica condicional
   - Settings de pagamento e e-mail

5. ⏳ **JavaScript do Form Builder** (`src/form-builder.js`)
   - Lógica de renderização de campos
   - Validações client-side
   - Drag-and-drop (Sortable.js ou similar)
   - Gestão de condicionais
   - Preview dinâmico

6. ⏳ **Página Pública do Formulário** (`src/form-public.js`)
   - Renderização dinâmica de campos
   - Validações
   - Submissão AJAX
   - Mensagens de sucesso/erro

7. ⏳ **Dashboard de Submissões** (`src/form-submissions-kromi.html`)
   - Listagem com filtros
   - Exportação CSV/XLSX
   - Estatísticas rápidas
   - Detalhes de submissão individual

8. ⏳ **Features Avançadas**
   - Upload de ficheiros (integração com Supabase Storage)
   - Integração de pagamentos (Stripe)
   - E-mails de confirmação (nodemailer)
   - Lógica condicional avançada
   - i18n multi-idioma completo

## 📊 Estrutura de Dados

### Catálogo de Campos
```sql
form_field_catalog
├── field_key (unique)
├── field_type (text, email, select, etc.)
├── label_translations (JSONB multi-idioma)
├── validation_rules (JSONB)
├── options (JSONB para select/multiselect)
└── metadata (JSONB)
```

### Formulários
```sql
event_forms
├── event_id (FK)
├── form_slug (unique, URL-friendly)
├── form_title_translations (JSONB)
├── version (versionamento)
├── published_at (controle de publicação)
├── settings (JSONB)
├── payment_config (JSONB)
└── email_confirmation_config (JSONB)
```

### Campos do Formulário
```sql
event_form_fields
├── form_id (FK)
├── field_catalog_id (FK, nullable para campos custom)
├── field_key
├── field_order (drag-and-drop)
├── is_required
├── is_visible
├── conditional_logic (JSONB)
└── overrides de labels/placeholders/validações
```

### Submissões
```sql
form_submissions
├── form_id (FK)
├── event_id (FK)
├── submission_data (JSONB com todos os dados)
├── payment_status
├── confirmation_token
├── ip_address
└── metadata
```

## 🔐 Segurança

### RLS Policies Implementadas
- **Catálogo**: Leitura pública, escrita apenas para admins
- **Formulários**: Leitura pública se publicado, escrita para organizadores/admins
- **Campos**: Mesmas regras que formulários
- **Submissões**: Leitura para organizadores, escrita pública para formulários publicados
- **Audit Logs**: Leitura para organizadores, escrita pelo sistema

### Autenticação
- Cookies HttpOnly com session manager
- Roles: admin, moderator, event_manager, user
- Rate limiting: 10 requests por minuto por IP

## 🌐 URLs e Rotas

### Públicas
- `GET /form/:slug` - Formulário público
- `GET /form-redirect/:oldSlug` - Redirecionamento de slug antigo
- `POST /api/forms/:formId/submit` - Submeter formulário

### Protegidas (Organizadores)
- `GET /api/events/:eventId/forms` - Listar formulários do evento
- `POST /api/events/:eventId/forms` - Criar formulário
- `GET /api/forms/:formId` - Detalhes do formulário
- `PUT /api/forms/:formId` - Atualizar formulário
- `POST /api/forms/:formId/publish` - Publicar formulário
- `GET /api/forms/:formId/fields` - Listar campos
- `POST /api/forms/:formId/fields` - Adicionar campo
- `PUT /api/forms/:formId/fields/:fieldId` - Atualizar campo
- `POST /api/forms/:formId/fields/reorder` - Reordenar campos
- `DELETE /api/forms/:formId/fields/:fieldId` - Remover campo
- `GET /api/forms/:formId/submissions` - Listar submissões

### Admins Apenas
- `GET /api/forms/catalog` - Catálogo de campos
- `POST /api/forms/catalog` - Criar campo no catálogo

## 🚀 Como Usar

### 1. Executar SQL
```bash
# Acessar Supabase Dashboard → SQL Editor
# Copiar e executar: sql/create-form-builder-system.sql
```

### 2. Reiniciar Servidor
```bash
node server.js
# Deve mostrar: ✅ Rotas de Form Builder carregadas
```

### 3. Criar Formulário via API
```javascript
// POST /api/events/:eventId/forms
{
  "form_title": { "pt": "Inscrição Marathon", "en": "Marathon Registration" },
  "form_description": { "pt": "Complete sua inscrição", "en": "Complete your registration" },
  "settings": {
    "max_submissions": 1000,
    "captcha_enabled": true,
    "allow_edits": false
  }
}
// Retorna: { "success": true, "form": { "id", "form_slug": "marathon-2024", ... } }
```

### 4. Acessar Formulário Público
```
https://sua-aplicacao.com/form/marathon-2024
https://sua-aplicacao.com/form/marathon-2024?lang=en
```

## 📝 Próximos Passos

1. **Interface do Builder**
   - Criar página HTML com drag-and-drop
   - Implementar JavaScript de renderização
   - Adicionar validações e preview

2. **Features Faltantes**
   - Upload de ficheiros
   - Integração de pagamentos
   - E-mails de confirmação
   - Dashboard de submissões com exportação
   - Lógica condicional avançada

3. **i18n e Acessibilidade**
   - Suporte completo multi-idioma
   - WCAG AA compliance
   - Mobile-first design
   - Testes de acessibilidade

4. **Testing e Documentação**
   - Testes unitários das funções SQL
   - Testes de integração das rotas API
   - Documentação de uso para organizadores
   - Exemplos de uso

## 🔍 Debug

### Verificar se SQL foi executado
```sql
SELECT COUNT(*) FROM form_field_catalog; -- Deve retornar 10
SELECT * FROM event_forms; -- Listar formulários
```

### Verificar rotas carregadas
```bash
# Procurar nos logs do servidor:
✅ Rotas de Form Builder carregadas
```

### Testar API
```bash
# Listar catálogo
curl http://localhost:1144/api/forms/catalog

# Criar formulário (requer autenticação)
curl -X POST http://localhost:1144/api/events/:eventId/forms \
  -H "Content-Type: application/json" \
  -d '{"form_title": {"pt": "Teste"}, "form_description": {"pt": "Teste"}}'
```

## 📚 Referências

- Schema: `sql/create-form-builder-system.sql`
- Backend: `src/form-builder-routes.js`
- Integração: `server.js` (linhas ~4113-4116)
- Base: Sistema de eventos existente em `src/events-routes.js`

