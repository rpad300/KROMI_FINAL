# 📱 Módulo GPS Tracking - Modelo INBOX para App Móvel

## ✅ O Que Foi Criado

### 3 Novos Ficheiros SQL:

1. **`sql/track_module_mobile_inbox.sql`** - Tabelas para comunicação com app
   - `track_participant_access` - QR mapping (app LEIA)
   - `track_inbox_messages` - Inbox principal (app ESCREVA)
   - `track_device_registry` - Registro de dispositivos
   - `track_ingest_errors` - Log de erros
   - View `v_track_participant_qr_context` - Contexto completo do QR
   - RPC `track_get_participant_by_qr()` - Validar QR
   - RPC `track_submit_message()` - Submeter para inbox

2. **`sql/track_module_inbox_processor.sql`** - Processador backend
   - `track_process_inbox_messages()` - Processar mensagens pendentes
   - `track_process_gps_batch()` - Processar pontos GPS
   - `track_process_activity_event()` - Processar eventos
   - `track_cleanup_old_messages()` - Limpeza
   - `track_inbox_stats()` - Estatísticas

3. **`docs/GPS_TRACKING_MOBILE_APP_API.md`** - Documentação completa para developers

---

## 🎯 Modelo INBOX Pattern

### Por que Inbox?

❌ **Modelo Antigo (direto):**
```
App → track_gps_live (ESCRITA DIRETA)
```
Problemas:
- App precisa conhecer schema complexo
- Validações na app (inseguro)
- Difícil auditar/debugar
- Sem retry automático

✅ **Modelo Novo (inbox):**
```
App → track_inbox_messages → Processor → track_gps_live
```
Vantagens:
- ✅ App escreve JSON simples
- ✅ Backend valida tudo
- ✅ Idempotência garantida (dedupe_id)
- ✅ Retry automático
- ✅ Auditoria completa
- ✅ Desacoplamento total

---

## 📋 Tabelas

### App LEIA (Read-Only)

| Tabela | Finalidade |
|--------|------------|
| `track_participant_access` | Mapear QR → Participante + Evento |
| `track_routes` | Listar rotas do evento |
| `v_track_participant_qr_context` | View com contexto completo |

### App ESCREVA (Write-Only)

| Tabela | Finalidade |
|--------|------------|
| `track_inbox_messages` | **ÚNICO** ponto de escrita da app |

### Backend Processa

| Tabela | Origem | Destino |
|--------|--------|---------|
| Processador | `track_inbox_messages` | `track_activities`, `track_gps_live` |

---

## 🚀 Instalação

### 1. Executar SQL (por ordem)

```sql
-- ANTES: Se ainda não executou o módulo base
\i sql/track_module_schema.sql
\i sql/track_module_rls.sql
\i sql/track_module_functions.sql

-- NOVO: Tabelas para app móvel
\i sql/track_module_mobile_inbox.sql
\i sql/track_module_inbox_processor.sql
```

### 2. Migrar QRs Existentes (se já criou anteriormente)

```sql
SELECT track_migrate_existing_qrs();
-- Retorna: {"success": true, "migrated": N}
```

### 3. Configurar Scheduler para Processar Inbox

#### Opção A: Supabase (pg_cron)

```sql
-- Executar a cada 10 segundos
SELECT cron.schedule(
    'process-gps-inbox',
    '*/10 * * * * *',
    'SELECT track_process_inbox_messages(100);'
);
```

#### Opção B: External Cron (Linux)

```bash
# Adicionar ao crontab
*/1 * * * * psql $DATABASE_URL -c "SELECT track_process_inbox_messages(100);"
```

#### Opção C: Supabase Edge Function (Serverless)

```javascript
// functions/process-inbox/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Atenção: service role!
  );
  
  const { data, error } = await supabase.rpc('track_process_inbox_messages', {
    p_limit: 100
  });
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Invocar a cada 30 segundos via webhook/cron
```

### 4. (Opcional) Cleanup Automático

```sql
-- Limpar mensagens processadas >30 dias (executar semanalmente)
SELECT cron.schedule(
    'cleanup-old-inbox',
    '0 2 * * 0',  -- Domingos às 2h
    'SELECT track_cleanup_old_messages(30);'
);
```

---

## 📱 Como a App Usa

### Leitura (GET)

