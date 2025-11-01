# Descrição da Tabela `bib_templates`

## 📋 Visão Geral

A tabela `bib_templates` armazena templates de calibração de dorsais para eventos. Esta tabela guarda todas as informações necessárias para a detecção e reconhecimento de números de dorsais, incluindo as imagens de referência (original e com marcação) e as configurações de OCR (Optical Character Recognition).

**Chave única:** Um template por evento (`CONSTRAINT unique_event_template UNIQUE(event_id)`)

---

## 📊 Estrutura da Tabela

### Campos de Identificação

#### `id` (UUID, PRIMARY KEY)
- **Tipo:** UUID
- **Descrição:** Identificador único do template
- **Valor padrão:** Gerado automaticamente com `gen_random_uuid()`
- **Obrigatório:** Sim
- **Exemplo:** `a6301479-56c8-4269-a42d-aa8a7650a575`

#### `event_id` (UUID, NOT NULL)
- **Tipo:** UUID
- **Descrição:** Referência ao evento ao qual este template pertence
- **Foreign Key:** `REFERENCES events(id) ON DELETE CASCADE`
- **Obrigatório:** Sim
- **Nota:** Se o evento for eliminado, o template é automaticamente eliminado (CASCADE)
- **Exemplo:** `a6301479-56c8-4269-a42d-aa8a7650a575`

---

### Campos de Imagem

#### `base_image_base64` (TEXT)
- **Tipo:** TEXT
- **Descrição:** Imagem original do dorsal codificada em Base64, **sem qualquer marcação ou retângulo verde**
- **Formato:** String Base64 que começa com `data:image/jpeg;base64,` ou `data:image/png;base64,`
- **Obrigatório:** Não (pode ser NULL)
- **Uso:** Imagem de referência original para comparação e visualização
- **Exemplo:** `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...`

#### `template_image_base64` (TEXT, NOT NULL)
- **Tipo:** TEXT
- **Descrição:** Imagem do dorsal codificada em Base64 **com um retângulo verde marcando a área selecionada** para detecção
- **Formato:** String Base64 que começa com `data:image/png;base64,` (geralmente PNG para suportar transparência)
- **Obrigatório:** Sim
- **Uso:** 
  - Visualização da área de detecção configurada
  - Referência visual para o utilizador ver exatamente onde o sistema vai procurar o número
  - O retângulo verde é semi-transparente (opacity 0.3) com borda sólida verde
- **Geração:** Criada automaticamente pela função `generateTemplateImageWithGreenRectangle()` quando o utilizador guarda a área de detecção

#### `template_image_url` (TEXT)
- **Tipo:** TEXT
- **Descrição:** URL alternativa para a imagem (opcional)
- **Obrigatório:** Não (pode ser NULL)
- **Uso:** Pode ser usado para guardar uma URL de uma imagem hospedada externamente em vez de Base64
- **Nota:** Atualmente não utilizado (mantido para uso futuro)

---

### Campos de Região do Dorsal Completo (bib_region)

Estes campos definem a região completa do dorsal (todo o objeto/área do dorsal na imagem).

#### `bib_region_x` (DECIMAL(5,4), NOT NULL, DEFAULT 0.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Posição X da região do dorsal completo (coordenada normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 0.0
- **Uso:** Coordenada X do canto superior esquerdo da região do dorsal, normalizada pela largura da imagem
- **Exemplo:** `0.2979` (29.79% da largura da imagem)

#### `bib_region_y` (DECIMAL(5,4), NOT NULL, DEFAULT 0.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Posição Y da região do dorsal completo (coordenada normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 0.0
- **Uso:** Coordenada Y do canto superior esquerdo da região do dorsal, normalizada pela altura da imagem
- **Exemplo:** `0.2960` (29.60% da altura da imagem)

#### `bib_region_width` (DECIMAL(5,4), NOT NULL, DEFAULT 1.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Largura da região do dorsal completo (normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 1.0 (toda a largura)
- **Uso:** Largura da região do dorsal, normalizada pela largura da imagem
- **Exemplo:** `0.4362` (43.62% da largura da imagem)

#### `bib_region_height` (DECIMAL(5,4), NOT NULL, DEFAULT 1.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Altura da região do dorsal completo (normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 1.0 (toda a altura)
- **Uso:** Altura da região do dorsal, normalizada pela altura da imagem
- **Exemplo:** `0.5149` (51.49% da altura da imagem)

---

### Campos de Região do Número (number_region)

Estes campos definem a região específica onde o **número** do dorsal aparece dentro do dorsal completo.

