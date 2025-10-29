-- Verificar se as classificações foram criadas

-- 1. Verificar dados brutos na tabela classifications
SELECT 
    'DADOS NA TABELA CLASSIFICATIONS:' as info;

SELECT 
    id,
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    created_at
FROM classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar dados na view event_classifications
SELECT 
    'DADOS NA VIEW EVENT_CLASSIFICATIONS:' as info;

SELECT 
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    position
FROM event_classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position
LIMIT 10;

-- 3. Verificar se a view existe
SELECT 
    'VERIFICAÇÃO DA VIEW:' as info;

SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE viewname = 'event_classifications';

-- 4. Contar registros
SELECT 
    'CONTAGEM:' as info,
    (SELECT COUNT(*) FROM classifications WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as total_classifications,
    (SELECT COUNT(*) FROM event_classifications WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as total_view;

