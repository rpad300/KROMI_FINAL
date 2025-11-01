# 📋 Calibração - Passos e Dados Guardados

## 🔄 Passos do Processo de Calibração

A página `calibration-kromi.html` segue um fluxo de **5 passos principais**:

---

### **📸 PASSO 1: Upload da Imagem**

**Função:** `handleImageUpload()`

**O que acontece:**
- Utilizador faz upload de uma imagem de referência (ex: foto de um dorsal)
- A imagem é convertida para Base64
- Análise inicial com IA para sugerir configurações

**Dados guardados:**
- **Local (memória):** `uploadedImage` (string Base64)

**Não guarda ainda em nenhuma tabela**

---

### **🏷️ PASSO 2: Nomenclatura dos Dorsais** (Apenas Leitura)

**Função:** `loadNomenclatureConfigReadOnly(eventId)`

**O que acontece:**
- Exibe **APENAS** a configuração atual de nomenclatura
- **NÃO permite editar** (edição é feita na página `config-kromi.html`)
- Mostra o tipo de nomenclatura configurado:
  - Numérico
  - Prefixo (M-, F-, etc.)
  - Sufixo (-M, -F, etc.)
  - Marcadores de cor
  - Personalizado (regex)

**Dados lidos:**
- **Tabela:** `events`
- **Campo:** `settings.dorsal_nomenclature` (JSONB)
- **Como:** Via API REST `GET /api/events/:id`

**Exemplo de dados guardados em `events.settings`:**
```json
{
  "dorsal_nomenclature": {
    "type": "numeric",
    "numeric": {
      "mode": "sequential",
      "min": 1,
      "max": 9999,
      "use_padding": false,
      "digits": 3
    }
  }
}
```

**⚠️ NOTA:** Este passo é **somente leitura**. Para alterar, o utilizador deve ir à página de Configurações do Evento.

---

### **🎯 PASSO 3: Definir Área de Detecção**

**Função:** `saveDetectionArea()`

**O que acontece:**
- Utilizador define uma área retangular na imagem onde o dorsal aparece
- Coordenadas são normalizadas (valores entre 0 e 1)
- Guarda temporariamente para uso posterior

**Dados guardados:**
- **Local (memória):** `detectionArea` (objeto com x, y, width, height normalizados)
- **LocalStorage (temporário):** Via `saveConfiguration('number_area', detectionArea, eventId)`

**Estrutura de `detectionArea`:**
```javascript
{
  x: 0.25,        // Posição X normalizada (0-1)
  y: 0.30,        // Posição Y normalizada (0-1)
  width: 0.50,    // Largura normalizada (0-1)
  height: 0.40    // Altura normalizada (0-1)
}
```

**⚠️ NOTA:** Este dado é guardado temporariamente. Só é persistido no Supabase quando completa a calibração (Passo 5).

---

### **🤖 PASSO 4: Configuração da IA**

**Função:** `saveAIConfiguration()`

**O que acontece:**
- Utilizador configura:
  - Threshold de confiança (0.0 a 1.0)
  - Tipo de processador AI (Gemini, OpenAI, etc.)
  - Outras configurações específicas da IA

**Dados guardados:**
- **Local (memória):** `aiConfig` (objeto com todas as configurações)
- **LocalStorage (temporário):** Via `saveConfiguration('ai_config', aiConfig, eventId)`

**Estrutura de `aiConfig`:**
```javascript
{
  confidenceThreshold: 0.75,
  processorType: 'gemini',
  processorSpeed: 'balanced',
  nomenclatureType: 'numeric',
  nomenclatureConfig: { /* config específica */ }
}
```

**⚠️ NOTA:** Este dado também é guardado temporariamente. Só é persistido quando completa a calibração.

---

### **🧪 PASSO 5: Teste e Finalização**

**Funções:**
- `testConfiguration()` - Testa a configuração com a imagem
- `finishCalibration()` - Guarda tudo no Supabase

**O que acontece:**

1. **Teste da configuração:**
   - Processa a imagem com a área e configurações definidas
   - Executa detecção do número do dorsal
   - Mostra resultados (número detectado, confiança, tempo)

2. **Finalização:**
   - Guarda **todos os dados** na tabela `event_calibrations`
   - Usa duas funções RPC do Supabase:
     - `create_calibration()` - Cria o registo inicial
     - `complete_calibration()` - Completa com os resultados

**Dados guardados em `event_calibrations`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único da calibração |
| `event_id` | UUID | Referência ao evento |
| `device_id` | UUID (opcional) | Dispositivo associado (null por padrão) |
| `image_data` | TEXT | Imagem em Base64 |
| `image_width` | INTEGER | Largura da imagem (calculado automaticamente) |
| `image_height` | INTEGER | Altura da imagem (calculado automaticamente) |
| `detection_area_x` | DECIMAL(5,4) | Posição X da área (0.0-1.0) |
| `detection_area_y` | DECIMAL(5,4) | Posição Y da área (0.0-1.0) |
| `detection_area_width` | DECIMAL(5,4) | Largura da área (0.0-1.0) |
| `detection_area_height` | DECIMAL(5,4) | Altura da área (0.0-1.0) |
| `nomenclature_type` | TEXT | Tipo de nomenclatura ('numeric', 'prefix', etc.) |
| `nomenclature_config` | JSONB | Configuração específica da nomenclatura |
| `ai_config` | JSONB | Todas as configurações da IA |
| `detected_number` | TEXT | Número detectado no teste |
| `confidence` | DECIMAL(3,2) | Confiança da detecção (0.00-1.00) |
| `processing_time_ms` | INTEGER | Tempo de processamento em milissegundos |
| `ai_description` | TEXT | Descrição adicional da IA |
| `is_active` | BOOLEAN | Se está ativa (sempre `true` para nova) |
| `is_complete` | BOOLEAN | Se está completa (`true` após teste) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de atualização |
| `completed_at` | TIMESTAMP | Data de conclusão |

