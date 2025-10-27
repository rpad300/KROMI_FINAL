-- Script para corrigir split_time do dorsal 401
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais das classificações
SELECT 'DADOS ATUAIS DAS CLASSIFICAÇÕES:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    split_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_time ASC;

-- 2. Verificar se há múltiplos checkpoints para o mesmo dorsal
SELECT 'VERIFICAÇÃO DE MÚLTIPLOS CHECKPOINTS:' as info;
SELECT 
    dorsal_number,
    COUNT(*) as num_checkpoints,
    MIN(device_order) as min_order,
    MAX(device_order) as max_order
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
GROUP BY dorsal_number
ORDER BY dorsal_number;

-- 3. Se ambos dorsais têm apenas checkpoint 1, vamos simular um checkpoint 2 para o dorsal 407
-- (para demonstrar como funcionaria com múltiplos checkpoints)

-- Primeiro, vamos criar um checkpoint 2 para o dorsal 407 (simulado)
INSERT INTO classifications (
    event_id,
    dorsal_number,
    device_order,
    checkpoint_time,
    detection_id
)
SELECT 
    'a6301479-56c8-4269-a42d-aa8a7650a575' as event_id,
    407 as dorsal_number,
    2 as device_order,
    checkpoint_time + INTERVAL '5 minutes' as checkpoint_time, -- Simular 5 minutos depois
    detection_id
FROM classifications 
WHERE dorsal_number = 407 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND device_order = 1;

-- 4. Agora vamos criar um checkpoint 2 para o dorsal 401 também
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
    2 as device_order,
    checkpoint_time + INTERVAL '3 minutes' as checkpoint_time, -- Simular 3 minutos depois
    detection_id
FROM classifications 
WHERE dorsal_number = 401 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND device_order = 1;

-- 5. Verificar resultado após criar checkpoints 2
SELECT 'RESULTADO APÓS CRIAR CHECKPOINTS 2:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    split_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 6. Verificar a view event_classifications
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
