# 🔄 Sistema de Fallback de APIs de IA

## 📋 Visão Geral

O sistema de fallback automático garante que o processamento de imagens continue funcionando mesmo quando um serviço de IA falha. O sistema tenta automaticamente os serviços alternativos configurados até conseguir uma resposta bem-sucedida.

---

## 🎯 Como Funciona

### **Fluxo de Fallback**

1. **Tenta o serviço principal** configurado
2. Se falhar, **tenta automaticamente os demais serviços** na ordem definida
3. Continua até **conseguir uma resposta** ou **esgotar todos os serviços**
4. Se todos falharem, marca as imagens como erro

### **Ordem de Prioridade**

```
Gemini → OpenAI → DeepSeek → Google Vision
```

A ordem prioriza:
- **Custo**: serviços mais baratos primeiro
- **Qualidade**: serviços com melhor precisão
- **Disponibilidade**: apenas serviços com API keys configuradas

---

## ⚙️ Configuração

### **1. Definir Processador Principal**

No arquivo de configuração do evento ou globalmente:

```javascript
const config = {
    processorType: 'gemini', // Serviço principal
    processorSpeed: 'balanced',
    processorConfidence: 0.7
};
```

### **2. Configurar API Keys**

No arquivo `.env` ou na base de dados:

```env
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key
GOOGLE_VISION_API_KEY=your-google-vision-key
```

**Importante**: O sistema só adiciona serviços com API keys configuradas à cadeia de fallback.

---

## 📊 Exemplos de Uso

### **Exemplo 1: Gemini como Principal**

```javascript
// Configuração
processorType: 'gemini'

// Cadeia de fallback automática:
Gemini (principal) → OpenAI → DeepSeek → Google Vision

// Se Gemini falhar, tenta OpenAI
// Se OpenAI falhar, tenta DeepSeek
// E assim por diante...
```

### **Exemplo 2: OpenAI como Principal**

```javascript
// Configuração
processorType: 'openai'

// Cadeia de fallback automática:
OpenAI (principal) → Gemini → DeepSeek → Google Vision

// Se OpenAI falhar, tenta Gemini primeiro (mais barato)
// Depois DeepSeek, depois Google Vision
```

### **Exemplo 3: Apenas Gemini e DeepSeek Configurados**

```javascript
// Configuração
processorType: 'gemini'

// Cadeia de fallback automática:
Gemini (principal) → DeepSeek

// Como OpenAI e Google Vision não têm API keys,
// apenas Gemini e DeepSeek são tentados
```

---

## 🔍 Logs do Sistema

O sistema registra automaticamente cada tentativa:

```
[10:30:15] 📋 Configuração carregada: gemini (balanced)
[10:30:15] 🔗 Cadeia de fallback: gemini → openai → deepseek → google-vision
[10:30:16] 📡 Enviando requisição para Gemini...
❌ Falha com gemini: API rate limit exceeded
[10:30:17] ⏭️ Tentando próximo serviço na cadeia...
[10:30:17] 🔄 Tentando fallback para openai...
✅ Fallback openai bem-sucedido
```

---

## 💡 Benefícios

### **1. Alta Disponibilidade**
- ✅ Continuidade mesmo com falhas de um serviço
- ✅ Redundância automática
- ✅ Zero intervenção manual necessária

### **2. Otimização de Custos**
- ✅ Tenta serviços mais baratos primeiro no fallback
- ✅ Gemini como primeira alternativa (mais econômico)
- ✅ Sempre usa o mais barato disponível

### **3. Flexibilidade**
- ✅ Adiciona automaticamente apenas serviços configurados
- ✅ Respeita a configuração do evento
- ✅ Funciona com qualquer combinação de serviços

### **4. Confiabilidade**
- ✅ Garante processamento mesmo com falhas temporárias
- ✅ Evita perda de dados
- ✅ Logs detalhados para troubleshooting

---

## 🚫 Exclusões

Estes tipos de processador **NÃO** participam do fallback:

- **`hybrid`**: Sistema especial que combina múltiplos serviços
- **`manual`**: Processamento manual, não requer fallback
- **`ocr`**: OCR tradicional não é uma alternativa viável

---

## 🔧 Configuração Avançada

### **Modificar Ordem de Fallback**

No arquivo `src/background-processor.js`, linha 620-626:

```javascript
getFallbackChain() {
    const priorityOrder = [
        'gemini',        // Primeira alternativa
        'openai',       // Segunda alternativa
        'deepseek',     // Terceira alternativa
        'google-vision' // Última alternativa
    ];
    // ...
}
```

### **Adicionar Novos Serviços**

1. Adicionar à ordem de prioridade
2. Implementar método `processImagesWith[Service]`
3. Adicionar API key em `hasApiKeyForProcessor`

---

## 📈 Métricas e Monitoramento

### **Logs Disponíveis**

- ✅ Cadeia de fallback montada
- ✅ Tentativas de fallback
- ✅ Serviços bem-sucedidos
- ✅ Erros de cada serviço

### **Exemplo de Monitoramento**

```bash
# Ver logs do processador
tail -f logs/processor.log | grep "fallback"

# Ver taxa de sucesso por serviço
grep "Fallback" logs/processor.log | wc -l

# Ver qual serviço está sendo mais usado no fallback
grep "Fallback.*bem-sucedido" logs/processor.log
```

---

## 🐛 Troubleshooting

### **Problema: Todos os serviços falhando**

**Sintoma**: `❌ Todos os serviços na cadeia falharam`

**Solução**:
1. Verificar API keys configuradas
2. Verificar conectividade de rede
3. Verificar limites de rate/quotas de APIs
4. Verificar logs para erros específicos

### **Problema: Falta de fallback**

**Sintoma**: Nenhum fallback é tentado

**Solução**:
1. Configurar pelo menos 2 API keys
2. Verificar método `hasApiKeyForProcessor`
3. Verificar logs da cadeia montada

---

## 📝 Notas Importantes

### **Custos**

- Cada serviço no fallback é chamado sequencialmente
- Apenas o primeiro sucesso é registrado
- Falhas não geram custos adicionais

### **Performance**

- O fallback adiciona latência apenas quando há falhas
- Em funcionamento normal, não há overhead
- Timeouts devem ser configurados adequadamente

### **Compatibilidade**

- Funciona com configurações globais e por evento
- Respeita configurações específicas de cada evento
- Compatível com todas as versões anteriores

---

## ✅ Conclusão

O sistema de fallback automático garante:
- ✅ Máxima disponibilidade
- ✅ Melhor custo-benefício
- ✅ Confiabilidade total
- ✅ Zero intervenção manual

**Resultado**: Processamento contínuo mesmo com falhas parciais de infraestrutura!

