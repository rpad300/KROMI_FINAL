# 🔧 Erro: "Mismatch between the 'From' number and the account"

## ❌ Problema

O erro indica que o número `+1234567890` configurado não pertence à conta Twilio com Account SID `AC...`.

```
Mismatch between the 'From' number +1234567890 and the account AC...
```

## ✅ Solução

### Passo 1: Verificar Números da Sua Conta Twilio

1. Aceda ao [Console Twilio](https://console.twilio.com/)
2. Vá para **Phone Numbers > Manage > Active numbers**
3. Veja todos os números que pertencem à sua conta
4. Copie um número válido no formato E.164 (ex: `+1234567890`)

### Passo 2: Configurar Número Correto

**Opção A: Via Variável de Ambiente (.env)**

Adicione ou atualize no `.env`:
```env
TWILIO_FROM_NUMBER=+1234567890
```
(Substitua `+1234567890` pelo número real que pertence à sua conta)

**Opção B: Via Base de Dados (Platform Configurations)**

Pode também configurar na tabela `platform_configurations`:
```sql
INSERT INTO platform_configurations (config_key, config_value, description)
VALUES ('TWILIO_FROM_NUMBER', '+1234567890', 'Número Twilio para envio de SMS')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
```

### Passo 3: Reiniciar Servidor

Após configurar, reinicie o servidor:
```bash
# Parar servidor (Ctrl+C)
# Iniciar novamente
node server.js
```

## 🔍 Verificar Números da Conta

Se não souber quais números pertencem à conta, pode listá-los via API:

```bash
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts/AC.../IncomingPhoneNumbers.json' \
  -u AC...:SEU_AUTH_TOKEN
```

Isso retorna todos os números da conta no formato:
```json
{
  "phone_numbers": [
    {
      "phone_number": "+1234567890",
      "friendly_name": "...",
      ...
    }
  ]
}
```

## ⚠️ Notas Importantes

1. **Números Trial:** Contas trial do Twilio podem ter limitações nos números que podem usar
2. **Formato:** O número deve estar no formato E.164 (ex: `+351912345678`)
3. **Propriedade:** O número DEVE pertencer à conta Twilio configurada
4. **Verificação:** Se não tiver certeza, verifique no Console Twilio primeiro

## ✅ Após Corrigir

1. Configure `TWILIO_FROM_NUMBER` no `.env` com um número válido da conta
2. Reinicie o servidor
3. Teste novamente o envio de SMS
4. Deve funcionar sem o erro "Mismatch"

