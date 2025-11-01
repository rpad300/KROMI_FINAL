# 🚀 Instalação Rápida - Módulo GPS Tracking

## ⚡ Quick Start (5 minutos)

### 1️⃣ Executar SQL no Supabase

Aceda ao **Supabase Dashboard** → **SQL Editor** → **New Query**

Copie e cole **cada ficheiro** por ordem:

#### A. Schema (Tabelas)
```sql
-- Copiar e executar: sql/track_module_schema.sql
```
✅ Cria 8 tabelas + índices + triggers

#### B. RLS (Segurança)
```sql
-- Copiar e executar: sql/track_module_rls.sql
```
✅ Configura Row Level Security

#### C. Funções (Lógica)
```sql
-- Copiar e executar: sql/track_module_functions.sql
```
✅ Cria 10 RPCs (API functions)

#### D. Seeds Demo (Opcional)
```sql
-- Copiar e executar: sql/track_module_seeds.sql
```
✅ Carrega dados de teste

---

### 2️⃣ Verificar Instalação

Execute no SQL Editor:

```sql
-- Listar tabelas criadas
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'track_%' 
ORDER BY tablename;

-- Deve retornar 8 tabelas:
-- track_activities
-- track_activity_checkpass
-- track_audit_log
-- track_checks
-- track_device_session
-- track_gps_live
-- track_participant_qr
-- track_routes

-- Contar registos demo (se executou seeds)
SELECT 
    (SELECT COUNT(*) FROM track_routes) as routes,
    (SELECT COUNT(*) FROM track_participant_qr) as qrs,
    (SELECT COUNT(*) FROM track_activities) as activities,
    (SELECT COUNT(*) FROM track_gps_live) as gps_points;

-- Deve retornar: routes=2, qrs=3, activities=2, gps_points=50
```

✅ **Se tudo aparecer:** Instalação bem-sucedida!

---

### 3️⃣ Configurar UI

#### A. Obter Credenciais Supabase

**Supabase Dashboard** → **Settings** → **API**

Copiar:
- `Project URL` (ex: https://abc123.supabase.co)
- `anon public key` (começa com "eyJ...")

#### B. Obter ID do Evento

```sql
-- Executar no SQL Editor
SELECT id, name FROM eventos ORDER BY created_at DESC LIMIT 10;
```

Copiar o `id` (UUID) do evento desejado.

#### C. Editar Ficheiros HTML

Editar **cada ficheiro** em `src/tracking/`:
- `track-routes-manager.html`
- `track-qr-manager.html`
- `track-live-map.html`
- `track-rankings.html`

Substituir no topo do `<script>`:

```javascript
// ANTES:
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const EVENT_ID = 'YOUR_EVENT_ID';

// DEPOIS:
const SUPABASE_URL = 'https://abc123.supabase.co';
const SUPABASE_KEY = 'eyJ...sua-key...';
const EVENT_ID = 'uuid-do-evento';
```

#### D. Incluir Supabase Client

Adicionar no `<head>` de cada HTML (antes do `</head>`):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const { createClient } = supabase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
```

---

### 4️⃣ Testar UI

#### Abrir no navegador:

1. **Gestão de Rotas**
   - Abrir: `src/tracking/track-routes-manager.html`
   - Criar uma rota de teste
   - ✅ Se aparecer na lista: Funciona!

2. **Gestão de QR Codes**
   - Abrir: `src/tracking/track-qr-manager.html`
   - Emitir QR para um participante
   - ✅ Se gerar QR code: Funciona!

3. **Mapa Live**
   - Abrir: `src/tracking/track-live-map.html`
   - Ver atividades demo (se executou seeds)
   - ✅ Se mostrar mapa: Funciona!

4. **Rankings**
   - Abrir: `src/tracking/track-rankings.html`
   - Selecionar rota
   - ✅ Se mostrar rankings: Funciona!

---

### 5️⃣ Integrar no seu sistema

#### Opção A: Standalone (atual)
- Hospedar ficheiros HTML num servidor
- Acesso direto via URL

#### Opção B: Integração React/Vue/etc
- Copiar lógica JavaScript dos HTMLs
- Adaptar para componentes do framework
- Usar `@supabase/supabase-js` npm package

#### Opção C: Iframe
- Embedar HTMLs via iframe no backoffice existente

```html
<iframe 
  src="/tracking/track-routes-manager.html" 
  style="width:100%; height:800px; border:none">
</iframe>
```

---

## 🎯 Próximos Passos

### Para Testar Funcionalidade Completa:

1. **Criar Evento Real**
   ```sql
   -- Criar evento de teste
   INSERT INTO eventos (name, event_type, start_date, status)
   VALUES ('Teste GPS', 'running', NOW() + INTERVAL '7 days', 'published')
   RETURNING id;
   ```

2. **Inscrever Participantes**
   ```sql
   -- Adicionar participantes
   INSERT INTO participants (event_id, full_name, email, bib_number)
   VALUES 
     ('event-uuid', 'Teste 1', 'teste1@example.com', '001'),
     ('event-uuid', 'Teste 2', 'teste2@example.com', '002');
   ```

3. **Criar Rota**
   - Via UI: `track-routes-manager.html`
   - Nome: "5K Teste"
   - Distância: 5.0 km

4. **Emitir QRs**
   - Via UI: `track-qr-manager.html`
   - Clicar "Emitir QRs em Massa"

5. **Simular Tracking** (via SQL - substituto da app móvel)
   ```sql
   -- Armar atividade
   SELECT track_arm_activity(
     p_qr_code := 'QR-CODE-AQUI',
     p_route_id := 'route-uuid'
   );

   -- Obter activity_id retornado, depois:
   
   -- Enviar pontos GPS
   SELECT track_submit_gps_batch(
     p_activity_id := 'activity-uuid',
     p_points := '[
       {"lat": 38.7223, "lng": -9.1393, "alt_m": 25, "speed_kmh": 10, "accuracy_m": 8, "device_ts": "2025-10-31T10:00:00Z"},
       {"lat": 38.7224, "lng": -9.1394, "alt_m": 26, "speed_kmh": 11, "accuracy_m": 7, "device_ts": "2025-10-31T10:00:05Z"}
     ]'::jsonb
   );

   -- Finalizar
   SELECT track_finish_activity(
     p_activity_id := 'activity-uuid'
   );
   ```

6. **Ver Resultados**
   - Mapa Live: Ver posição durante tracking
   - Rankings: Ver classificação após finalizar

---

## 📱 App Móvel (Futuro)

Para tracking real via smartphone, precisará de:

### Tecnologias Sugeridas:
- **React Native** ou **Flutter**
- GPS nativo (Geolocation API)
- Supabase Client SDK

### Fluxo:
1. Login participante
2. Listar suas atividades armadas
3. Iniciar tracking GPS
4. Coletar pontos a cada N segundos
5. Enviar em batches via `track_submit_gps_batch`
6. Botão pausar/retomar/finalizar

### Exemplo Simplificado (React Native):
```javascript
import { createClient } from '@supabase/supabase-js';
import Geolocation from '@react-native-community/geolocation';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Coletar pontos
const watchId = Geolocation.watchPosition(
  (position) => {
    gpsBuffer.push({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      alt_m: position.coords.altitude,
      speed_kmh: (position.coords.speed || 0) * 3.6,
      accuracy_m: position.coords.accuracy,
      device_ts: new Date(position.timestamp).toISOString()
    });
    
    if (gpsBuffer.length >= 10) {
      sendBatch();
    }
  },
  null,
  { enableHighAccuracy: true, distanceFilter: 10 }
);

