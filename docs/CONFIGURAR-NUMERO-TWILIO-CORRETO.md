# ✅ Configurar Número Twilio Correto

## 📱 Número Encontrado

**Número Twilio:** `+1 318 889 3212`  
**Formato E.164:** `+1234567890`  
**Phone Number SID:** `PN0cc2a2f4ef19f7afb36db389c602a1f5`

## 🔧 Configuração

### Opção 1: Via Base de Dados (Recomendado)

Execute o script SQL:

```bash
node scripts/run-sql.js sql/update-twilio-from-number.sql
```

Isso atualiza a tabela `platform_configurations` com o número correto.

### Opção 2: Via Variável de Ambiente

Adicione ou atualize no seu `.env`:

```env
TWILIO_FROM_NUMBER=+1234567890
```

**Importante:**
- Use o formato E.164: `+1234567890` (sem espaços, sem parênteses)
- Sempre começa com `+` seguido do código do país

### Opção 3: Ambas (Recomendado para Produção)

Configure tanto no `.env` quanto na base de dados. O sistema usa primeiro o `.env`, depois a base de dados.

## 🔄 Após Configurar

1. **Reinicie o servidor**
2. **Teste login com telefone**
3. **Deve funcionar sem erros!**

## ✅ Verificação

Após configurar, pode verificar se está correto:

1. **Teste via endpoint (como admin):**
   ```
   GET https://192.168.1.219:1144/api/twilio/phone-numbers
   ```
   
   Deve mostrar o número `+1234567890` na lista.

2. **Tente fazer login com telefone**
   - O sistema deve enviar SMS com sucesso
   - Não deve aparecer erro de "Mismatch"

## 📝 Notas

- O número `+1234567890` pertence à conta `AC...`
- O sistema vai usar este número automaticamente para todos os SMS
- Se mudar de número no futuro, só precisa atualizar a configuração

