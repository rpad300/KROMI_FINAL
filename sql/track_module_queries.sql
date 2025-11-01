-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - QUERIES DE VERIFICAÇÃO
-- ============================================================================
-- Queries úteis para monitoramento, debug e relatórios
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAÇÃO DE INTEGRIDADE
-- ============================================================================

-- Verificar rotas sem evento
SELECT 
    tr.id,
    tr.name,
    tr.event_id as missing_event_id
FROM track_routes tr
LEFT JOIN events e ON e.id = tr.event_id
WHERE e.id IS NULL;

-- Verificar QRs sem participante ou evento
SELECT 
    qr.id,
    qr.qr_code,
    qr.event_id,
    qr.participant_id,
    CASE 
        WHEN e.id IS NULL THEN 'missing_event'
        WHEN p.id IS NULL THEN 'missing_participant'
    END as issue
FROM track_participant_qr qr
LEFT JOIN events e ON e.id = qr.event_id
LEFT JOIN participants p ON p.id = qr.participant_id
WHERE e.id IS NULL OR p.id IS NULL;

-- Verificar atividades órfãs
SELECT 
    ta.id,
    ta.event_id,
    ta.participant_id,
    ta.route_id,
    ta.status,
    CASE 
        WHEN e.id IS NULL THEN 'missing_event'
        WHEN p.id IS NULL THEN 'missing_participant'
        WHEN r.id IS NULL THEN 'missing_route'
    END as issue
FROM track_activities ta
LEFT JOIN events e ON e.id = ta.event_id
LEFT JOIN participants p ON p.id = ta.participant_id
LEFT JOIN track_routes r ON r.id = ta.route_id
WHERE e.id IS NULL OR p.id IS NULL OR r.id IS NULL;

-- Verificar pontos GPS sem atividade
SELECT 
    COUNT(*) as orphan_gps_points
FROM track_gps_live gps
LEFT JOIN track_activities ta ON ta.id = gps.activity_id
WHERE ta.id IS NULL;

-- ============================================================================
-- 2. DASHBOARD DE EVENTO
-- ============================================================================

-- Resumo geral de um evento
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.event_date,
    COUNT(DISTINCT tr.id) as total_routes,
    COUNT(DISTINCT tr.id) FILTER (WHERE tr.is_active) as active_routes,
    COUNT(DISTINCT qr.id) as total_qrs,
    COUNT(DISTINCT qr.id) FILTER (WHERE qr.status = 'active') as active_qrs,
    COUNT(DISTINCT ta.id) as total_activities,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'armed') as armed_activities,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'running') as running_activities,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'paused') as paused_activities,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'finished') as finished_activities,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'discarded') as discarded_activities,
    COUNT(gps.id) as total_gps_points,
    COUNT(gps.id) FILTER (WHERE gps.is_valid) as valid_gps_points
FROM events e
LEFT JOIN track_routes tr ON tr.event_id = e.id
LEFT JOIN track_participant_qr qr ON qr.event_id = e.id
LEFT JOIN track_activities ta ON ta.event_id = e.id
LEFT JOIN track_gps_live gps ON gps.activity_id = ta.id
WHERE e.id = '00000000-0000-0000-0000-000000000000'::uuid -- SUBSTITUIR com ID do evento
GROUP BY e.id, e.name, e.event_date;

-- ============================================================================
-- 3. MONITORAMENTO EM TEMPO REAL
-- ============================================================================

-- Atividades ativas agora (running ou paused)
SELECT 
    ta.id as activity_id,
    ta.status,
    e.name as event_name,
    tr.name as route_name,
    p.full_name as participant_name,
    p.dorsal_number,
    ta.start_time,
    EXTRACT(EPOCH FROM (NOW() - ta.start_time))::integer as elapsed_sec,
    to_char((NOW() - ta.start_time), 'HH24:MI:SS') as elapsed_formatted,
    ta.total_points,
    ta.valid_points,
    (
        SELECT COUNT(*) 
        FROM track_gps_live gps 
        WHERE gps.activity_id = ta.id 
        AND gps.device_ts > NOW() - INTERVAL '1 minute'
    ) as points_last_minute,
    (
        SELECT device_ts 
        FROM track_gps_live gps 
        WHERE gps.activity_id = ta.id 
        ORDER BY device_ts DESC 
        LIMIT 1
    ) as last_gps_update
