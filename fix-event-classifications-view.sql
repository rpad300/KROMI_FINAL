-- =====================================================
-- VisionKrono - View event_classifications CORRIGIDA
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- Remover view existente
DROP VIEW IF EXISTS event_classifications;

-- Criar nova view com dados de voltas (sintaxe corrigida)
CREATE VIEW event_classifications AS
WITH dorsal_best_times AS (
    SELECT 
        event_id,
        dorsal_number,
        MIN(total_time) as best_total_time
    FROM classifications 
    GROUP BY event_id, dorsal_number
),
lap_statistics AS (
    SELECT 
        ld.event_id,
        ld.dorsal_number,
        COUNT(*) as total_laps,
        MIN(ld.lap_time) as fastest_lap,
        MAX(ld.lap_time) as slowest_lap,
        AVG(ld.lap_time) as avg_lap_time,
        AVG(ld.lap_speed_kmh) as avg_lap_speed,
        MAX(ld.lap_speed_kmh) as fastest_lap_speed,
        SUM(ld.lap_time) as total_lap_time
    FROM lap_data ld
    GROUP BY ld.event_id, ld.dorsal_number
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
        -- Dados de voltas (se disponíveis)
        ls.total_laps,
        ls.fastest_lap,
        ls.slowest_lap,
        ls.avg_lap_time,
        ls.avg_lap_speed,
        ls.fastest_lap_speed,
        ls.total_lap_time,
        -- Calcular posição baseada em voltas + tempo (se tem voltas) ou apenas tempo
        ROW_NUMBER() OVER (
            PARTITION BY c.event_id 
            ORDER BY 
                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                COALESCE(ls.total_laps, 0) DESC,
                dbt.best_total_time ASC NULLS LAST
        ) as position,
        -- Calcular tempo para o da frente (gap)
        CASE 
            WHEN ROW_NUMBER() OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    COALESCE(ls.total_laps, 0) DESC,
                    dbt.best_total_time ASC NULLS LAST
            ) = 1 THEN NULL -- Líder não tem gap
            ELSE 
                CASE 
                    WHEN ls.total_laps IS NOT NULL THEN
                        -- Gap baseado em voltas e tempo
                        CASE 
                            WHEN ls.total_laps < LAG(ls.total_laps) OVER (
                                PARTITION BY c.event_id 
                                ORDER BY 
                                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                    COALESCE(ls.total_laps, 0) DESC,
                                    dbt.best_total_time ASC NULLS LAST
                            ) THEN 
                                -- Menos voltas = penalidade
                                INTERVAL '999:59:59'
                            ELSE 
                                -- Mesmo número de voltas, calcular diferença de tempo
                                dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                                    PARTITION BY c.event_id 
                                    ORDER BY 
                                        CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                        COALESCE(ls.total_laps, 0) DESC,
                                        dbt.best_total_time ASC NULLS LAST
                                )
                        END
                    ELSE 
                        -- Sem voltas, gap normal
                        dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                            PARTITION BY c.event_id 
                            ORDER BY 
                                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                dbt.best_total_time ASC NULLS LAST
                        )
                END
        END as gap_to_leader,
        -- Calcular velocidade média (assumindo distância padrão de 10km se não especificada)
        CASE 
            WHEN e.distance_km IS NOT NULL AND e.distance_km > 0 AND dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                (e.distance_km / EXTRACT(EPOCH FROM dbt.best_total_time)) * 3600
            ELSE NULL
        END as avg_speed_kmh,
        -- Calcular ritmo por km (apenas para corridas)
        CASE 
            WHEN e.event_type = 'running' AND dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                EXTRACT(EPOCH FROM dbt.best_total_time) / COALESCE(e.distance_km, 10)
            ELSE NULL
        END as pace_per_km_seconds
    FROM classifications c
    JOIN dorsal_best_times dbt ON c.event_id = dbt.event_id AND c.dorsal_number = dbt.dorsal_number
    JOIN events e ON c.event_id = e.id
    LEFT JOIN lap_statistics ls ON c.event_id = ls.event_id AND c.dorsal_number = ls.dorsal_number
    WHERE c.total_time = dbt.best_total_time
),
category_rankings AS (
    SELECT 
        rd.*,
        p.full_name,
        p.team_name,
        p.category,
        p.gender,
        p.birth_date,
        -- Posição por categoria
        ROW_NUMBER() OVER (
            PARTITION BY rd.event_id, p.category 
            ORDER BY 
                CASE WHEN rd.is_penalty THEN 1 ELSE 0 END,
                COALESCE(rd.total_laps, 0) DESC,
                rd.best_total_time ASC NULLS LAST
        ) as category_position
    FROM ranked_dorsals rd
    LEFT JOIN participants p ON rd.event_id = p.event_id AND rd.dorsal_number = p.dorsal_number
)
SELECT DISTINCT ON (cr.event_id, cr.dorsal_number)
    c.id,
    cr.event_id,
    cr.dorsal_number,
    cr.device_order,
    cr.checkpoint_time,
    cr.split_time,
    cr.total_time,
    cr.is_penalty,
    cr.penalty_reason,
    cr.detection_id,
    cr.position,
    cr.gap_to_leader,
    cr.avg_speed_kmh,
    cr.pace_per_km_seconds,
    cr.category_position,
    cr.full_name,
    cr.team_name,
    cr.category,
    cr.gender,
    cr.birth_date,
    -- Dados de voltas
    cr.total_laps,
    cr.fastest_lap,
    cr.slowest_lap,
    cr.avg_lap_time,
    cr.avg_lap_speed,
    cr.fastest_lap_speed,
    cr.total_lap_time,
    e.event_started_at,
    e.name as event_name,
    e.event_type,
    e.distance_km,
    e.has_lap_counter,
    es.total_athletes,
    es.fastest_time
FROM category_rankings cr
JOIN classifications c ON cr.event_id = c.event_id AND cr.dorsal_number = c.dorsal_number AND cr.total_time = c.total_time
JOIN events e ON cr.event_id = e.id
JOIN event_stats es ON cr.event_id = es.event_id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY cr.event_id, cr.dorsal_number, cr.total_time ASC NULLS LAST;