**Exemplo de `nomenclature_config` (JSONB):**
```json
{
  "mode": "sequential",
  "min": 1,
  "max": 9999,
  "use_padding": false,
  "digits": 3
}
```

**Exemplo de `ai_config` (JSONB):**
```json
{
  "confidenceThreshold": 0.75,
  "processorType": "gemini",
  "processorSpeed": "balanced",
  "processorConfidence": 0.7,
  "geminiModel": "gemini-1.5-flash"
}
```

---

## 📊 Resumo das Tabelas Utilizadas

### **1. `events`**
- **O que guarda:** Configuração de nomenclatura dos dorsais
- **Campo:** `settings.dorsal_nomenclature` (JSONB)
- **Quando:** Guardado na página `config-kromi.html`, não na calibração
- **Leitura:** Lida no Passo 2 (somente leitura)

### **2. `event_calibrations`** ⭐ **PRINCIPAL**
- **O que guarda:** Toda a calibração completa
- **Quando:** Guardado no Passo 5 (`finishCalibration()`)
- **Funções RPC usadas:**
  - `create_calibration()` - Cria o registo
  - `complete_calibration()` - Completa com resultados
- **Como buscar:** `get_active_calibration(event_uuid)`

### **3. `calibration_history`** (Histórico)
- **O que guarda:** Histórico de testes realizados
- **Quando:** Ainda não implementado na página atual
- **Uso futuro:** Para auditoria e análise de performance

---

## 🔄 Fluxo Completo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│ PASSO 1: Upload Imagem                                       │
│ ─────────────────────────────────────────────────────────── │
│ uploadedImage (Base64) → Memória                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 2: Nomenclatura (LEITURA)                             │
│ ─────────────────────────────────────────────────────────── │
│ events.settings.dorsal_nomenclature ← API GET /api/events/:id│
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 3: Área de Detecção                                   │
│ ─────────────────────────────────────────────────────────── │
│ detectionArea → LocalStorage (temporário)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 4: Configuração IA                                    │
│ ─────────────────────────────────────────────────────────── │
│ aiConfig → LocalStorage (temporário)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PASSO 5: Teste e Finalização                                 │
│ ─────────────────────────────────────────────────────────── │
│ 1. testConfiguration() → Processa imagem                     │
│    └─> calibrationResults (número, confiança, tempo)        │
│                                                              │
│ 2. finishCalibration() → Guarda no Supabase                  │
│    ├─> create_calibration() → Cria registo                  │
│    │   └─> event_calibrations (imagem, área, configs)       │
│    │                                                         │
│    └─> complete_calibration() → Completa registo            │
│        └─> event_calibrations (resultados, is_complete=true) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Funções RPC do Supabase

### **`get_active_calibration(event_uuid)`**
- **Uso:** Buscar calibração ativa de um evento
- **Quando chamada:**
  - Ao carregar a página (`checkExistingCalibration()`)
  - Ao ver detalhes da calibração existente
  - Ao carregar configuração salva (`loadSavedConfiguration()`)

### **`create_calibration(...)`**
- **Uso:** Criar nova calibração
- **O que faz:**
  1. Desativa calibrações anteriores do evento (`is_active = false`)
  2. Cria nova calibração com todos os dados iniciais
  3. Retorna o `calibration_id`

### **`complete_calibration(calibration_id, ...)`**
- **Uso:** Completar calibração com resultados do teste
- **O que faz:**
  1. Atualiza campos de resultados (`detected_number`, `confidence`, etc.)
  2. Define `is_complete = true`
  3. Define `completed_at = NOW()`

---

## 📝 Notas Importantes

1. **Dados Temporários:** Passos 3 e 4 guardam apenas em LocalStorage até completar a calibração
2. **Nomenclatura:** É guardada em `events.settings`, não em `event_calibrations`
3. **Calibrações Anteriores:** Ao criar nova calibração, as anteriores são desativadas automaticamente
4. **Imagem Base64:** A imagem é guardada como string Base64 (pode ser grande!)
5. **Coordenadas Normalizadas:** A área de detecção usa valores 0-1 para ser independente do tamanho da imagem

---

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Usar `calibration_history` para guardar histórico de testes
- [ ] Otimizar armazenamento de imagens (usar Storage em vez de Base64)
- [ ] Permitir múltiplas calibrações ativas por evento (com seleção)
- [ ] Adicionar validações mais robustas antes de guardar

