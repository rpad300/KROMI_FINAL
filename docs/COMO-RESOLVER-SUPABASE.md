# 🔧 COMO RESOLVER ERRO SUPABASE

## ❌ Problema Atual

```
❌ Erro ao carregar eventos: Error: Supabase não disponível
```

## ✅ Solução

### 1️⃣ Configure Supabase

**Arquivo `.env` criado** - Edite com suas credenciais:

```bash
# Substitua pelos seus valores reais:
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 2️⃣ Obter Credenciais Supabase

1. **Acesse**: https://supabase.com
2. **Login** na sua conta
3. **Selecione** o projeto VisionKrono
4. **Vá em**: Settings → API
5. **Copie**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3️⃣ Executar SQL no Supabase

**Abra**: Supabase Dashboard → SQL Editor  
**Execute**: "`../sql/livestream-schema-simplified.sql"

### 4️⃣ Reiniciar Servidor

```bash
# Pare o servidor (Ctrl+C)
# Execute novamente:
npm start
```

### 5️⃣ Testar

**Recarregue**: `https://192.168.1.219:1144/events`

---

## 🚨 Erro SSL (Normal em Desenvolvimento)

```
An SSL certificate error occurred when fetching the script.
```

**✅ IGNORE** - É normal com certificados auto-assinados!

**Por quê?**:
- Certificado SSL é auto-assinado para desenvolvimento local
- Service Worker não consegue carregar em HTTPS não confiável
- **App funciona 100%** sem Service Worker

**Em produção**: Certificado válido → Service Worker funciona

---

## 🎯 Status Esperado Após Configuração

### Console do Servidor:
```
✅ Supabase conectado
📡 Socket.IO rodando na porta 1144
```

### Console do Browser:
```
✅ Supabase conectado
🔑 Usando chave: Nova (publishable)
📋 Tabela "detections" verificada
```

### Interface:
- ✅ Lista de eventos carrega
- ✅ Eventos clicáveis
- ✅ Live Stream funciona
- ✅ Navegação hierárquica

---

## 🔍 Debugging

### Se ainda não funcionar:

1. **Verifique `.env`**:
   ```bash
   cat .env
   ```

2. **Verifique servidor**:
   ```bash
   # Deve mostrar:
   SUPABASE_URL no processo: CONFIGURADA
   ```

3. **Verifique browser**:
   ```javascript
   // Console do browser:
   console.log(window.supabaseClient.isConnected);
   // Deve retornar: true
   ```

4. **Teste conexão**:
   ```javascript
   // Console do browser:
   fetch('/api/config').then(r => r.json()).then(console.log);
   // Deve mostrar suas credenciais
   ```

---

**Configure o `.env` e reinicie o servidor!** 🚀
