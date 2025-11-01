# 🔧 Configurar Supabase para Produção

## 📋 Configurações Necessárias

Para o domínio `https://myapp.kromi.online` funcionar corretamente, precisa configurar as seguintes URLs no Supabase:

### 1. **Site URL** (URL Base)

**Onde:** Supabase Dashboard → Authentication → URL Configuration → **Site URL**

**Valor:**
```
https://myapp.kromi.online
```

**O que faz:**
- Base URL usada nos links de confirmação de email
- URL padrão para redirecionamentos

---

### 2. **Redirect URLs** (URLs Permitidas)

**Onde:** Supabase Dashboard → Authentication → URL Configuration → **Redirect URLs**

**⚠️ IMPORTANTE:** Configure URLs tanto para **PRODUÇÃO** quanto para **DESENVOLVIMENTO**!

**URLs de PRODUÇÃO a adicionar:**
```
https://myapp.kromi.online/api/auth/verify-email-callback
https://myapp.kromi.online/auth/google-callback.html
https://myapp.kromi.online/auth/callback
https://myapp.kromi.online/index-kromi.html
https://myapp.kromi.online/verify-contact.html
```

**URLs de DESENVOLVIMENTO a adicionar:**
```
https://192.168.1.219:1144/api/auth/verify-email-callback
https://192.168.1.219:1144/auth/google-callback.html
https://192.168.1.219:1144/auth/callback
https://192.168.1.219:1144/index-kromi.html
https://192.168.1.219:1144/verify-contact.html
http://localhost:1144/api/auth/verify-email-callback
http://localhost:1144/auth/google-callback.html
http://localhost:1144/auth/callback
http://localhost:1144/index-kromi.html
http://localhost:1144/verify-contact.html
```

**O que faz:**
- Permite que o Supabase redirecione para estas URLs após autenticação/confirmação
- Sem estas URLs, os redirecionamentos vão falhar
- Ter ambos permite alternar entre desenvolvimento e produção sem reconfigurar

---

### 3. **Google OAuth - Authorized Redirect URIs**

**Onde:** Google Cloud Console → APIs & Services → Credentials → Seu OAuth 2.0 Client

**⚠️ IMPORTANTE:** Configure URLs tanto para **PRODUÇÃO** quanto para **DESENVOLVIMENTO**!

**URIs a adicionar (todos):**
```
https://myapp.kromi.online/auth/google-callback.html
https://192.168.1.219:1144/auth/google-callback.html
http://localhost:1144/auth/google-callback.html
```

**Nota:** Este é configurado no Google Cloud, não no Supabase, mas é necessário para OAuth funcionar.

---

## 🎯 Passos Detalhados

### Passo 1: Configurar Site URL no Supabase

1. Aceda ao [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o seu projeto
3. Vá para **Authentication** → **URL Configuration**
4. No campo **Site URL**, insira:
   ```
   https://myapp.kromi.online
   ```
5. Clique em **Save**

### Passo 2: Configurar Redirect URLs

1. No mesmo local (Authentication → URL Configuration)
2. No campo **Redirect URLs**, adicione **TODAS** as URLs abaixo (produção + desenvolvimento):

**Produção:**
- `https://myapp.kromi.online/api/auth/verify-email-callback`
- `https://myapp.kromi.online/auth/google-callback.html`
- `https://myapp.kromi.online/auth/callback`
- `https://myapp.kromi.online/index-kromi.html`
- `https://myapp.kromi.online/verify-contact.html`

**Desenvolvimento (IP local):**
- `https://192.168.1.219:1144/api/auth/verify-email-callback`
- `https://192.168.1.219:1144/auth/google-callback.html`
- `https://192.168.1.219:1144/auth/callback`
- `https://192.168.1.219:1144/index-kromi.html`
- `https://192.168.1.219:1144/verify-contact.html`

**Desenvolvimento (localhost):**
- `http://localhost:1144/api/auth/verify-email-callback`
- `http://localhost:1144/auth/google-callback.html`
- `http://localhost:1144/auth/callback`
- `http://localhost:1144/index-kromi.html`
- `http://localhost:1144/verify-contact.html`

3. Para cada URL, clique em **Add URL** ou **+**
4. Clique em **Save**

**💡 Dica:** Pode usar wildcards se o Supabase suportar:
- `https://myapp.kromi.online/*` (cobre todas as rotas de produção)
- `https://192.168.1.219:1144/*` (cobre todas as rotas de dev)
- `http://localhost:1144/*` (cobre todas as rotas de localhost)

### Passo 3: Configurar Google OAuth (se usar)

1. Aceda ao [Google Cloud Console](https://console.cloud.google.com)
2. Vá para **APIs & Services** → **Credentials**
3. Clique no seu **OAuth 2.0 Client ID**
4. Em **Authorized redirect URIs**, adicione **TODAS** estas URLs:
   ```
   https://myapp.kromi.online/auth/google-callback.html
   https://192.168.1.219:1144/auth/google-callback.html
   http://localhost:1144/auth/google-callback.html
   ```
5. Clique em **Save**

---

## ✅ Verificação

Após configurar:

1. **Teste Confirmação de Email:**
   - Registe um novo utilizador
   - Clique no link do email
   - Deve redirecionar para `https://myapp.kromi.online` sem erros

2. **Teste Google OAuth:**
   - Clique em "Entrar com Google"
   - Após autenticação, deve redirecionar para `https://myapp.kromi.online` sem erros

3. **Verifique os Logs:**
   - No Supabase Dashboard → Logs → Auth Logs
   - Não deve haver erros de "Redirect URL not allowed"

---

## 📝 Notas Importantes

- **Ambos os ambientes:** Configure **SEMPRE** URLs de produção E desenvolvimento para poder alternar entre ambientes sem reconfigurar
- **Wildcards:** Algumas versões do Supabase permitem wildcards como `https://*.kromi.online/*` - verifique a documentação do Supabase
- **HTTP vs HTTPS:** Use `https://` em produção, mas mantenha `http://` para localhost se necessário
- **Porta:** Especifique a porta quando diferente de 443 (HTTPS) ou 80 (HTTP)
- **Ordem não importa:** Pode adicionar as URLs em qualquer ordem

## ✅ Lista Completa de URLs para Copiar

**Para facilitar, aqui está a lista completa para copiar:**

### Supabase Redirect URLs:
```
https://myapp.kromi.online/api/auth/verify-email-callback
https://myapp.kromi.online/auth/google-callback.html
https://myapp.kromi.online/auth/callback
https://myapp.kromi.online/index-kromi.html
https://myapp.kromi.online/verify-contact.html
https://192.168.1.219:1144/api/auth/verify-email-callback
https://192.168.1.219:1144/auth/google-callback.html
https://192.168.1.219:1144/auth/callback
https://192.168.1.219:1144/index-kromi.html
https://192.168.1.219:1144/verify-contact.html
http://localhost:1144/api/auth/verify-email-callback
http://localhost:1144/auth/google-callback.html
http://localhost:1144/auth/callback
http://localhost:1144/index-kromi.html
http://localhost:1144/verify-contact.html
```

### Google OAuth Redirect URIs:
```
https://myapp.kromi.online/auth/google-callback.html
https://192.168.1.219:1144/auth/google-callback.html
http://localhost:1144/auth/google-callback.html
```

---

## 🔄 Se Mudar de Domínio

Se mudar de domínio no futuro:

1. Atualize **Site URL** no Supabase
2. Atualize **Redirect URLs** no Supabase
3. Atualize **APP_URL** no `.env`
4. Atualize **APP_URL** na base de dados (fallback)

