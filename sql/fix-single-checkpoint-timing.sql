-- Script para corrigir total_time de dorsais com apenas um checkpoint
-- Regra: Se há apenas 1 checkpoint, ele é considerado a meta
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dorsais sem total_time
SELECT 'DORSAIS SEM TOTAL_TIME:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL
ORDER BY dorsal_number;

-- 2. Verificar quantos checkpoints cada dorsal tem
SELECT 'CHECKPOINTS POR DORSAL:' as info;
SELECT 
    dorsal_number,
    COUNT(*) as num_checkpoints,
    MIN(device_order) as primeiro_checkpoint,
    MAX(device_order) as ultimo_checkpoint
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
GROUP BY dorsal_number
ORDER BY dorsal_number;

-- 3. Corrigir total_time para dorsais com apenas 1 checkpoint
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at 
    FROM events 
    WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL
AND dorsal_number IN (
    -- Dorsais que têm apenas 1 checkpoint
    SELECT dorsal_number
    FROM classifications 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
    GROUP BY dorsal_number
    HAVING COUNT(*) = 1
);

-- 4. Verificar resultado após correção
SELECT 'RESULTADO APÓS CORREÇÃO:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 5. Verificar estatísticas finais
SELECT 'ESTATÍSTICAS FINAIS:' as info;
SELECT 
    COUNT(DISTINCT dorsal_number) as total_dorsais,
    COUNT(DISTINCT CASE WHEN total_time IS NOT NULL AND is_penalty = false THEN dorsal_number END) as dorsais_completados,
    MIN(CASE WHEN is_penalty = false THEN total_time END) as melhor_tempo,
    AVG(CASE WHEN is_penalty = false THEN EXTRACT(EPOCH FROM total_time) END) as tempo_medio_segundos
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 6. Atualizar a view para refletir as mudanças
DROP VIEW IF EXISTS event_classifications;

CREATE VIEW event_classifications AS
WITH dorsal_best_times AS (
    SELECT 
        event_id,
        dorsal_number,
        MIN(total_time) as best_total_time
    FROM classifications 
    GROUP BY event_id, dorsal_number
)
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
            dbt.best_total_time ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
LEFT JOIN dorsal_best_times dbt ON c.event_id = dbt.event_id AND c.dorsal_number = dbt.dorsal_number
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY c.event_id, c.dorsal_number, c.total_time ASC NULLS LAST;
