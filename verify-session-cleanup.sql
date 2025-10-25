-- Verificar sessões ativas e inativas
-- Execute este script no Supabase SQL Editor para verificar o estado das sessões

-- 1. Ver todas as sessões
SELECT 
    session_id,
    device_id,
    event_id,
    is_active,
    started_at,
    ended_at,
    last_heartbeat,
    created_at
FROM device_sessions 
ORDER BY created_at DESC;

-- 2. Ver apenas sessões ativas
SELECT 
    session_id,
    device_id,
    event_id,
    is_active,
    started_at,
    ended_at,
    last_heartbeat,
    created_at
FROM device_sessions 
WHERE is_active = true
ORDER BY created_at DESC;

-- 3. Ver contadores de sessões ativas por dispositivo
SELECT 
    ed.device_id,
    d.device_name,
    ed.active_sessions as contador_tabela,
    COUNT(ds.session_id) as sessoes_ativas_reais
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

-- 4. Ver sessões inativas há mais de 5 minutos
SELECT 
    session_id,
    device_id,
    event_id,
    is_active,
    started_at,
    ended_at,
    last_heartbeat,
    NOW() - last_heartbeat as tempo_sem_heartbeat,
    created_at
FROM device_sessions 
WHERE is_active = true
AND last_heartbeat < NOW() - INTERVAL '5 minutes'
ORDER BY last_heartbeat ASC;

-- 5. Executar limpeza manual (se necessário)
-- SELECT cleanup_inactive_sessions();

-- 6. Verificar se a função end_device_session existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'end_device_session';

-- 7. Verificar se a função cleanup_inactive_sessions existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'cleanup_inactive_sessions';
