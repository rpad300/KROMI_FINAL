-- Script para corrigir dorsal 999
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se existe detecção para dorsal 999
SELECT 'DETECÇÕES PARA DORSAL 999:' as info;
SELECT 
    id,
    number,
    event_id,
    detected_at
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
AND number = 999;

-- 2. Se não existir detecção para 999, criar uma de teste
INSERT INTO detections (
    event_id,
    number,
    detected_at,
    detection_method,
    proof_image,
    session_id
)
SELECT 
    'a6301479-56c8-4269-a42d-aa8a7650a575' as event_id,
    999 as number,
    NOW() as detected_at,
    'Teste Manual' as detection_method,
    (SELECT proof_image FROM detections WHERE number = 407 LIMIT 1) as proof_image,
    'test-session-999' as session_id
WHERE NOT EXISTS (
    SELECT 1 FROM detections 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
    AND number = 999
);

-- 3. Associar dorsal 999 com sua detecção
UPDATE classifications 
SET detection_id = (
    SELECT id FROM detections 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
    AND number = 999 
    LIMIT 1
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
AND dorsal_number = 999;

-- 4. Verificar resultado final
SELECT 'RESULTADO FINAL:' as info;
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
