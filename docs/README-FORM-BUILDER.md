# 📋 Form Builder - Sistema de Formulários Dinâmicos

## 🎯 Visão Geral

Sistema completo de **formulários dinâmicos** para eventos, permitindo que cada organizador crie formulários de inscrição totalmente configuráveis com:

- **URL personalizado** por formulário
- **Catálogo de campos** reutilizáveis
- **Validações** e regras customizáveis
- **Multi-idioma** (PT/EN+)
- **Rate limiting** anti-spam
- **Auditoria completa**
- **Dashboard** de submissões
- **Exportação** CSV/XLSX
- **Pagamentos** (em desenvolvimento)
- **Confirmations** por e-mail (em desenvolvimento)

---

## ✅ Status Atual

### Implementado e Funcional ✅

| Componente | Status | Arquivos |
|------------|--------|----------|
| **Schema SQL** | ✅ | `sql/create-form-builder-system.sql` |
| **Backend API** | ✅ | `src/form-builder-routes.js` |
| **Integração Server** | ✅ | `server.js` |
| **Frontend Público** | ✅ | `src/form-public.js` |
| **Catálogo Inicial** | ✅ | 10 campos padrão |
| **Submissões** | ✅ | API funcional |
| **Validações** | ✅ | Client e server-side |
| **Rate Limiting** | ✅ | Anti-spam |
| **RLS Policies** | ✅ | Segurança Supabase |
| **Auditoria** | ✅ | Logs automáticos |
| **Redirecionamentos** | ✅ | Slugs únicos |

### Em Desenvolvimento ⏳

| Componente | Prioridade | Estimativa |
|------------|-----------|------------|
| **Interface Builder** | Alta | 3-5 horas |
| **Dashboard Submissões** | Alta | 2-3 horas |
| **Upload Ficheiros** | Média | 1-2 horas |
| **Pagamentos** | Média | 2-4 horas |
| **E-mails** | Baixa | 1-2 horas |
| **Lógica Condicional** | Baixa | 2-3 horas |
| **i18n Avançado** | Baixa | 1-2 horas |

---

## 🚀 Quick Start

### 1️⃣ Setup (1 minuto)

```bash
# 1. Executar SQL no Supabase
# → Supabase Dashboard → SQL Editor
# → Abrir: sql/create-form-builder-system.sql
# → Run

# 2. Reiniciar servidor
node server.js

# 3. Verificar rotas carregadas
# Procurar no console: "✅ Rotas de Form Builder carregadas"
```

### 2️⃣ Criar Formulário (via API)

```javascript
POST /api/events/:eventId/forms
Content-Type: application/json

{
  "form_title": {
    "pt": "Inscrição Marathon Lisboa 2024",
    "en": "Lisbon Marathon 2024 Registration"
  },
  "form_description": {
    "pt": "Complete sua inscrição agora",
    "en": "Complete your registration now"
  },
  "settings": {
    "max_submissions": 5000,
    "captcha_enabled": true
  }
}

// Resposta:
{
  "success": true,
  "form": {
    "id": "xxx-xxx-xxx",
    "form_slug": "marathon-lisboa-2024"
  }
}
```

### 3️⃣ Adicionar Campos

```javascript
POST /api/forms/:formId/fields

[
  {
    "field_catalog_id": "<uuid-do-campo-nome>",
    "is_required": true,
    "field_order": 1
  },
  {
    "field_key": "custom_field",
    "field_type": "text",
    "label_translations": {
      "pt": "Campo Custom",
      "en": "Custom Field"
    },
    "is_required": false,
    "field_order": 2
  }
]
```

### 4️⃣ Publicar

```javascript
POST /api/forms/:formId/publish
```

### 5️⃣ Acessar

```
https://seu-app.com/form/marathon-lisboa-2024
https://seu-app.com/form/marathon-lisboa-2024?lang=en
```

✅ **Formulário funcionando!**

---

## 📚 Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| [`FORM-BUILDER-QUICK-START.md`](./FORM-BUILDER-QUICK-START.md) | Guia rápido de uso |
| [`docs/FORM-BUILDER-IMPLEMENTATION.md`](./docs/FORM-BUILDER-IMPLEMENTATION.md) | Detalhes técnicos completos |
| [`sql/create-form-builder-system.sql`](./sql/create-form-builder-system.sql) | Schema completo comentado |
| [`src/form-builder-routes.js`](./src/form-builder-routes.js) | Backend API implementado |

---

## 🏗️ Arquitetura

### Backend

```
Server.js
└── form-builder-routes.js
    ├── Catálogo API (GET/POST)
    ├── Formulários API (CRUD + publish)
    ├── Campos API (CRUD + reorder)
    ├── Submissões API (submit/list/confirm)
    ├── Público Routes (/form/:slug, /form-redirect/:oldSlug)
    └── Helper Functions (slugs, auditoria, validação)
```

