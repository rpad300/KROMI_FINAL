

# 📱 VisionKrono GPS Tracking - API para App Móvel

## Modelo de Comunicação: **INBOX PATTERN**

A app móvel **nunca escreve diretamente** nas tabelas finais. Toda comunicação segue:

```
App → INBOX (track_inbox_messages) → Backend Processor → Tabelas Finais
```

---

## 🔄 Fluxo Completo

### 1. Iniciar App

```javascript
// 1.1. Validar dispositivo (se usar registry)
const { data: device } = await supabase
  .from('track_device_registry')
  .select('*')
  .eq('device_id', deviceId)
  .eq('is_active', true)
  .single();

if (!device) {
  // Registar dispositivo (fazer no backend)
}
```

### 2. Ler QR Code

```javascript
// 2.1. Scan QR
const qrCode = await scanQR(); // Ex: "VK-TRACK-abc123..."

// 2.2. Validar QR via RPC
const { data, error } = await supabase.rpc('track_get_participant_by_qr', {
  p_qr_code: qrCode,
  p_device_pin: null // ou PIN se configurado
});

if (!data.valid) {
  alert('QR inválido: ' + data.error);
  return;
}

// 2.3. Guardar contexto
const context = {
  eventId: data.event.id,
  eventName: data.event.name,
  participantId: data.participant.id,
  participantName: data.participant.name,
  dorsal: data.participant.dorsal,
  qrCode: qrCode
};
```

### 3. Listar Rotas do Evento

```javascript
// 3.1. Buscar rotas ativas
const { data: routes } = await supabase
  .from('track_routes')
  .select('id, name, distance_km, gpx_url')
  .eq('event_id', context.eventId)
  .eq('is_active', true);

// 3.2. Usuário seleciona rota
const selectedRoute = routes[0];
```

### 4. Criar Atividade (Backend cria, app consulta)

A atividade pode ser criada de 2 formas:

#### Opção A: Staff arma no backoffice (recomendado)
- Staff faz scan do QR no controle de partida
- Backoffice chama `track_arm_activity()` 
- App consulta atividades `armed` para este QR

```javascript
// App: Verificar se há atividade armada
const { data: activities } = await supabase
  .from('track_activities')
  .select('id, status, route_id')
  .eq('participant_id', context.participantId)
  .eq('event_id', context.eventId)
  .in('status', ['armed', 'running', 'paused'])
  .order('created_at', { ascending: false })
  .limit(1);

if (activities && activities.length > 0) {
  activityId = activities[0].id;
} else {
  alert('Aguarde: staff ainda não armou sua atividade');
}
```

#### Opção B: App cria via mensagem
- App envia `activity_event` tipo `create`
- Backend processa e cria atividade

```javascript
// Enviar mensagem para criar atividade
await supabase.rpc('track_submit_message', {
  p_message_type: 'activity_event',
  p_dedupe_id: uuidv4(),
  p_device_id: deviceId,
  p_app_version: '1.0.0',
  p_qr_code: qrCode,
  p_payload: {
    type: 'create',
    route_id: selectedRoute.id,
    device_ts: new Date().toISOString()
  }
});

// Aguardar processamento (polling ou realtime)
```

### 5. Iniciar Tracking GPS

```javascript
let gpsBuffer = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 30000; // 30 segundos

// 5.1. Iniciar GPS
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    const point = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      alt_m: position.coords.altitude || 0,
      speed_kmh: (position.coords.speed || 0) * 3.6, // m/s para km/h
      accuracy_m: position.coords.accuracy,
      bearing: position.coords.heading || 0,
      device_ts: new Date(position.timestamp).toISOString()
    };
    
    gpsBuffer.push(point);
    
    // Enviar batch quando atingir tamanho ou tempo
    if (gpsBuffer.length >= BATCH_SIZE) {
      sendGPSBatch();
    }
  },
  (error) => console.error('GPS error:', error),
  {
    enableHighAccuracy: true,
    distanceFilter: 10, // metros
    interval: 5000 // 5 segundos
  }
);

// 5.2. Timer para enviar batch periodicamente
setInterval(() => {
  if (gpsBuffer.length > 0) {
    sendGPSBatch();
  }
}, BATCH_INTERVAL);
```

### 6. Enviar Batch GPS para Inbox

```javascript
async function sendGPSBatch() {
  if (gpsBuffer.length === 0) return;
  
  const batchToSend = [...gpsBuffer];
  gpsBuffer = []; // Limpar buffer
  
  try {
    const { data, error } = await supabase.rpc('track_submit_message', {
      p_message_type: 'gps_batch',
      p_dedupe_id: uuidv4(), // IMPORTANTE: UUID único por batch
      p_device_id: deviceId,
      p_app_version: '1.0.0',
      p_qr_code: context.qrCode,
      p_activity_id: activityId,
      p_payload: {
        points: batchToSend,
        device_ts: new Date().toISOString()
      },
      p_device_info: {
        os: Platform.OS,
        model: DeviceInfo.getModel(),
        brand: DeviceInfo.getBrand()
      }
    });
    
    if (error) throw error;
    
    if (data.duplicate) {
      console.log('Batch já recebido (idempotência OK)');
    } else {
      console.log('Batch enviado:', data.inbox_id);
    }
    
  } catch (error) {
    // IMPORTANTE: Guardar batch localmente para reenviar
    await saveToLocalStorage('failed_batches', batchToSend);
    console.error('Erro ao enviar batch:', error);
  }
}
```

