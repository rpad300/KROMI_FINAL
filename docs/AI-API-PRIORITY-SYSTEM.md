# 🤖 Sistema de Prioridade de APIs - AI Processor

## ✅ Status Atual

**Todas as 4 APIs estão configuradas no `.env`:**

1. ✅ **GEMINI** - Prioridade 1 (Mais barato e rápido)
2. ✅ **DEEPSEEK** - Prioridade 2 (Alternativa econômica)
3. ✅ **OPENAI** - Prioridade 3 (Boa qualidade)
4. ✅ **GOOGLE VISION** - Prioridade 4 (OCR tradicional)

---

## 🔗 Como Funciona o Sistema de Fallback Automático

### Detecção Automática

O sistema **detecta automaticamente** quais APIs estão configuradas no `.env` e cria uma cadeia de fallback inteligente:

```javascript
// 1. Detecta APIs disponíveis
✅ GEMINI configurada
✅ DEEPSEEK configurada
✅ OPENAI configurada
✅ GOOGLE_VISION configurada

// 2. Ordena por prioridade (custo/velocidade)
1. GEMINI
2. DEEPSEEK
3. OPENAI
4. GOOGLE_VISION

// 3. Tenta processar nesta ordem
Gemini falhou? → Tenta DeepSeek
DeepSeek falhou? → Tenta OpenAI
OpenAI falhou? → Tenta Google Vision
Todas falharam? → Marca como ERROR
```

---

## 📊 Ordem de Prioridade

### Por Custo (mais barato primeiro)

| API | Custo/1M tokens | Velocidade | Qualidade |
|-----|----------------|------------|-----------|
| 🥇 **Gemini** | ~$0.35 | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐ Excelente |
| 🥈 **DeepSeek** | ~$0.14 | ⚡⚡ Médio | ⭐⭐⭐ Boa |
| 🥉 **OpenAI** | ~$2.50 | ⚡⚡ Médio | ⭐⭐⭐⭐⭐ Excelente |
| 4️⃣ **Google Vision** | ~$1.50/1K | ⚡ Lento | ⭐⭐ OCR básico |

---

## 🔄 Fluxo de Processamento

```
┌─────────────────────────────────────────────┐
│ Nova imagem no image_buffer (status=pending)│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Background Processor detecta               │
│ Configuração do evento: "gemini"           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Cadeia de Fallback:                        │
│ gemini → deepseek → openai → google-vision │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 1️⃣ TENTA: Gemini                           │
│    ✅ Sucesso? → Salva detection & PARA    │
│    ❌ Falhou? → Próximo...                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2️⃣ TENTA: DeepSeek                        │
│    ✅ Sucesso? → Salva detection & PARA    │
│    ❌ Falhou? → Próximo...                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3️⃣ TENTA: OpenAI                          │
│    ✅ Sucesso? → Salva detection & PARA    │
│    ❌ Falhou? → Próximo...                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4️⃣ TENTA: Google Vision                   │
│    ✅ Sucesso? → Salva detection & PARA    │
│    ❌ Falhou? → Marca como ERROR           │
└─────────────────────────────────────────────┘
```

---

## ⚙️ Configuração

### Ver APIs Configuradas

```bash
node scripts/check-configured-apis.js
```

### Adicionar/Remover APIs

Editar `.env`:

```bash
# Habilitar
GEMINI_API_KEY=sua-key-aqui

# Desabilitar (comentar ou remover)
# OPENAI_API_KEY=
```

### Alterar Prioridade

Editar `src/background-processor.js`:

```javascript
const priorityOrder = [
    'gemini',        // Prioridade 1
    'deepseek',      // Prioridade 2
    'openai',        // Prioridade 3
    'google-vision'  // Prioridade 4
];
```

---

## 📈 Logs de Fallback

Quando o sistema usa fallback, aparece nos logs:

```
[BackgroundProcessor] ✅ GEMINI configurada no .env
[BackgroundProcessor] ✅ DEEPSEEK configurada no .env
[BackgroundProcessor] ✅ OPENAI configurada no .env
[BackgroundProcessor] ✅ GOOGLE_VISION configurada no .env
[BackgroundProcessor] 🔗 Cadeia de fallback (baseada no .env): gemini → deepseek → openai → google-vision
[BackgroundProcessor] 📊 4 API(s) configurada(s): gemini, deepseek, openai, google-vision
[BackgroundProcessor] ❌ Erro ao processar com gemini: API quota exceeded
[BackgroundProcessor] 🔄 Tentando fallback para deepseek...
[BackgroundProcessor] ✅ Fallback deepseek bem-sucedido
```

---

## 💰 Otimização de Custos

### Cenário 1: Apenas APIs Baratas

```bash
# .env
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
# OPENAI_API_KEY= (comentado)
# GOOGLE_VISION_API_KEY= (comentado)
```

**Resultado**: Usa apenas Gemini e DeepSeek (mais econômico)

### Cenário 2: Máxima Qualidade

```bash
# .env
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

**Resultado**: Tenta Gemini primeiro (rápido), fallback para OpenAI (qualidade)

### Cenário 3: Máxima Disponibilidade

```bash
# .env (todas configuradas)
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_VISION_API_KEY=...
```

**Resultado**: 4 camadas de fallback (raramente falha)

---

## 🔍 Troubleshooting

### "Todos os fallbacks falharam"

**Possíveis causas:**
1. Todas as API keys expiraram/inválidas
2. Quota excedida em todas
3. Problema de rede
4. Imagem inválida

**Solução:**
1. Verificar keys: `node scripts/check-configured-apis.js`
2. Ver erro específico no `processing_result`
3. Verificar formato da imagem

### "Usando API cara demais"

**Solução:**
1. Verificar ordem de prioridade
2. Garantir que APIs mais baratas estão configuradas
3. Remover APIs caras do `.env` temporariamente

---

## 📝 Resumo

✅ **Sistema 100% automático** - detecta APIs disponíveis  
✅ **Prioriza por custo** - usa mais barato primeiro  
✅ **Fallback inteligente** - tenta todas antes de falhar  
✅ **Configurável** - via `.env` e prioridades  
✅ **Transparente** - logs detalhados de cada tentativa  

**NENHUMA MUDANÇA MANUAL NECESSÁRIA** - basta configurar keys no `.env`!