FROM track_activities ta
JOIN events e ON e.id = ta.event_id
JOIN track_routes tr ON tr.id = ta.route_id
JOIN participants p ON p.id = ta.participant_id
WHERE ta.status IN ('running', 'paused')
ORDER BY ta.start_time DESC;

-- Últimas posições de cada atleta ativo
SELECT DISTINCT ON (ta.id)
    ta.id as activity_id,
    p.full_name as participant_name,
    p.dorsal_number,
    tr.name as route_name,
    gps.lat,
    gps.lng,
    gps.speed_kmh,
    gps.accuracy_m,
    gps.device_ts,
    NOW() - gps.device_ts as time_since_last_point,
    EXTRACT(EPOCH FROM (NOW() - ta.start_time))::integer as elapsed_sec
FROM track_activities ta
JOIN participants p ON p.id = ta.participant_id
JOIN track_routes tr ON tr.id = ta.route_id
LEFT JOIN track_gps_live gps ON gps.activity_id = ta.id AND gps.is_valid = true
WHERE ta.status IN ('running', 'paused')
ORDER BY ta.id, gps.device_ts DESC;

-- Estatísticas de ingestão em tempo real (últimos 5 minutos)
SELECT 
    date_trunc('minute', server_ts) as minute,
    COUNT(*) as total_points,
    COUNT(*) FILTER (WHERE is_valid) as valid_points,
    COUNT(DISTINCT activity_id) as active_activities,
    COUNT(DISTINCT batch_id) as batches,
    AVG(accuracy_m) FILTER (WHERE is_valid) as avg_accuracy,
    AVG(speed_kmh) FILTER (WHERE is_valid AND speed_kmh > 0) as avg_speed
FROM track_gps_live
WHERE server_ts > NOW() - INTERVAL '5 minutes'
GROUP BY date_trunc('minute', server_ts)
ORDER BY minute DESC;

-- ============================================================================
-- 4. RANKINGS E RESULTADOS
-- ============================================================================

-- Top 10 por rota
WITH ranked AS (
    SELECT 
        ta.route_id,
        tr.name as route_name,
        p.full_name as participant_name,
        p.dorsal_number,
        p.category,
        ta.total_time_sec,
        ta.avg_speed_kmh,
        ta.avg_pace_min_km,
        ta.total_distance_m / 1000.0 as distance_km,
        ta.end_time,
        ROW_NUMBER() OVER (
            PARTITION BY ta.route_id 
            ORDER BY ta.total_time_sec ASC
        ) as overall_rank,
        ROW_NUMBER() OVER (
            PARTITION BY ta.route_id, p.category 
            ORDER BY ta.total_time_sec ASC
        ) as category_rank
    FROM track_activities ta
    JOIN participants p ON p.id = ta.participant_id
    JOIN track_routes tr ON tr.id = ta.route_id
    WHERE ta.status = 'finished'
        AND ta.total_time_sec IS NOT NULL
)
SELECT 
    overall_rank,
    category_rank,
    route_name,
    participant_name,
    dorsal_number,
    category,
    to_char(total_time_sec * interval '1 second', 'HH24:MI:SS') as finish_time,
    ROUND(avg_speed_kmh, 2) as avg_speed_kmh,
    ROUND(avg_pace_min_km, 2) as avg_pace_min_km,
    ROUND(distance_km, 2) as distance_km,
    end_time
FROM ranked
WHERE overall_rank <= 10
ORDER BY route_id, overall_rank;

