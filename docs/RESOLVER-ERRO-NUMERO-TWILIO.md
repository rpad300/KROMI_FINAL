# 🔧 Resolver: "Mismatch between the 'From' number and the account"

## ❌ Erro Atual

```
Mismatch between the 'From' number +1234567890 and the account AC...
```

**Significado:** O número `+1234567890` não pertence à conta Twilio `AC...`.

## ✅ Solução

### Passo 1: Descobrir Números da Sua Conta

**Opção A: Via Console Twilio**
1. Aceda a: https://console.twilio.com/
2. Vá para: **Phone Numbers > Manage > Active numbers**
3. Veja todos os números que pertencem à sua conta
4. Copie um número válido (formato: `+1234567890`)

**Opção B: Via Endpoint do Sistema (Recomendado)**
1. Aceda a: `https://192.168.1.219:1144/api/twilio/phone-numbers`
2. Deve estar autenticado como admin
3. Verá uma lista de todos os números da conta Twilio
4. Copie um dos números mostrados

**Opção C: Via API Twilio Direta**
```bash
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts/AC.../IncomingPhoneNumbers.json' \
  -u AC...:SEU_AUTH_TOKEN
```

### Passo 2: Configurar Número Correto

**No ficheiro `.env`:**
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=seu_auth_token_aqui
TWILIO_FROM_NUMBER=+1234567890
```
(Substitua `+1234567890` pelo número real que pertence à sua conta)

### Passo 3: Reiniciar Servidor

```bash
# Parar servidor (Ctrl+C)
node server.js
```

### Passo 4: Testar Novamente

Após configurar o número correto, teste novamente o login com telefone.

## 📋 Checklist

- [ ] Verificou quais números pertencem à conta no Console Twilio
- [ ] Configurou `TWILIO_FROM_NUMBER` no `.env` com um número válido
- [ ] Reiniciou o servidor
- [ ] Testou novamente o envio de SMS

## ⚠️ Se Não Tiver Números

Se a conta não tiver números de telefone:
1. Compre um número no Console Twilio
2. Configure-o no `.env` como `TWILIO_FROM_NUMBER`
3. Teste novamente

## 🔍 Verificar Configuração

Após configurar, verifique se está correto:
- Terminal do servidor deve mostrar: `📱 Enviando SMS via Twilio: From=+XXXXX, To=+YYYYY, Account=AC...`
- Se o número estiver incorreto, verá o erro "Mismatch"
- Se estiver correto, verá `✅ SMS enviado via Twilio direto: SM...`

