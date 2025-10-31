# 🔧 Solução: Erro "Invalid From Number: AC..."

## ❌ Problema Identificado

O erro mostra que o Supabase está a usar o **Account SID** como número "From":

```
Invalid From Number (caller ID): AC...
```

**Account SID não é um número de telefone!** O Account SID (`AC...`) é apenas o identificador da conta Twilio.

## ✅ Solução: Configuração Correta no Supabase

### Passo 1: Verificar Campo "Twilio Message Service SID"

No Supabase: **Settings > Authentication > Phone**

**OPÇÃO A - Deixar VAZIO (Recomendado):**
1. Encontre o campo **"Twilio Message Service SID"**
2. **APAGUE TODO O CONTEÚDO** deste campo
3. Deixe completamente **VAZIO**
4. Salve as configurações

**OPÇÃO B - Usar Message Service SID Correto:**
Se quiser usar um Messaging Service:
1. Crie um no Twilio Console (Messaging > Services)
2. Adicione o número `+1234567890` ao serviço
3. Copie o **Message Service SID** (começa com `MG` ou `MS`)
4. Cole no campo "Twilio Message Service SID"

### Passo 2: Verificar Outros Campos

Certifique-se de que estão configurados corretamente:

1. **Twilio Account SID:** `AC...` ✅
2. **Twilio Auth Token:** [Seu token correto] ✅
3. **Twilio Message Service SID:** **VAZIO** ou `MG...`/`MS...` (NÃO `AC...` ou `SK...`) ❌
4. **Enable Phone provider:** ATIVADO ✅
5. **Enable phone confirmations:** ATIVADO ✅

## 🔍 Como Saber se Está Correto

### ❌ ERRADO:
- Message Service SID contém: `AC...` (Account SID)
- Message Service SID contém: `SK...` (Secret Key)
- Message Service SID contém qualquer coisa que NÃO comece com `MG` ou `MS`

### ✅ CORRETO:
- Message Service SID: **VAZIO** (vazio)
- Message Service SID: `MG1234567890abcdef...` (Message Service SID válido)
- Message Service SID: `MS1234567890abcdef...` (Message Service SID válido)

## 📱 Criar Messaging Service (Opcional)

Se quiser usar um Messaging Service em vez de deixar vazio:

1. **No Twilio Console:**
   - Aceda a: [Console Twilio](https://console.twilio.com/)
   - Vá para: **Messaging > Services**
   - Clique em **"Create new Messaging Service"**
   - Nome: "Kromi SMS" (ou outro)
   - Clique em **"Add Sender"**
   - Selecione o número `+1234567890`
   - Salve o serviço
   - Copie o **Message Service SID** (começa com `MG`)

2. **No Supabase:**
   - Cole o Message Service SID no campo apropriado
   - Salve

## 🧪 Testar Após Corrigir

1. Reinicie o servidor (se necessário)
2. Tente fazer login com telefone novamente
3. Verifique se o SMS é enviado com sucesso
4. Verifique se não aparece mais o erro "Invalid From Number: AC..."

## 📝 Resumo

**O problema:** Campo "Twilio Message Service SID" contém Account SID (`AC...`) em vez de estar vazio ou ter um Message Service SID válido (`MG...`/`MS...`).

**A solução:** Apagar o conteúdo do campo "Twilio Message Service SID" e deixá-lo vazio.

