# 🔧 Configurar Google OAuth no Google Cloud Console

## 📋 Pré-requisitos

1. Conta Google com acesso ao Google Cloud Console
2. Projeto criado no Google Cloud
3. OAuth 2.0 Client ID já criado (ou criar um novo)

---

## 🎯 Passo a Passo Completo

### Passo 1: Aceder ao Google Cloud Console

1. Aceda a: [https://console.cloud.google.com](https://console.cloud.google.com)
2. Faça login com a sua conta Google
3. Selecione o projeto correto no dropdown do topo (ou crie um novo projeto)

### Passo 2: Navegar para Credentials

1. No menu lateral esquerdo, clique em **APIs & Services**
2. Clique em **Credentials** (ou "Credenciais" se estiver em português)

### Passo 3: Localizar ou Criar OAuth 2.0 Client ID

**Se já tiver um OAuth Client:**
- Encontre a lista de "OAuth 2.0 Client IDs"
- Clique no nome do client que usa para o Supabase (geralmente tem o nome do projeto)

**Se NÃO tiver um OAuth Client:**
1. Clique no botão **+ CREATE CREDENTIALS** (ou "+ CRIAR CREDENCIAIS")
2. Selecione **OAuth client ID**
3. Se for a primeira vez, vai pedir para configurar o OAuth consent screen:
   - **User Type:** Escolha "External" (para uso público)
   - **App name:** Ex: "Kromi Online" ou "VisionKrono"
   - **User support email:** Seu email
   - **Developer contact information:** Seu email
   - Clique em **SAVE AND CONTINUE**
   - Em "Scopes", clique em **SAVE AND CONTINUE**
   - Em "Test users", pode adicionar emails de teste (opcional)
   - Clique em **SAVE AND CONTINUE**
   - Revise e clique em **BACK TO DASHBOARD**

4. Agora volte a **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
5. **Application type:** Escolha "Web application"
6. **Name:** Ex: "Kromi Web Client"
7. Clique em **CREATE**

### Passo 4: Configurar Authorized Redirect URIs

1. No OAuth Client que acabou de abrir/criar, vai ver a secção **Authorized redirect URIs**
2. Clique no botão **+ ADD URI** (ou "+ ADICIONAR URI")
3. Adicione cada uma destas URLs **uma por uma**:

**Produção:**
```
https://myapp.kromi.online/auth/google-callback.html
```

**Desenvolvimento (IP local):**
```
https://192.168.1.219:1144/auth/google-callback.html
```

**Desenvolvimento (localhost):**
```
http://localhost:1144/auth/google-callback.html
```

4. Para cada URL:
   - Cole a URL no campo
   - Clique em **+ ADD** ou pressione Enter
   - A URL vai aparecer na lista abaixo

5. Depois de adicionar todas as URLs, clique em **SAVE** (ou "SALVAR") no final da página

---

## 📸 Exemplo Visual da Interface

```
┌─────────────────────────────────────────────────┐
│  OAuth client created                          │
│  ┌──────────────────────────────────────────┐  │
│  │  Name: Kromi Web Client                  │  │
│  │  Client ID: xxxxxx.apps.googleusercontent│  │
│  │  Client secret: xxxxxx                   │  │
│  │                                            │  │
│  │  Authorized JavaScript origins            │  │
│  │  + ADD URI                                │  │
│  │  • https://myapp.kromi.online             │  │
│  │  • https://192.168.1.219:1144            │  │
│  │  • http://localhost:1144                │  │
│  │                                            │  │
│  │  Authorized redirect URIs                 │  │
│  │  + ADD URI                                │  │
│  │  • https://myapp.kromi.online/...         │  │
│  │  • https://192.168.1.219:1144/...        │  │
│  │  • http://localhost:1144/...             │  │
│  │                                            │  │
│  │  [SAVE] [CANCEL]                          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## ✅ URLs Completas para Adicionar

**Copie e cole estas 3 URLs uma por uma:**

```
https://myapp.kromi.online/auth/google-callback.html
https://192.168.1.219:1144/auth/google-callback.html
http://localhost:1144/auth/google-callback.html
```

---

## 🔗 Configurar no Supabase

Após configurar no Google, precisa garantir que o Supabase está configurado:

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. Clique em **Google**
3. Certifique-se de que está **Enabled**
4. **Client ID (for OAuth):** Cole o **Client ID** do Google Cloud
5. **Client Secret (for OAuth):** Cole o **Client Secret** do Google Cloud

**Onde encontrar Client ID e Secret:**
- No Google Cloud Console, no OAuth Client que acabou de configurar
- **Client ID:** Visível na lista (formato: `xxxxxx.apps.googleusercontent.com`)
- **Client Secret:** Clique em "Show" para revelar (se ainda não tiver, pode precisar criar um novo)

---

## 🧪 Testar

Após configurar tudo:

1. Aceda à sua aplicação em `https://myapp.kromi.online`
2. Clique em "Entrar com Google" ou "Login with Google"
3. Deve redirecionar para a página de login do Google
4. Após autenticar, deve redirecionar de volta para `https://myapp.kromi.online`
5. Deve estar autenticado

---

## ⚠️ Problemas Comuns

### Erro: "Redirect URI mismatch"

**Causa:** A URL de redirect não está na lista de URLs autorizadas

**Solução:**
1. Verifique se adicionou exatamente a mesma URL (incluindo `http://` vs `https://`, porta, caminho completo)
2. Certifique-se de que clicou em **SAVE** após adicionar as URLs
3. Aguarde alguns minutos (pode haver cache)

### Erro: "OAuth consent screen not configured"

**Causa:** Não configurou o OAuth consent screen

**Solução:**
1. Vá para **APIs & Services** → **OAuth consent screen**
2. Complete a configuração (veja Passo 3 acima)

### Erro: "Client ID not found"

**Causa:** Client ID incorreto no Supabase

**Solução:**
1. Verifique o Client ID no Google Cloud Console
2. Certifique-se de que copiou o Client ID completo (não o Client Secret)
3. Cole novamente no Supabase

---

## 📝 Notas Importantes

- **HTTPS obrigatório:** Em produção, use sempre `https://` (não `http://`)
- **Portas:** Se usar portas não padrão (como `:1144`), inclua-as nas URLs
- **Caminhos exatos:** O caminho `/auth/google-callback.html` deve ser exato
- **Ambiente de teste:** Se ainda estiver em modo "Testing" no OAuth consent screen, apenas utilizadores de teste poderão fazer login
- **Publicação:** Para uso público, precisa publicar o OAuth consent screen (pode levar alguns dias para aprovação)

---

## 🔄 Próximos Passos

Após configurar:

1. ✅ Configurar URLs no Supabase (veja `CONFIGURAR-SUPABASE-PRODUCAO.md`)
2. ✅ Configurar `APP_URL` no `.env`
3. ✅ Testar login com Google em produção
4. ✅ Testar login com Google em desenvolvimento

