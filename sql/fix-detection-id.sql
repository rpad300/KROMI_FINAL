-- Script para verificar e corrigir detection_id nas classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações sem detection_id
SELECT 'CLASSIFICAÇÕES SEM DETECTION_ID:' as info;
SELECT 
    id,
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND detection_id IS NULL;

-- 2. Verificar detecções disponíveis para associar
SELECT 'DETECÇÕES DISPONÍVEIS:' as info;
SELECT 
    id,
    event_id,
    number,
    detected_at,
    detection_method
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY number, detected_at;

-- 3. Associar classificações com detecções baseado no dorsal_number
UPDATE classifications 
SET detection_id = (
    SELECT d.id 
    FROM detections d 
    WHERE d.event_id = classifications.event_id 
    AND d.number = classifications.dorsal_number
    ORDER BY d.detected_at ASC 
    LIMIT 1
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND detection_id IS NULL;

-- 4. Verificar resultado
SELECT 'CLASSIFICAÇÕES APÓS CORREÇÃO:' as info;
SELECT 
    id,
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;