### 7. Eventos de Atividade (Pause, Resume, Finish)

```javascript
// 7.1. Pausar
async function pauseActivity() {
  await supabase.rpc('track_submit_message', {
    p_message_type: 'activity_event',
    p_dedupe_id: uuidv4(),
    p_device_id: deviceId,
    p_app_version: '1.0.0',
    p_activity_id: activityId,
    p_payload: {
      type: 'pause',
      device_ts: new Date().toISOString()
    }
  });
  
  // Parar coleta de GPS
  navigator.geolocation.clearWatch(watchId);
}

// 7.2. Retomar
async function resumeActivity() {
  await supabase.rpc('track_submit_message', {
    p_message_type: 'activity_event',
    p_dedupe_id: uuidv4(),
    p_device_id: deviceId,
    p_app_version: '1.0.0',
    p_activity_id: activityId,
    p_payload: {
      type: 'resume',
      device_ts: new Date().toISOString()
    }
  });
  
  // Retomar GPS
  startGPSTracking();
}

// 7.3. Finalizar
async function finishActivity() {
  // Enviar últimos pontos
  if (gpsBuffer.length > 0) {
    await sendGPSBatch();
  }
  
  // Enviar evento de finish
  await supabase.rpc('track_submit_message', {
    p_message_type: 'activity_event',
    p_dedupe_id: uuidv4(),
    p_device_id: deviceId,
    p_app_version: '1.0.0',
    p_activity_id: activityId,
    p_payload: {
      type: 'finish',
      device_ts: new Date().toISOString()
    }
  });
  
  // Parar GPS
  navigator.geolocation.clearWatch(watchId);
  
  // Navegar para tela de resultado
  navigation.navigate('Result', { activityId });
}
```

### 8. Heartbeat (Opcional mas Recomendado)

```javascript
// Enviar heartbeat a cada 60 segundos
setInterval(async () => {
  await supabase.rpc('track_submit_message', {
    p_message_type: 'heartbeat',
    p_dedupe_id: uuidv4(),
    p_device_id: deviceId,
    p_app_version: '1.0.0',
    p_activity_id: activityId,
    p_payload: {
      device_ts: new Date().toISOString(),
      battery_level: await getBatteryLevel()
    }
  });
}, 60000);
```

### 9. Resiliência Offline

```javascript
// 9.1. Detectar quando fica offline
NetInfo.addEventListener(state => {
  if (!state.isConnected) {
    isOffline = true;
    console.log('Modo offline: dados serão salvos localmente');
  } else {
    isOffline = false;
    syncOfflineData(); // Enviar dados pendentes
  }
});

// 9.2. Sincronizar quando voltar online
async function syncOfflineData() {
  const failedBatches = await getFromLocalStorage('failed_batches');
  
  for (const batch of failedBatches) {
    try {
      await sendGPSBatch(batch);
      // Remover do storage local se enviado com sucesso
    } catch (error) {
      // Manter no storage
    }
  }
}
```

---

## 📋 Estrutura de Payloads

### GPS Batch

```json
{
  "points": [
    {
      "lat": 38.7223,
      "lng": -9.1393,
      "alt_m": 25.5,
      "speed_kmh": 12.5,
      "accuracy_m": 8.2,
      "bearing": 135.0,
      "device_ts": "2025-10-31T10:15:30.000Z"
    }
  ],
  "device_ts": "2025-10-31T10:15:35.000Z"
}
```

### Activity Event

```json
{
  "type": "start|pause|resume|finish|create",
  "device_ts": "2025-10-31T10:00:00.000Z",
  "route_id": "uuid" // apenas em create
}
```

### Heartbeat

```json
{
  "device_ts": "2025-10-31T10:16:00.000Z",
  "battery_level": 0.85,
  "gps_enabled": true,
  "location_permission": "always"
}
```

---

## 🔒 Segurança

### RLS Policies (já criadas no SQL)

```sql
-- App pode ler seu próprio contexto
SELECT * FROM v_track_participant_qr_context WHERE qr_code = 'meu-qr';

-- App pode escrever na inbox
INSERT INTO track_inbox_messages (...);

-- App NÃO pode:
-- - Ler track_inbox_messages de outros
-- - Escrever em track_activities
-- - Escrever em track_gps_live
-- - Modificar track_participant_access
```

### Autenticação

