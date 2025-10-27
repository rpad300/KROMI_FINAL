-- Script para calcular splits corretos
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações atuais
SELECT 'CLASSIFICAÇÕES ATUAIS:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    split_time,
    total_time
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 2. Calcular splits baseados no tempo de checkpoint
-- Para o primeiro checkpoint, split_time = total_time
-- Para checkpoints subsequentes, split_time = checkpoint_time - checkpoint_anterior
UPDATE classifications 
SET split_time = CASE 
    WHEN device_order = 1 THEN total_time
    ELSE checkpoint_time - (
        SELECT checkpoint_time 
        FROM classifications c2 
        WHERE c2.event_id = classifications.event_id 
        AND c2.dorsal_number = classifications.dorsal_number 
        AND c2.device_order = classifications.device_order - 1
    )
END
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Verificar resultado
SELECT 'CLASSIFICAÇÕES COM SPLITS:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    split_time,
    total_time
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 4. Testar a view event_classifications
SELECT 'VIEW EVENT_CLASSIFICATIONS:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    split_time,
    checkpoint_time
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;