#### `number_region_x` (DECIMAL(5,4), NOT NULL, DEFAULT 0.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Posição X da região do número dentro do dorsal (coordenada normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 0.0
- **Uso:** Coordenada X do canto superior esquerdo da região do número, normalizada pela largura da imagem
- **Nota:** Esta é a região que o utilizador seleciona na interface (área arrastável)
- **Exemplo:** `0.2979` (29.79% da largura da imagem)

#### `number_region_y` (DECIMAL(5,4), NOT NULL, DEFAULT 0.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Posição Y da região do número dentro do dorsal (coordenada normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 0.0
- **Uso:** Coordenada Y do canto superior esquerdo da região do número, normalizada pela altura da imagem
- **Exemplo:** `0.2960` (29.60% da altura da imagem)

#### `number_region_width` (DECIMAL(5,4), NOT NULL, DEFAULT 1.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Largura da região do número dentro do dorsal (normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 1.0 (toda a largura)
- **Uso:** Largura da região do número, normalizada pela largura da imagem
- **Exemplo:** `0.4362` (43.62% da largura da imagem)

#### `number_region_height` (DECIMAL(5,4), NOT NULL, DEFAULT 1.0)
- **Tipo:** DECIMAL com 5 dígitos totais, 4 casas decimais
- **Descrição:** Altura da região do número dentro do dorsal (normalizada entre 0.0 e 1.0)
- **Formato:** Valor entre 0.0000 e 1.0000
- **Obrigatório:** Sim
- **Default:** 1.0 (toda a altura)
- **Uso:** Altura da região do número, normalizada pela altura da imagem
- **Exemplo:** `0.5149` (51.49% da altura da imagem)

**Nota:** Atualmente, `bib_region` e `number_region` são iguais, mas no futuro podem ser diferentes para casos onde o dorsal completo ocupa uma área maior que a área do número.

---

### Campos de Configuração OCR

#### `expected_digits` (INTEGER, DEFAULT 4)
- **Tipo:** INTEGER
- **Descrição:** Número de dígitos esperados nos números de dorsal
- **Obrigatório:** Não (pode ser NULL)
- **Default:** 4
- **Uso:** 
  - Usado pela IA para validar detecções (se esperar 4 dígitos e detectar 3, pode rejeitar)
  - **Calculado automaticamente** baseado na configuração de nomenclatura do evento (campo `dorsal_nomenclature` em `events.settings`)
  - Se a nomenclatura for `numeric.digits`, usa esse valor
  - Se for `numeric.max`, calcula: `Math.ceil(Math.log10(max))` (ex: max=9999 → 4 dígitos)
  - Se não for numérico, usa padrão 4
- **Exemplos:**
  - `4` para dorsais como "0123", "4567"
  - `3` para dorsais como "123", "456"
  - `5` para dorsais como "01234"

#### `confidence_threshold` (DECIMAL(3,2), DEFAULT 0.75)
- **Tipo:** DECIMAL com 3 dígitos totais, 2 casas decimais
- **Descrição:** Limiar mínimo de confiança (threshold) para aceitar uma detecção como válida
- **Formato:** Valor entre 0.00 e 1.00
- **Obrigatório:** Não (pode ser NULL)
- **Default:** 0.75 (75% de confiança)
- **Uso:**
  - Se a IA detectar um número com confiança menor que este valor, a detecção é rejeitada
  - Ajustável pelo utilizador no Passo 4 da calibração (slider de "Limiar de Confiança")
  - Valores típicos:
    - `0.75` (75%) - Padrão, bom equilíbrio
    - `0.90` (90%) - Muito rigoroso, pode rejeitar detecções válidas
    - `0.50` (50%) - Mais permissivo, pode aceitar falsos positivos
- **Exemplo:** `0.75`

---

### Campos de Metadados

#### `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Tipo:** TIMESTAMP WITH TIME ZONE
- **Descrição:** Data e hora de criação do template
- **Obrigatório:** Não (gerado automaticamente)
- **Default:** Data/hora atual do servidor (`NOW()`)
- **Uso:** Rastreabilidade, saber quando a calibração foi criada
- **Exemplo:** `2025-01-27 14:30:00+00`

#### `updated_at` (TIMESTAMPTZ, DEFAULT NOW())
- **Tipo:** TIMESTAMP WITH TIME ZONE
- **Descrição:** Data e hora da última atualização do template
- **Obrigatório:** Não (gerado automaticamente)
- **Default:** Data/hora atual do servidor (`NOW()`)
- **Atualização:** Automática via trigger `trigger_update_bib_templates_updated_at` sempre que o registo é atualizado
- **Uso:** Saber quando a calibração foi modificada pela última vez
- **Exemplo:** `2025-01-27 15:45:00+00`

---

## 🔄 Operações e Relações

