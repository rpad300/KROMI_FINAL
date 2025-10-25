# 🔧 Flow de Calibração Completo - VisionKrono

## 📋 Comparação: Versão Antiga vs Atual

### **Versão Antiga (calibration.js) - 5 Passos:**

```
Passo 1: Upload Imagem + Número do Dorsal
├─ Fazer upload de foto com dorsal
├─ Digitar número do dorsal (ex: 407)
└─ Salvar imagem de referência

Passo 2: Configurar Nomenclatura dos Dorsais ⚠️ FALTA
├─ Tipo: Numérico, Prefixo, Marcadores, Custom
├─ Numérico: 1-9999, padding, dígitos
├─ Prefixo: "M-407", "F-156", etc
├─ Marcadores: Cores de início/fim
├─ Custom: Regex personalizado
└─ Preview do padrão

Passo 3: Calibração Automática
├─ Testar diferentes parâmetros
├─ Contraste: 1.0, 1.2, 1.5, 1.8, 2.0
├─ Threshold: 127, 100, 120, 140, 160
├─ Encontrar melhor combinação
└─ Salvar parâmetros otimizados

Passo 4: Definir Área do Número
├─ Canvas com imagem
├─ Desenhar retângulo (mousedown/mousemove/mouseup)
├─ Touch events para mobile
├─ Salvar coordenadas relativas
└─ Confirmar área

Passo 5: Resultados e Links
├─ Mostrar configuração final
├─ QR Code para mobile
├─ Links diretos
├─ Teste de detecção
└─ Exportar config
```

### **Versão Atual (calibration-kromi.html) - 4 Passos:**

```
Passo 1: Upload Imagem
├─ Upload com drag & drop ✅
├─ Preview da imagem ✅
└─ Analisar imagem ✅

Passo 2: Definir Área
├─ Área arrastável ✅
├─ Handles para resize ✅
├─ Info em tempo real ✅
├─ Salvar em event_configurations ✅
└─ OK ✅

Passo 3: Configurar IA
├─ Limiar de confiança ✅
├─ Velocidade de detecção ✅
├─ Pré/Pós-processamento ✅
├─ Máximo detecções ✅
├─ Timeout ✅
└─ Salvar config ✅

Passo 4: Resultados
├─ Precisão ✅
├─ Recall ✅
├─ F1-Score ✅
├─ Tempo médio ✅
└─ Detecções/s ✅

❌ FALTA: Passo de Nomenclatura dos Dorsais
```

---

## ⚠️ O Que Está em Falta

### **Passo 2: Nomenclatura dos Dorsais**

Este passo permite configurar diferentes formatos de dorsais:

#### **1. Numérico (Padrão):**
```
Formato: 1, 2, 3, ..., 9999
Config:
  - Mínimo: 1
  - Máximo: 9999
  - Padding: 001, 002 (opcional)
  - Dígitos: 3 (001-999)
```

#### **2. Prefixo:**
```
Formato: M-407, F-156, PRO-023
Config:
  - Prefixo: "M-", "F-", "PRO-"
  - Número: 1-9999
  - Separador: -, _, espaço
```

#### **3. Marcadores de Cor:**
```
Formato: 🟢407🔴 (verde início, vermelho fim)
Config:
  - Cor início: RGB
  - Cor fim: RGB
  - Tolerância: 10-50
  - Número entre marcadores
```

#### **4. Custom (Regex):**
```
Formato: Qualquer padrão
Config:
  - Regex: ^[A-Z]\d{3}$
  - Exemplos: A123, B456
  - Validação
```

---

## 🔄 Flow Completo Recomendado

### **Para Implementar Completo:**

```javascript
// Adicionar após Passo 1, antes do Passo 2 atual

Passo 1: Upload Imagem ✅
  └─ (atual)

NOVO Passo 2: Nomenclatura
  ├─ Radio buttons: Numérico/Prefixo/Marcadores/Custom
  ├─ Formulários específicos por tipo
  ├─ Preview do padrão
  ├─ Salvar em event_configurations
  └─ Validar e avançar

Passo 3: Área do Número ✅
  └─ (atual Passo 2)

Passo 4: Configurar IA ✅
  └─ (atual Passo 3)

Passo 5: Testar e Resultados ✅
  └─ (atual Passo 4)
```

---

## 📝 Implementação Sugerida

### **Adicionar Passo 2 de Nomenclatura:**

```html
<div class="step" id="step2nomenclature">
  <h3>🔢 Configurar Nomenclatura dos Dorsais</h3>
  
  <!-- Radio Buttons -->
  <label>
    <input type="radio" name="dorsalType" value="numeric" checked>
    Numérico (1, 2, 3, ..., 9999)
  </label>
  
  <label>
    <input type="radio" name="dorsalType" value="prefix">
    Com Prefixo (M-407, F-156)
  </label>
  
  <label>
    <input type="radio" name="dorsalType" value="markers">
    Com Marcadores de Cor
  </label>
  
  <label>
    <input type="radio" name="dorsalType" value="custom">
    Personalizado (Regex)
  </label>
  
  <!-- Configs específicas -->
  <div id="numericConfig">
    Mínimo: <input type="number" value="1">
    Máximo: <input type="number" value="9999">
    Padding: <input type="checkbox"> Zeros à esquerda
  </div>
  
  <button onclick="saveNomenclature()">Salvar Nomenclatura</button>
</div>
```

```javascript
async function saveNomenclature() {
  const type = document.querySelector('input[name="dorsalType"]:checked').value;
  
  const nomenclatureConfig = {
    type: type,
    // ... configs específicas
  };
  
  // Salvar em event_configurations
  await window.supabaseClient.supabase
    .from('event_configurations')
    .upsert({
      event_id: currentEvent.id,
      config_type: 'dorsal_nomenclature',
      config_data: nomenclatureConfig
    });
  
  showStep(3); // Próximo passo
}
```

---

## 🎯 Prioridade

### **Para Produção Imediata:**
O sistema funciona **SEM** nomenclatura (assume numérico 1-9999).

### **Para Implementar Depois:**
- Passo de nomenclatura completo
- Suporte a prefixos
- Marcadores de cor
- Regex custom

---

## ✅ O Que Já Funciona

- Upload e preview ✅
- Área arrastável e redimensionável ✅
- Config IA ✅
- Salvar tudo em event_configurations ✅
- Teste mostra resultados ✅

**Para agora, podes usar o sistema assumindo dorsais numéricos simples (1-9999).** 

**Quer que implemente o Passo de Nomenclatura completo numa próxima sessão?** 🔧

