# Sistema de Código para Participantes

## 📋 Descrição

Este sistema gera automaticamente um **código alfanumérico único de 6 dígitos** para cada participante sempre que um novo participante é adicionado a um evento.

## ✨ Funcionalidades

- ✅ Geração automática de código único ao criar participante
- ✅ Código alfanumérico de 6 caracteres (ex: `A3K7P2`)
- ✅ Garantia de unicidade (não pode haver dois participantes com o mesmo código)
- ✅ Código exibido na tabela de participantes
- ✅ Funciona automaticamente via trigger no banco de dados

## 🗄️ Estrutura do Banco de Dados

### Coluna Adicionada

A tabela `participants` agora possui uma nova coluna:
- `participant_code` (VARCHAR(6)): Código alfanumérico único gerado automaticamente

### Funções Criadas

1. **`generate_participant_code()`**: Gera um código alfanumérico único de 6 caracteres
2. **`auto_generate_participant_code()`**: Função trigger que gera o código automaticamente

### Trigger

Um trigger é executado **antes** de cada inserção na tabela `participants`, garantindo que:
- Se `participant_code` estiver vazio ou NULL, um código é gerado automaticamente
- O código gerado é sempre único no banco de dados

## 📝 Como Usar

### 1. Executar o Script SQL

Execute o script `sql/add-participant-code.sql` no Supabase SQL Editor:

```sql
-- Este script:
-- 1. Adiciona a coluna participant_code
-- 2. Cria a função de geração de código
-- 3. Cria o trigger automático
-- 4. Gera códigos para participantes existentes
```

### 2. Criar Novo Participante

Ao criar um participante (via interface web, API ou importação), o código é gerado automaticamente:

```javascript
// Exemplo: Criar participante (código gerado automaticamente)
const { data, error } = await supabase
  .from('participants')
  .insert({
    event_id: 'event-uuid',
    dorsal_number: 123,
    full_name: 'João Silva',
    // participant_code será gerado automaticamente
  });
```

### 3. Visualizar Código

O código aparece na tabela de participantes na interface web, na coluna "Código".

## 🔧 Detalhes Técnicos

### Caracteres Usados

O código usa apenas caracteres que não são facilmente confundidos:
- **Letras**: A, B, C, D, E, F, G, H, J, K, L, M, N, P, Q, R, S, T, U, V, W, X, Y, Z
- **Números**: 2, 3, 4, 5, 6, 7, 8, 9
- **Excluídos**: 0, O, I, 1 (para evitar confusão)

### Garantia de Unicidade e Proteção contra Conflitos

#### ✅ Triggers no Banco de Dados (Server-Side)

**IMPORTANTE**: Os triggers estão implementados **100% no banco de dados**, garantindo:

1. **Execução sempre**: O código é gerado independentemente da origem:
   - ✅ Inserções via API REST
   - ✅ Inserções via frontend (Supabase Client)
   - ✅ Inserções diretas via SQL
   - ✅ Importações em massa (bulk inserts)

2. **Proteção contra Race Conditions**:
   - Usa `pg_advisory_xact_lock()` para evitar conflitos em inserções simultâneas
   - Usa `FOR UPDATE` no SELECT para garantir exclusão mútua
   - Garante que duas inserções concorrentes não gerem o mesmo código

3. **Validação Automática**:
   - Se alguém tentar inserir um código manual que já existe, um novo é gerado automaticamente
   - Se o formato do código estiver incorreto, é gerado um novo válido
   - Formato validado: exatamente 6 caracteres alfanuméricos maiúsculos

4. **Índice Único**:
   - Índice único na coluna `participant_code` previne duplicados a nível de banco
   - Se por algum motivo dois códigos iguais forem gerados, o banco rejeita o INSERT

5. **Tentativas de Geração**:
   - Função tenta até 100 vezes gerar um código único antes de falhar
   - Se não conseguir após 100 tentativas, lança exceção clara

### Performance

- Índice criado para busca rápida por código
- Trigger executado apenas em inserções (não afeta updates)
- Códigos gerados em milissegundos
- Locks são liberados automaticamente após a transação

### Segurança

- **Nenhuma lógica no servidor/frontend**: Tudo é feito no banco de dados
- **Impossível bypass**: Mesmo inserções diretas via SQL passam pelo trigger
- **Atomicidade**: Cada geração de código é uma transação atômica

## 📊 Exemplo de Resultado

```sql
-- Consulta para ver participantes com códigos
SELECT 
    dorsal_number,
    full_name,
    participant_code,
    registration_date
FROM participants
ORDER BY created_at DESC;

-- Resultado:
-- dorsal_number | full_name    | participant_code | registration_date
-- 123           | João Silva   | A3K7P2          | 2024-01-15 10:30:00
-- 124           | Maria Santos | B4L8Q3          | 2024-01-15 10:31:00
-- 125           | Pedro Costa  | C5M9R4          | 2024-01-15 10:32:00
```

## 🎨 Interface Web

Na página de gestão de participantes (`/participants`), o código aparece:
- Na segunda coluna da tabela (após "Dorsal")
- Com destaque visual (background colorido)
- Formato: `<code>A3K7P2</code>`

## ⚠️ Notas Importantes

1. **Participantes Existentes**: O script gera códigos para participantes que já existiam antes da implementação
2. **Não Editável**: O código não deve ser editado manualmente (é gerado automaticamente)
3. **Único Global**: O código é único em todo o banco de dados, não apenas por evento
4. **Usos Futuros**: O código pode ser usado para:
   - Identificação rápida de participantes
   - Sistemas de check-in
   - Integração com outros sistemas
   - QR codes personalizados

## 🚀 Próximos Passos Possíveis

- Exportar códigos em CSV/Excel
- Gerar QR codes baseados no código
- Sistema de check-in por código
- API para buscar participante por código