```javascript
// 1. Validar QR
const { data } = await supabase.rpc('track_get_participant_by_qr', {
  p_qr_code: 'VK-TRACK-abc123',
  p_device_pin: null
});

// 2. Listar rotas
const { data: routes } = await supabase
  .from('track_routes')
  .select('*')
  .eq('event_id', eventId)
  .eq('is_active', true);
```

### Escrita (POST)

```javascript
// Enviar TUDO para inbox via RPC
await supabase.rpc('track_submit_message', {
  p_message_type: 'gps_batch',  // ou 'activity_event', 'heartbeat'
  p_dedupe_id: uuidv4(),         // UUID ÚNICO por mensagem
  p_device_id: 'device-123',
  p_app_version: '1.0.0',
  p_qr_code: 'VK-TRACK-abc123',
  p_activity_id: 'activity-uuid',  // se já tiver
  p_payload: {
    points: [
      { lat: 38.7, lng: -9.1, device_ts: '2025-10-31T10:00:00Z', ... }
    ]
  }
});
```

**Ver documentação completa:** `docs/GPS_TRACKING_MOBILE_APP_API.md`

---

## 🔄 Fluxo Completo

```
┌─────────────┐
│  App Móvel  │
└──────┬──────┘
       │ 1. Scan QR
       ▼
┌─────────────────────────────────┐
│ track_get_participant_by_qr()  │ (RPC)
│ Retorna: event, participant     │
└──────┬──────────────────────────┘
       │ 2. Iniciar GPS
       ▼
┌─────────────┐
│  GPS Watch  │
│  Position   │
└──────┬──────┘
       │ 3. Buffer pontos
       ▼
┌──────────────────────────┐
│ track_submit_message()   │ (RPC)
│ Insere em inbox          │
└──────┬───────────────────┘
       │
       ▼
┌───────────────────────────┐
│ track_inbox_messages      │ (Tabela)
│ Status: pending           │
└──────┬────────────────────┘
       │ 4. Scheduler (a cada 10s)
       ▼
┌─────────────────────────────────┐
│ track_process_inbox_messages()  │ (Processor)
│ • Valida payload                │
│ • Aplica regras de negócio      │
│ • Insere em track_gps_live      │
│ • Atualiza track_activities     │
│ • Marca como 'success'          │
└──────┬──────────────────────────┘
       │
       ▼
┌────────────────────┐
│ track_gps_live     │ (Tabela Final)
│ Pontos validados   │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│ Dashboard / UI     │
│ Mapa Live          │
└────────────────────┘
```

---

## 🎯 Tipos de Mensagens

### 1. GPS Batch

```json
{
  "message_type": "gps_batch",
  "payload": {
    "points": [
      {
        "lat": 38.7223,
        "lng": -9.1393,
        "alt_m": 25.5,
        "speed_kmh": 12.5,
        "accuracy_m": 8.2,
        "bearing": 135.0,
        "device_ts": "2025-10-31T10:15:30Z"
      }
    ]
  }
}
```

### 2. Activity Event

```json
{
  "message_type": "activity_event",
  "payload": {
    "type": "start",  // start, pause, resume, finish
    "device_ts": "2025-10-31T10:00:00Z"
  }
}
```

### 3. Heartbeat

```json
{
  "message_type": "heartbeat",
  "payload": {
    "device_ts": "2025-10-31T10:16:00Z",
    "battery_level": 0.85
  }
}
```

---

## 📊 Monitoramento

### Ver Estatísticas da Inbox

```sql
SELECT * FROM track_inbox_stats();
```

Retorna:
```
metric             | value
-------------------+-------
total_messages     | 1523
pending            | 12
success            | 1498
failed             | 13
gps_batches        | 1200
activity_events    | 280
heartbeats         | 43
last_hour          | 145
errors_total       | 13
```

### Ver Mensagens Pendentes

```sql
SELECT 
  id, 
  message_type, 
  device_id, 
  received_at,
  processed_status
FROM track_inbox_messages
WHERE processed_status IS NULL OR processed_status = 'pending'
ORDER BY received_at ASC;
```

### Ver Erros

```sql
SELECT 
  e.error_code,
  e.error_detail,
  i.message_type,
  i.device_id,
  e.created_at
FROM track_ingest_errors e
JOIN track_inbox_messages i ON i.id = e.inbox_id
ORDER BY e.created_at DESC
LIMIT 20;
```

### Reprocessar Falhados

```sql
SELECT track_retry_failed_messages(
  p_max_retries := 3,
  p_limit := 50
);
```

---

## ⚙️ Configurações Recomendadas

### Performance