-- Estatísticas por categoria em uma rota
SELECT 
    p.category,
    COUNT(*) as finishers,
    MIN(ta.total_time_sec) as best_time_sec,
    to_char(MIN(ta.total_time_sec) * interval '1 second', 'HH24:MI:SS') as best_time,
    AVG(ta.total_time_sec) as avg_time_sec,
    to_char(AVG(ta.total_time_sec) * interval '1 second', 'HH24:MI:SS') as avg_time,
    MAX(ta.total_time_sec) as worst_time_sec,
    AVG(ta.avg_speed_kmh) as avg_speed_kmh
FROM track_activities ta
JOIN participants p ON p.id = ta.participant_id
WHERE ta.route_id = '00000000-0000-0000-0000-000000000000'::uuid -- SUBSTITUIR
    AND ta.status = 'finished'
    AND ta.total_time_sec IS NOT NULL
GROUP BY p.category
ORDER BY best_time_sec ASC;

-- ============================================================================
-- 5. ANÁLISE DE QUALIDADE DE DADOS
-- ============================================================================

-- Qualidade GPS por atividade
SELECT 
    ta.id as activity_id,
    p.full_name as participant_name,
    p.dorsal_number,
    tr.name as route_name,
    ta.status,
    ta.total_points,
    ta.valid_points,
    ROUND((ta.valid_points::decimal / NULLIF(ta.total_points, 0) * 100), 1) as quality_pct,
    ta.avg_accuracy_m,
    (
        SELECT COUNT(*) 
        FROM track_gps_live gps 
        WHERE gps.activity_id = ta.id 
        AND gps.validation_flags ? 'speed_exceeded'
    ) as points_speed_exceeded,
    (
        SELECT COUNT(*) 
        FROM track_gps_live gps 
        WHERE gps.activity_id = ta.id 
        AND gps.validation_flags ? 'accuracy_poor'
    ) as points_poor_accuracy,
    (
        SELECT MAX(device_ts) - MIN(device_ts)
        FROM track_gps_live gps 
        WHERE gps.activity_id = ta.id
    ) as gps_time_span
FROM track_activities ta
JOIN participants p ON p.id = ta.participant_id
JOIN track_routes tr ON tr.id = ta.route_id
WHERE ta.total_points > 0
ORDER BY quality_pct ASC, ta.total_points DESC;

-- Estatísticas de rejeição por tipo
SELECT 
    ta.route_id,
    tr.name as route_name,
    COUNT(*) FILTER (WHERE gps.validation_flags ? 'speed_exceeded') as speed_exceeded,
    COUNT(*) FILTER (WHERE gps.validation_flags ? 'accuracy_poor') as accuracy_poor,
    COUNT(*) FILTER (WHERE gps.validation_flags ? 'lat_invalid') as lat_invalid,
    COUNT(*) FILTER (WHERE gps.validation_flags ? 'lng_invalid') as lng_invalid,
    COUNT(*) FILTER (WHERE NOT gps.is_valid) as total_invalid,
    COUNT(*) as total_points,
    ROUND((COUNT(*) FILTER (WHERE NOT gps.is_valid)::decimal / COUNT(*) * 100), 2) as rejection_rate_pct
FROM track_gps_live gps
JOIN track_activities ta ON ta.id = gps.activity_id
JOIN track_routes tr ON tr.id = ta.route_id
GROUP BY ta.route_id, tr.name
ORDER BY rejection_rate_pct DESC;

-- ============================================================================
-- 6. ANÁLISE DE CHECKPOINTS
-- ============================================================================

-- Splits por checkpoint (para uma atividade específica)
SELECT 
    tc.order_index,
    tc.name as checkpoint_name,
    tc.distance_from_start_km,
    cp.pass_time,
    cp.elapsed_sec,
    to_char(cp.elapsed_sec * interval '1 second', 'HH24:MI:SS') as elapsed_formatted,
    cp.split_sec,
    to_char(cp.split_sec * interval '1 second', 'HH24:MI:SS') as split_formatted,
    CASE 
        WHEN tc.order_index > 0 THEN
            ROUND((cp.split_sec::decimal / NULLIF((tc.distance_from_start_km - LAG(tc.distance_from_start_km) OVER (ORDER BY tc.order_index)), 0)), 2)
        ELSE NULL
    END as pace_min_km,
    cp.distance_to_check_m