#### Opção 1: Supabase Auth (Recomendado)
```javascript
// Login como participante
const { user } = await supabase.auth.signIn({
  email: participant.email,
  password: participant.password
});
```

#### Opção 2: Device Token
```javascript
// Registar dispositivo e obter token
const { token } = await registerDevice(deviceId);

// Usar em headers
supabase.headers['X-Device-Token'] = token;
```

---

## 📊 Monitoramento

### Ver Status do Processamento

```javascript
// Verificar se mensagem foi processada
const { data: message } = await supabase
  .from('track_inbox_messages')
  .select('processed_status, processed_reason')
  .eq('dedupe_id', myDedupeId)
  .single();

if (message.processed_status === 'failed') {
  console.error('Falhou:', message.processed_reason);
}
```

### Subscrever a Updates de Atividade

```javascript
// Realtime: acompanhar mudanças na atividade
const subscription = supabase
  .channel('activity-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'track_activities',
      filter: `id=eq.${activityId}`
    },
    (payload) => {
      console.log('Atividade atualizada:', payload.new.status);
      // Atualizar UI
    }
  )
  .subscribe();
```

---

## 🎯 Checklist de Implementação

### Fase 1: Configuração
- [ ] Configurar Supabase client
- [ ] Obter credenciais (URL, anon key)
- [ ] Implementar geração de UUID (dedupe_id)

### Fase 2: QR e Validação
- [ ] Implementar leitor de QR
- [ ] Chamar `track_get_participant_by_qr()`
- [ ] Tratar erros de validação
- [ ] Guardar contexto localmente

### Fase 3: GPS
- [ ] Pedir permissões de localização
- [ ] Implementar `watchPosition`
- [ ] Buffer de pontos GPS
- [ ] Enviar batches via `track_submit_message()`

### Fase 4: Controles
- [ ] Botão Iniciar (enviar event `start`)
- [ ] Botão Pausar/Retomar
- [ ] Botão Finalizar
- [ ] UI de feedback

### Fase 5: Resiliência
- [ ] Detectar modo offline
- [ ] Guardar batches localmente
- [ ] Sincronizar quando voltar online
- [ ] Garantir dedupe_id único

### Fase 6: Otimizações
- [ ] Compressão de payloads (se necessário)
- [ ] Reduzir frequência GPS em baixa velocidade
- [ ] Gestão de bateria
- [ ] Logs locais para debug

---

## ⚠️ Boas Práticas

### 1. **SEMPRE usar dedupe_id único**
```javascript
import { v4 as uuidv4 } from 'uuid';
const dedupeId = uuidv4(); // Gerar novo para cada mensagem
```

### 2. **Validar dados antes de enviar**
```javascript
if (!point.lat || !point.lng) {
  console.warn('Ponto GPS inválido, ignorando');
  return;
}
```

### 3. **Tratar erros de rede**
```javascript
try {
  await sendMessage();
} catch (error) {
  if (error.code === 'PGRST116') {
    // Duplicado (OK - idempotência)
  } else {
    // Guardar para retry
    saveForRetry(message);
  }
}
```

### 4. **Limitar tamanho de batches**
```javascript
const MAX_BATCH_SIZE = 50; // Não enviar batches gigantes
if (gpsBuffer.length > MAX_BATCH_SIZE) {
  await sendGPSBatch(gpsBuffer.splice(0, MAX_BATCH_SIZE));
}
```

### 5. **Feedback visual ao usuário**
```javascript
// Mostrar contador de pontos enviados
setStatusText(`${totalPointsSent} pontos enviados`);

// Indicador de conectividade
setIsOnline(netInfo.isConnected);
```

---

## 🚀 Exemplo Completo (React Native)

Ver ficheiro separado: `MOBILE_APP_EXAMPLE_REACT_NATIVE.js`

---

## 📞 Troubleshooting

### Problema: Batches não aparecem no sistema

**Diagnóstico:**
```sql
-- Ver se chegaram à inbox
SELECT * FROM track_inbox_messages 
WHERE device_id = 'MEU_DEVICE_ID' 
ORDER BY received_at DESC;

-- Ver se foram processados
SELECT processed_status, processed_reason 
FROM track_inbox_messages 
WHERE dedupe_id = 'MEU_DEDUPE_ID';
```

**Solução:** Verificar `processed_reason` para ver o erro.

---

### Problema: "QR code not found"

**Causa:** QR não foi emitido ou foi revogado  
**Solução:** Backoffice → Emitir novo QR

---

### Problema: "No active activity"

**Causa:** Atividade não foi armada pelo staff  
**Solução:** Staff precisa fazer scan do QR e armar atividade

---

## 📚 Referências

- Supabase RPC: https://supabase.com/docs/guides/database/functions
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- UUID v4: https://www.npmjs.com/package/uuid

---

**Versão:** 1.0.0  
**Data:** Outubro 2025  
**VisionKrono GPS Tracking**