### Relação com `events`
- **Foreign Key:** `event_id` → `events(id)`
- **Cascade Delete:** Se um evento for eliminado, todos os seus templates são automaticamente eliminados
- **Unicidade:** Apenas um template por evento (`UNIQUE(event_id)`)

### Relação com `event_calibrations`
- Embora não haja foreign key direta, `bib_templates.event_id` corresponde a `event_calibrations.event_id`
- `bib_templates` armazena as imagens e coordenadas específicas
- `event_calibrations` armazena a configuração geral da calibração (AI config, resultados, etc.)

---

## 📝 Funções Relacionadas

### `get_bib_template(event_uuid UUID)`
- **Descrição:** Retorna o template de bib de um evento
- **Retorna:** Todos os campos da tabela `bib_templates` para o evento especificado
- **Uso:** Usada no frontend para carregar as imagens e configurações de calibração

### `update_bib_templates_updated_at()`
- **Descrição:** Função trigger que atualiza automaticamente `updated_at` quando um registo é modificado
- **Trigger:** `trigger_update_bib_templates_updated_at` (BEFORE UPDATE)

---

## 🔐 Segurança (RLS - Row Level Security)

### Política Atual
- **Nome:** "Allow all operations on bib_templates"
- **Tipo:** Permissiva (desenvolvimento)
- **Regra:** `FOR ALL USING (true) WITH CHECK (true)`
- **Nota:** Em produção, deve ser ajustada para restringir acesso baseado em roles/permissões

---

## 📊 Índices

### `idx_bib_templates_event_id`
- **Campos:** `event_id`
- **Uso:** Acelera consultas por evento

### `idx_bib_templates_created_at`
- **Campos:** `created_at DESC`
- **Uso:** Acelera consultas ordenadas por data de criação

---

## 💾 Fluxo de Dados

### Criação/Atualização
1. Utilizador faz upload de imagem (Passo 1)
2. Utilizador seleciona área de detecção (Passo 3)
3. Sistema gera `template_image_base64` com retângulo verde
4. Sistema guarda `base_image_base64` (imagem original)
5. Sistema calcula `expected_digits` baseado na nomenclatura do evento
6. Sistema guarda todas as coordenadas normalizadas
7. **UPSERT** na tabela (cria se não existe, atualiza se existe)

### Leitura
1. Frontend chama `get_bib_template(event_uuid)`
2. Retorna ambas as imagens (`base_image_base64` e `template_image_base64`)
3. Frontend exibe ambas as imagens na secção de calibração existente

---

## 📐 Coordenadas Normalizadas

Todos os campos de região (X, Y, width, height) usam coordenadas normalizadas entre 0.0 e 1.0:

- **X/Y:** Posição relativa (0.0 = início, 1.0 = fim)
- **Width/Height:** Tamanho relativo (0.0 = 0%, 1.0 = 100%)

**Exemplo:**
- Se a imagem tem 1000px de largura e a região começa em 300px:
  - `number_region_x = 0.3000` (300/1000)

**Vantagens:**
- Independente da resolução da imagem
- Fácil de aplicar a qualquer tamanho de imagem
- Precisão decimal alta (4 casas)

---

## 🎯 Exemplo de Registo Completo

```json
{
  "id": "1ade9101-af4d-4fc6-be3b-7a0f67271ff8",
  "event_id": "a6301479-56c8-4269-a42d-aa8a7650a575",
  "base_image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "template_image_base64": "data:image/png;base64,iVBORw0KGgo...",
  "template_image_url": null,
  "bib_region_x": 0.2979,
  "bib_region_y": 0.2960,
  "bib_region_width": 0.4362,
  "bib_region_height": 0.5149,
  "number_region_x": 0.2979,
  "number_region_y": 0.2960,
  "number_region_width": 0.4362,
  "number_region_height": 0.5149,
  "expected_digits": 4,
  "confidence_threshold": 0.75,
  "created_at": "2025-01-27T14:30:00Z",
  "updated_at": "2025-01-27T15:45:00Z"
}
```

---

## ✅ Validações e Regras de Negócio

1. **Um template por evento:** `UNIQUE(event_id)` garante que cada evento tem apenas um template
2. **Coordenadas válidas:** Devem estar entre 0.0 e 1.0 (garantido pelo tipo DECIMAL(5,4))
3. **Imagens obrigatórias:** `template_image_base64` é NOT NULL
4. **Expected digits:** Calculado automaticamente baseado na nomenclatura do evento
5. **Confidence threshold:** Entre 0.00 e 1.00 (garantido pelo tipo DECIMAL(3,2))

---

## 📚 Versão e Histórico

- **Versão inicial:** 1.0 (2025-11-01)
- **Atualização:** 1.1 (2025-01-27) - Adicionado campo `base_image_base64`