// Enviar batch
async function sendBatch() {
  const { data } = await supabase.rpc('track_submit_gps_batch', {
    p_activity_id: activityId,
    p_points: gpsBuffer
  });
  gpsBuffer = [];
}
```

---

## 🔧 Troubleshooting

### ❌ Erro: "relation track_routes does not exist"
**Causa:** Tabelas não foram criadas  
**Solução:** Executar `sql/track_module_schema.sql`

### ❌ Erro: "function track_issue_qr does not exist"
**Causa:** Funções não foram criadas  
**Solução:** Executar `sql/track_module_functions.sql`

### ❌ Erro: "new row violates row-level security policy"
**Causa:** RLS bloqueando operação  
**Solução:** 
- Verificar se usuário está autenticado
- Verificar se possui role adequado (admin/staff)
- Executar `sql/track_module_rls.sql`

### ❌ UI não carrega dados
**Causa:** Credenciais incorretas ou CORS  
**Solução:**
- Verificar SUPABASE_URL e SUPABASE_KEY
- No Supabase: Authentication → URL Configuration → Site URL

### ❌ QR code não aparece
**Causa:** Biblioteca QRCode.js não carregada  
**Solução:** Verificar internet (usa CDN) ou baixar localmente

---

## 📚 Documentação Completa

- **README Principal:** `GPS_TRACKING_MODULE_README.md`
- **API Detalhada:** `docs/GPS_TRACKING_API.md`
- **Testes:** `docs/GPS_TRACKING_TESTS.md`
- **Queries:** `sql/track_module_queries.sql`

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] SQL scripts executados com sucesso
- [ ] Verificação passou (8 tabelas criadas)
- [ ] UI configurada com credenciais reais
- [ ] Teste de ponta a ponta realizado
- [ ] Roles e permissões testados
- [ ] Backup da base de dados feito
- [ ] Monitoramento configurado
- [ ] Documentação lida pela equipa

---

## 🎉 Está Pronto!

O módulo GPS Tracking está instalado e funcional.

**Dúvidas?** Consulte a documentação completa ou execute queries de verificação em `sql/track_module_queries.sql`

**Boa sorte com os seus eventos! 🏃‍♂️🏃‍♀️**

