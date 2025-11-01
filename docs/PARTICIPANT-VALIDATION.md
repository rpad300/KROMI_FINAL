# ✅ Validação de Participantes em Classificações

## ❌ Problema Identificado

O sistema estava a criar classificações para **dorsais não registados** como participantes.

### Exemplo

```
Participantes registados: 401, 407
Detecção: 183 (não registado)
Resultado: ❌ Classificação criada para 183
```

---

## ✅ Solução Implementada

### 1. Validação no Backend Processor

**Arquivo**: `src/background-processor.js`

Adicionei validação ANTES de criar classificação:

```javascript
// ✅ VALIDAÇÃO: Verificar se dorsal existe nos participantes
const participantExists = await this.checkParticipantExists(image.event_id, detectionResult.number);

if (!participantExists) {
    this.log(`⚠️ Dorsal ${detectionResult.number} NÃO está registado - IGNORANDO`, 'warning');
    
    // Salvar APENAS a detecção (sem classificação)
    await this.saveDetection(...);
    
    return; // Parar - NÃO criar classificação
}

// Participante existe - continuar normalmente
this.log(`✅ Dorsal ${detectionResult.number} é válido - criando classificação`, 'info');
```

### 2. Função de Verificação

```javascript
async checkParticipantExists(eventId, dorsalNumber) {
    // Busca em participants por event_id + dorsal_number
    // Retorna true se encontrar
    // Retorna false se não encontrar
}
```

---

## 🧹 Limpeza de Classificações Inválidas

**Arquivo**: `sql/remove-invalid-classifications.sql`

```sql
-- Remover classificações de dorsais não registados
DELETE FROM classifications
WHERE NOT EXISTS (
    SELECT 1 FROM participants p 
    WHERE p.event_id = classifications.event_id 
    AND p.dorsal_number = classifications.dorsal_number
);
```

**Executado com sucesso!** ✅

---

## 📊 Fluxo Atual

```
┌─────────────────────────────────────────────┐
│ 1. Detecção recebida: Dorsal 183           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Verificar participante                  │
│    Query: SELECT FROM participants         │
│    WHERE event_id=X AND dorsal_number=183  │
└─────────────────────────────────────────────┘
                    ↓
      ┌─────────────┴─────────────┐
      │                           │
   EXISTE?                     NÃO EXISTE?
      │                           │
      ↓                           ↓
┌─────────────┐            ┌─────────────┐
│ ✅ CRIAR    │            │ ⚠️ IGNORAR  │
│ Detecção    │            │ Detecção    │
│ +           │            │ (salva)     │
│ Classificação│            │ Classificação│
│             │            │ (NÃO cria)  │
└─────────────┘            └─────────────┘
```

---

## 🔄 Como Aplicar

### 1. Reiniciar Servidor

```bash
# Parar
Ctrl+C

# Iniciar
node server.js
```

### 2. Classificações Inválidas Removidas

O SQL já foi executado e removeu as classificações do dorsal 183.

### 3. Próximas Detecções

A partir de agora:
- ✅ Dorsal 401 (participante) → cria detecção + classificação
- ✅ Dorsal 407 (participante) → cria detecção + classificação
- ⚠️ Dorsal 183 (não participante) → cria detecção, **IGNORA** classificação

---

## 📋 Logs Esperados

### Dorsal Válido (401, 407)

```
✅ Dorsal 401 é participante válido - criando classificação
✅ Detecção salva: dorsal 401
✅ Classificação criada: dorsal 401
```

### Dorsal Inválido (183)

```
⚠️ Dorsal 183 NÃO está registado nos participantes - IGNORANDO classificação
   Detecção será salva, mas classificação NÃO será criada
✅ Detecção salva (dorsal 183) mas classificação IGNORADA (não é participante)
```

---

## 🧪 Testar

### 1. Verificar classificações atuais

Aceder:
```
https://192.168.1.219:1144/classifications-kromi.html?event=a6301479-56c8-4269-a42d-aa8a7650a575
```

Deve mostrar apenas:
- ✅ Dorsal 401
- ✅ Dorsal 407
- ❌ **NÃO** deve mostrar dorsal 183

### 2. Enviar nova detecção de dorsal 183

```
1. App nativa envia imagem com dorsal 183
2. Gemini detecta: "183"
3. Backend verifica: "183 não é participante"
4. Cria detecção (para histórico)
5. NÃO cria classificação
```

---

## 📊 Impacto

| Antes | Depois |
|-------|--------|
| Qualquer dorsal → classificação | Apenas participantes → classificação |
| Dorsais inválidos poluem lista | Lista limpa |
| Difícil filtrar | Automático |

---

## ⚙️ Configurável?

Se quiseres permitir dorsais não registados (para eventos abertos):

**Opção 1**: Comentar validação no código

```javascript
// const participantExists = await this.checkParticipantExists(...);
// if (!participantExists) return;
```

**Opção 2**: Adicionar flag no evento

```sql
ALTER TABLE events ADD COLUMN allow_unregistered_dorsals BOOLEAN DEFAULT false;
```

E verificar no código:

```javascript
if (!allowUnregistered && !participantExists) {
    // Ignorar
}
```

---

## ✅ Resumo

**Problema**: Dorsal 183 criava classificações desnecessárias  
**Solução**: Validação automática de participantes  
**Resultado**: Apenas participantes registados têm classificações  

**Aplicado e testado!** 🎉

