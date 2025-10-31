# ✅ Teste SMS Após Configuração

## 📋 Checklist de Configuração

### ✅ No Supabase
- [x] Twilio Account SID configurado
- [x] Twilio Auth Token configurado
- [x] Twilio Message Service SID: vazio OU valor válido (MG/MS)
- [x] Enable Phone provider: ATIVADO
- [x] Enable phone confirmations: ATIVADO

### ✅ No .env (Servidor)
- [x] `TWILIO_ACCOUNT_SID=AC...`
- [x] `TWILIO_AUTH_TOKEN=seu_token_aqui`

### ✅ Número Twilio
- [x] Número From: `+1234567890`

## 🔄 Reiniciar Servidor

**IMPORTANTE:** O servidor precisa ser reiniciado para carregar as novas variáveis de ambiente!

1. **Parar o servidor** (Ctrl+C no terminal onde está a correr)
2. **Iniciar novamente:**
   ```bash
   node server.js
   ```
   ou
   ```bash
   npm start
   ```

## 🧪 Teste 1: Endpoint de Teste (Recomendado)

Após reiniciar o servidor, teste via endpoint:

```bash
curl -X POST https://192.168.1.219:1144/api/twilio/test-sms \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=SEU_SESSION_ID" \
  -d '{
    "to": "+351912345678",
    "from": "+1234567890",
    "message": "Teste de SMS do Kromi"
  }'
```

**Nota:** 
- Substitua `+351912345678` pelo seu número de telefone real
- Você precisa estar autenticado como admin (ter o cookie `sid` válido)

## 🧪 Teste 2: Login com Telefone no Sistema

1. Aceda a: `https://192.168.1.219:1144/login.html`
2. Clique em **"Entrar com telefone"**
3. Introduza um número de telefone registado no sistema
4. Clique em **"Enviar código SMS"**
5. Verifique se recebe o SMS
6. Introduza o código recebido
7. Verifique se faz login com sucesso

## 🔍 Verificar Logs

### No Terminal do Servidor
Deve ver mensagens como:
```
✅ SMS enviado via Twilio: SM1234567890abcdef
📱 SMS enviado para +351912345678 via Supabase Auth
```

### Se Houver Erro
Verifique:
- ❌ "TWILIO_AUTH_TOKEN não configurado" → Verifique se o servidor foi reiniciado
- ❌ "Invalid From Number" → Verifique configuração do Supabase
- ❌ "Phone number not verified" → Verifique se o número está verificado no Twilio (contas trial)

## 📱 Teste 3: API Twilio Direta

Para testar diretamente a API Twilio (sem passar pelo Supabase):

```bash
curl 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages.json' \
  -X POST \
  --data-urlencode 'To=+351912345678' \
  --data-urlencode 'From=+1234567890' \
  --data-urlencode 'Body=Teste direto via Twilio API' \
  -u AC...:SEU_AUTH_TOKEN
```

**Se funcionar:** A API Twilio está OK
**Se não funcionar:** Verifique credenciais no Twilio Console

## ✅ Resultado Esperado

Após todos os testes:

1. ✅ SMS é enviado com sucesso
2. ✅ Código SMS chega ao telefone
3. ✅ Login com telefone funciona
4. ✅ Verificação de telefone funciona
5. ✅ Sem erros "Invalid From Number"

## ⚠️ Problemas Comuns

### "TWILIO_AUTH_TOKEN não configurado"
**Solução:** Reinicie o servidor para carregar as variáveis do `.env`

### "Invalid From Number" ainda aparece
**Solução:** 
- Verifique se removeu o valor `SK...` do campo Message Service SID no Supabase
- Certifique-se de que o Message Service SID está vazio OU começa com `MG`/`MS`

### SMS não chega
**Possíveis causas:**
- Número de destino não está no formato E.164 (`+351912345678`)
- Conta Twilio trial precisa verificar números de destino
- Conta Twilio sem créditos
- Número de destino bloqueado

## 📞 Próximos Passos

Se tudo funcionar:
- ✅ Sistema de login com telefone está operacional
- ✅ Sistema de verificação de telefone está operacional
- ✅ Pode usar SMS para autenticação de utilizadores

