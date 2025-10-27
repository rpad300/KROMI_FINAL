-- Script para atualizar a view event_classifications com estatísticas avançadas
-- Execute este script no Supabase SQL Editor

-- 1. Remover view existente
DROP VIEW IF EXISTS event_classifications;

-- 2. Criar nova view com estatísticas avançadas
CREATE VIEW event_classifications AS
WITH dorsal_best_times AS (
    SELECT 
        event_id,
        dorsal_number,
        MIN(total_time) as best_total_time
    FROM classifications 
    GROUP BY event_id, dorsal_number
),
event_stats AS (
    SELECT 
        event_id,
        COUNT(DISTINCT dorsal_number) as total_athletes,
        MIN(best_total_time) as fastest_time
    FROM dorsal_best_times
    GROUP BY event_id
),
ranked_dorsals AS (
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
        dbt.best_total_time,
        -- Calcular posição baseada no melhor tempo total por dorsal
        ROW_NUMBER() OVER (
            PARTITION BY c.event_id 
            ORDER BY 
                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                dbt.best_total_time ASC NULLS LAST
        ) as position,
        -- Calcular tempo para o da frente (gap)
        CASE 
            WHEN ROW_NUMBER() OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    dbt.best_total_time ASC NULLS LAST
            ) = 1 THEN NULL -- Líder não tem gap
            ELSE dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    dbt.best_total_time ASC NULLS LAST
            )
        END as gap_to_leader,
        -- Calcular velocidade média (assumindo distância padrão de 10km)
        CASE 
            WHEN dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                (10.0 * 3600) / EXTRACT(EPOCH FROM dbt.best_total_time) -- km/h
            ELSE NULL
        END as avg_speed_kmh
    FROM classifications c
    JOIN dorsal_best_times dbt ON c.event_id = dbt.event_id AND c.dorsal_number = dbt.dorsal_number
    WHERE c.total_time = dbt.best_total_time -- Apenas o melhor tempo de cada dorsal
)
SELECT DISTINCT ON (rd.event_id, rd.dorsal_number)
    c.id,
    rd.event_id,
    rd.dorsal_number,
    rd.device_order,
    rd.checkpoint_time,
    rd.split_time,
    rd.total_time,
    rd.is_penalty,
    rd.penalty_reason,
    rd.detection_id,
    rd.position,
    rd.gap_to_leader,
    rd.avg_speed_kmh,
    e.event_started_at,
    e.name as event_name,
    es.total_athletes,
    es.fastest_time
FROM ranked_dorsals rd
JOIN classifications c ON rd.event_id = c.event_id AND rd.dorsal_number = c.dorsal_number AND rd.total_time = c.total_time
JOIN events e ON rd.event_id = e.id
JOIN event_stats es ON rd.event_id = es.event_id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY rd.event_id, rd.dorsal_number, rd.total_time ASC NULLS LAST;

-- 3. Testar a nova view
SELECT 'TESTE DA NOVA VIEW:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    gap_to_leader,
    avg_speed_kmh,
    total_athletes,
    fastest_time
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;
