# ⏰ Configurar Scheduler (pg_cron) - MANUAL

## ⚠️ PASSO PENDENTE (Apenas 1!)

O scheduler **pg_cron** precisa ser habilitado manualmente no Supabase Dashboard.

**Tempo:** 2 minutos  
**Dificuldade:** Muito fácil  

---

## 🎯 Por Que Precisa?

O scheduler processa **automaticamente** as mensagens que a app móvel envia para a inbox:

```
App → Inbox → Scheduler (10s) → GPS Live ✅
```

Sem ele:
- Mensagens ficam em `track_inbox_messages` sem processar
- Precisa processar manualmente

---

## 📋 Passos no Supabase Dashboard

### 1️⃣ Habilitar Extension (1 minuto)

1. Ir para: https://supabase.com/dashboard
2. Selecionar projeto: **mdrvgbztadnluhrrnlob**
3. Menu lateral: **Database** → **Extensions**
4. Procurar: **`pg_cron`**
5. Clicar: **Enable** (botão verde)

✅ Extension habilitada!

---

### 2️⃣ Criar Job (1 minuto)

1. Menu lateral: **SQL Editor**
2. Clicar: **New Query**
3. Copiar e colar:

```sql
SELECT cron.schedule(
    'process-gps-inbox',
    '*/10 * * * * *',
    $$SELECT track_process_inbox_messages(100);$$
);
```

4. Clicar: **Run** (ou F5)

✅ Job criado!

---

### 3️⃣ Verificar (30 segundos)

No mesmo SQL Editor, executar:

```sql
-- Ver job criado
SELECT 
    jobid,
    jobname,
    schedule,
    active
FROM cron.job 
WHERE jobname = 'process-gps-inbox';
```

**Resultado esperado:**
```
jobname: process-gps-inbox
schedule: */10 * * * * *
active: true
```

✅ Tudo funcionando!

---

## 🔄 O Que o Scheduler Faz?

A cada **10 segundos**:

1. Busca até 100 mensagens pendentes em `track_inbox_messages`
2. Processa cada mensagem:
   - `gps_batch` → Insere pontos em `track_gps_live`
   - `activity_event` → Atualiza status em `track_activities`
   - `heartbeat` → Atualiza last_seen
3. Marca como `success` ou `failed`
4. Retries automáticos para falhadas

---

## 📊 Monitorar

```sql
-- Ver estatísticas
SELECT * FROM track_inbox_stats();

-- Ver jobs rodando
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-gps-inbox' 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🚨 Se pg_cron Não Estiver Disponível

### Alternativa 1: Edge Function (Serverless)

Criar Supabase Edge Function que chama `track_process_inbox_messages()` a cada 10s.

### Alternativa 2: Processar Manualmente

Quando precisar:
```sql
SELECT track_process_inbox_messages(100);
```

### Alternativa 3: Cron Externo

Usar cron do sistema operacional:
```bash
*/1 * * * * curl -X POST https://SEU-PROJETO.supabase.co/rest/v1/rpc/track_process_inbox_messages \
  -H "apikey: SUA-KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_limit":100}'
```

---

## ✅ Depois de Configurar

O sistema fica 100% automático:

```
App envia GPS → Inbox → [Scheduler a cada 10s] → Dashboard Live ✅
```

---

## 🎉 ESTÁ QUASE!

Apenas este passo manual e está **tudo pronto**!

Depois disso:
- ✅ Sistema 100% funcional
- ✅ Menu GPS nos eventos
- ✅ Prontopar a app móvel

---

**Execute agora:** 2 minutos no Supabase Dashboard! 🚀

