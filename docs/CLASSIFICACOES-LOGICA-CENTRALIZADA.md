# Lógica de Classificações Centralizada

## Arquivos criados

### `src/classification-logic.js`
Módulo que centraliza TODA a lógica de cálculo de tempos para classificações.

**Função principal:** `calculateClassificationTimes(params)`

## Integração no background-processor.js

### 1. Adicionar require no topo
```javascript
const ClassificationLogic = require('./classification-logic');
```

### 2. Inicializar no construtor
```javascript
this.classificationLogic = new ClassificationLogic(this.supabaseUrl, this.supabaseKey);
```

### 3. Usar em vez do código antigo

**ANTES:**
```javascript
const deviceInfo = await this.getDeviceInfo(image.device_id, image.event_id);
const checkpointOrder = deviceInfo?.checkpoint_order || 1;
const checkpointType = deviceInfo?.checkpoint_type || 'finish';

const isFinish = await this.isFinishCheckpoint(checkpointType);
const isLast = await this.isLastCheckpoint(image.event_id, checkpointOrder);

let totalTime = null;
let splitTime = null;

if (isFinish && isLast) {
    // cálculos...
}

await this.saveClassification({
    event_id: image.event_id,
    dorsal_number: number,
    device_order: checkpointOrder,
    checkpoint_time: image.captured_at,
    detection_id: savedDetection.id,
    total_time: totalTime,
    split_time: splitTime
});
```

**DEPOIS:**
```javascript
const deviceInfo = await this.getDeviceInfo(image.device_id, image.event_id);
const checkpointOrder = deviceInfo?.checkpoint_order || 1;

// CALCULAR TEMPOS COM MÓDULO CENTRALIZADO
const times = await this.classificationLogic.calculateClassificationTimes({
    eventId: image.event_id,
    dorsalNumber: number,
    deviceOrder: checkpointOrder,
    checkpointTime: image.captured_at
});

await this.saveClassification({
    event_id: image.event_id,
    dorsal_number: number,
    device_order: checkpointOrder,
    checkpoint_time: image.captured_at,
    detection_id: savedDetection.id,
    total_time: times.total_time,
    split_time: times.split_time
});
```

## Lógica implementada

### Eventos simples (running)
- Checkpoint finish (único) → `total_time` ✅

### Triatlo (3 metas)
- `swimming_finish` (checkpoint 1) → `split_time` (tempo natação)
- `cycling_finish` (checkpoint 2) → `split_time` (tempo ciclismo)
- `running_finish` (checkpoint 3, último) → `total_time` (tempo total) ✅

### Duatlo (3 metas)
- `running_finish` (checkpoint 1) → `split_time` (tempo corrida 1)
- `cycling_finish` (checkpoint 2) → `split_time` (tempo ciclismo)
- `running_finish` (checkpoint 3, último) → `total_time` (tempo total) ✅

### Eventos com voltas
- `lap_counter` → `split_time` (tempo de cada volta)
- `finish` (último) → `total_time` (tempo total) ✅

## Vantagens

1. **Centralizado:** Toda lógica num só arquivo
2. **Sem triggers:** Não depende de SQL
3. **Manutenível:** Fácil de modificar
4. **Testável:** Pode testar isoladamente
5. **Documentado:** Lógica clara e explicada

## Para modificar a lógica

Edite apenas `src/classification-logic.js` na função `calculateClassificationTimes()`.

O código já está preparado, falta apenas substituir as chamadas antigas no `background-processor.js`.

