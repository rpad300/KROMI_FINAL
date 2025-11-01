# ✅ Campos Custom - Implementação Completa

## 🎯 Como Funciona

### Campos do Catálogo vs Campos Custom

#### Campos do Catálogo
```javascript
{
  field_catalog_id: "uuid-do-campo",     // ← Referência ao catálogo
  field_key: "full_name",
  is_required: true,
  field_order: 1,
  label_override: { pt: "...", en: "..." },
  // ...
}
```

**Salvos em:** `event_form_fields`  
**Referência:** `form_field_catalog` via `field_catalog_id`

#### Campos Custom
```javascript
{
  field_catalog_id: null,                // ← NULL = campo custom!
  field_key: "empresa",
  field_type: "text",                    // ← Tipo definido diretamente
  is_required: false,
  field_order: 2,
  label_override: { pt: "Nome da Empresa", en: "Company Name" },
  placeholder_override: { pt: "Digite o nome..." },
  validation_rules_override: { minLength: 3 },
  // ...
}
```

**Salvos em:** `event_form_fields`  
**Referência:** NULL (campo independente)

---

## 🎯 Fluxo de Campos Custom

### 1. Criar Campo Custom

```
1. Editor de formulário
   → Tab "Campos"
   → Clicar "➕ Campo Custom"

2. Prompts aparecem:
   → "Chave do campo (ex: empresa):"
   → "Label do campo (PT):"
   → "Tipo (text, email, textarea, select):"

3. Campo criado localmente
   → Adicionado a formFields[]
   → Marcado como (CUSTOM)
   → Aparece no construtor ✅
   → Aparece no preview ✅
```

### 2. Configurar Campo Custom

```
1. Clicar ✏️ no campo custom
   → Modal abre

2. Configurar:
   → Label PT/EN
   → Placeholder
   → Obrigatório
   → Texto de ajuda
   → Validações (minLength, maxLength, etc)
   → Opções (se select)

3. Guardar
   → Atualiza formFields[]
   → Preview atualiza ✅
```

### 3. Salvar no Banco

```
1. Clicar "💾 Guardar"

2. Sistema envia array completo:
   POST /api/forms/:formId/fields
   Body: [
     { field_catalog_id: "uuid", ... },  ← Do catálogo
     { field_catalog_id: null, field_type: "text", ... },  ← CUSTOM
     { field_catalog_id: "uuid", ... }   ← Do catálogo
   ]

3. Backend processa:
   → Remove campos existentes
   → Insere todos de novo
   → Preserva ordem
   → Aceita field_catalog_id = null ✅

4. Salvo em event_form_fields:
   ┌────────────┬──────────────────┬───────────┬──────────┬──────────────┐
   │ form_id    │ field_catalog_id │ field_key │ is_req.  │ field_type   │
   ├────────────┼──────────────────┼───────────┼──────────┼──────────────┤
   │ form-uuid  │ catalog-uuid-1   │ full_name │ true     │ NULL         │
   │ form-uuid  │ NULL             │ empresa   │ false    │ text         │ ← CUSTOM
   │ form-uuid  │ catalog-uuid-2   │ email     │ true     │ NULL         │
   └────────────┴──────────────────┴───────────┴──────────┴──────────────┘
```

### 4. Carregar do Banco

```
1. Abrir editor
   → GET /api/forms/:formId/fields

2. Backend retorna:
   → Campos do catálogo com join
   → Campos custom com field_type

3. Frontend processa:
   → Campos com catalog_id → usa catalog.field_type
   → Campos com catalog_id = NULL → usa field.field_type ✅

4. Renderiza:
   → Construtor mostra (CUSTOM)
   → Preview renderiza corretamente
```

### 5. Formulário Público

```
1. Participante acessa /form/:slug

2. Backend carrega campos:
   → SELECT * FROM event_form_fields WHERE form_id = ...
   → Inclui campos custom ✅

3. Frontend renderiza:
   → Campos do catálogo: usa catalog.field_type
   → Campos custom: usa field.field_type ✅
   → TODOS os campos aparecem ✅

4. Validações:
   → Campos custom: validation_rules_override
   → Campos catálogo: catalog.validation_rules + override
```

---

## 📊 Estrutura da Tabela

