# 🚀 Form Builder - Quick Start Guide

## Implementação Completa do Sistema de Formulários Dinâmicos

Este guia mostra como usar o Form Builder implementado no VisionKrono/Kromi.online.

---

## ✅ O Que Foi Implementado

### Backend Completo ✅
- **8 Tabelas SQL** com relacionamentos, triggers, RLS policies
- **17 Rotas API REST** para CRUD completo de formulários
- **Sistema de slugs** únicos e redirecionamentos automáticos
- **Rate limiting** anti-spam
- **Auditoria completa** de todas as ações

### Frontend Público ✅
- **Página de formulário dinâmica** (`/form/:slug`)
- **JavaScript de renderização** de todos os tipos de campo
- **Validações client-side** e submissão AJAX
- **Multi-idioma** (PT/EN)

### Catálogo Inicial ✅
10 campos pré-configurados:
- Nome Completo
- E-mail
- Telefone
- Data de Nascimento
- Género
- País
- Tamanho de T-shirt
- Clube
- Notas Médicas
- Consentimento GDPR

---

## 🎯 Como Usar

### 1. Executar SQL de Setup

Acesse o **Supabase Dashboard → SQL Editor** e execute:

```sql
-- Copiar conteúdo de: sql/create-form-builder-system.sql
-- Clica em "Run" ou Ctrl+Enter
```

✅ Você verá: `✅ Form Builder System criado com sucesso!`

### 2. Reiniciar o Servidor

```bash
node server.js
```

✅ Procure nos logs:
```
✅ Rotas de Form Builder carregadas:
   GET    /api/forms/catalog
   POST   /api/forms/catalog
   GET    /api/events/:eventId/forms
   POST   /api/events/:eventId/forms
   ...
```

### 3. Criar um Formulário

#### Opção A: Via API (Para Desenvolvedores)

```javascript
// POST /api/events/:eventId/forms
{
  "form_title": {
    "pt": "Inscrição Marathon Lisboa 2024",
    "en": "Lisbon Marathon 2024 Registration"
  },
  "form_description": {
    "pt": "Complete sua inscrição no maior evento de corrida de Portugal",
    "en": "Complete your registration for Portugal's biggest running event"
  },
  "settings": {
    "max_submissions": 5000,
    "captcha_enabled": true,
    "allow_edits": false
  }
}

// Resposta:
{
  "success": true,
  "form": {
    "id": "uuid-here",
    "form_slug": "marathon-lisboa-2024",
    "version": 1,
    "is_active": true,
    "published_at": null
  }
}
```

#### Opção B: Interface Gráfica (Próximo Passo)

⏳ A interface visual do Form Builder ainda está pendente.
Enquanto isso, use a API diretamente.

### 4. Adicionar Campos ao Formulário

```javascript
// POST /api/forms/:formId/fields
[
  {
    "field_catalog_id": "<uuid-do-campo-nome-completo>",
    "is_required": true,
    "field_order": 1
  },
  {
    "field_catalog_id": "<uuid-do-campo-email>",
    "is_required": true,
    "field_order": 2
  },
  {
    "field_key": "custom_emergency_contact",
    "field_type": "phone",
    "label_translations": {
      "pt": "Contacto de Emergência",
      "en": "Emergency Contact"
    },
    "is_required": false,
    "field_order": 3
  }
]
```

### 5. Publicar o Formulário

```javascript
// POST /api/forms/:formId/publish
// Isso define published_at e published_by
```

### 6. Acessar o Formulário Público

```
https://sua-app.com/form/marathon-lisboa-2024
https://sua-app.com/form/marathon-lisboa-2024?lang=en
```

O formulário será renderizado automaticamente com todos os campos configurados!

---

## 📊 Estrutura do Sistema

### Tabelas Criadas

1. **`form_field_catalog`** - Catálogo de campos reutilizáveis
2. **`event_forms`** - Formulários por evento
3. **`event_form_fields`** - Campos configurados em cada formulário
4. **`form_submissions`** - Submissões dos participantes
5. **`form_submission_files`** - Ficheiros anexados
6. **`event_form_slug_redirects`** - Redirecionamentos de slugs antigos
7. **`event_form_version_history`** - Histórico de versões
8. **`form_builder_audit_logs`** - Logs de auditoria

### Funções SQL Criadas

- `generate_event_form_slug()` - Gera slug único
- `create_form_slug_redirect()` - Cria redirecionamentos
- `log_form_builder_action()` - Registra auditoria
- `validate_submission_payment()` - Valida pagamentos
- `update_updated_at_column()` - Atualiza timestamps

### Rotas API Disponíveis

#### Públicas
- `GET /form/:slug` - Formulário público
- `GET /form-redirect/:oldSlug` - Redirecionamento
- `POST /api/forms/:formId/submit` - Submeter
- `GET /api/submissions/:submissionId/confirm` - Confirmar

