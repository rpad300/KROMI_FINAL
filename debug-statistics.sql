-- Script para verificar dados das classificações e estatísticas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados brutos das classificações
SELECT 'DADOS BRUTOS DAS CLASSIFICAÇÕES:' as info;
SELECT 
    dorsal_number,
    total_time,
    split_time,
    is_penalty,
    checkpoint_time,
    device_order
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Verificar tipos de dados
SELECT 'TIPOS DE DADOS:' as info;
SELECT 
    dorsal_number,
    pg_typeof(total_time) as total_time_type,
    pg_typeof(split_time) as split_time_type,
    pg_typeof(checkpoint_time) as checkpoint_time_type,
    total_time::text as total_time_text,
    split_time::text as split_time_text
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 3. Calcular estatísticas manualmente
SELECT 'ESTATÍSTICAS CALCULADAS:' as info;
SELECT 
    COUNT(*) as total_atletas,
    COUNT(CASE WHEN total_time IS NOT NULL AND is_penalty = false THEN 1 END) as completaram,
    MIN(CASE WHEN is_penalty = false THEN total_time END) as melhor_tempo,
    AVG(CASE WHEN is_penalty = false THEN EXTRACT(EPOCH FROM total_time) END) as tempo_medio_segundos
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 4. Verificar se o evento está ativo
SELECT 'STATUS DO EVENTO:' as info;
SELECT 
    name,
    is_active,
    event_started_at,
    event_ended_at,
    status
FROM events 
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 5. Verificar view event_classifications
SELECT 'VIEW EVENT_CLASSIFICATIONS:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    pg_typeof(total_time) as total_time_type,
    total_time::text as total_time_text
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;
