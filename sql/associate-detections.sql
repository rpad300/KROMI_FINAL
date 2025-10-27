-- Script direto para associar classificações com detecções
-- Execute este script no Supabase SQL Editor

-- Associar classificações com detecções baseado no dorsal_number
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

-- Verificar resultado
SELECT 
    dorsal_number,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;
