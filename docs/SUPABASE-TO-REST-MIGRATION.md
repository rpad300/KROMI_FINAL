# 🔄 Migração Completa: Supabase Direto → API REST

## 🎯 Objetivo

Substituir TODAS as chamadas `window.supabaseClient.supabase.from()` (ANON key + RLS) por APIs REST (service role, bypass RLS).

## 📋 Arquivos Encontrados

### Principais (Produção)
1. ✅ **index-kromi.html** - Migrado (usa `/api/events/stats`)
2. ✅ **events-kromi.html** - Migrado (usa `/api/events/list`)
3. ✅ **config-kromi.html** - Migrado (usa `/api/events/:id` e `/api/events/list`)
4. ✅ **logs-auditoria.html** - Corrigido (usa `window.supabaseClient.supabase` corretamente)
5. ⏳ **classifications-kromi.html** - PRECISA MIGRAR
6. ⏳ **detection-kromi.html** - Verificar
7. ⏳ **participants-kromi.html** - Verificar
8. ⏳ **devices-kromi.html** - Verificar

### Secundários (Opcionais)
- test-events-direct.html (ferramenta de debug - OK)
- admin-dashboard.html (antigo?)
- events-pwa.html (versão PWA?)

## 🔍 Análise: classifications-kromi.html

### Queries Encontradas

**1. Estatísticas do Evento (linha 624-625)**
```javascript
// ANTES - Supabase direto
const [participantsResult, detectionsResult] = await Promise.all([
    window.supabaseClient.supabase.from('participants').select('*').eq('event_id', eventId),
    window.supabaseClient.supabase.from('detections').select('*').eq('event_id', eventId)
]);
```

**Solução:** Criar endpoint `/api/events/:id/stats`
```javascript
// DEPOIS - API REST
const res = await fetch(`/api/events/${eventId}/stats`, {
    credentials: 'include'
});
const { stats } = await res.json();
// stats.totalParticipants, stats.totalDetections
```

**2. Reset de Classificações (linha 1205-1207)**
```javascript
// ANTES - Supabase direto
const [verifyClass, verifyDet, verifyBuffer] = await Promise.all([
    window.supabaseClient.supabase.from('classifications').select('*', { count: 'exact', head: true }),
    window.supabaseClient.supabase.from('detections').select('*', { count: 'exact', head: true }),
    window.supabaseClient.supabase.from('image_buffer').select('*', { count: 'exact', head: true })
]);
```

**Solução:** Criar endpoint `/api/events/:id/reset`
```javascript
// DEPOIS - API REST
const res = await fetch(`/api/events/${eventId}/reset`, {
    method: 'POST',
    credentials: 'include'
});
const { success, counts } = await res.json();
```

## 📊 Endpoints REST Necessários

### Já Existentes ✅
- `GET /api/events/list` - Lista eventos
- `GET /api/events/stats` - Estatísticas gerais
- `GET /api/events/:id` - Detalhes do evento
- `POST /api/events/create` - Criar evento
- `PUT /api/events/:id` - Editar evento
- `DELETE /api/events/:id` - Deletar evento

### A Criar 🆕
1. `GET /api/events/:id/stats` - Estatísticas de um evento específico
2. `POST /api/events/:id/reset` - Reset de classificações/detecções
3. `GET /api/events/:id/participants` - Lista participantes
4. `GET /api/events/:id/detections` - Lista detecções
5. `GET /api/events/:id/classifications` - Lista classificações
6. `GET /api/devices/list` - Lista dispositivos
7. `POST /api/devices/create` - Criar dispositivo
8. etc...

## 🚀 Plano de Ação

### Fase 1: Criar Endpoints REST (Prioridade Alta)

#### A) Estatísticas de Evento Específico
```javascript
// events-routes.js
app.get('/api/events/:id/stats', requireAuth, requireRole(['admin', 'moderator', 'event_manager']), async (req, res) => {
    const eventId = req.params.id;
    
    const [participants, detections, classifications] = await Promise.all([
        supabase.from('participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('detections').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('classifications').select('*', { count: 'exact', head: true }).eq('event_id', eventId)
    ]);
    
    res.json({
        success: true,
        stats: {
            totalParticipants: participants.count || 0,
            totalDetections: detections.count || 0,
            totalClassifications: classifications.count || 0
        }
    });
});
```

#### B) Reset de Evento
```javascript
app.post('/api/events/:id/reset', requireAuth, requireRole(['admin']), async (req, res) => {
    const eventId = req.params.id;
    
    // Deletar dados do evento
    const [classRes, detRes, bufferRes] = await Promise.all([
        supabase.from('classifications').delete().eq('event_id', eventId),
        supabase.from('detections').delete().eq('event_id', eventId),
        supabase.from('image_buffer').delete().eq('event_id', eventId)
    ]);
    
    res.json({ success: true, message: 'Evento resetado' });
});
```

### Fase 2: Migrar classifications-kromi.html

### Fase 3: Migrar detection-kromi.html

### Fase 4: Migrar participants-kromi.html

### Fase 5: Migrar devices-kromi.html

## 🔧 Padrão de Migração

### ANTES (Supabase direto - RLS ativo)
```javascript
const { data, error } = await window.supabaseClient.supabase
    .from('table')
    .select('*')
    .eq('field', value);
```

### DEPOIS (API REST - RLS bypassed)
```javascript
const res = await fetch('/api/endpoint', {
    credentials: 'include'
});
const { success, data, error } = await res.json();
```

## ✅ Benefícios

- ✅ RLS bypassed (service role no servidor)
- ✅ Admin vê TUDO sem problemas
- ✅ Controle de escopo no código (mais flexível)
- ✅ Validações centralizadas no backend
- ✅ Logs detalhados de todas operações
- ✅ Mais seguro (lógica no servidor, não no browser)

---

**Status:** Análise completa  
**Próximo passo:** Criar endpoints REST faltantes

