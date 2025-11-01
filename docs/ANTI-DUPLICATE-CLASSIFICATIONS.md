# 🚫 Sistema Anti-Duplicação de Classificações

## ✅ Implementações Aplicadas

### 1️⃣ **Validação de Participantes**

Apenas dorsais registados em `participants` podem ter classificações.

```javascript
// Verificar se é participante
const participantExists = await this.checkParticipantExists(eventId, dorsalNumber);

if (!participantExists) {
    // ⚠️ Ignorar - não criar classificação
    return;
}
```

### 2️⃣ **Validação de Duplicados**

Verifica se já existe classificação para o mesmo dorsal no mesmo checkpoint.

```javascript
// Verificar se já existe classificação
const classificationExists = await this.checkClassificationExists(
    eventId, 
    dorsalNumber, 
    deviceOrder
);

if (classificationExists) {
    // ⚠️ Ignorar - não criar duplicado
    return;
}
```

### 3️⃣ **Constraint UNIQUE na Base de Dados**

```sql
ALTER TABLE classifications 
ADD CONSTRAINT classifications_event_dorsal_checkpoint_unique 
UNIQUE (event_id, dorsal_number, device_order);
```

**Garante a nível de base de dados** que não podem existir duplicados.

---

## 🔒 Chave Única

```
UNIQUE (event_id, dorsal_number, device_order)
```

**Significado:**
- Cada **evento** pode ter
- Cada **dorsal** uma vez por
- Cada **checkpoint** (device_order)

**Exemplos:**

| event_id | dorsal | checkpoint | Válido? |
|----------|--------|------------|---------|
| evento1 | 401 | 1 | ✅ Primeiro registro |
| evento1 | 401 | 1 | ❌ DUPLICADO |
| evento1 | 401 | 2 | ✅ Checkpoint diferente |
| evento1 | 407 | 1 | ✅ Dorsal diferente |
| evento2 | 401 | 1 | ✅ Evento diferente |

---

## 📊 Fluxo de Validação

```
┌─────────────────────────────────────────────┐
│ 1. Detecção: Dorsal 401, Checkpoint 1      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. VALIDAÇÃO 1: É participante?            │
│    Query: participants WHERE dorsal=401     │
└─────────────────────────────────────────────┘
            ↓ SIM          ↓ NÃO
            ✅             ❌ IGNORAR
            ↓
┌─────────────────────────────────────────────┐
│ 3. VALIDAÇÃO 2: Já tem classificação?      │
│    Query: classifications WHERE             │
│           event=X, dorsal=401, checkpoint=1 │
└─────────────────────────────────────────────┘
            ↓ NÃO          ↓ SIM
            ✅             ❌ IGNORAR (duplicado)
            ↓
┌─────────────────────────────────────────────┐
│ 4. CRIAR CLASSIFICAÇÃO                      │
│    INSERT INTO classifications              │
└─────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────┐
│ 5. CONSTRAINT UNIQUE valida                 │
│    Se passar validações mas houver race     │
│    condition, constraint bloqueia           │
└─────────────────────────────────────────────┘
```

---

## 🧹 Limpeza Executada

### SQL Executado

1. ✅ Removeu classificações de dorsais **não participantes** (183)
2. ✅ Removeu classificações **duplicadas** (manteve apenas a mais antiga)
3. ✅ Adicionou **CONSTRAINT UNIQUE** para prevenir futuros duplicados

### Resultado

```sql
-- ANTES
Dorsal 183: 4 classificações (não é participante) ❌
Dorsal 401: 3 classificações (duplicadas) ❌

-- DEPOIS
Dorsal 183: 0 classificações (removidas) ✅
Dorsal 401: 1 classificação (única) ✅
```

---

## 📋 Logs do Sistema

### Dorsal Válido (Primeira Vez)

```
✅ Dorsal 401 é participante válido - criando classificação
🔍 Verificando se classificação já existe...
✅ Classificação NÃO existe - criando nova
✅ Classificação criada: dorsal 401 no checkpoint 1
```

### Dorsal Válido (Duplicado)

