# 🔍 Como Encontrar o Número Twilio Correto

## ❌ Problema

O número não pertence à conta Twilio especificada.

## ✅ Solução: Descobrir Números da Conta

### Método 1: Via Endpoint do Sistema (Mais Fácil)

1. **Aceda ao sistema como admin**
2. **Chame o endpoint:**
   ```
   GET https://192.168.1.219:1144/api/twilio/phone-numbers
   ```
   
   Ou via curl (substitua `SEU_SESSION_ID`):
   ```bash
   curl -X GET https://192.168.1.219:1144/api/twilio/phone-numbers \
     -H "Cookie: sid=SEU_SESSION_ID"
   ```

3. **A resposta mostrará todos os números da conta:**
   ```json
   {
     "success": true,
     "phone_numbers": [
       {
         "phone_number": "+1234567890",
         "friendly_name": "...",
         "sid": "PN...",
         "capabilities": {...}
       }
     ],
     "account_sid": "AC...",
     "message": "Encontrados X número(s). Use um deles como TWILIO_FROM_NUMBER."
   }
   ```

4. **Copie um dos números mostrados**

5. **Configure no `.env`:**
   ```env
   TWILIO_FROM_NUMBER=+1234567890
   ```
   (Use o número real retornado)

### Método 2: Via Console Twilio

1. **Aceda a:** https://console.twilio.com/
2. **Phone Numbers > Manage > Active numbers**
3. **Veja a lista de números**
4. **Copie um número** (ex: `+15551234567`)

### Método 3: Via API Twilio Direta

```bash
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts/AC.../IncomingPhoneNumbers.json' \
  -u AC...:SEU_AUTH_TOKEN
```

**Resposta:**
```json
{
  "incoming_phone_numbers": [
    {
      "phone_number": "+15551234567",
      "friendly_name": "...",
      ...
    }
  ]
}
```

### Método 4: Se Não Tiver Números

Se não tiver números na conta:

1. **No Console Twilio:**
   - Vá para: **Phone Numbers > Buy a number**
   - Escolha país/região (ex: Portugal, Estados Unidos)
   - Compre um número
   - Copie o número comprado

2. **Configure no `.env`:**
   ```env
   TWILIO_FROM_NUMBER=+351912345678
   ```
   (Use o número que comprou)

## ⚙️ Configuração Final

No seu `.env`:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_FROM_NUMBER=+1234567890
```

**Importante:**
- `TWILIO_FROM_NUMBER` DEVE ser um número que pertença à conta
- Use o formato E.164: `+351912345678` ou `+15551234567`
- Sem espaços ou caracteres especiais

## 🔄 Reiniciar e Testar

Após configurar:
1. **Reinicie o servidor**
2. **Teste login com telefone**
3. **Deve funcionar!**

