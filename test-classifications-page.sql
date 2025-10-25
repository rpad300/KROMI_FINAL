-- Script para testar a consulta da página de classificações
-- Execute este script no Supabase SQL Editor

-- 1. Testar a consulta exata que a página usa
SELECT 'CONSULTA DA PÁGINA:' as info;
SELECT 
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.split_time,
    c.total_time,
    c.is_penalty,
    c.penalty_reason,
    c.position,
    c.event_started_at,
    c.event_name
FROM event_classifications c
WHERE c.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'  -- ID do evento teste1
ORDER BY c.position ASC;

-- 2. Verificar se o evento está ativo
SELECT 'STATUS DO EVENTO:' as info;
SELECT 
    id, 
    name, 
    event_started_at, 
    is_active,
    status
FROM events 
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Testar consulta mais simples
SELECT 'CONSULTA SIMPLES:' as info;
SELECT 
    dorsal_number,
    total_time,
    position
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position ASC;
