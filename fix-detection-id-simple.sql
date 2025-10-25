-- Script simplificado para corrigir detection_id
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações atuais
SELECT 'CLASSIFICAÇÕES ATUAIS:' as info;
SELECT 
    id,
    dorsal_number,
    device_order,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Verificar detecções disponíveis
SELECT 'DETECÇÕES DISPONÍVEIS:' as info;
SELECT 
    id,
    number,
    detected_at
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY number, detected_at;

-- 3. Associar apenas classificações sem detection_id
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

-- 4. Verificar resultado final
SELECT 'RESULTADO FINAL:' as info;
SELECT 
    dorsal_number,
    device_order,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status_foto
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;
