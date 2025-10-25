-- Script para criar classificação do dorsal 401
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se existe detecção do dorsal 401
SELECT 'VERIFICANDO DETECÇÃO DO DORSAL 401:' as info;
SELECT 
    id,
    event_id,
    number as dorsal_number,
    device_id,
    created_at,
    proof_image IS NOT NULL as tem_foto
FROM detections 
WHERE number = 401 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY created_at DESC;

-- 2. Criar classificação para o dorsal 401
INSERT INTO classifications (
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    detection_id
)
SELECT 
    'a6301479-56c8-4269-a42d-aa8a7650a575' as event_id,
    401 as dorsal_number,
    1 as device_order,
    created_at as checkpoint_time,
    id as detection_id
FROM detections 
WHERE number = 401 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Verificar se a classificação foi criada
SELECT 'VERIFICANDO CLASSIFICAÇÃO CRIADA:' as info;
SELECT 
    id,
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE dorsal_number = 401 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_time DESC;

-- 4. Verificar todas as classificações
SELECT 'TODAS AS CLASSIFICAÇÕES:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_time DESC;
