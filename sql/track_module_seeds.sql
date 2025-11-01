-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - SEEDS DE DEMONSTRAÇÃO
-- ============================================================================
-- Dados de teste para desenvolvimento e demonstração
-- ============================================================================

-- NOTA: Execute apenas em ambiente de desenvolvimento/teste!
-- Este script assume que já existem eventos e participantes nas tabelas base

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter ou criar evento de demo
-- ============================================================================
DO $$
DECLARE
    v_event_id UUID;
    v_organizer_id UUID;
    v_route_id_10k UUID;
    v_route_id_21k UUID;
    v_participant_1 UUID;
    v_participant_2 UUID;
    v_participant_3 UUID;
    v_qr_1 VARCHAR;
    v_qr_2 VARCHAR;
    v_qr_3 VARCHAR;
    v_activity_1 UUID;
    v_activity_2 UUID;
BEGIN
    -- Tentar obter um evento existente ou criar um de demo
    SELECT id INTO v_event_id
    FROM events
    WHERE name LIKE '%Demo GPS%'
    LIMIT 1;
    
    -- Se não existe, criar evento de demonstração
    IF v_event_id IS NULL THEN
        -- Organizador NULL por enquanto (ou pegar first user)
        v_organizer_id := NULL;
        
        -- Criar evento
        INSERT INTO events (
            name,
            description,
            event_type,
            event_date,
            location,
            organizer_id,
            is_active
        ) VALUES (
            'Corrida Demo GPS Tracking',
            'Evento de demonstração do módulo de tracking GPS em tempo real',
            'running',
            NOW() + INTERVAL '7 days',
            'Lisboa, Portugal',
            v_organizer_id,
            true
        ) RETURNING id INTO v_event_id;
        
        RAISE NOTICE 'Evento demo criado: %', v_event_id;
    ELSE
        RAISE NOTICE 'Usando evento existente: %', v_event_id;
    END IF;
    
    -- ========================================================================
    -- CRIAR ROTAS
    -- ========================================================================
    
    -- Rota 10K
    INSERT INTO track_routes (
        event_id,
        name,
        description,
        distance_km,
        elev_gain_m,
        elev_loss_m,
        map_center_lat,
        map_center_lng,
        map_zoom,
        max_speed_kmh,
        max_accuracy_m,
        is_active
    ) VALUES (
        v_event_id,
        '10K - Percurso Urbano',
        'Percurso plano de 10km pelo centro histórico',
        10.0,
        85.0,
        85.0,
        38.7223,  -- Lisboa
        -9.1393,
        14,
        25.0,
        30.0,
        true
    ) RETURNING id INTO v_route_id_10k;
    
    -- Rota Meia Maratona
    INSERT INTO track_routes (
        event_id,
        name,
        description,
        distance_km,
        elev_gain_m,
        elev_loss_m,
        map_center_lat,
        map_center_lng,
        map_zoom,
        max_speed_kmh,
        max_accuracy_m,
        is_active
    ) VALUES (
        v_event_id,
        '21K - Meia Maratona',
        'Percurso com subidas pela margem do Tejo',
        21.1,
        245.0,
        245.0,
        38.7223,
        -9.1393,
        13,
        30.0,
        35.0,
        true
    ) RETURNING id INTO v_route_id_21k;
    
    RAISE NOTICE 'Rotas criadas: 10K (%) e 21K (%)', v_route_id_10k, v_route_id_21k;
    
    -- ========================================================================
    -- CRIAR CHECKPOINTS PARA 10K
    -- ========================================================================
    
    INSERT INTO track_checks (event_id, route_id, name, lat, lng, radius_m, order_index, distance_from_start_km) VALUES
        (v_event_id, v_route_id_10k, 'Partida', 38.7223, -9.1393, 50, 0, 0),
        (v_event_id, v_route_id_10k, 'KM 2.5', 38.7245, -9.1420, 30, 1, 2.5),
        (v_event_id, v_route_id_10k, 'KM 5 - Hidratação', 38.7190, -9.1450, 40, 2, 5.0),
        (v_event_id, v_route_id_10k, 'KM 7.5', 38.7160, -9.1380, 30, 3, 7.5),
        (v_event_id, v_route_id_10k, 'Meta 10K', 38.7223, -9.1393, 50, 4, 10.0);
    
    -- ========================================================================
    -- CRIAR CHECKPOINTS PARA 21K
    -- ========================================================================
    
    INSERT INTO track_checks (event_id, route_id, name, lat, lng, radius_m, order_index, distance_from_start_km) VALUES
        (v_event_id, v_route_id_21k, 'Partida', 38.7223, -9.1393, 50, 0, 0),
        (v_event_id, v_route_id_21k, 'KM 5', 38.7300, -9.1500, 30, 1, 5.0),
        (v_event_id, v_route_id_21k, 'KM 10 - Hidratação', 38.7400, -9.1600, 40, 2, 10.0),
        (v_event_id, v_route_id_21k, 'KM 15', 38.7250, -9.1700, 30, 3, 15.0),
        (v_event_id, v_route_id_21k, 'KM 20', 38.7150, -9.1500, 30, 4, 20.0),
        (v_event_id, v_route_id_21k, 'Meta 21K', 38.7223, -9.1393, 50, 5, 21.1);
    
    RAISE NOTICE 'Checkpoints criados para ambas as rotas';
    
    -- ========================================================================
    -- CRIAR PARTICIPANTES DEMO (se não existirem)
    -- ========================================================================
    
    -- Participante 1
    SELECT id INTO v_participant_1
    FROM participants
    WHERE event_id = v_event_id
    AND full_name = 'João Silva Demo'
    LIMIT 1;
    
    IF v_participant_1 IS NULL THEN
        INSERT INTO participants (
            event_id,
            full_name,
            email,
            dorsal_number,
            category,
            registration_status
        ) VALUES (
            v_event_id,
            'João Silva Demo',
            'joao.demo@visionkrono.com',
            1,
            'M40',
            'paid'
        ) RETURNING id INTO v_participant_1;
    END IF;
    
    -- Participante 2
    SELECT id INTO v_participant_2
    FROM participants
    WHERE event_id = v_event_id
    AND full_name = 'Maria Santos Demo'
    LIMIT 1;
    
    IF v_participant_2 IS NULL THEN
        INSERT INTO participants (
            event_id,
            full_name,
            email,
            dorsal_number,
            category,
            registration_status
        ) VALUES (
            v_event_id,
            'Maria Santos Demo',
            'maria.demo@visionkrono.com',
            2,
            'F35',
            'paid'
        ) RETURNING id INTO v_participant_2;
    END IF;
    
    -- Participante 3
    SELECT id INTO v_participant_3
    FROM participants
    WHERE event_id = v_event_id
    AND full_name = 'Pedro Costa Demo'
    LIMIT 1;
    
    IF v_participant_3 IS NULL THEN
        INSERT INTO participants (
            event_id,
            full_name,
            email,
            dorsal_number,
            category,
            registration_status
        ) VALUES (
            v_event_id,
            'Pedro Costa Demo',
            'pedro.demo@visionkrono.com',
            3,
            'M25',
            'paid'
        ) RETURNING id INTO v_participant_3;
    END IF;
    
    RAISE NOTICE 'Participantes: % / % / %', v_participant_1, v_participant_2, v_participant_3;
    
    -- ========================================================================
    -- EMITIR QR CODES
    -- ========================================================================
    
    -- QR para João
    v_qr_1 := 'VK-TRACK-DEMO-JOAO-' || gen_random_uuid();
    INSERT INTO track_participant_qr (
        event_id,
        participant_id,
        qr_code,
        status,
        notes
    ) VALUES (
        v_event_id,
        v_participant_1,
        v_qr_1,
        'active',
        'QR de demonstração'
    );
    
    -- QR para Maria
    v_qr_2 := 'VK-TRACK-DEMO-MARIA-' || gen_random_uuid();
    INSERT INTO track_participant_qr (
        event_id,
        participant_id,
        qr_code,
        status,
        notes
    ) VALUES (
        v_event_id,
        v_participant_2,
        v_qr_2,
        'active',
        'QR de demonstração'
    );
    
    -- QR para Pedro
    v_qr_3 := 'VK-TRACK-DEMO-PEDRO-' || gen_random_uuid();
    INSERT INTO track_participant_qr (
        event_id,
        participant_id,
        qr_code,
        status,
        notes
    ) VALUES (
        v_event_id,
        v_participant_3,
        v_qr_3,
        'active',
        'QR de demonstração'
    );
    
    RAISE NOTICE 'QR Codes emitidos';
    
    -- ========================================================================
    -- CRIAR ATIVIDADES DE DEMO
    -- ========================================================================
    
    -- Atividade 1: João na rota 10K (armed, pronto para iniciar)
    INSERT INTO track_activities (
        event_id,
        participant_id,
        route_id,
        status,
        source
    ) VALUES (
        v_event_id,
        v_participant_1,
        v_route_id_10k,
        'armed',
        'backoffice'
    ) RETURNING id INTO v_activity_1;
    
    -- Atividade 2: Maria na rota 21K (finished, com dados completos)
    INSERT INTO track_activities (
        event_id,
        participant_id,
        route_id,
        status,
        start_time,
        end_time,
        total_time_sec,
        total_distance_m,
        avg_speed_kmh,
        max_speed_kmh,
        avg_pace_min_km,
        elev_gain_m,
        elev_loss_m,
        total_points,
        valid_points,
        avg_accuracy_m,
        source
    ) VALUES (
        v_event_id,
        v_participant_2,
        v_route_id_21k,
        'finished',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '10 minutes',
        6540,  -- 1h49min (6.54 min/km pace)
        21100,
        11.6,
        18.5,
        5.17,
        245.0,
        245.0,
        2500,
        2450,
        12.5,
        'mobile_app'
    ) RETURNING id INTO v_activity_2;
    
    RAISE NOTICE 'Atividades criadas: % (armed), % (finished)', v_activity_1, v_activity_2;
    
    -- ========================================================================
    -- CRIAR PONTOS GPS DE EXEMPLO PARA ATIVIDADE FINISHED
    -- ========================================================================
    
    -- Simular 50 pontos GPS ao longo do percurso de Maria
    INSERT INTO track_gps_live (
        activity_id,
        participant_id,
        lat,
        lng,
        alt_m,
        speed_kmh,
        accuracy_m,
        bearing,
        device_ts,
        is_valid
    )
    SELECT 
        v_activity_2,
        v_participant_2,
        38.7223 + (random() - 0.5) * 0.05,  -- Variação de ~5km
        -9.1393 + (random() - 0.5) * 0.05,
        (random() * 50)::decimal(8,2),      -- Altitude 0-50m
        (8 + random() * 8)::decimal(6,3),   -- Velocidade 8-16 km/h
        (5 + random() * 15)::decimal(6,2),  -- Precisão 5-20m
        (random() * 360)::decimal(5,2),     -- Direção aleatória
        NOW() - INTERVAL '2 hours' + (i * INTERVAL '2.6 minutes'),  -- ~130 minutos / 50 pontos
        true
    FROM generate_series(1, 50) as i;
    
    RAISE NOTICE '50 pontos GPS simulados para atividade %', v_activity_2;
    
    -- ========================================================================
    -- CRIAR PASSAGENS EM CHECKPOINTS PARA MARIA
    -- ========================================================================
    
    INSERT INTO track_activity_checkpass (
        activity_id,
        check_id,
        pass_time,
        distance_m,
        elapsed_sec,
        split_sec
    )
    SELECT 
        v_activity_2,
        tc.id,
        NOW() - INTERVAL '2 hours' + (tc.distance_from_start_km / 21.1 * INTERVAL '109 minutes'),
        tc.distance_from_start_km * 1000,
        (tc.distance_from_start_km / 21.1 * 6540)::integer,
        CASE 
            WHEN tc.order_index = 0 THEN 0
            ELSE ((tc.distance_from_start_km - LAG(tc.distance_from_start_km) OVER (ORDER BY tc.order_index)) / 21.1 * 6540)::integer
        END
    FROM track_checks tc
    WHERE tc.route_id = v_route_id_21k
    ORDER BY tc.order_index;
    
    RAISE NOTICE 'Passagens em checkpoints criadas para atividade %', v_activity_2;
    
    -- ========================================================================
    -- CRIAR DEVICE SESSION
    -- ========================================================================
    
    INSERT INTO track_device_session (
        participant_id,
        event_id,
        device_id,
        device_type,
        app_version,
        total_batches,
        total_points,
        is_active
    ) VALUES (
        v_participant_2,
        v_event_id,
        'ANDROID-DEMO-' || v_participant_2,
        'android',
        '1.0.0',
        25,
        2500,
        false
    );
    
    RAISE NOTICE 'Device session criada';
    
    -- ========================================================================
    -- RESUMO
    -- ========================================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEEDS DE DEMONSTRAÇÃO CRIADOS COM SUCESSO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Evento ID: %', v_event_id;
    RAISE NOTICE 'Rotas: 10K (%) e 21K (%)', v_route_id_10k, v_route_id_21k;
    RAISE NOTICE 'Participantes: 3';
    RAISE NOTICE 'QR Codes: 3 (ativos)';
    RAISE NOTICE 'Atividades:';
    RAISE NOTICE '  - % (João, 10K, armed - pronto para tracking)', v_activity_1;
    RAISE NOTICE '  - % (Maria, 21K, finished - com dados completos)', v_activity_2;
    RAISE NOTICE '  - Pedro sem atividade ainda';
    RAISE NOTICE 'Checkpoints: 5 (10K) + 6 (21K)';
    RAISE NOTICE 'Pontos GPS: 50 (atividade de Maria)';
    RAISE NOTICE '';
    RAISE NOTICE 'QR Codes para teste:';
    RAISE NOTICE '  João:  %', v_qr_1;
    RAISE NOTICE '  Maria: %', v_qr_2;
    RAISE NOTICE '  Pedro: %', v_qr_3;
    RAISE NOTICE '========================================';
    
END $$;

-- ============================================================================
-- VIEWS AUXILIARES PARA CONSULTAS RÁPIDAS
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

COMMENT ON VIEW v_track_activities_summary IS 'Resumo legível de todas as atividades de tracking';

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

COMMENT ON VIEW v_track_active_qrs IS 'QR codes ativos com informações do participante e evento';

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
    AVG(ta.avg_speed_kmh) FILTER (WHERE ta.status = 'finished') as avg_speed_kmh,
    AVG(ta.avg_accuracy_m) FILTER (WHERE ta.status = 'finished') as avg_gps_accuracy
FROM track_routes tr
JOIN events e ON e.id = tr.event_id
LEFT JOIN track_activities ta ON ta.route_id = tr.id
WHERE tr.is_active = true
GROUP BY tr.id, tr.event_id, e.name, tr.name, tr.distance_km;

COMMENT ON VIEW v_track_route_stats IS 'Estatísticas agregadas por rota';

-- ============================================================================
-- FIM DOS SEEDS
-- ============================================================================

