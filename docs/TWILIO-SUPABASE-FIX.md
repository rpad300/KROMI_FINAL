# 🔧 Correção: Configuração Twilio no Supabase

## ✅ Seu Número Twilio
**From Number:** `+1234567890`

## 🔧 Configuração Correta no Supabase

### Passo 1: Aceder às Configurações
1. Aceda ao [Painel do Supabase](https://supabase.com/dashboard)
2. Selecione o seu projeto
3. Vá para **Settings > Authentication > Phone**

### Passo 2: Configurar Campos

1. **Twilio Account SID:**
   ```
   AC...
   ```

2. **Twilio Auth Token:**
   ```
   [Seu Auth Token - já configurado]
   ```

3. **Twilio Message Service SID:**
   ⚠️ **OPÇÃO A:** Deixar **VAZIO** (se não tiver um Messaging Service criado)
   
   ⚠️ **OPÇÃO B:** Se tiver um Messaging Service:
   - Deve começar com `MG` ou `MS`
   - **NÃO** usar valores que comecem com `SK`
   - Se estiver `SK...`, **REMOVER** este valor

4. **From Number (se disponível):**
   ```
   +1234567890
   ```
   - Se não houver campo específico para "From Number", o Supabase pode usar o Message Service
   - Se deixar o Message Service SID vazio, pode precisar configurar o número de outra forma

### Passo 3: Ativar Configurações

- ✅ **Enable Phone provider:** ATIVADO
- ✅ **Enable phone confirmations:** ATIVADO
- **SMS OTP Expiry:** 60 segundos
- **SMS OTP Length:** (padrão: 6)

## 📝 Notas Importantes

### Se o Campo "Message Service SID" Aceitar Número
Algumas versões do Supabase permitem colocar um número de telefone diretamente no campo "Message Service SID" em vez de um SID. Se for o caso, pode tentar:
```
+1234567890
```

### Se Precisar Criar Messaging Service

1. **No Console do Twilio:**
   - Messaging > Services > Create new Messaging Service
   - Nome: "Kromi SMS" (ou outro)
   - Adicionar número: `+1234567890`
   - Copiar o **Message Service SID** (começa com `MG`)

2. **No Supabase:**
   - Colar o Message Service SID no campo apropriado

## 🧪 Testar Configuração

### Teste 1: Via cURL Direto
```bash
curl 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json' \
  -X POST \
  --data-urlencode 'To=+351912345678' \
  --data-urlencode 'From=+1234567890' \
  --data-urlencode 'Body=Teste de SMS' \
  -u AC...:[SeuAuthToken]
```

### Teste 2: Via Endpoint do Servidor
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

### Teste 3: Login com Telefone no Sistema
Após configurar no Supabase:
1. Tentar fazer login com telefone
2. Verificar se recebe SMS no número de destino
3. Verificar logs do servidor para erros

## ⚠️ Problemas Comuns

### Erro: "Invalid From Number"
- **Causa:** Campo Message Service SID contém valor inválido (ex: `SK...`)
- **Solução:** Remover valor ou usar número diretamente

### Erro: "Phone number is not verified" (contas trial)
- **Causa:** Contas trial do Twilio precisam verificar números de destino
- **Solução:** Verificar números no Console Twilio > Phone Numbers > Verified Caller IDs

### SMS não chega
- Verificar se número de destino está no formato E.164 (`+351912345678`)
- Verificar se conta Twilio tem créditos
- Verificar logs do Twilio Console

## ✅ Checklist

- [ ] Account SID configurado: `AC...`
- [ ] Auth Token configurado (correto)
- [ ] Message Service SID: vazio OU começa com `MG`/`MS` (NÃO `SK`)
- [ ] From Number: `+1234567890` (se campo disponível)
- [ ] Phone provider: ATIVADO
- [ ] Phone confirmations: ATIVADO
- [ ] Teste via cURL funcionou
- [ ] Teste no sistema funcionou