```sql
-- Intervalo de processamento
PROCESSING_INTERVAL = 10 segundos

-- Batch size por processamento
BATCH_SIZE = 100 mensagens

-- Cleanup de mensagens antigas
RETENTION_DAYS = 30 dias
```

### Rate Limiting (App)

```javascript
// Na app móvel
MAX_BATCH_SIZE = 50 pontos
MIN_BATCH_INTERVAL = 30 segundos
MAX_RETRIES = 3
RETRY_BACKOFF = [5s, 30s, 120s]
```

---

## 🔐 Segurança

### RLS Configurado

- ✅ App pode **ler** `track_participant_access` (próprio QR)
- ✅ App pode **ler** `track_routes` (evento público/próprio)
- ✅ App pode **inserir** `track_inbox_messages`
- ❌ App **não pode** ler/alterar inbox de outros
- ❌ App **não pode** escrever em `track_gps_live` diretamente

### Validações Backend

- ✅ QR ativo e válido
- ✅ Atividade existe e pertence ao participante
- ✅ Coordenadas válidas (-90/90, -180/180)
- ✅ Velocidade dentro dos limites
- ✅ Precisão GPS aceitável
- ✅ Timestamps realistas

---

## 📋 Checklist de Deploy

- [ ] Executar `sql/track_module_mobile_inbox.sql`
- [ ] Executar `sql/track_module_inbox_processor.sql`
- [ ] Migrar QRs existentes (se aplicável)
- [ ] Configurar scheduler (pg_cron ou external)
- [ ] Testar envio de mensagem via app
- [ ] Verificar processamento (inbox_stats)
- [ ] Configurar cleanup automático
- [ ] Monitorar logs de erro
- [ ] Documentar para equipa mobile

---

## 🎓 Exemplos

### Teste Manual (via SQL)

```sql
-- 1. Emitir QR para participante
INSERT INTO track_participant_access (
  qr_code, event_id, participant_id, is_active
) VALUES (
  'VK-TRACK-TEST-001',
  'event-uuid',
  'participant-uuid',
  true
);

-- 2. Validar QR
SELECT track_get_participant_by_qr('VK-TRACK-TEST-001');

-- 3. Simular mensagem da app
SELECT track_submit_message(
  p_message_type := 'gps_batch',
  p_dedupe_id := gen_random_uuid(),
  p_device_id := 'test-device',
  p_app_version := '1.0.0',
  p_qr_code := 'VK-TRACK-TEST-001',
  p_payload := '{"points":[{"lat":38.7223,"lng":-9.1393,"device_ts":"2025-10-31T10:00:00Z"}]}'::jsonb
);

-- 4. Processar inbox
SELECT track_process_inbox_messages(10);

-- 5. Verificar resultado
SELECT * FROM track_gps_live ORDER BY server_ts DESC LIMIT 1;
```

---

## 🚨 Troubleshooting

### Mensagens não são processadas

```sql
-- Ver se processador está a executar
SELECT * FROM cron.job WHERE jobname = 'process-gps-inbox';

-- Forçar processamento manual
SELECT track_process_inbox_messages(100);
```

### Muitas mensagens falhadas

```sql
-- Ver motivos de falha
SELECT processed_reason, COUNT(*)
FROM track_inbox_messages
WHERE processed_status = 'failed'
GROUP BY processed_reason;
```

### Inbox a crescer muito

```sql
-- Forçar cleanup
SELECT track_cleanup_old_messages(7); -- últimos 7 dias apenas
```

---

## 📚 Ficheiros Relacionados

- `sql/track_module_schema.sql` - Tabelas base (executar primeiro)
- `sql/track_module_mobile_inbox.sql` - Tabelas inbox ⭐
- `sql/track_module_inbox_processor.sql` - Processador ⭐
- `docs/GPS_TRACKING_MOBILE_APP_API.md` - Doc para app mobile ⭐

---

## ✨ Resumo

**Faz sentido este modelo?** ✅ **SIM!**

Vantagens:
- ✅ Desacoplamento total (app não conhece schema final)
- ✅ Idempotência garantida
- ✅ Processamento assíncrono
- ✅ Retry automático
- ✅ Auditoria completa
- ✅ Fácil debug
- ✅ Escalável

**Próximo passo:** Desenvolver app móvel usando a API documentada! 📱

---

**VisionKrono GPS Tracking - Inbox Pattern**  
Versão: 1.0.0 | Data: Outubro 2025