#### Protegidas (Organizadores)
- `GET /api/events/:eventId/forms` - Listar formulários
- `POST /api/events/:eventId/forms` - Criar formulário
- `GET /api/forms/:formId` - Detalhes
- `PUT /api/forms/:formId` - Atualizar
- `POST /api/forms/:formId/publish` - Publicar
- `DELETE /api/forms/:formId` - Deletar
- `GET /api/forms/:formId/fields` - Listar campos
- `POST /api/forms/:formId/fields` - Adicionar campo
- `PUT /api/forms/:formId/fields/:fieldId` - Atualizar campo
- `POST /api/forms/:formId/fields/reorder` - Reordenar
- `DELETE /api/forms/:formId/fields/:fieldId` - Remover campo
- `GET /api/forms/:formId/submissions` - Listar submissões

#### Admins
- `GET /api/forms/catalog` - Listar catálogo
- `POST /api/forms/catalog` - Criar campo no catálogo

---

## 🔒 Segurança

### RLS Policies

O sistema usa **Row Level Security** do Supabase:

- **Catálogo**: Público ler, apenas admins escrever
- **Formulários**: Público ler se publicado, organizadores/admins escrever
- **Submissões**: Público escrever em formulários publicados, organizadores ler
- **Audit Logs**: Organizadores ler, sistema escrever

### Rate Limiting

- **10 requests** por minuto por IP
- Evita spam e ataques de força bruta

### Autenticação

- Cookies **HttpOnly** para proteção XSS
- Sistema de **roles** (admin, moderator, event_manager)
- **Sessões** gerenciadas server-side

---

## 🧪 Testar o Sistema

### 1. Verificar SQL

```sql
-- Deve retornar 10 campos
SELECT COUNT(*) FROM form_field_catalog;

-- Listar campos
SELECT field_key, field_type FROM form_field_catalog;
```

### 2. Testar API (curl)

```bash
# Listar catálogo (sem auth)
curl http://localhost:1144/api/forms/catalog

# Criar formulário (requer auth, usar Postman ou similar)
curl -X POST http://localhost:1144/api/events/:eventId/forms \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your-session-id" \
  -d '{"form_title": {"pt": "Teste"}}'
```

### 3. Testar Formulário Público

1. Criar formulário via API
2. Adicionar campos
3. Publicar
4. Acessar: `http://localhost:1144/form/meu-formulario`
5. Preencher e submeter
6. Verificar submissão no Supabase

---

## 📝 Próximos Passos (Pendentes)

### Interface Gráfica ⏳
- `src/form-builder-kromi.html` - Interface do builder
- `src/form-builder.js` - Lógica do builder
- Drag-and-drop para reordenar campos
- Preview em tempo real
- Configuração de validações

### Dashboard de Submissões ⏳
- `src/form-submissions-kromi.html` - Interface
- Listagem com filtros
- Exportação CSV/XLSX
- Estatísticas (total, por dia, taxa conversão)

### Features Avançadas ⏳
- Upload de ficheiros (integração Supabase Storage)
- Pagamentos (integração Stripe)
- E-mails de confirmação (nodemailer)
- Lógica condicional avançada
- i18n completo (mais idiomas)

### Acessibilidade ⏳
- WCAG AA compliance
- Testes com leitores de tela
- Teclado navigation
- Mobile-first design

---

## 🐛 Troubleshooting

### Erro: "Formulário não encontrado"
- Verificar se o slug está correto
- Verificar se o formulário foi publicado (`published_at IS NOT NULL`)

### Erro: "Não autenticado"
- Fazer login primeiro
- Verificar se o cookie `sid` está presente
- Verificar expiração da sessão

### Erro: "Rate limit excedido"
- Aguardar 1 minuto entre requests
- Implementar throttling no frontend

### Campos não aparecem
- Verificar se os campos estão no `event_form_fields`
- Verificar `field_order` correto
- Verificar `is_visible = true`

### Submissão não funciona
- Verificar se formulário está publicado
- Verificar console do browser para erros
- Verificar logs do servidor

---

## 📚 Documentação Completa

- **Implementação**: `docs/FORM-BUILDER-IMPLEMENTATION.md`
- **Schema SQL**: `sql/create-form-builder-system.sql`
- **Backend**: `src/form-builder-routes.js`
- **Frontend**: `src/form-public.js`

---

## 🎉 Conclusão

O sistema de **Form Builder** está **100% funcional** no backend!

Você pode:
✅ Criar formulários dinâmicos via API
✅ Configurar campos, validações, traduções
✅ Publicar formulários com URLs personalizados
✅ Receber submissões com validações
✅ Auditoria completa de ações
✅ Rate limiting anti-spam

**Próximo passo:** Implementar a interface gráfica para facilitar o uso pelos organizadores.