FROM track_activity_checkpass cp
JOIN track_checks tc ON tc.id = cp.check_id
WHERE cp.activity_id = '00000000-0000-0000-0000-000000000000'::uuid -- SUBSTITUIR
ORDER BY tc.order_index;

-- Comparação de splits entre participantes (para um checkpoint específico)
SELECT 
    p.full_name as participant_name,
    p.dorsal_number,
    cp.split_sec,
    to_char(cp.split_sec * interval '1 second', 'HH24:MI:SS') as split_time,
    ROW_NUMBER() OVER (ORDER BY cp.split_sec) as rank
FROM track_activity_checkpass cp
JOIN track_activities ta ON ta.id = cp.activity_id
JOIN participants p ON p.id = ta.participant_id
WHERE cp.check_id = '00000000-0000-0000-0000-000000000000'::uuid -- SUBSTITUIR
    AND ta.status = 'finished'
ORDER BY cp.split_sec;

-- ============================================================================
-- 7. AUDITORIA E SEGURANÇA
-- ============================================================================

-- Histórico de emissão/revogação de QR
SELECT 
    al.created_at,
    al.action,
    e.name as event_name,
    p.full_name as participant_name,
    p.dorsal_number,
    al.details,
    u.email as actor_email
FROM track_audit_log al
JOIN events e ON e.id = al.event_id
JOIN participants p ON p.id = al.participant_id
LEFT JOIN auth.users u ON u.id = al.actor_id
WHERE al.action IN ('qr_issued', 'qr_revoked')
ORDER BY al.created_at DESC
LIMIT 50;

-- Atividades armadas mas nunca iniciadas (possível problema)
SELECT 
    ta.id as activity_id,
    e.name as event_name,
    p.full_name as participant_name,
    p.dorsal_number,
    tr.name as route_name,
    ta.created_at,
    NOW() - ta.created_at as time_since_armed
FROM track_activities ta
JOIN events e ON e.id = ta.event_id
JOIN participants p ON p.id = ta.participant_id
JOIN track_routes tr ON tr.id = ta.route_id
WHERE ta.status = 'armed'
    AND ta.created_at < NOW() - INTERVAL '1 hour'
ORDER BY ta.created_at;

-- Sessões de dispositivo suspeitas (muitos pontos rejeitados)
SELECT 
    ds.device_id,
    ds.participant_id,
    p.full_name as participant_name,
    ds.event_id,
    e.name as event_name,
    ds.total_batches,
    ds.total_points,
    (
        SELECT COUNT(*) 
        FROM track_gps_live gps
        JOIN track_activities ta ON ta.id = gps.activity_id
        WHERE ta.participant_id = ds.participant_id
            AND ta.event_id = ds.event_id
            AND NOT gps.is_valid
    ) as rejected_points,
    ds.app_version,
    ds.started_at,
    ds.last_activity_at
FROM track_device_session ds
JOIN participants p ON p.id = ds.participant_id
JOIN events e ON e.id = ds.event_id
WHERE ds.total_points > 100
ORDER BY rejected_points DESC
LIMIT 20;

-- ============================================================================
-- 8. PERFORMANCE E OTIMIZAÇÃO
-- ============================================================================

-- Tamanho das tabelas
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE tablename LIKE 'track_%'
ORDER BY size_bytes DESC;

-- Contagem de registros por tabela
SELECT 
    'track_routes' as table_name,
    COUNT(*) as row_count
FROM track_routes
UNION ALL
SELECT 'track_participant_qr', COUNT(*) FROM track_participant_qr
UNION ALL
SELECT 'track_activities', COUNT(*) FROM track_activities
UNION ALL
SELECT 'track_gps_live', COUNT(*) FROM track_gps_live
UNION ALL
SELECT 'track_device_session', COUNT(*) FROM track_device_session
UNION ALL
SELECT 'track_checks', COUNT(*) FROM track_checks
UNION ALL
SELECT 'track_activity_checkpass', COUNT(*) FROM track_activity_checkpass
UNION ALL
SELECT 'track_audit_log', COUNT(*) FROM track_audit_log;