### Frontend

```
/form/:slug
├── HTML dinâmico (gerado no servidor)
├── form-public.js (renderização)
└── Design System (kromi-design-system.css)
```

### Base de Dados

```
form_field_catalog ←→ event_form_fields
                          ↓
                    event_forms ←→ form_submissions
                                       ↓
                              form_submission_files
```

---

## 🔐 Segurança

### RLS Policies

- **Público**: Ler formulários publicados, submeter
- **Organizadores**: Gerenciar seus formulários
- **Admins**: Acesso total + gestão do catálogo

### Rate Limiting

- **10 requests/minuto** por IP
- Previne spam e DDoS

### Auditoria

- Todas as ações são registradas em `form_builder_audit_logs`
- Includes: user, timestamp, mudanças, IP

### Validações

- **Client-side**: UX rápida
- **Server-side**: Segurança garantida

---

## 🧪 Exemplos de Uso

### Exemplo 1: Formulário Simples de Inscrição

```javascript
// 1. Criar formulário
const form = await fetch('/api/events/xxx/forms', {
  method: 'POST',
  body: JSON.stringify({
    form_title: { pt: 'Inscrição' },
    form_description: { pt: 'Preencha seus dados' }
  })
}).then(r => r.json());

// 2. Adicionar campos básicos
await fetch(`/api/forms/${form.form.id}/fields`, {
  method: 'POST',
  body: JSON.stringify([
    { field_key: 'full_name', field_catalog_id: '<uuid-nome>', is_required: true },
    { field_key: 'email', field_catalog_id: '<uuid-email>', is_required: true },
    { field_key: 'phone', field_catalog_id: '<uuid-telefone>', is_required: false }
  ])
});

// 3. Publicar
await fetch(`/api/forms/${form.form.id}/publish`, { method: 'POST' });

// 4. URL pronta
console.log(`https://app.com/form/${form.form.form_slug}`);
```

### Exemplo 2: Formulário com Validações Custom

```javascript
await fetch(`/api/forms/${formId}/fields`, {
  method: 'POST',
  body: JSON.stringify([{
    field_key: 'age',
    field_type: 'number',
    label_translations: { pt: 'Idade', en: 'Age' },
    is_required: true,
    validation_rules: {
      min: 18,
      max: 100
    }
  }])
});
```

---

## 🎨 Tipos de Campo Suportados

| Tipo | Renderiza como | Validações |
|------|---------------|------------|
| `text` | Input texto | min/max length, pattern |
| `textarea` | Área de texto | min/max length, rows |
| `email` | Input email | formato email |
| `phone` | Input telefone | pattern custom |
| `number` | Input número | min/max |
| `date` | Input data | min/max date |
| `select` | Dropdown | required |
| `multiselect` | Multi-select | - |
| `checkbox` | Checkbox | required |
| `country` | Select países | - |
| `tshirt_size` | Select tamanhos | - |
| `club` | Select clubes | - |
| `file` | Upload | max size, types |
| `consent` | Checkbox legal | required |
| `gdpr_consent` | Checkbox GDPR | required |

---

## 📊 API Reference

### Autenticação

Todas as rotas protegidas usam **cookies HttpOnly**:

```
Cookie: sid=<session-id>
```

### Respostas

```javascript
// Sucesso
{
  "success": true,
  "data": {...}
}

// Erro
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "ERROR_CODE"
}
```

### Endpoints Completos

Ver documentação completa em `docs/FORM-BUILDER-IMPLEMENTATION.md`

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Formulário não encontrado" | Verificar slug, published_at |
| "Não autenticado" | Fazer login, verificar cookie |
| "Rate limit excedido" | Aguardar 1 minuto |
| Campos não aparecem | Verificar field_order, is_visible |
| Submissão falha | Ver console browser, logs servidor |

---

## 🔄 Próximos Passos

1. **Interface Gráfica** (prioridade)
   - Drag-and-drop para campos
   - Preview em tempo real
   - Configuração visual

2. **Dashboard** de Submissões
   - Exportação CSV/XLSX
   - Filtros avançados
   - Estatísticas

3. **Features Avançadas**
   - Upload de ficheiros
   - Integração Stripe
   - E-mails automáticos
   - Lógica condicional

---

## 📞 Suporte

Para questões ou bugs:

1. Verificar logs do servidor
2. Verificar console do browser
3. Verificar Supabase logs
4. Ver documentação técnica

---

## 🎉 Conclusão

O **Form Builder** está **funcional** no backend!

✅ 8 tabelas SQL configuradas
✅ 17 rotas API implementadas
✅ Frontend público funcionando
✅ Segurança RLS ativa
✅ Auditoria completa
✅ Rate limiting anti-spam

**Próximo:** Interface gráfica para facilitar uso pelos organizadores.

---

**Desenvolvido para VisionKrono/Kromi.online** 🏃‍♂️⏱️

