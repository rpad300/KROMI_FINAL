-- Script para corrigir duplicação de dorsais na view
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'DADOS ATUAIS DA VIEW:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    split_time,
    detection_id
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;

-- 2. Recriar a view para agrupar por dorsal
DROP VIEW IF EXISTS event_classifications;

CREATE VIEW event_classifications AS
SELECT 
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
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL;

-- 3. Criar uma view específica para mostrar apenas o melhor tempo por dorsal
CREATE OR REPLACE VIEW event_classifications_summary AS
SELECT 
    c.event_id,
    c.dorsal_number,
    MIN(c.device_order) as first_checkpoint,
    MAX(c.device_order) as last_checkpoint,
    MIN(c.checkpoint_time) as first_checkpoint_time,
    MAX(c.checkpoint_time) as last_checkpoint_time,
    MIN(c.total_time) as best_total_time,
    MAX(c.total_time) as final_total_time,
    COUNT(*) as total_checkpoints,
    c.is_penalty,
    c.penalty_reason,
    -- Usar o detection_id do primeiro checkpoint
    (SELECT detection_id FROM classifications c2 
     WHERE c2.event_id = c.event_id 
     AND c2.dorsal_number = c.dorsal_number 
     AND c2.device_order = MIN(c.device_order) 
     LIMIT 1) as detection_id,
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id 
        ORDER BY 
            CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
            MIN(c.total_time) ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
GROUP BY c.event_id, c.dorsal_number, c.is_penalty, c.penalty_reason, e.event_started_at, e.name;

-- 4. Testar a nova view
SELECT 'NOVA VIEW SUMMARY:' as info;
SELECT 
    dorsal_number,
    position,
    best_total_time,
    total_checkpoints,
    detection_id
FROM event_classifications_summary 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;

-- 5. Verificar dados brutos das classificações
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
