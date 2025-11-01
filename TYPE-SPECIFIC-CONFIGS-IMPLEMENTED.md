# ✅ Configurações Específicas por Tipo - IMPLEMENTADO!

## 🎯 Sistema Inteligente de Configuração

Cada tipo de campo agora tem **configurações específicas e contextuais**!

---

## 📋 Como Funciona

### Fluxo Automático

```
1. Criar Campo Custom
   → Clicar "➕ Campo Custom"
   → Modal abre

2. Selecionar Tipo
   → Dropdown com 61 tipos
   → Escolher tipo: "Número"
   
3. Configurações Aparecem AUTOMATICAMENTE
   → Seção "Configurações Específicas" renderiza
   → Mostra: Mínimo, Máximo, Step
   → Campos apropriados para "Número"
   
4. Selecionar Outro Tipo
   → Mudar para: "Upload Imagem"
   → Configurações MUDAM automaticamente
   → Agora mostra: Formatos, Dimensões, Tamanho máx
   
5. Preencher Configurações
   → Específicas do tipo selecionado
   → Validadas automaticamente
   
6. Criar Campo
   → Configurações salvas em type_config
   → Armazenadas no banco
   → Usadas no formulário público
```

---

## 🎨 Exemplos por Tipo

### 1. Número (`number`)

**Selecionou:** Número

**Configurações aparecem:**
```
┌─────────────────────────────────┐
│ Mínimo:  [    0    ]            │
│ Máximo:  [   100   ]            │
│ Step:    [    1    ]            │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "min": 0,
    "max": 100,
    "step": 1
  }
}
```

### 2. Moeda (`currency`)

**Selecionou:** Moeda

**Configurações aparecem:**
```
┌─────────────────────────────────┐
│ Moeda: [EUR (€) ▼]              │
│ Valor mínimo: [ 0.00 ]          │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "currency": "EUR",
    "min": 0
  }
}
```

### 3. Slider (`slider`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Mínimo  │ Máximo  │ Step        │
│ [  0  ] │ [ 100 ] │ [  1  ]     │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "min": 0,
    "max": 100,
    "step": 1
  }
}
```

### 4. Classificação (`rating`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Máximo de Estrelas:             │
│ [ 5 estrelas ▼ ]                │
│   - 3 estrelas                  │
│   - 5 estrelas ✓                │
│   - 10 estrelas                 │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "max_stars": 5
  }
}
```

### 5. Upload Imagem (`image`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Formatos: [Multiple Select]     │
│ ☑ JPEG  ☑ PNG  ☐ GIF  ☐ WebP   │
│                                  │
│ Largura máx: [ 1920 ] px        │
│ Altura máx:  [ 1080 ] px        │
│ Tamanho máx: [  5   ] MB        │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "formats": ["image/jpeg", "image/png"],
    "max_width": 1920,
    "max_height": 1080,
    "max_size_mb": 5
  }
}
```

### 6. Upload Ficheiro (`file`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Tipos permitidos:                │
│ [ .pdf,.doc,.docx ]             │
│ (separados por vírgula)          │
│                                  │
│ Tamanho máximo: [ 10 ] MB       │
│ ☑ Permitir múltiplos ficheiros  │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "accept": ".pdf,.doc,.docx",
    "max_size_mb": 10,
    "multiple": true
  }
}
```

### 7. Texto Longo (`textarea`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Mín caracteres: [  10  ]        │
│ Máx caracteres: [ 500  ]        │
│ Número de linhas: [ 4 ]         │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "min_length": 10,
    "max_length": 500,
    "rows": 4
  }
}
```

### 8. Data (`date`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Data mínima: [ 01/01/2024 ]     │
│ Data máxima: [ 31/12/2024 ]     │
│ ☑ Desabilitar datas passadas    │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "min_date": "2024-01-01",
    "max_date": "2024-12-31",
    "disable_past": true
  }
}
```

### 9. NIF (`nif`)

**Configurações:**
```
┌─────────────────────────────────┐
│ País: [ Portugal ▼ ]            │
│   - Portugal (9 dígitos)        │
│   - Espanha (DNI/NIE)           │
│   - Brasil (CPF/CNPJ)           │
│   - Internacional               │
│                                  │
│ ☑ Validar checksum              │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "country": "PT",
    "validate_checksum": true
  }
}
```

