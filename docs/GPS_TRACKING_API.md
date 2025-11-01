# VisionKrono - API de GPS Tracking

## Visão Geral

Módulo de cronometragem GPS em tempo real para eventos esportivos, usando QR individual por participante.

**Namespace:** `track_*`  
**Sem alterações em:** `eventos`, `participants`

---

## Endpoints / RPCs

### 1. Emitir QR Code

**Função:** `track_issue_qr`

**Descrição:** Emite ou reemite um QR code exclusivo para um participante em um evento. Se já existir um QR ativo, este será automaticamente revogado.

**Parâmetros:**
```sql
p_event_id UUID,
p_participant_id UUID,
p_notes TEXT DEFAULT NULL
```

**Request Example (via Supabase RPC):**
```javascript
const { data, error } = await supabase.rpc('track_issue_qr', {
  p_event_id: 'uuid-do-evento',
  p_participant_id: 'uuid-do-participante',
  p_notes: 'QR emitido no check-in'
});
```

**Response:**
```json
{
  "success": true,
  "qr_id": "uuid-do-qr",
  "qr_code": "VK-TRACK-abc123...",
  "revoked_previous": true,
  "old_qr_id": "uuid-do-qr-anterior"
}
```

**Permissões:** Admin, Staff, Organizador do evento

---

### 2. Validar QR Code

**Função:** `track_validate_qr`

**Descrição:** Valida um QR code e retorna informações do participante e evento associados.

**Parâmetros:**
```sql
p_qr_code VARCHAR(255)
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_validate_qr', {
  p_qr_code: 'VK-TRACK-abc123...'
});
```

**Response (válido):**
```json
{
  "valid": true,
  "qr_id": "uuid",
  "event_id": "uuid",
  "event_name": "Maratona Lisboa 2025",
  "event_date": "2025-11-15T09:00:00Z",
  "participant_id": "uuid",
  "participant_name": "João Silva",
  "bib_number": "1234",
  "issued_at": "2025-11-01T10:00:00Z"
}
```

**Response (inválido):**
```json
{
  "valid": false,
  "error": "QR code not found"
}
```

**Permissões:** Autenticado

---

### 3. Armar Atividade (Arm Activity)

**Função:** `track_arm_activity`

**Descrição:** Cria uma atividade de tracking no estado "armed" (armada), pronta para iniciar. Usado no controle de partida ao ler o QR do atleta.

**Parâmetros:**
```sql
p_qr_code VARCHAR(255),
p_route_id UUID,
p_notes TEXT DEFAULT NULL
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_arm_activity', {
  p_qr_code: 'VK-TRACK-abc123...',
  p_route_id: 'uuid-da-rota',
  p_notes: 'Largada wave 1'
});
```

**Response:**
```json
{
  "success": true,
  "activity_id": "uuid-da-atividade",
  "event_id": "uuid",
  "participant_id": "uuid",
  "route_id": "uuid",
  "status": "armed"
}
```

**Erros possíveis:**
- `QR code not found`
- `QR code is not active`
- `Route not found`
- `Route does not belong to the same event`
- `Participant already has an active activity` (se já houver armed/running/paused)

**Permissões:** Admin, Staff, Organizador do evento

---

### 4. Submeter Batch de Pontos GPS

**Função:** `track_submit_gps_batch`

**Descrição:** Recebe um lote de pontos GPS da aplicação móvel. No primeiro batch, muda automaticamente o status de "armed" para "running".

**Parâmetros:**
```sql
p_activity_id UUID,
p_points JSONB, -- Array de pontos
p_device_id VARCHAR(255) DEFAULT NULL
```

**Formato dos pontos:**
```json
[
  {
    "lat": 38.7223,
    "lng": -9.1393,
    "alt_m": 25.5,
    "speed_kmh": 12.5,
    "accuracy_m": 8.2,
    "bearing": 135.0,
    "device_ts": "2025-11-15T10:15:30Z"
  },
  {
    "lat": 38.7225,
    "lng": -9.1395,
    "alt_m": 26.0,
    "speed_kmh": 13.0,
    "accuracy_m": 7.5,
    "bearing": 138.0,
    "device_ts": "2025-11-15T10:15:35Z"
  }
]
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_submit_gps_batch', {
  p_activity_id: 'uuid-da-atividade',
  p_points: gpsPoints,
  p_device_id: 'ANDROID-device-id-123'
});
```

