# 🔧 Configurar APP_URL para Produção

## ❌ Problema

Quando em produção (domínio `myapp.kromi.online`), os links de confirmação de email e redirecionamentos OAuth estavam a usar o IP pessoal (`192.168.1.219:1144`) em vez do domínio de produção.

## ✅ Solução Implementada

O sistema agora obtém a `APP_URL` na seguinte ordem de prioridade:

1. **Variável de ambiente** (`APP_URL` no `.env`) — **RECOMENDADO**
2. **Base de dados** (`platform_configurations` → `APP_URL`) — Fallback
3. **Hostname da requisição** (automático do request) — Último recurso

## 🔧 Configuração

### ⭐ Opção 1: Via Variável de Ambiente (RECOMENDADO)

**No seu `.env` de produção:**

```env
APP_URL=https://myapp.kromi.online
```

**Vantagens:**
- ✅ Fácil de mudar entre ambientes (dev, staging, produção)
- ✅ Não requer acesso à base de dados
- ✅ Pode ser diferente por instância do servidor
- ✅ Segue boas práticas de configuração via environment variables

**No `.env` de desenvolvimento:**

```env
APP_URL=https://192.168.1.219:1144
# ou
APP_URL=http://localhost:1144
```

### Opção 2: Via Base de Dados (Fallback)

Se não tiver `APP_URL` no `.env`, o sistema usa a base de dados:

```sql
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES ('APP_URL', 'https://myapp.kromu.online', 'api-key', false, 'URL da aplicação em produção')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();
```

**Uso recomendado:** Apenas como fallback se não puder usar `.env`.

## 📋 Locais Corrigidos

Os seguintes endpoints agora usam a `APP_URL` correta:

1. ✅ `/api/auth/send-confirmation-email` - Links de confirmação de email
2. ✅ `/api/auth/resend-verification` (email) - Reenvio de emails
3. ✅ `/api/auth/google` - Redirecionamento OAuth Google
4. ✅ `/api/auth/google/callback` - Callback OAuth Google
5. ✅ `auth-client.js` - Cliente Google OAuth no frontend

## 📋 Exemplo Completo de `.env`

```env
# ... outras configurações ...

# URL da aplicação
# Produção:
APP_URL=https://myapp.kromi.online

# Desenvolvimento:
# APP_URL=https://192.168.1.219:1144
# ou
# APP_URL=http://localhost:1144
```

## 🔄 Após Configurar

1. **Adicione `APP_URL` ao seu `.env`** (exemplo acima)
2. **Reinicie o servidor** para carregar variáveis de ambiente
3. **Teste registo** - verifique se o email de confirmação usa `https://kromi.online`
4. **Teste Google OAuth** - verifique se redireciona para `https://kromi.online`

## ✅ Verificação

Após configurar, verifique:

1. **Email de confirmação:**
   - Registe um novo utilizador
   - Verifique o email recebido
   - O link deve ser: `https://myapp.kromu.online/api/auth/verify-email-callback?token=...`

2. **Google OAuth:**
   - Clique em "Entrar com Google"
   - Após autenticação, deve redirecionar para `https://myapp.kromu.online/auth/google-callback.html`

## 📝 Notas

- **Desenvolvimento:** Se não configurar, usa automaticamente o hostname da requisição (`http://localhost:1144` ou `https://192.168.1.219:1144`)
- **Produção:** Configure sempre `APP_URL` para garantir links corretos
- **Mudanças:** Se mudar de domínio, só precisa atualizar `APP_URL` na base de dados ou `.env`

