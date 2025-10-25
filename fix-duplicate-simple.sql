-- Script simples para corrigir duplicação de dorsais
-- Execute este script no Supabase SQL Editor

-- 1. Recriar a view event_classifications para agrupar por dorsal
DROP VIEW IF EXISTS event_classifications;

CREATE VIEW event_classifications AS
SELECT DISTINCT ON (c.event_id, c.dorsal_number)
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.split_time,
    c.total_time,
    c.is_penalty,
    c.penalty_reason,
    c.detection_id,
    -- Calcular posição baseada no melhor tempo total por dorsal
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id 
        ORDER BY 
            CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
            MIN(c.total_time) OVER (PARTITION BY c.event_id, c.dorsal_number) ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY c.event_id, c.dorsal_number, c.total_time ASC NULLS LAST;

-- 2. Testar a view corrigida
SELECT 'VIEW CORRIGIDA:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    detection_id
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;

-- 3. Verificar dados brutos para debug
SELECT 'DADOS BRUTOS:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;
