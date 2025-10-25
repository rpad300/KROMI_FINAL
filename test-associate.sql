-- Script de teste para verificar dados
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações
SELECT 'CLASSIFICAÇÕES:' as info;
SELECT 
    id,
    dorsal_number,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Verificar detecções
SELECT 'DETECÇÕES:' as info;
SELECT 
    id,
    number,
    event_id
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Associar manualmente (exemplo para dorsal 407)
UPDATE classifications 
SET detection_id = (
    SELECT id FROM detections 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
    AND number = 407 
    LIMIT 1
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
AND dorsal_number = 407;

-- 4. Associar manualmente (exemplo para dorsal 999)
UPDATE classifications 
SET detection_id = (
    SELECT id FROM detections 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
    AND number = 999 
    LIMIT 1
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
AND dorsal_number = 999;

-- 5. Verificar resultado
SELECT 'RESULTADO:' as info;
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