### 10. Telefone (`phone`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Formato: [ Portugal (+351) ▼]  │
│ ☑ Aplicar máscara               │
└─────────────────────────────────┘
```

**Salva:**
```json
{
  "type_config": {
    "format": "PT",
    "mask": true
  }
}
```

### 11. Código Postal (`postal_code`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Formato: [ Portugal ▼ ]        │
│   - Portugal (0000-000)         │
│   - Espanha (00000)             │
│   - Brasil (00000-000)          │
│   - UK, US, etc                 │
└─────────────────────────────────┘
```

### 12. Localização (`location`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Centro do mapa:                 │
│ [ 38.7223,-9.1393 ]             │
│ (Lisboa por padrão)             │
│                                  │
│ Zoom inicial: [ 12 ]            │
│ ☑ Usar localização atual        │
└─────────────────────────────────┘
```

### 13. QR Scanner (`qr_scanner`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Tipo de código:                 │
│ [ QR Code ▼ ]                   │
│   - QR Code                     │
│   - Código de Barras            │
│   - Ambos                       │
│                                  │
│ ☑ Leitura contínua              │
└─────────────────────────────────┘
```

### 14. Assinatura (`signature`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Largura:  [ 400 ] px            │
│ Altura:   [ 200 ] px            │
│ Cor caneta: [■] #000000         │
└─────────────────────────────────┘
```

### 15. Captura Câmara (`camera`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Resolução: [ Média ▼ ]         │
│   - Baixa (640x480)             │
│   - Média (1280x720)            │
│   - Alta (1920x1080)            │
│                                  │
│ Câmara: [ Qualquer ▼ ]         │
│   - Frontal                     │
│   - Traseira                    │
│   - Qualquer                    │
└─────────────────────────────────┘
```

### 16. Matriz Likert (`matrix`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Perguntas (uma por linha):      │
│ ┌─────────────────────────────┐ │
│ │ Atendimento foi bom         │ │
│ │ Recomendaria a outros       │ │
│ │ Preço justo                 │ │
│ └─────────────────────────────┘ │
│                                  │
│ Escala: [ Likert ▼ ]           │
│   - 1 a 5                       │
│   - 1 a 10                      │
│   - Likert (Discordo-Concordo)  │
└─────────────────────────────────┘
```

### 17. Repetidor (`repeater`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Mín repetições: [ 1 ]           │
│ Máx repetições: [ 10 ]          │
│ Texto botão: [ ➕ Adicionar ]   │
└─────────────────────────────────┘
```

### 18. Campo Calculado (`calculated`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Fórmula:                        │
│ [ {preco} * {quantidade} ]      │
│ Use {nome_campo} para ref.      │
│                                  │
│ Formato saída: [ Moeda ▼ ]     │
│   - Número                      │
│   - Moeda                       │
│   - Percentagem                 │
└─────────────────────────────────┘
```

### 19. HTML Estático (`html`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Conteúdo HTML:                  │
│ ┌─────────────────────────────┐ │
│ │ <div class="alert">         │ │
│ │   <strong>Atenção!</strong> │ │
│ │   Leia com cuidado...       │ │
│ │ </div>                      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 20. Separador (`separator`)

**Configurações:**
```
┌─────────────────────────────────┐
│ Título: [ Dados Pessoais ]      │
│                                  │
│ Estilo: [ Linha grossa ▼ ]     │
│   - Linha simples               │
│   - Linha grossa                │
│   - Linha tracejada             │
│   - Linha pontilhada            │
└─────────────────────────────────┘
```

---

## 🎯 Tipos com Configurações Específicas

### Já Implementados (20 tipos)
1. ✅ `number` - Min, max, step
2. ✅ `currency` - Moeda, min
3. ✅ `slider` - Min, max, step
4. ✅ `rating` - Max estrelas
5. ✅ `file` - Tipos, tamanho, múltiplos
6. ✅ `image` - Formatos, dimensões, tamanho
7. ✅ `textarea` - Min/max length, rows
8. ✅ `date` - Min/max date, disable past
9. ✅ `date_range` - Max days, same day
10. ✅ `nif` - País, validate checksum
11. ✅ `phone` - Formato, máscara
12. ✅ `postal_code` - Formato por país
13. ✅ `location` - Centro, zoom, current
14. ✅ `qr_scanner` - Tipo código, contínuo
15. ✅ `signature` - Dimensões, cor
16. ✅ `camera` - Resolução, câmara
17. ✅ `matrix` - Perguntas, escala
18. ✅ `repeater` - Min/max items, label
19. ✅ `calculated` - Fórmula, formato
20. ✅ `html` - Conteúdo
21. ✅ `separator` - Título, estilo
22. ✅ `category` - Auto, regras idade
23. ✅ `emergency_contact` - Require relation
24. ✅ `dorsal` - Min/max, auto-assign

### Facilmente Extensível

Adicionar novo tipo com config:

```javascript
// Em field-type-configs.js

