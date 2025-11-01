# 🔑 Correção: Prioridade de API Keys (.env vs Base de Dados)

## ❌ Problema Identificado

O sistema estava a usar API keys **expiradas da base de dados** em vez das **válidas do `.env`**.

### Comportamento Anterior (ERRADO)

```
1. Carregar do .env → gemini_key_valida
2. Carregar da DB → gemini_key_expirada
3. SOBRESCREVER com DB → ❌ Usa key expirada!
```

**Resultado**: Todas as APIs falhavam mesmo com keys válidas no `.env`

---

## ✅ Solução Implementada

### Comportamento Atual (CORRETO)

```
1. Carregar do .env → gemini_key_valida
2. Carregar da DB → gemini_key_expirada
3. VERIFICAR: Já tem no .env? → ✅ Usa do .env!
```

**Resultado**: `.env` tem **SEMPRE prioridade**

---

## 🔧 Código Modificado

### Arquivo: `src/background-processor.js`

**Antes:**
```javascript
if (apiConfigs.geminiApiKey) {
    this.geminiApiKey = apiConfigs.geminiApiKey; // ❌ Sobrescreve sempre
}
```

**Depois:**
```javascript
if (apiConfigs.geminiApiKey && !this.geminiApiKey) {
    this.geminiApiKey = apiConfigs.geminiApiKey; // ✅ Só se não tiver no .env
} else if (this.geminiApiKey) {
    this.log('✅ Usando Gemini do .env (prioritário)', 'info');
}
```

---

## 📊 Nova Ordem de Prioridade

| Prioridade | Fonte | Uso |
|------------|-------|-----|
| 🥇 **1ª** | `.env` | **SEMPRE** (se configurado) |
| 🥈 **2ª** | Base de Dados | Fallback (se `.env` vazio) |

---

## 🔄 Como Aplicar

### 1. Reiniciar o Servidor

```bash
# Parar servidor atual
Ctrl+C

# Iniciar novamente
node server.js
```

### 2. Verificar Logs

Deve aparecer:

```
[BackgroundProcessor] ✅ Usando Gemini do .env (prioritário)
[BackgroundProcessor] ✅ Usando OpenAI do .env (prioritário)
[BackgroundProcessor] ✅ Usando DeepSeek do .env (prioritário)
[BackgroundProcessor] ✅ Usando Google Vision do .env (prioritário)
```

### 3. Testar Processamento

Aceder a: `https://192.168.1.219:1144/image-processor-kromi.html`

O sistema deve:
- ✅ Usar Gemini (do `.env`, que funciona)
- ✅ NÃO dar erro "API key expired"
- ✅ Processar imagens com sucesso

---

## 🧪 Scripts de Teste

### Verificar Keys Configuradas

```bash
node scripts/check-configured-apis.js
```

**Resultado esperado:**
```
✅ GEMINI          | Prioridade 1 | Mais barato e rápido
   Key: AIzaSyAG-P...
```

### Testar Gemini Diretamente

```bash
node scripts/test-gemini-api.js
```

**Resultado esperado:**
```
✅ API FUNCIONANDO!
Status: 200 OK
```

### Testar com Imagem Real

```bash
node scripts/test-gemini-with-real-image.js
```

**Resultado esperado:**
```
✅ GEMINI FUNCIONANDO PERFEITAMENTE!
Tokens usados: ~1400
```

---

## 📋 Checklist de Verificação

Após reiniciar o servidor:

- [ ] Logs mostram "✅ Usando X do .env (prioritário)"
- [ ] NÃO aparecem erros "API key expired"
- [ ] Processamento de imagens funciona
- [ ] Gemini é usado como primeira opção
- [ ] Fallback funciona (se Gemini falhar)

---

## 🔍 Troubleshooting

### Ainda aparece "API key expired"

**Causa**: Servidor não foi reiniciado  
**Solução**: `Ctrl+C` e `node server.js`

### Logs não mostram "Usando do .env"

**Causa**: Key não está no `.env`  
**Solução**: 
```bash
# Verificar se existe
cat .env | grep GEMINI_API_KEY

# Se não existir, adicionar
echo "GEMINI_API_KEY=sua-key-aqui" >> .env
```

### Gemini falha mas teste funciona

**Causa**: Servidor ainda usa versão antiga  
**Solução**:
```bash
# Matar todos os processos node
taskkill /F /IM node.exe

# Iniciar novamente
node server.js
```

---

## 💡 Benefícios da Correção

1. ✅ **Controle Total** - `.env` controla sempre
2. ✅ **Sem Surpresas** - Não sobrescreve acidentalmente
3. ✅ **Fácil Manutenção** - Atualizar só no `.env`
4. ✅ **Transparente** - Logs mostram origem da key
5. ✅ **Seguro** - `.env` não versionado (git ignore)

---

## 🎯 Resumo

**ANTES**: Base de dados sobrescrevia `.env` ❌  
**DEPOIS**: `.env` tem prioridade absoluta ✅

**Para usar API do `.env`**: Basta ter no arquivo  
**Para usar API da DB**: Deixar `.env` vazio

**Flexível e previsível!** 🎉

