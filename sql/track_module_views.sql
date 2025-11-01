-- ============================================================================
-- VISIONKRONO - GPS TRACKING - VIEWS AUXILIARES
-- ============================================================================

-- View de resumo de atividades
CREATE OR REPLACE VIEW v_track_activities_summary AS
SELECT 
    ta.id as activity_id,
    ta.status,
    e.name as event_name,
    e.event_date as event_date,
    p.full_name as participant_name,
    p.dorsal_number,
    p.category,
    tr.name as route_name,
    tr.distance_km as route_distance,
    ta.start_time,
    ta.end_time,
    ta.total_time_sec,
    to_char(ta.total_time_sec * interval '1 second', 'HH24:MI:SS') as formatted_time,
    ta.total_distance_m,
    ROUND(ta.total_distance_m / 1000.0, 2) as total_distance_km,
    ta.avg_speed_kmh,
    ta.max_speed_kmh,
    ta.avg_pace_min_km,
    ta.total_points,
    ta.valid_points,
    CASE 
        WHEN ta.total_points > 0 
        THEN ROUND((ta.valid_points::decimal / ta.total_points * 100), 1)
        ELSE NULL
    END as points_quality_pct,
    ta.avg_accuracy_m,
    ta.created_at,
    ta.updated_at
FROM track_activities ta
JOIN events e ON e.id = ta.event_id
JOIN participants p ON p.id = ta.participant_id
JOIN track_routes tr ON tr.id = ta.route_id;

-- View de QRs ativos
CREATE OR REPLACE VIEW v_track_active_qrs AS
SELECT 
    qr.id as qr_id,
    qr.qr_code,
    e.name as event_name,
    e.event_date as event_date,
    p.full_name as participant_name,
    p.dorsal_number,
    p.email as participant_email,
    qr.issued_at,
    qr.notes,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM track_activities ta 
            WHERE ta.participant_id = p.id 
            AND ta.event_id = e.id 
            AND ta.status IN ('armed', 'running', 'paused')
        ) THEN true
        ELSE false
    END as has_active_activity
FROM track_participant_qr qr
JOIN events e ON e.id = qr.event_id
JOIN participants p ON p.id = qr.participant_id
WHERE qr.status = 'active';

-- View de estatísticas por rota
CREATE OR REPLACE VIEW v_track_route_stats AS
SELECT 
    tr.id as route_id,
    tr.event_id,
    e.name as event_name,
    tr.name as route_name,
    tr.distance_km,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'finished') as total_finishers,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status IN ('armed', 'running', 'paused')) as currently_active,
    MIN(ta.total_time_sec) FILTER (WHERE ta.status = 'finished') as best_time_sec,
    to_char(MIN(ta.total_time_sec) * interval '1 second', 'HH24:MI:SS') as best_time_formatted,
    AVG(ta.total_time_sec) FILTER (WHERE ta.status = 'finished') as avg_time_sec,
    to_char(AVG(ta.total_time_sec) * interval '1 second', 'HH24:MI:SS') as avg_time,
    AVG(ta.avg_speed_kmh) FILTER (WHERE ta.status = 'finished') as avg_speed_kmh,
    AVG(ta.avg_accuracy_m) FILTER (WHERE ta.status = 'finished') as avg_gps_accuracy
FROM track_routes tr
JOIN events e ON e.id = tr.event_id
LEFT JOIN track_activities ta ON ta.route_id = tr.id
WHERE tr.is_active = true
GROUP BY tr.id, tr.event_id, e.name, tr.name, tr.distance_km;

-- Comentários
COMMENT ON VIEW v_track_activities_summary IS 'Resumo legível de todas as atividades de tracking';
COMMENT ON VIEW v_track_active_qrs IS 'QR codes ativos com informações do participante e evento';
COMMENT ON VIEW v_track_route_stats IS 'Estatísticas agregadas por rota';