**Response:**
```json
{
  "success": true,
  "batch_id": "uuid-do-batch",
  "activity_id": "uuid",
  "points_inserted": 98,
  "points_rejected": 2,
  "first_batch": true,
  "activity_status": "running"
}
```

**Validações aplicadas:**
- Velocidade máxima (configurável por rota)
- Precisão GPS mínima
- Coordenadas válidas (-90/90 lat, -180/180 lng)
- Atividade deve estar em status compatível (armed, running, paused)

**Permissões:** Participante dono da atividade

---

### 5. Pausar Atividade

**Função:** `track_pause_activity`

**Parâmetros:**
```sql
p_activity_id UUID
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_pause_activity', {
  p_activity_id: 'uuid-da-atividade'
});
```

**Response:**
```json
{
  "success": true,
  "status": "paused"
}
```

**Permissões:** Participante dono da atividade

---

### 6. Retomar Atividade

**Função:** `track_resume_activity`

**Parâmetros:**
```sql
p_activity_id UUID
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_resume_activity', {
  p_activity_id: 'uuid-da-atividade'
});
```

**Response:**
```json
{
  "success": true,
  "status": "running"
}
```

**Permissões:** Participante dono da atividade

---

### 7. Finalizar Atividade

**Função:** `track_finish_activity`

**Descrição:** Encerra uma atividade, calcula métricas finais (tempo, distância, velocidade média, etc.) e gera polyline simplificada.

**Parâmetros:**
```sql
p_activity_id UUID,
p_force BOOLEAN DEFAULT false
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_finish_activity', {
  p_activity_id: 'uuid-da-atividade',
  p_force: false
});
```

**Response:**
```json
{
  "success": true,
  "activity_id": "uuid",
  "status": "finished",
  "total_points": 2500,
  "valid_points": 2450,
  "avg_accuracy_m": 12.5,
  "max_speed_kmh": 18.3
}
```

**Permissões:** Participante dono da atividade, Admin, Staff, Organizador

---

### 8. Descartar Atividade

**Função:** `track_discard_activity`

**Descrição:** Marca uma atividade como descartada (não aparecerá em rankings).

**Parâmetros:**
```sql
p_activity_id UUID,
p_reason TEXT DEFAULT NULL
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_discard_activity', {
  p_activity_id: 'uuid-da-atividade',
  p_reason: 'Problema técnico no GPS'
});
```

**Response:**
```json
{
  "success": true,
  "status": "discarded"
}
```

**Permissões:** Participante dono da atividade, Admin, Staff, Organizador

---

### 9. Obter Posições Live

**Função:** `track_get_live_positions`

**Descrição:** Retorna as posições atuais de todos os atletas que estão ativos (running/paused) em um evento ou rota.

**Parâmetros:**
```sql
p_event_id UUID,
p_route_id UUID DEFAULT NULL
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_get_live_positions', {
  p_event_id: 'uuid-do-evento',
  p_route_id: 'uuid-da-rota' // opcional
});
```

**Response:**
```json
[
  {
    "activity_id": "uuid",
    "participant_id": "uuid",
    "participant_name": "João Silva",
    "bib_number": "1234",
    "route_id": "uuid",
    "route_name": "10K",
    "status": "running",
    "lat": 38.7223,
    "lng": -9.1393,
    "speed_kmh": 12.5,
    "last_update": "2025-11-15T10:15:30Z",
    "elapsed_sec": 3600
  }
]
```

**Permissões:** Admin, Staff, Organizador do evento, Público (se evento permitir)

**Uso:** Ideal para mapa live no dashboard. Combinar com Supabase Realtime para updates automáticos.

---

### 10. Obter Rankings

**Função:** `track_get_rankings`

**Descrição:** Retorna classificação de atividades finalizadas, ordenadas por tempo.

**Parâmetros:**
```sql
p_event_id UUID,
p_route_id UUID DEFAULT NULL,
p_limit INTEGER DEFAULT 100
```

**Request Example:**
```javascript
const { data, error } = await supabase.rpc('track_get_rankings', {
  p_event_id: 'uuid-do-evento',
  p_route_id: 'uuid-da-rota',
  p_limit: 50
});
```

