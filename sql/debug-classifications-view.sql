-- Debug: Por que event_classifications não mostra dados?

-- 1. Verificar dados brutos na tabela
SELECT 
    'TABELA CLASSIFICATIONS (RAW):' as info;

SELECT 
    id,
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    is_penalty
FROM classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Verificar dados na VIEW
SELECT 
    'VIEW EVENT_CLASSIFICATIONS:' as info;

SELECT *
FROM event_classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Ver definição da VIEW
SELECT 
    'DEFINIÇÃO DA VIEW:' as info;

SELECT definition
FROM pg_views
WHERE viewname = 'event_classifications';

-- 4. Verificar se evento está ativo
SELECT 
    'STATUS DO EVENTO:' as info;

SELECT 
    id,
    name,
    is_active,
    event_started_at,
    event_ended_at
FROM events
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';


