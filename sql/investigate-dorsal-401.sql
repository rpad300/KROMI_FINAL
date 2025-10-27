-- Script para investigar por que dorsal 401 não aparece nas classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se existe detecção do dorsal 401
SELECT 'DETECÇÕES DO DORSAL 401:' as info;
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

-- 2. Verificar se existe classificação do dorsal 401
SELECT 'CLASSIFICAÇÕES DO DORSAL 401:' as info;
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

-- 3. Verificar todas as detecções recentes
SELECT 'TODAS AS DETECÇÕES RECENTES:' as info;
SELECT 
    number as dorsal_number,
    created_at,
    device_id,
    proof_image IS NOT NULL as tem_foto
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY created_at DESC
LIMIT 10;

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

-- 5. Verificar se o processador em background está funcionando
SELECT 'STATUS DO BUFFER DE IMAGENS:' as info;
SELECT 
    COUNT(*) as total_imagens,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as processadas,
    COUNT(CASE WHEN status = 'discarded' THEN 1 END) as descartadas
FROM image_buffer 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';