**Response:**
```json
[
  {
    "rank": 1,
    "activity_id": "uuid",
    "participant_id": "uuid",
    "participant_name": "Maria Santos",
    "bib_number": "567",
    "route_name": "21K",
    "total_time_sec": 6540,
    "formatted_time": "01:49:00",
    "avg_speed_kmh": 11.6,
    "avg_pace_min_km": 5.17,
    "total_distance_m": 21100.0,
    "finished_at": "2025-11-15T11:49:00Z"
  }
]
```

**Permissões:** Admin, Staff, Organizador, Público (atividades finished de eventos públicos)

---

## Tabelas de Leitura Direta (via Supabase)

Além dos RPCs, você pode ler diretamente das tabelas (respeitando RLS):

### Rotas do Evento
```javascript
const { data, error } = await supabase
  .from('track_routes')
  .select('*')
  .eq('event_id', eventId)
  .eq('is_active', true);
```

### QR Codes Ativos
```javascript
const { data, error } = await supabase
  .from('track_participant_qr')
  .select('*, participants(*), eventos(*)')
  .eq('event_id', eventId)
  .eq('status', 'active');
```

### Atividades do Evento
```javascript
const { data, error } = await supabase
  .from('track_activities')
  .select(`
    *,
    participants(*),
    track_routes(*),
    eventos(*)
  `)
  .eq('event_id', eventId)
  .order('created_at', { ascending: false });
```

### Views Auxiliares

#### v_track_activities_summary
Resumo legível de atividades com joins já feitos:
```javascript
const { data, error } = await supabase
  .from('v_track_activities_summary')
  .select('*')
  .eq('event_name', 'Maratona Lisboa 2025');
```

#### v_track_active_qrs
QR codes ativos com informações completas:
```javascript
const { data, error } = await supabase
  .from('v_track_active_qrs')
  .select('*')
  .eq('event_name', 'Maratona Lisboa 2025');
```

#### v_track_route_stats
Estatísticas agregadas por rota:
```javascript
const { data, error } = await supabase
  .from('v_track_route_stats')
  .select('*')
  .eq('event_id', eventId);
```

---

## Realtime (Supabase Subscriptions)

### Live Tracking (pontos GPS)

```javascript
const channel = supabase
  .channel('gps-live')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'track_gps_live',
      filter: `participant_id=eq.${participantId}`
    },
    (payload) => {
      console.log('Novo ponto GPS:', payload.new);
      // Atualizar mapa
    }
  )
  .subscribe();
```

### Status de Atividades

```javascript
const channel = supabase
  .channel('activities-status')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'track_activities',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      console.log('Atividade atualizada:', payload.new);
      // Atualizar UI
    }
  )
  .subscribe();
```

---

## Fluxo Completo (End-to-End)

### 1. Preparação (Backoffice)

```javascript
// 1.1. Criar rota
const { data: route } = await supabase
  .from('track_routes')
  .insert({
    event_id: eventId,
    name: '10K',
    distance_km: 10.0,
    is_active: true
  })
  .select()
  .single();

// 1.2. Emitir QR para participante
const { data: qr } = await supabase.rpc('track_issue_qr', {
  p_event_id: eventId,
  p_participant_id: participantId,
  p_notes: 'QR emitido no check-in'
});

console.log('QR Code:', qr.qr_code);
```

### 2. Controle de Partida (Backoffice)

```javascript
// 2.1. Validar QR (scan do QR)
const { data: validation } = await supabase.rpc('track_validate_qr', {
  p_qr_code: scannedQRCode
});

if (!validation.valid) {
  alert('QR inválido!');
  return;
}

// 2.2. Armar atividade
const { data: activity } = await supabase.rpc('track_arm_activity', {
  p_qr_code: scannedQRCode,
  p_route_id: selectedRouteId
});

console.log('Atividade armada:', activity.activity_id);
```

### 3. App Móvel (Tracking)

