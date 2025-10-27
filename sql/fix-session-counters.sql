-- Corrigir inconsistência entre contadores e sessões reais
-- Execute este script para sincronizar os contadores

-- 1. Ver estado atual antes da correção
SELECT 
    'ANTES DA CORREÇÃO' as status,
    ed.device_id,
    d.device_name,
    ed.active_sessions as contador_tabela,
    COUNT(ds.session_id) as sessoes_ativas_reais,
    CASE 
        WHEN ed.active_sessions = COUNT(ds.session_id) THEN '✅ CORRETO'
        ELSE '❌ INCORRETO'
    END as status_contador
FROM event_devices ed
LEFT JOIN devices d ON d.id = ed.device_id
LEFT JOIN device_sessions ds ON (
    ds.device_id = ed.device_id 
    AND ds.event_id = ed.event_id 
    AND ds.is_active = true
    AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
)
GROUP BY ed.device_id, d.device_name, ed.active_sessions
ORDER BY d.device_name;

-- 2. Executar limpeza de sessões inativas primeiro
SELECT cleanup_inactive_sessions() as sessoes_limpas;

-- 3. Corrigir contadores manualmente
UPDATE event_devices ed
SET active_sessions = (
    SELECT COUNT(*)
    FROM device_sessions ds
    WHERE ds.device_id = ed.device_id
    AND ds.event_id = ed.event_id
    AND ds.is_active = true
    AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
);

-- 4. Ver estado após a correção
SELECT 
    'APÓS A CORREÇÃO' as status,
    ed.device_id,
    d.device_name,
    ed.active_sessions as contador_tabela,
    COUNT(ds.session_id) as sessoes_ativas_reais,
    CASE 
        WHEN ed.active_sessions = COUNT(ds.session_id) THEN '✅ CORRETO'
        ELSE '❌ INCORRETO'
    END as status_contador
FROM event_devices ed
LEFT JOIN devices d ON d.id = ed.device_id
LEFT JOIN device_sessions ds ON (
    ds.device_id = ed.device_id 
    AND ds.event_id = ed.event_id 
    AND ds.is_active = true
    AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
)
GROUP BY ed.device_id, d.device_name, ed.active_sessions
ORDER BY d.device_name;

-- 5. Ver todas as sessões ativas para debug
SELECT 
    'SESSÕES ATIVAS' as tipo,
    session_id,
    device_id,
    event_id,
    is_active,
    started_at,
    ended_at,
    last_heartbeat,
    NOW() - last_heartbeat as tempo_sem_heartbeat
FROM device_sessions 
WHERE is_active = true
ORDER BY last_heartbeat DESC;


