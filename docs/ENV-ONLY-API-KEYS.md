# 🔑 API Keys: APENAS do .env (Base de Dados DESATIVADA)

## ✅ Mudança Aplicada

O sistema agora usa **EXCLUSIVAMENTE** as API keys do `.env`.

**API keys da base de dados são IGNORADAS** (estão expiradas e causam erros).

---

## 📋 Código Modificado

### Arquivo: `src/background-processor.js`

```javascript
// ⚠️ IMPORTANTE: NUNCA usar API keys da base de dados
// APENAS usar as do .env
// Base de dados tem keys expiradas que causam erros

if (this.geminiApiKey) {
    this.log('✅ Usando Gemini do .env', 'info');
} else {
    this.log('⚠️ Gemini não configurada no .env', 'warning');
}

// NÃO carregar API keys da base de dados (estão expiradas)
// Código de fallback removido/comentado
```

---

## 🔄 REINICIAR SERVIDOR (OBRIGATÓRIO)

### Windows PowerShell

```powershell
# Parar servidor
Ctrl+C

# Iniciar novamente
node server.js
```

---

## ✅ Logs Esperados Após Reiniciar

```
[BackgroundProcessor] Carregando configurações da base de dados...
[BackgroundProcessor] ✅ Usando Gemini do .env
[BackgroundProcessor] ✅ Usando OpenAI do .env
[BackgroundProcessor] ✅ Usando DeepSeek do .env
[BackgroundProcessor] ✅ Usando Google Vision do .env
[BackgroundProcessor] 🔗 Cadeia de fallback (baseada no .env): gemini → deepseek → openai → google-vision
[BackgroundProcessor] 📊 4 API(s) configurada(s): gemini, deepseek, openai, google-vision
```

---

## 🎯 Processamento de Imagens

Agora quando processar uma imagem:

```
1️⃣ Tenta Gemini (do .env) ✅ FUNCIONA
   └─ Sucesso! Cria detection e PARA
   
❌ NÃO vai tentar base de dados
❌ NÃO vai dar erro "API key expired"
```

---

## 🧪 Teste Rápido

Após reiniciar, aceder:
```
https://192.168.1.219:1144/image-processor-kromi.html
```

**Deve aparecer nos logs:**
```
✅ Usando Gemini do .env
🔗 Cadeia de fallback: gemini → ...
✅ Sucesso ao processar com gemini
```

**NÃO deve aparecer:**
```
❌ API key expired
❌ Chave X carregada da base de dados
```

---

## 📊 Vantagens

| Antes | Depois |
|-------|--------|
| ❌ Keys da DB sobrescreviam .env | ✅ Apenas .env |
| ❌ Keys expiradas causavam erro | ✅ Apenas keys válidas |
| ❌ Comportamento imprevisível | ✅ 100% previsível |
| ❌ Difícil de debugar | ✅ Transparente nos logs |

---

## 🔧 Configuração

### Adicionar API Key

```bash
# Editar .env
nano .env

# Adicionar/atualizar
GEMINI_API_KEY=sua-key-nova-aqui
```

### Remover API Key

```bash
# Editar .env
nano .env

# Comentar ou remover
# OPENAI_API_KEY=antiga-key
```

### Verificar Keys Configuradas

```bash
node scripts/check-configured-apis.js
```

---

## ⚠️ IMPORTANTE

- **NÃO editar** API keys na base de dados (plataform_configurations)
- **Apenas editar** no arquivo `.env`
- **Sempre reiniciar** servidor após mudar `.env`

---

## 🔍 Troubleshooting

### Ainda aparece "API key expired"

**Causa**: Servidor não reiniciado  
**Solução**:
```bash
# Matar todos os processos node
taskkill /F /IM node.exe

# Iniciar novamente
node server.js
```

### Logs não mostram "Usando X do .env"

**Causa**: `.env` não tem a key  
**Solução**:
```bash
# Verificar .env
cat .env | grep GEMINI_API_KEY

# Se vazio, adicionar
echo "GEMINI_API_KEY=sua-key-aqui" >> .env
```

### Nenhuma API configurada

**Causa**: `.env` vazio  
**Solução**:
```bash
# Copiar exemplo
cp env.example .env

# Editar e adicionar keys reais
nano .env
```

---

## ✅ Checklist Pós-Reiniciar

- [ ] Servidor reiniciado
- [ ] Logs mostram "✅ Usando X do .env"
- [ ] NÃO aparece "API key expired"
- [ ] Processamento funciona
- [ ] Imagens são processadas com sucesso

---

## 🎉 Resultado Final

**100% das API keys vêm do `.env`**  
**0% da base de dados**

Simples, previsível, funcional! ✅