```javascript
// 3.1. Iniciar tracking (app obtém activity_id armado)
let gpsBuffer = [];

// 3.2. Coletar pontos GPS
navigator.geolocation.watchPosition(
  (position) => {
    gpsBuffer.push({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      alt_m: position.coords.altitude,
      speed_kmh: position.coords.speed * 3.6, // m/s para km/h
      accuracy_m: position.coords.accuracy,
      bearing: position.coords.heading,
      device_ts: new Date(position.timestamp).toISOString()
    });
    
    // Enviar batch a cada 10 pontos ou 30 segundos
    if (gpsBuffer.length >= 10) {
      sendBatch();
    }
  },
  (error) => console.error(error),
  { enableHighAccuracy: true, distanceFilter: 10 }
);

// 3.3. Enviar batch
async function sendBatch() {
  if (gpsBuffer.length === 0) return;
  
  const { data, error } = await supabase.rpc('track_submit_gps_batch', {
    p_activity_id: activityId,
    p_points: gpsBuffer,
    p_device_id: getDeviceId()
  });
  
  if (!error) {
    console.log(`Batch enviado: ${data.points_inserted} pontos`);
    gpsBuffer = [];
  }
}

// 3.4. Finalizar
async function finish() {
  await sendBatch(); // Enviar últimos pontos
  
  const { data } = await supabase.rpc('track_finish_activity', {
    p_activity_id: activityId
  });
  
  console.log('Atividade finalizada:', data);
}
```

### 4. Dashboard Live (Backoffice)

```javascript
// 4.1. Carregar posições iniciais
const { data: positions } = await supabase.rpc('track_get_live_positions', {
  p_event_id: eventId
});

renderMap(positions);

// 4.2. Subscrever a updates em tempo real
const channel = supabase
  .channel('live-tracking')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'track_gps_live'
    },
    (payload) => {
      updateAthletePosition(payload.new);
    }
  )
  .subscribe();
```

### 5. Rankings (Público/Backoffice)

```javascript
const { data: rankings } = await supabase.rpc('track_get_rankings', {
  p_event_id: eventId,
  p_route_id: routeId,
  p_limit: 100
});

renderRankingsTable(rankings);
```

---

## Segurança e Limites

### Rate Limiting
- Implementar no nível da aplicação (Supabase Edge Functions ou middleware)
- Sugestão: 1 batch por segundo por device_session

### Validações GPS
- Velocidade máxima: configurável por rota (padrão 25-50 km/h)
- Precisão mínima: configurável (padrão 30-50m)
- Coordenadas dentro dos limites geográficos válidos

### Auditoria
Todas as operações críticas são registradas em `track_audit_log`:
- Emissão/revogação de QR
- Armamento de atividade
- Início/pausa/finalização/descarte

---

## Métricas e Monitoramento

### KPIs Principais
- Taxa de conclusão: `finished / armed`
- Qualidade GPS: `valid_points / total_points`
- Latência: tempo entre `device_ts` e `server_ts`
- Taxa de rejeição por validação

### Queries de Monitoramento
Ver arquivo: `sql/track_module_queries.sql`

---

## Troubleshooting

### Problema: Participante não consegue enviar pontos GPS

**Diagnóstico:**
```javascript
// Verificar status da atividade
const { data } = await supabase
  .from('track_activities')
  .select('status')
  .eq('id', activityId)
  .single();

console.log('Status:', data.status);
// Deve estar 'armed', 'running' ou 'paused'
```

**Solução:** Se status for 'pending' ou 'finished', a atividade não aceita pontos.

---

### Problema: QR não valida

**Diagnóstico:**
```sql
SELECT qr_code, status, revoked_at 
FROM track_participant_qr 
WHERE qr_code = 'VK-TRACK-...';
```

**Solução:** Se `status = 'revoked'`, reemitir novo QR.

---

### Problema: Muitos pontos sendo rejeitados

**Diagnóstico:**
```sql
SELECT 
  validation_flags,
  COUNT(*) 
FROM track_gps_live 
WHERE activity_id = 'uuid' 
  AND NOT is_valid
GROUP BY validation_flags;
```

**Solução:** Ajustar `max_speed_kmh` ou `max_accuracy_m` na rota.

---

## Próximos Passos

1. ✅ Schema criado
2. ✅ RLS configurado
3. ✅ Funções implementadas
4. ⏳ UI de backoffice
5. ⏳ App móvel
6. ⏳ Testes end-to-end

---

## Referências

- [Supabase RPC](https://supabase.com/docs/guides/database/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [PostGIS (opcional)](https://postgis.net/) para queries geoespaciais avançadas

