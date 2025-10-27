# Separação Correta das Configurações de Checkpoints

## 📋 3 Configurações Diferentes, 3 Páginas Diferentes

### 1️⃣ **Dispositivos Físicos** (`/devices`)

**O que é:** Gestão dos dispositivos físicos (smartphones, tablets) associados ao evento.

**Funcionalidades:**
- ➕ Adicionar dispositivo ao evento
- 🗑️ Remover dispositivo do evento
- 📊 Ver lista de dispositivos

**Não faz:**
- ❌ Não configura ordem
- ❌ Não configura tipos
- ❌ Não configura checkpoints

**Exemplo:**
```
📱 Dispositivo 1
ID: abc123
Role: detector
[Remover]

📱 Dispositivo 2
ID: xyz789
Role: detector
[Remover]
```

---

### 2️⃣ **Ordem dos Checkpoints** (`/checkpoint-order`)

**O que é:** Configuração da ORDEM e TIPOS dos checkpoints no percurso do evento.

**Funcionalidades:**
- ➕ Adicionar checkpoint ao percurso
- 📍 Definir nome (ex: "Km 5", "Subida")
- 🎨 Escolher tipo (Início, Meta, Intermédio, etc)
- 🔢 Definir ordem (arrastar e soltar)
- ✏️ Editar checkpoint
- 🗑️ Remover checkpoint
- 💾 Salvar ordem final

**Interface:**
```
┌──────────────────────────────┐
│ 1️⃣ 🏁 Início/Largada        │
│    Tipo: Início • Splits: ✗  │
│    [Editar] [Remover]        │
├──────────────────────────────┤
│ 2️⃣ 📍 Km 5                  │
│    Tipo: Intermédio • Splits:│
│    [Editar] [Remover]        │
├──────────────────────────────┤
│ 3️⃣ 📍 Km 10                 │
│    Tipo: Intermédio • Splits:│
│    [Editar] [Remover]        │
├──────────────────────────────┤
│ 4️⃣ 🏁 Meta/Chegada          │
│    Tipo: Meta • Splits: ✓    │
│    [Editar] [Remover]        │
└──────────────────────────────┘
```

**Drag & Drop:** Arraste para reordenar

---

### 3️⃣ **Tipos de Checkpoints** (dentro de `/config`)

**O que é:** Configuração GLOBAL dos tipos de checkpoints disponíveis no sistema.

**Funcionalidades:**
- 📋 Ver tipos disponíveis
- ✓/✗ Ativar/Desativar tipos
- ➕ Adicionar tipo personalizado (via SQL)

**Tipos Padrão:**
```
🏁 Início (verde) - Ponto de largada • Splits: ✗
📍 Intermédio (laranja) - Checkpoint no percurso • Splits: ✓
🏁 Meta (vermelho) - Linha de chegada • Splits: ✓
⏱️ Cronometragem (amarelo) - Timing adicional • Splits: ✓
✓ Controlo (azul) - Verificação • Splits: ✗
💧 Abastecimento (ciano) - Posto de apoio • Splits: ✗
```

---

## 🔄 Como as 3 Funcionam Juntas

### Passo 1: Configurar Tipos (Global)
```
/config → Seção "Tipos de Checkpoints"
- Definir tipos disponíveis no sistema
- Ativar/desativar tipos
```

### Passo 2: Associar Dispositivos
```
/devices → Adicionar dispositivos físicos
- Associar smartphones/tablets ao evento
```

### Passo 3: Configurar Checkpoints
```
/checkpoint-order → Montar o percurso
- Para cada checkpoint:
  * Escolher dispositivo
  * Definir nome (Km 5, Subida, etc)
  * Escolher tipo (Início, Meta, Intermédio)
  * Definir ordem
- Arrastar para reordenar
```

---

## 📊 Resultado Final nas Classificações

```sql
Dorsal | Split 1 (Km 5) | Split 2 (Km 10) | Total (Meta)
  401  |     30:25      |      31:02      |    1:12:35
```

**Baseado em:**
- Checkpoint 1 (Início) - não gera split
- Checkpoint 2 (Km 5) - gera Split 1
- Checkpoint 3 (Km 10) - gera Split 2
- Checkpoint 4 (Meta) - gera Tempo Total

---

## 🗺️ Navegação

```
Configuração
├─ 📱 Dispositivos       → /devices
│  └─ Gerir dispositivos físicos
├─ 📍 Ordem Checkpoints  → /checkpoint-order
│  └─ Configurar percurso e ordem
├─ 🔧 Calibração         → /calibration
└─ ⚙️ Configurações      → /config
   └─ Tipos de Checkpoints (seção)
```

---

## ✅ Benefícios da Separação

1. **Clareza:** Cada página tem função específica
2. **Simplicidade:** Não mistura conceitos diferentes
3. **Flexibilidade:** Configura cada aspecto separadamente
4. **Manutenibilidade:** Código organizado e limpo
5. **UX:** Interface intuitiva e focada



