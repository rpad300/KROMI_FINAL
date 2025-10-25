-- Script para corrigir total_time nas classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'DADOS ATUAIS:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 2. Atualizar total_time para todas as classificações
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at 
    FROM events 
    WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL;

-- 3. Verificar resultado após correção
SELECT 'RESULTADO APÓS CORREÇÃO:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 4. Verificar se a view está funcionando
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
