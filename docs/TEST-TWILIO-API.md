# 📱 Teste Direto da API Twilio

## Comando cURL Completo

O comando que você mostrou está incompleto. Aqui está a versão completa:

```bash
curl 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json' \
  -X POST \
  --data-urlencode 'To=+351912345678' \
  --data-urlencode 'From=+1234567890' \
  --data-urlencode 'Body=Teste de SMS via Twilio API' \
  -u AC...:SEU_AUTH_TOKEN
```

**Nota:** Substitua `+351912345678` pelo número de destino real.

### Parâmetros Necessários:

1. **To**: Número de destino (formato E.164: `+1234567890`)
2. **From**: Número Twilio de origem (formato E.164: `+1234567890`) ⚠️ **OBRIGATÓRIO**
3. **Body**: Mensagem a enviar
4. **Auth**: Account SID e Auth Token (via `-u`)

## ⚠️ Importante

- Substitua `[AuthToken]` pelo seu **Twilio Auth Token** real
- O número "From" deve ser um número Twilio válido que você possui
- Substitua `+351912345678` pelo número de destino real
- O número "From" deve ser um número Twilio válido que você possui

## 🔍 Como Encontrar o Número "From"

1. Aceda ao [Console do Twilio](https://console.twilio.com/)
2. Vá para **Phone Numbers > Manage > Active numbers**
3. Copie um número no formato E.164 (ex: `+351912345678`)

## 🧪 Usar Endpoint de Teste no Servidor

Criamos um endpoint de teste no servidor para facilitar:

### Endpoint: `POST /api/twilio/test-sms`

**Require:** Autenticação admin

**Body:**
```json
{
  "to": "+351912345678",
  "from": "+1234567890",
  "message": "Teste de SMS via API"
}
```

**Exemplo com cURL:**
```bash
curl -X POST https://192.168.1.219:1144/api/twilio/test-sms \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=SEU_SESSION_ID" \
  -d '{
    "to": "+351912345678",
    "from": "+1234567890",
    "message": "Teste de SMS"
  }'
```

## 📝 Variáveis de Ambiente

Para usar o endpoint de teste, configure no `.env`:

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
```

## ✅ Testar Configuração

1. **Teste direto via API Twilio:**
   ```bash
   curl 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json' \
     -X POST \
     --data-urlencode 'To=+351912345678' \
     --data-urlencode 'From=+1234567890' \
     --data-urlencode 'Body=Teste' \
     -u AC...:SEU_AUTH_TOKEN
   ```
   
   **Nota:** Substitua `+351912345678` pelo seu número de telefone real para receber o SMS de teste.

2. **Se funcionar:** A API Twilio está OK, o problema está na configuração do Supabase
3. **Se não funcionar:** Verifique:
   - Se o número "From" é válido e pertence à sua conta
   - Se a conta Twilio está ativa
   - Se tem créditos/permissões para enviar SMS
   - Se o número de destino está no formato correto (E.164)

## 🔧 Configurar no Supabase

Depois de confirmar que a API Twilio funciona:

1. No Supabase, **Settings > Authentication > Phone**
2. **Twilio Account SID**: `AC...`
3. **Twilio Auth Token**: Seu Auth Token
4. **Twilio Message Service SID**: 
   - **Opção A:** Deixar **VAZIO** (recomendado se não tiver Messaging Service)
   - **Opção B:** Usar Message Service SID que comece com `MG` ou `MS`
   - **NÃO usar** valores que comecem com `SK` (como `SK...`)
5. **From Number**: `+1234567890` (seu número Twilio no formato E.164)

## 📞 Suporte

Se continuar com problemas:
- Verifique logs do Twilio Console
- Verifique logs do servidor
- Verifique se conta Twilio está ativa e tem créditos