-- Índices e seu uso (requer pg_stat_user_indexes)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename LIKE 'track_%'
ORDER BY idx_scan DESC;

-- ============================================================================
-- 9. LIMPEZA E MANUTENÇÃO
-- ============================================================================

-- Pontos GPS antigos que podem ser arquivados (>30 dias e atividade finished)
SELECT 
    ta.event_id,
    e.name as event_name,
    COUNT(gps.id) as old_gps_points,
    pg_size_pretty(
        COUNT(gps.id)::bigint * 
        (SELECT avg(pg_column_size(track_gps_live.*)) FROM track_gps_live LIMIT 1000)::bigint
    ) as estimated_size
FROM track_gps_live gps
JOIN track_activities ta ON ta.id = gps.activity_id
JOIN events e ON e.id = ta.event_id
WHERE ta.status = 'finished'
    AND ta.end_time < NOW() - INTERVAL '30 days'
GROUP BY ta.event_id, e.name
ORDER BY old_gps_points DESC;

-- Script de arquivamento (comentado - executar manualmente)
/*
-- Criar tabela de arquivo se não existir
CREATE TABLE IF NOT EXISTS track_gps_archived (LIKE track_gps_live INCLUDING ALL);

-- Mover pontos antigos para arquivo
WITH moved AS (
    DELETE FROM track_gps_live gps
    WHERE EXISTS (
        SELECT 1 FROM track_activities ta
        WHERE ta.id = gps.activity_id
            AND ta.status = 'finished'
            AND ta.end_time < NOW() - INTERVAL '90 days'
    )
    RETURNING gps.*
)
INSERT INTO track_gps_archived
SELECT * FROM moved;
*/

-- ============================================================================
-- 10. RELATÓRIOS EXECUTIVOS
-- ============================================================================

-- Resumo por evento (últimos 30 dias)
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.event_date,
    COUNT(DISTINCT tr.id) as routes,
    COUNT(DISTINCT CASE WHEN ta.status = 'finished' THEN ta.participant_id END) as finishers,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'finished') as finished_activities,
    COUNT(gps.id) as total_gps_points,
    COUNT(gps.id) FILTER (WHERE gps.is_valid) as valid_gps_points,
    ROUND(AVG(ta.avg_accuracy_m) FILTER (WHERE ta.status = 'finished'), 1) as avg_gps_accuracy,
    MIN(ta.total_time_sec) FILTER (WHERE ta.status = 'finished') as best_time_sec,
    to_char(MIN(ta.total_time_sec) * interval '1 second', 'HH24:MI:SS') as best_time
FROM events e
LEFT JOIN track_routes tr ON tr.event_id = e.id
LEFT JOIN track_activities ta ON ta.event_id = e.id
LEFT JOIN track_gps_live gps ON gps.activity_id = ta.id
WHERE e.event_date >= NOW() - INTERVAL '30 days'
GROUP BY e.id, e.name, e.event_date
ORDER BY e.event_date DESC;

-- Taxa de conclusão por rota
SELECT 
    tr.id as route_id,
    tr.name as route_name,
    e.name as event_name,
    COUNT(DISTINCT qr.participant_id) as qrs_issued,
    COUNT(DISTINCT ta.id) as activities_created,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'armed') as armed,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status IN ('running', 'paused')) as in_progress,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'finished') as finished,
    COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'discarded') as discarded,
    ROUND(
        COUNT(DISTINCT ta.id) FILTER (WHERE ta.status = 'finished')::decimal / 
        NULLIF(COUNT(DISTINCT qr.participant_id), 0) * 100, 
        1
    ) as completion_rate_pct
FROM track_routes tr
JOIN events e ON e.id = tr.event_id
LEFT JOIN track_participant_qr qr ON qr.event_id = e.id
LEFT JOIN track_activities ta ON ta.route_id = tr.id
GROUP BY tr.id, tr.name, e.name
ORDER BY completion_rate_pct DESC;

-- ============================================================================
-- FIM DAS QUERIES
-- ============================================================================

