# Sistema de Checkpoints - VisionKrono

## 📋 Visão Geral

O sistema de checkpoints permite configurar pontos de cronometragem em eventos esportivos com tipos personalizáveis e ordem definida.

## 🗄️ Estrutura da Base de Dados

### Tabela: `checkpoint_types`

Define os tipos de checkpoints disponíveis no sistema.

```sql
- id (UUID)
- code (TEXT UNIQUE) - Código do tipo (start, finish, intermediate, etc)
- name (TEXT) - Nome exibido (Início, Meta, Intermédio, etc)
- description (TEXT) - Descrição
- icon (TEXT) - Emoji/ícone (🏁, 📍, ⏱️, etc)
- color (TEXT) - Cor hexadecimal para UI
- is_start (BOOLEAN) - Se é ponto de largada
- is_finish (BOOLEAN) - Se é linha de chegada
- is_intermediate (BOOLEAN) - Se é ponto intermediário
- requires_split (BOOLEAN) - Se gera split time nas classificações
- sort_order (INTEGER) - Ordem de exibição
- is_active (BOOLEAN) - Se está ativo
```

### Tipos Padrão Inclusos:

| Código | Nome | Ícone | Cor | Splits | Uso |
|--------|------|-------|-----|--------|-----|
| `start` | Início | 🏁 | Verde | Não | Ponto de largada |
| `finish` | Meta | 🏁 | Vermelho | Sim | Linha de chegada |
| `intermediate` | Intermédio | 📍 | Laranja | Sim | Checkpoints no percurso |
| `timing` | Cronometragem | ⏱️ | Amarelo | Sim | Pontos de tempo adicional |
| `control` | Controlo | ✓ | Azul | Não | Verificação sem tempo |
| `aid_station` | Abastecimento | 💧 | Ciano | Não | Posto de apoio |

### Tabela: `event_devices` (atualizada)

Associa dispositivos a eventos com configuração de checkpoint.

```sql
- id (UUID)
- event_id (UUID) - Referência ao evento
- device_id (UUID) - Referência ao dispositivo
- checkpoint_order (INTEGER) - Ordem no percurso (1, 2, 3...)
- checkpoint_type (TEXT) - Tipo (FK para checkpoint_types.code)
- checkpoint_name (TEXT) - Nome descritivo (ex: "Km 5", "Subida")
- role (TEXT) - Papel do dispositivo (detector, supervisor, admin)
- assigned_at (TIMESTAMPTZ) - Data de associação
```

## 🎯 Como Funciona

### 1. Ordem dos Checkpoints

Os checkpoints são ordenados sequencialmente:

```
Checkpoint 1 (Início) → Checkpoint 2 (Km 5) → Checkpoint 3 (Km 10) → Checkpoint 4 (Meta)
     🏁                     📍                      📍                      🏁
```

### 2. Cálculo de Splits

O `checkpoint_order` determina como os splits são calculados nas classificações:

```javascript
// Na tabela classifications:
device_order = checkpoint_order

// Cálculo de splits:
Split 1 (ordem 1): tempo desde início do evento
Split 2 (ordem 2): tempo checkpoint 2 - tempo checkpoint 1  
Split 3 (ordem 3): tempo checkpoint 3 - tempo checkpoint 2
Split 4 (ordem 4): tempo checkpoint 4 - tempo checkpoint 3 = Total Time
```

### 3. Tipos com e sem Split

- **requires_split = true**: Gera split time nas classificações (timing points)
- **requires_split = false**: Apenas controle, não gera split (aid stations, control points)

## 🖥️ Interface de Gestão

### Página: `/devices?event={id}`

#### Funcionalidades:

**1. Adicionar Checkpoint:**
- Nome personalizado (ex: "Km 5", "Subida da Torre")
- Tipo de checkpoint (dropdown com tipos disponíveis)
- Ordem no percurso (1, 2, 3...)
- ID do dispositivo (automático ou manual)

**2. Editar Checkpoint:**
- Alterar nome
- Alterar tipo
- Alterar ordem

**3. Visualização:**
- Cards coloridos por tipo
- Mostra ícone do tipo
- Indica se gera split
- Ordem clara (#1, #2, #3...)

**4. Link Rápido:**
- URL para abrir detecção
- Botão copiar
- Gerar QR Code

## 📱 Exemplo de Configuração

### Evento: Maratona (42km)

```
┌─────────────────────────────┐
│ 🏁 Início/Largada          │
│ Ordem: 1 | Tipo: Início    │
│ Splits: Não                │
├─────────────────────────────┤
│ 📍 Km 10                   │
│ Ordem: 2 | Tipo: Intermédio│
│ Splits: Sim                │
├─────────────────────────────┤
│ 📍 Km 21 (Meia Maratona)   │
│ Ordem: 3 | Tipo: Intermédio│
│ Splits: Sim                │
├─────────────────────────────┤
│ 💧 Km 30 (Abastecimento)   │
│ Ordem: 4 | Tipo: Abastec.  │
│ Splits: Não                │
├─────────────────────────────┤
│ 📍 Km 40                   │
│ Ordem: 5 | Tipo: Intermédio│
│ Splits: Sim                │
├─────────────────────────────┤
│ 🏁 Meta/Chegada            │
│ Ordem: 6 | Tipo: Meta      │
│ Splits: Sim (Total)        │
└─────────────────────────────┘
```

### Classificações Resultantes:

```
Dorsal | Split 1 | Split 2 | Split 3 | Split 5 | Total
  401  |    -    |  30:25  |  31:02  |  11:08  | 1:12:35
       |  (start)|  Km 10  |  Km 21  |  Km 40  | (Meta)
```

**Nota:** Km 30 (abastecimento) não gera split pois `requires_split = false`

## 🔧 Configuração

### 1. Executar SQL no Supabase:

```bash
# No Supabase Dashboard → SQL Editor:
create-checkpoint-types.sql
```

Isto cria:
- ✅ Tabela `checkpoint_types`
- ✅ 6 tipos padrão de checkpoints
- ✅ Colunas `checkpoint_order`, `checkpoint_type`, `checkpoint_name` em `event_devices`
- ✅ View `event_checkpoints_view` para consultas
- ✅ Índices para performance

### 2. Acessar Gestão de Checkpoints:

```
/devices?event={event_id}&eventName={nome}
```

### 3. Configurar Checkpoints do Evento:

1. Click em "Adicionar Dispositivo"
2. Digite nome do checkpoint (ex: "Km 5")
3. Selecione tipo (Início, Meta, Intermédio, etc)
4. Defina ordem (1, 2, 3...)
5. Salvar

## 📊 Integração com Classificações

Os checkpoints configurados são usados automaticamente nas classificações:

1. **device_order** nas classificações corresponde a **checkpoint_order**
2. Splits são calculados apenas para checkpoints com `requires_split = true`
3. Ordem determina a sequência dos splits
4. Cores e ícones são exibidos na UI

## ✨ Personalização

Você pode adicionar tipos personalizados de checkpoints:

```sql
INSERT INTO checkpoint_types (code, name, icon, color, requires_split, sort_order) 
VALUES ('custom', 'Meu Tipo', '🎯', '#9333ea', true, 90);
```

## 🎨 Benefícios

- ✅ **Flexível:** Crie tipos personalizados
- ✅ **Visual:** Cores e ícones diferentes por tipo
- ✅ **Preciso:** Controle total sobre ordem e splits
- ✅ **Escalável:** Suporta eventos com múltiplos checkpoints
- ✅ **Intuitivo:** UI amigável para configuração

