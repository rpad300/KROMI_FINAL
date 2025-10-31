# 🔧 Configuração do Twilio no Supabase

## ❌ Problema Identificado

O erro `Invalid From Number (caller ID): SK...` ocorre porque:

1. O campo **"Twilio Message Service SID"** contém um valor que começa com `SK` (Secret Key) - isso está incorreto
2. Os Message Service SIDs válidos do Twilio começam com `MG` ou `MS`
3. O Supabase está a tentar usar esse valor como número "From", o que causa o erro

## ✅ Solução

### Opção 1: Usar Message Service SID Correto (Recomendado)

1. **Criar Messaging Service no Twilio:**
   - Aceder ao [Console do Twilio](https://console.twilio.com/)
   - Ir para **Messaging > Services > Create new Messaging Service**
   - Dar um nome ao serviço (ex: "Kromi SMS")
   - Adicionar um número de telefone Twilio ao serviço
   - Copiar o **Message Service SID** (começa com `MG`)

2. **Atualizar no Supabase:**
   - Ir a **Settings > Authentication > Phone**
   - No campo **"Twilio Message Service SID"**, colar o SID que começa com `MG`
   - Remover qualquer valor que comece com `SK`

### Opção 2: Usar Número de Telefone Diretamente

Se não quiser usar Messaging Service, pode configurar um número Twilio diretamente:

1. **Obter número Twilio:**
   - No Console do Twilio, ir a **Phone Numbers > Manage > Active numbers**
   - Copiar um número no formato E.164 (ex: `+351912345678`)

2. **Configurar no Supabase:**
   - No campo **"Twilio Message Service SID"**, pode deixar vazio se usar número direto
   - Ou usar um número Twilio como "From Number" nas configurações avançadas

### Opção 3: Verificar Configuração Atual

Para verificar o que está configurado:

1. **No Twilio Console:**
   - Verificar se tem um Messaging Service criado
   - Verificar se tem números de telefone ativos
   - Verificar permissões da conta (algumas contas trial têm limitações)

2. **No Supabase:**
   - Verificar se todos os campos estão preenchidos corretamente:
     - ✅ Twilio Account SID: deve começar com `AC`
     - ✅ Twilio Auth Token: deve estar correto (mostrado como `•••••`)
     - ✅ Twilio Message Service SID: deve começar com `MG` ou `MS`, **NÃO** com `SK`
   - ✅ Enable Phone provider: deve estar ativado
   - ✅ Enable phone confirmations: deve estar ativado

## 🔍 Formato Correto dos IDs

- **Account SID**: `AC...` (ex: `AC...`) ✅
- **Auth Token**: `...` (string longa, não começa com prefixo específico) ✅
- **Message Service SID**: `MG...` ou `MS...` (ex: `MG1234567890abcdef1234567890abcdef`) ✅
- **Secret Key**: `SK...` (usado apenas para autenticação API, NÃO para Message Service) ❌

## 📝 Notas Importantes

1. **Contas Trial do Twilio:**
   - Podem ter limitações no envio de SMS
   - Podem precisar verificar números de destino
   - Podem precisar de ativar números de teste

2. **Formato do Telefone:**
   - Os números devem estar no formato E.164 (ex: `+351912345678`)
   - Sem espaços ou caracteres especiais
   - Com código do país (`+351` para Portugal)

3. **Permissões:**
   - Certifique-se de que a conta Twilio tem permissões para enviar SMS
   - Verifique se o número Twilio está ativo e verificado

## 🧪 Testar Configuração

Após corrigir a configuração, teste:

1. Tentar login com telefone no sistema
2. Verificar se recebe SMS com código
3. Verificar logs no servidor (não deve aparecer erro "Invalid From Number")
4. Verificar logs no Twilio Console (se SMS foi enviado)

## ⚠️ Se Ainda Não Funcionar

1. Verificar logs do servidor para mais detalhes
2. Verificar logs do Twilio Console para ver se houve tentativas de envio
3. Verificar se o número de destino está no formato correto
4. Contactar suporte do Twilio se necessário

