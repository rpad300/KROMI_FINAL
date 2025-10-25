-- Testar as funções de controle de sessões
-- Execute este script para verificar se as funções estão funcionando

-- 1. Verificar se as funções existem
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('end_device_session', 'cleanup_inactive_sessions')
ORDER BY routine_name;

-- 2. Ver estado atual das sessões antes da limpeza
SELECT 
    'ANTES DA LIMPEZA' as status,
    COUNT(*) as total_sessoes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as sessoes_ativas,
    COUNT(CASE WHEN is_active = false THEN 1 END) as sessoes_inativas
FROM device_sessions;

-- 3. Ver sessões inativas há mais de 5 minutos
SELECT 
    'SESSÕES INATIVAS' as tipo,
    session_id,
    device_id,
    event_id,
    is_active,
    last_heartbeat,
    NOW() - last_heartbeat as tempo_sem_heartbeat
FROM device_sessions 
WHERE is_active = true
AND last_heartbeat < NOW() - INTERVAL '5 minutes'
ORDER BY last_heartbeat ASC;

-- 4. Executar limpeza de sessões inativas
SELECT cleanup_inactive_sessions() as sessoes_limpas;

-- 5. Ver estado das sessões após a limpeza
SELECT 
    'APÓS A LIMPEZA' as status,
    COUNT(*) as total_sessoes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as sessoes_ativas,
    COUNT(CASE WHEN is_active = false THEN 1 END) as sessoes_inativas
FROM device_sessions;

-- 6. Ver contadores de sessões ativas por dispositivo
SELECT 
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
