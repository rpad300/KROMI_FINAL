# 📋 Implementação da Tabela bib_templates

## ✅ O que foi implementado

### **1. Tabela `bib_templates` criada**

Localização: `sql/create-bib-templates-table.sql`

**Campos implementados:**
- `id` - UUID primário
- `event_id` - Referência ao evento (UNIQUE, um template por evento)
- `template_image_base64` - Imagem Base64 com retângulo verde marcando a área
- `template_image_url` - URL alternativa (opcional)
- `bib_region_x/y/width/height` - Coordenadas da região completa do dorsal (normalizadas 0-1)
- `number_region_x/y/width/height` - Coordenadas da região do número (normalizadas 0-1)
- `expected_digits` - Número de dígitos esperados (calculado da nomenclatura)
- `confidence_threshold` - Threshold de confiança (0.00-1.00)
- `created_at`, `updated_at` - Timestamps

### **2. Função `generateTemplateImageWithGreenRectangle()`**

**O que faz:**
- Cria uma imagem com retângulo verde sobre a área selecionada
- Usa Canvas API para desenhar sobre a imagem original
- Retângulo verde semi-transparente com borda sólida
- Retorna Base64 da imagem processada

**Parâmetros:**
- `imageSrc` - Imagem original (Base64 ou URL)
- `regionX, regionY` - Posição da área (normalizada 0-1)
- `regionWidth, regionHeight` - Tamanho da área (normalizada 0-1)

### **3. Função `getExpectedDigitsFromNomenclature()`**

**O que faz:**
- Busca configuração de nomenclatura do evento via API
- Calcula `expected_digits` baseado no tipo de nomenclatura:
  - **Numeric com padding:** usa `digits` da configuração
  - **Numeric sem padding:** calcula dígitos baseado no `max`
  - **Outros tipos:** usa padrão de 4 dígitos

**Exemplos:**
- Nomenclatura: `{type: 'numeric', numeric: {use_padding: true, digits: 3}}` → `expected_digits: 3`
- Nomenclatura: `{type: 'numeric', numeric: {max: 9999}}` → `expected_digits: 4`
- Nomenclatura: `{type: 'prefix'}` → `expected_digits: 4` (padrão)

### **4. Função `saveDetectionArea()` atualizada**

**O que faz agora:**
1. Calcula coordenadas normalizadas da área selecionada
2. Gera imagem com retângulo verde usando `generateTemplateImageWithGreenRectangle()`
3. Calcula `expected_digits` usando `getExpectedDigitsFromNomenclature()`
4. Obtém `confidence_threshold` da configuração AI (ou usa 0.75 como padrão)
5. Guarda tudo na tabela `bib_templates` usando **UPSERT** (atualiza se existe, cria se não)
6. Também atualiza `event_calibrations` para compatibilidade

**Guarda em `bib_templates`:**
```javascript
{
  event_id: currentEvent.id,
  template_image_base64: templateImageBase64,  // Imagem com retângulo verde
  bib_region_x/y/width/height: bibRegion,     // Região do dorsal completo
  number_region_x/y/width/height: numberRegion, // Região do número
  expected_digits: expectedDigits,              // Calculado da nomenclatura
  confidence_threshold: confidenceThreshold    // Da configuração AI
}
```

### **5. Função `saveAIConfig()` atualizada**

**O que faz agora:**
- Guarda configuração AI em `event_calibrations` (como antes)
- **Também atualiza** `confidence_threshold` na tabela `bib_templates` se existir

---

## 🔄 Fluxo Completo

```
Passo 1: Upload Imagem
  ↓
Passo 2: Nomenclatura (read-only)
  ↓
Passo 3: Definir Área de Detecção
  ├─ Utilizador ajusta área na imagem
  ├─ Clica em "Guardar Área"
  ├─ Gera imagem com retângulo verde
  ├─ Calcula expected_digits da nomenclatura
  └─ Guarda em bib_templates (UPSERT)
  ↓
Passo 4: Configuração IA
  ├─ Utilizador configura threshold, velocidade, etc.
  ├─ Clica em "Guardar Configuração"
  └─ Atualiza confidence_threshold em bib_templates
  ↓
Passo 5: Teste e Finalização
```

---

## 📊 Estrutura da Tabela

```sql
bib_templates
├── id (UUID, PK)
├── event_id (UUID, FK → events.id, UNIQUE)
├── template_image_base64 (TEXT) - Imagem com retângulo verde
├── template_image_url (TEXT, nullable)
├── bib_region_x/y/width/height (DECIMAL 0-1)
├── number_region_x/y/width/height (DECIMAL 0-1)
├── expected_digits (INTEGER, calculado)
├── confidence_threshold (DECIMAL 0-1)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ, auto-update)
```

---

## 🎯 Notas Importantes

1. **Um template por evento:** A constraint `UNIQUE(event_id)` garante que só existe um template ativo por evento
2. **UPSERT automático:** Ao guardar, se já existe template para o evento, é atualizado; caso contrário, é criado
3. **Coordenadas normalizadas:** Todas as coordenadas são valores entre 0 e 1, independentes do tamanho da imagem
4. **expected_digits dinâmico:** Calculado automaticamente da nomenclatura configurada no evento
5. **Compatibilidade:** Continua a guardar em `event_calibrations` para manter compatibilidade com código existente

---

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Permitir definir `bib_region` separadamente de `number_region`
- [ ] Pré-visualizar a imagem com retângulo verde antes de guardar
- [ ] Exportar template como imagem PNG
- [ ] Histórico de templates (versões anteriores)
- [ ] Validação de coordenadas (garantir que estão entre 0-1)

