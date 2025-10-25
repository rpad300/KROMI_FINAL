-- Script para corrigir total_time dos checkpoints 2
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'DADOS ATUAIS:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 2. Corrigir total_time para todos os checkpoints
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at 
    FROM events 
    WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL;

-- 3. Recalcular split_time para checkpoints 2
UPDATE classifications c2
SET split_time = c2.checkpoint_time - c1.checkpoint_time
FROM classifications c1
WHERE c2.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND c2.device_order = 2
AND c1.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND c1.dorsal_number = c2.dorsal_number
AND c1.device_order = 1;

-- 4. Verificar resultado após correção
SELECT 'RESULTADO APÓS CORREÇÃO:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 5. Verificar view event_classifications
SELECT 'VIEW EVENT_CLASSIFICATIONS:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    split_time,
    detection_id
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;