```
✅ Dorsal 401 é participante válido - criando classificação
🔍 Verificando se classificação já existe...
⚠️ Classificação JÁ EXISTE para dorsal 401 no checkpoint 1 - IGNORANDO duplicado
```

### Dorsal Inválido

```
🔍 Verificando se dorsal 401 é participante...
⚠️ Dorsal 183 NÃO está registado nos participantes - IGNORANDO classificação
✅ Detecção salva (dorsal 183) mas classificação IGNORADA
```

---

## 🔄 Como Testar

### 1. Reiniciar Servidor

```bash
Ctrl+C
node server.js
```

### 2. Verificar Classificações

Aceder:
```
https://192.168.1.219:1144/classifications-kromi.html?event=a6301479-56c8-4269-a42d-aa8a7650a575
```

**Deve mostrar:**
- ✅ Cada dorsal aparece **1 vez** por checkpoint
- ✅ Apenas dorsais **401 e 407** (participantes)
- ❌ **NÃO** dorsal 183 (não participante)
- ❌ **NÃO** duplicados

### 3. Enviar Nova Detecção

App nativa envia dorsal 401:

**Primeira vez:**
- ✅ Cria detecção
- ✅ Cria classificação

**Segunda vez (mesmo checkpoint):**
- ✅ Cria detecção
- ❌ **NÃO** cria classificação (duplicado)

---

## 🛡️ Proteções Implementadas

| Nível | Proteção | Onde |
|-------|----------|------|
| **1** | Validação de participante | `background-processor.js` |
| **2** | Verificação de duplicado | `background-processor.js` |
| **3** | Constraint UNIQUE | Base de dados PostgreSQL |

**Tripla proteção!** Impossível criar duplicados.

---

## ⚙️ Configuração

### Permitir Múltiplas Passagens no Mesmo Checkpoint?

Se quiseres permitir (ex: corridas com voltas), há duas opções:

**Opção A**: Remover device_order da UNIQUE
```sql
-- Permite múltiplas classificações no mesmo checkpoint
ALTER TABLE classifications 
DROP CONSTRAINT classifications_event_dorsal_checkpoint_unique;

-- Criar nova UNIQUE sem device_order
ALTER TABLE classifications 
ADD CONSTRAINT classifications_event_dorsal_time_unique 
UNIQUE (event_id, dorsal_number, checkpoint_time);
```

**Opção B**: Usar sistema de voltas
- Já implementado em `sql/add-lap-counter-system.sql`
- Usa tabela separada `lap_data`
- Cada volta é registada separadamente

---

## 📊 Estatísticas

Executar para ver estado atual:

```sql
SELECT 
    event_id,
    dorsal_number,
    device_order,
    COUNT(*) as total_classificacoes
FROM classifications
GROUP BY event_id, dorsal_number, device_order
ORDER BY total_classificacoes DESC, dorsal_number;
```

**Resultado esperado:** Todas com `total_classificacoes = 1`

---

## ✅ Checklist de Validação

Após reiniciar servidor:

- [ ] Dorsais não participantes não criam classificações
- [ ] Dorsais duplicados no mesmo checkpoint são ignorados
- [ ] Cada dorsal aparece 1x por checkpoint nas classificações
- [ ] Logs mostram "IGNORANDO duplicado" quando apropriado
- [ ] Múltiplos checkpoints funcionam (401 no checkpoint 1 e 2)

---

## 📚 Arquivos Modificados

- ✅ `src/background-processor.js` - Validações adicionadas
- ✅ `sql/remove-invalid-classifications.sql` - Remover não participantes
- ✅ `sql/remove-duplicate-classifications.sql` - Remover duplicados + UNIQUE

---

## 🎯 Resumo

**ANTES:**
- ❌ Dorsais não participantes criavam classificações
- ❌ Duplicados permitidos no mesmo checkpoint
- ❌ Sem proteção na base de dados

**DEPOIS:**
- ✅ Apenas participantes registados
- ✅ Uma classificação por checkpoint
- ✅ Constraint UNIQUE na base de dados
- ✅ Validação no código + base de dados

**Impossível criar classificações inválidas ou duplicadas!** 🎉