### `event_form_fields`

**Colunas Principais:**
- `id` - UUID do campo
- `form_id` - Formulário ao qual pertence
- `field_catalog_id` - **NULL para custom**, UUID para catálogo
- `field_key` - Chave única do campo
- `field_type` - **OBRIGATÓRIO para custom** (text, select, etc)
- `field_order` - Ordem de exibição
- `is_required` - Campo obrigatório
- `label_override` - Labels PT/EN (JSONB)
- `placeholder_override` - Placeholders (JSONB)
- `help_text_override` - Textos de ajuda (JSONB)
- `validation_rules_override` - Validações custom (JSONB)
- `options_override` - Opções para select/radio (JSONB)

---

## ✅ Benefícios dos Campos Custom

### 1. Flexibilidade Total
- Criar campos específicos do evento
- Não poluir catálogo global
- Configuração independente

### 2. Exemplos de Uso

**Evento Corporativo:**
```
- Empresa (custom text)
- Departamento (custom select)
- Cargo (custom text)
- Autorização do Gestor (custom checkbox)
```

**Evento Escolar:**
```
- Escola (custom text)
- Ano Letivo (custom select)
- Turma (custom text)
- Autorização Encarregado (custom checkbox)
```

**Evento Desportivo Especial:**
```
- Tempo Esperado (custom time)
- Experiência Prévia (custom textarea)
- Objetivo do Evento (custom select)
```

### 3. Sem Limitações
- ✅ Ilimitados campos custom por formulário
- ✅ Todos os tipos suportados
- ✅ Validações configuráveis
- ✅ Traduções completas
- ✅ Integração total

---

## 🔍 Console Logs ao Salvar

```
💾 Guardando formulário...
📝 Dados básicos: { form_title: {...}, ... }
✅ Formulário básico salvo: { success: true }
📋 Salvando campos: 5
📊 Campos (incluindo custom): [
  { field_catalog_id: "uuid-1", field_key: "full_name", ... },
  { field_catalog_id: null, field_key: "empresa", field_type: "text", ... }, ← CUSTOM
  { field_catalog_id: "uuid-2", field_key: "email", ... },
  { field_catalog_id: null, field_key: "departamento", field_type: "select", ... }, ← CUSTOM
  { field_catalog_id: "uuid-3", field_key: "phone", ... }
]
✅ Campos salvos: { success: true, count: 5 }

Alert: "✅ Formulário guardado com sucesso!

Campos do catálogo: 3
Campos custom: 2
Total: 5"
```

---

## 📋 Backend Logs

```
[Server Console]

📋 Adicionando 5 campo(s) ao formulário a1b2c3...
🗑️ Campos existentes removidos para re-save
💾 Campos para inserir: [
  { form_id: "...", field_catalog_id: "uuid", field_key: "full_name", field_order: 1 },
  { form_id: "...", field_catalog_id: null, field_key: "empresa", field_type: "text", field_order: 2 },
  ...
]
✅ Campos inseridos: 5
```

---

## ✅ Verificação no Supabase

Vá para Supabase Dashboard → `event_form_fields`:

```sql
SELECT 
  field_key,
  field_catalog_id,
  field_type,
  label_override,
  is_required
FROM event_form_fields
WHERE form_id = 'seu-form-id'
ORDER BY field_order;
```

**Resultado esperado:**
```
field_key    | field_catalog_id | field_type | label_override              | is_required
-------------|------------------|------------|-----------------------------|-------------
full_name    | uuid-123         | NULL       | NULL                        | true
empresa      | NULL             | text       | {"pt":"Nome da Empresa"}    | false
email        | uuid-456         | NULL       | NULL                        | true
departamento | NULL             | select     | {"pt":"Departamento"}       | false
```

**✅ Campos custom salvos corretamente!**

---

## 🎊 Resultado

**Campos Custom 100% Funcionais!**

✅ Criação via interface  
✅ Configuração completa  
✅ Salvam no banco corretamente  
✅ Carregam do banco  
✅ Renderizam no público  
✅ Validações funcionam  
✅ Traduções suportadas  
✅ Integração total  

**Sistema completo e profissional!** 🌟

---

**VisionKrono/Kromi.online** 🏃‍♂️⏱️📋

