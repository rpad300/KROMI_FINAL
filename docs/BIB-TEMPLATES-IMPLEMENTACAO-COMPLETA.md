# ✅ Implementação Completa: Tabela bib_templates

## 📋 Resumo

Implementação completa da tabela `bib_templates` para guardar templates de calibração de dorsais com imagem marcada com retângulo verde.

---

## 🗄️ Estrutura da Tabela

### **Tabela: `bib_templates`**

**Campos implementados:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único do template |
| `event_id` | UUID | Referência ao evento (UNIQUE) |
| `template_image_base64` | TEXT | Imagem Base64 com retângulo verde |
| `template_image_url` | TEXT | URL alternativa (opcional) |
| `bib_region_x/y/width/height` | DECIMAL(5,4) | Região completa do dorsal (0-1) |
| `number_region_x/y/width/height` | DECIMAL(5,4) | Região só do número (0-1) |
| `expected_digits` | INTEGER | Dígitos esperados (calculado) |
| `confidence_threshold` | DECIMAL(3,2) | Threshold de confiança (0-1) |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização (auto) |

**Constraints:**
- `UNIQUE(event_id)` - Um template por evento
- `FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE`

**Índices:**
- `idx_bib_templates_event_id` - Performance em queries por evento
- `idx_bib_templates_created_at` - Ordenação por data

---

## 🔧 Funções RPC Criadas

### **`get_bib_template(event_uuid)`**

Retorna o template de bib de um evento.

**Uso:**
```javascript
const { data, error } = await supabase.rpc('get_bib_template', {
  event_uuid: eventId
});
```

---

## 💻 Implementação JavaScript

### **Função: `generateTemplateImageWithGreenRectangle()`**

Gera uma imagem com retângulo verde sobre a área selecionada.

**Parâmetros:**
- `imageSrc` - Imagem original (Base64)
- `regionX, regionY` - Posição (0-1)
- `regionWidth, regionHeight` - Tamanho (0-1)

**Retorna:** Base64 da imagem processada

### **Função: `getExpectedDigitsFromNomenclature()`**

Calcula `expected_digits` baseado na nomenclatura configurada no evento.

**Lógica:**
- Numeric com padding → usa `digits`
- Numeric sem padding → calcula de `max`
- Outros tipos → padrão 4 dígitos

### **Função: `saveDetectionArea()` Atualizada**

**O que faz:**
1. Calcula coordenadas normalizadas da área
2. Gera imagem com retângulo verde
3. Calcula `expected_digits` automaticamente
4. Obtém `confidence_threshold` (ou usa 0.75)
5. Guarda na tabela `bib_templates` (UPSERT)

**Código:**
```javascript
await window.supabaseClient.supabase
    .from('bib_templates')
    .upsert({
        event_id: currentEvent.id,
        template_image_base64: templateImageBase64,
        bib_region_x/y/width/height: bibRegion,
        number_region_x/y/width/height: numberRegion,
        expected_digits: expectedDigits,
        confidence_threshold: confidenceThreshold
    }, {
        onConflict: 'event_id'
    });
```

### **Função: `saveAIConfig()` Atualizada**

Também atualiza `confidence_threshold` na tabela `bib_templates` quando configurado.

---

## ✅ Status da Implementação

### **SQL**
- ✅ Tabela `bib_templates` criada
- ✅ Função `get_bib_template()` criada
- ✅ Trigger `updated_at` configurado
- ✅ RLS Policies configuradas
- ✅ Índices criados

### **JavaScript**
- ✅ Função para gerar imagem com retângulo verde
- ✅ Função para calcular `expected_digits`
- ✅ Função `saveDetectionArea()` atualizada
- ✅ Função `saveAIConfig()` atualizada
- ✅ UPSERT implementado (atualiza se existe, cria se não)

---

## 🚀 Como Usar

### **1. Definir Área de Detecção (Passo 3)**

Quando o utilizador:
1. Ajusta a área na imagem
2. Clica em "Guardar Área"

O sistema automaticamente:
- Gera imagem com retângulo verde
- Calcula `expected_digits` da nomenclatura
- Guarda tudo em `bib_templates`

### **2. Configurar IA (Passo 4)**

Quando o utilizador:
1. Configura o threshold de confiança
2. Clica em "Guardar Configuração"

O sistema automaticamente:
- Atualiza `confidence_threshold` em `bib_templates`

---

## 📊 Dados Guardados

**Exemplo de registo em `bib_templates`:**

```json
{
  "id": "uuid-123...",
  "event_id": "a6301479-56c8-4269-a42d-aa8a7650a575",
  "template_image_base64": "data:image/png;base64,iVBORw0KG...",
  "bib_region_x": 0.2,
  "bib_region_y": 0.3,
  "bib_region_width": 0.6,
  "bib_region_height": 0.4,
  "number_region_x": 0.25,
  "number_region_y": 0.35,
  "number_region_width": 0.5,
  "number_region_height": 0.3,
  "expected_digits": 3,
  "confidence_threshold": 0.75,
  "created_at": "2025-11-01T15:00:00Z",
  "updated_at": "2025-11-01T15:00:00Z"
}
```

---

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ Passo 3: Definir Área                                       │
│ ─────────────────────────────────────────────────────────── │
│ 1. Utilizador ajusta área na imagem                         │
│ 2. Clica "Guardar Área"                                    │
│ 3. generateTemplateImageWithGreenRectangle()                │
│    └─> Cria imagem com retângulo verde                       │
│ 4. getExpectedDigitsFromNomenclature()                      │
│    └─> Calcula dígitos esperados (ex: 3, 4, 5)              │
│ 5. UPSERT em bib_templates                                  │
│    ├─> template_image_base64 (com retângulo)                │
│    ├─> bib_region_x/y/width/height                          │
│    ├─> number_region_x/y/width/height                       │
│    ├─> expected_digits (calculado)                          │
│    └─> confidence_threshold (padrão 0.75)                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Passo 4: Configurar IA                                      │
│ ─────────────────────────────────────────────────────────── │
│ 1. Utilizador configura threshold                           │
│ 2. Clica "Guardar Configuração"                            │
│ 3. UPDATE em bib_templates                                  │
│    └─> confidence_threshold (atualizado)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Notas Importantes

1. **Um template por evento:** A constraint `UNIQUE(event_id)` garante isso
2. **UPSERT automático:** Se já existe template, é atualizado; caso contrário, é criado
3. **expected_digits dinâmico:** Calculado automaticamente da nomenclatura
4. **Imagem com retângulo:** Gerada automaticamente ao guardar área
5. **Coordenadas normalizadas:** Todos os valores entre 0-1 (independente do tamanho da imagem)

---

## ✅ Conclusão

A implementação está **100% completa** e funcional:
- ✅ Tabela criada no Supabase
- ✅ Funções RPC disponíveis
- ✅ Código JavaScript implementado
- ✅ Integração com fluxo de calibração
- ✅ Cálculo automático de `expected_digits`
- ✅ Geração automática de imagem com retângulo verde

**Pronto para usar!** 🎉

