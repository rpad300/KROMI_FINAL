# 🔑 Configuração de API Keys - VisionKrono

## ⚠️ IMPORTANTE: Processamento de Imagens Requer API Key

O sistema VisionKrono usa **Gemini AI** para processar imagens e detectar dorsais automaticamente.

---

## 📋 Passo a Passo

### 1️⃣ Obter Gemini API Key

1. Acesse: **https://aistudio.google.com/app/apikey**
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave gerada

### 2️⃣ Configurar no VisionKrono

1. Abra o arquivo **`.env`** na raiz do projeto
2. Encontre a linha:
   ```
   GEMINI_API_KEY=SUA_CHAVE_GEMINI_AQUI
   ```
3. Substitua por:
   ```
   GEMINI_API_KEY=AIzaSyC...sua_chave_real_aqui
   ```
4. Salve o arquivo

### 3️⃣ Reiniciar o Servidor

```bash
# Para o servidor (Ctrl+C)
# Reinicia:
node server.js
```

Deve aparecer:
```
✅ Processador de imagens ativo e monitorando buffer
```

Se aparecer:
```
❌ Falha ao iniciar processador de imagens
```

Verifica se a chave está correta no `.env`

---

## 🔍 Verificar se Está Funcionando

### No Terminal do Servidor:

```
[18:30:45] 📋 Processando 5 imagens...
[18:30:48] ✅ Detecção salva: 401
[18:30:48] ✅ Detecção salva: 156
[18:30:49] ✅ Classificação criada para dorsal 401
```

### Na Interface (/image-processor):

- Estatísticas atualizando
- Imagens sendo processadas
- "Na Fila" diminuindo
- "Processadas" aumentando

---

## ⚡ Teste Rápido

### 1. Verifica Configuração:

```bash
# Windows PowerShell:
Get-Content .env | Select-String "GEMINI"

# Deve mostrar:
# GEMINI_API_KEY=AIzaSyC...
```

### 2. Teste no Navegador:

```
/detection → Captura imagens
/image-processor → Ver fila
```

Aguarda 10-30 segundos. Deve ver:
- Fila diminuir
- Processadas aumentar

---

## 🚨 Troubleshooting

### Problema: "Falha ao iniciar processador"

**Causas:**
1. GEMINI_API_KEY não configurada
2. Chave inválida
3. Sem internet
4. Quota excedida

**Solução:**
1. Verifica `.env`
2. Testa chave em: https://aistudio.google.com
3. Verifica logs do servidor

### Problema: "Imagens não processam"

**Verifica:**
```sql
-- No Supabase SQL:
SELECT * FROM image_buffer 
WHERE status = 'pending'
ORDER BY captured_at DESC
LIMIT 10;
```

Se há imagens pending mas não processam:
- Backend não está rodando
- API key inválida
- Erro no processador

---

## 📊 Limites da API Gemini

**Free Tier:**
- 15 requisições/minuto
- 1500 requisições/dia
- 1 milhão tokens/dia

**Para Produção:**
- Considere Gemini Pro com quota maior
- Ou implemente Google Vision API como fallback

---

## ✅ Checklist de Configuração

- [ ] Arquivo `.env` criado
- [ ] GEMINI_API_KEY configurada
- [ ] Servidor reiniciado
- [ ] Vê "Processador ativo" no log
- [ ] Teste de captura funciona
- [ ] Imagens são processadas em 10-30s

---

## 🆘 Suporte

Se continuar com problemas:
1. Partilha logs do servidor Node.js
2. Verifica se há imagens em `image_buffer`
3. Testa API key manualmente

**Configure a API key e reinicie o servidor!** 🔑

