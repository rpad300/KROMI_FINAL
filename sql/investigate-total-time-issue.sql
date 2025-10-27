-- Script para investigar por que total_time não está sendo calculado
-- Execute este script no Supabase SQL Editor

-- 1. Verificar status do evento
SELECT 'STATUS DO EVENTO:' as info;
SELECT 
    id,
    name,
    is_active,
    event_started_at,
    event_ended_at,
    status,
    created_at
FROM events 
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Verificar dados das classificações
SELECT 'DADOS DAS CLASSIFICAÇÕES:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    is_penalty,
    detection_id,
    created_at
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 3. Verificar se há registros na tabela classifications
SELECT 'CONTAGEM DE REGISTROS:' as info;
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT dorsal_number) as dorsais_unicos,
    COUNT(CASE WHEN total_time IS NOT NULL THEN 1 END) as com_total_time,
    COUNT(CASE WHEN total_time IS NULL THEN 1 END) as sem_total_time
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 4. Verificar se há registros na tabela detections
SELECT 'DADOS DAS DETECÇÕES:' as info;
SELECT 
    number as dorsal_number,
    created_at,
    device_id,
    event_id,
    proof_image IS NOT NULL as tem_foto
FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY number, created_at;

-- 5. Verificar se há registros na tabela image_buffer
SELECT 'DADOS DO BUFFER:' as info;
SELECT 
    COUNT(*) as total_imagens,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'processed' THEN 1 END) as processadas,
    COUNT(CASE WHEN status = 'discarded' THEN 1 END) as descartadas
FROM image_buffer 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 6. Tentar calcular total_time manualmente
SELECT 'CÁLCULO MANUAL DE TOTAL_TIME:' as info;
SELECT 
    c.dorsal_number,
    c.checkpoint_time,
    e.event_started_at,
    CASE 
        WHEN e.event_started_at IS NOT NULL THEN 
            c.checkpoint_time - e.event_started_at
        ELSE NULL 
    END as total_time_calculado,
    c.total_time as total_time_atual
FROM classifications c
CROSS JOIN events e
WHERE c.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND e.id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY c.dorsal_number;