'novo_tipo': `
    <div style="margin-top: 16px;">
        <div class="form-group">
            <label>Configuração X:</label>
            <input type="text" id="config_x" class="form-input">
        </div>
    </div>
`
```

**Pronto! Sistema detecta e renderiza automaticamente.**

---

## 📊 Estrutura de Dados

### No Frontend (Modal)
```javascript
// Quando seleciona tipo "currency"
updateCustomFieldTypeOptions()
→ FieldTypeConfigs.getTypeSpecificConfig('currency')
→ HTML renderizado em typeSpecificConfig
→ Inputs aparecem
```

### Ao Salvar
```javascript
// Extrai configurações
saveCustomField()
→ FieldTypeConfigs.extractTypeSpecificConfig('currency')
→ { currency: 'EUR', min: 0 }
→ Salva em field.type_config
```

### No Banco
```sql
SELECT * FROM event_form_fields WHERE field_key = 'valor_inscricao';

-- Resultado:
field_type: "currency"
type_config: {
  "currency": "EUR",
  "min": 0
}
```

### No Formulário Público
```javascript
// Renderiza campo currency
const config = field.type_config;
const currency = config?.currency || 'EUR';

html = `
  <input type="number" 
         step="0.01" 
         min="${config?.min || 0}"
         placeholder="0.00">
  <span>${currency === 'EUR' ? '€' : '$'}</span>
`;
```

---

## 🎯 Benefícios

### 1. Contexto Imediato
- ✅ Configurações aparecem automaticamente
- ✅ Apenas opções relevantes
- ✅ Sem confusão

### 2. Validações Inteligentes
- ✅ Min/max para numéricos
- ✅ Formatos para uploads
- ✅ Máscaras para documentos
- ✅ Regras por país

### 3. UX Profissional
- ✅ Interface limpa
- ✅ Campos contextuais
- ✅ Valores padrão sensatos
- ✅ Ajuda inline

### 4. Extensibilidade
- ✅ Adicionar novos tipos fácil
- ✅ Configurações modulares
- ✅ Zero acoplamento

---

## 🔥 Exemplos Práticos

### Formulário Corporativo

**Campo 1: Número de Colaboradores**
- Tipo: `number`
- Config: min=1, max=10000, step=1

**Campo 2: Orçamento Anual**
- Tipo: `currency`
- Config: currency=EUR, min=0

**Campo 3: NIF da Empresa**
- Tipo: `nif`
- Config: country=PT, validate_checksum=true

**Campo 4: Upload Logotipo**
- Tipo: `image`
- Config: formats=[PNG,JPEG], max_width=500, max_size=2MB

### Formulário Desportivo

**Campo 1: Classificação Esperada**
- Tipo: `rating`
- Config: max_stars=5

**Campo 2: Categoria**
- Tipo: `category`
- Config: auto_category=true, rules={Sub-18:<18, Senior:18-39, Veterano:40+}

**Campo 3: Tempo Esperado**
- Tipo: `duration`
- Config: format=hh:mm

**Campo 4: Foto do Atleta**
- Tipo: `camera`
- Config: resolution=medium, camera=any

---

## ✅ Status

**24 Tipos com Configurações Específicas Implementadas!**

✅ Renderização automática  
✅ Extração de configurações  
✅ Validações contextuais  
✅ Valores padrão inteligentes  
✅ Armazenamento JSONB  
✅ Uso no formulário público  
✅ Extensível facilmente  

**Sistema de Classe Mundial!** 🌟

---

**VisionKrono/Kromi.online** 🏃‍♂️⏱️📋

**Configurações por tipo: 24 implementadas**  
**Restantes: Padrão simples**  
**Total tipos: 61**

