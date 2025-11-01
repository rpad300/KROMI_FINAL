-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - FUNÇÕES E RPCs
-- ============================================================================
-- Lógica de negócio para operações do módulo de tracking
-- ============================================================================

-- ============================================================================
-- 1. EMITIR/REEMITIR QR CODE
-- ============================================================================
CREATE OR REPLACE FUNCTION track_issue_qr(
    p_event_id UUID,
    p_participant_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_qr_code VARCHAR(255);
    v_qr_id UUID;
    v_event_exists BOOLEAN;
    v_participant_exists BOOLEAN;
    v_old_qr_id UUID;
BEGIN
    -- Validar que evento existe
    SELECT EXISTS(SELECT 1 FROM events WHERE id = p_event_id) INTO v_event_exists;
    IF NOT v_event_exists THEN
        RAISE EXCEPTION 'Event not found: %', p_event_id;
    END IF;
    
    -- Validar que participante existe e pertence ao evento
    SELECT EXISTS(
        SELECT 1 FROM participants 
        WHERE id = p_participant_id AND event_id = p_event_id
    ) INTO v_participant_exists;
    
    IF NOT v_participant_exists THEN
        RAISE EXCEPTION 'Participant not found or does not belong to event';
    END IF;
    
    -- Revogar QR ativo anterior se existir
    UPDATE track_participant_qr
    SET status = 'revoked',
        revoked_at = NOW(),
        revoked_by = auth.uid()
    WHERE event_id = p_event_id
        AND participant_id = p_participant_id
        AND status = 'active'
    RETURNING id INTO v_old_qr_id;
    
    -- Gerar novo código QR (token seguro)
    v_qr_code := 'VK-TRACK-' || 
                 encode(gen_random_bytes(16), 'base64') || 
                 '-' || 
                 extract(epoch from now())::text;
    
    -- Remover caracteres problemáticos do base64
    v_qr_code := replace(replace(replace(v_qr_code, '/', '_'), '+', '-'), '=', '');
    
    -- Inserir novo QR
    INSERT INTO track_participant_qr (
        event_id,
        participant_id,
        qr_code,
        status,
        notes,
        issued_by
    ) VALUES (
        p_event_id,
        p_participant_id,
        v_qr_code,
        'active',
        p_notes,
        auth.uid()
    ) RETURNING id INTO v_qr_id;
    
    -- Registrar em audit log
    INSERT INTO track_audit_log (
        event_id,
        participant_id,
        action,
        actor_id,
        details
    ) VALUES (
        p_event_id,
        p_participant_id,
        'qr_issued',
        auth.uid(),
        json_build_object(
            'new_qr_id', v_qr_id,
            'old_qr_id', v_old_qr_id,
            'notes', p_notes
        )
    );
    
    -- Retornar dados do QR
    RETURN json_build_object(
        'success', true,
        'qr_id', v_qr_id,
        'qr_code', v_qr_code,
        'revoked_previous', v_old_qr_id IS NOT NULL,
        'old_qr_id', v_old_qr_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. VALIDAR QR CODE
-- ============================================================================
CREATE OR REPLACE FUNCTION track_validate_qr(
    p_qr_code VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    v_qr RECORD;
BEGIN
    -- Buscar QR ativo
    SELECT 
        qr.id,
        qr.event_id,
        qr.participant_id,
        qr.status,
        qr.issued_at,
        e.name as event_name,
        e.event_date as event_date,
        p.full_name as participant_name,
        p.dorsal_number
    INTO v_qr
    FROM track_participant_qr qr
    JOIN eventos e ON e.id = qr.event_id
    JOIN participants p ON p.id = qr.participant_id
    WHERE qr.qr_code = p_qr_code;
    
    -- QR não encontrado
    IF v_qr.id IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code not found'
        );
    END IF;
    
    -- QR revogado
    IF v_qr.status = 'revoked' THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'QR code has been revoked'
        );
    END IF;
    
    -- QR válido
    RETURN json_build_object(
        'valid', true,
        'qr_id', v_qr.id,
        'event_id', v_qr.event_id,
        'event_name', v_qr.event_name,
        'event_date', v_qr.event_date,
        'participant_id', v_qr.participant_id,
        'participant_name', v_qr.participant_name,
        'dorsal_number', v_qr.dorsal_number,
        'issued_at', v_qr.issued_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. ARMAR ATIVIDADE (ARM ACTIVITY)
-- ============================================================================
CREATE OR REPLACE FUNCTION track_arm_activity(
    p_qr_code VARCHAR(255),
    p_route_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_qr RECORD;
    v_route RECORD;
    v_existing_activity UUID;
    v_activity_id UUID;
BEGIN
    -- Validar QR
    SELECT id, event_id, participant_id, status
    INTO v_qr
    FROM track_participant_qr
    WHERE qr_code = p_qr_code;
    
    IF v_qr.id IS NULL THEN
        RAISE EXCEPTION 'QR code not found';
    END IF;
    
    IF v_qr.status != 'active' THEN
        RAISE EXCEPTION 'QR code is not active (status: %)', v_qr.status;
    END IF;
    
    -- Validar rota
    SELECT id, event_id, name, is_active
    INTO v_route
    FROM track_routes
    WHERE id = p_route_id;
    
    IF v_route.id IS NULL THEN
        RAISE EXCEPTION 'Route not found';
    END IF;
    
    IF v_route.event_id != v_qr.event_id THEN
        RAISE EXCEPTION 'Route does not belong to the same event as QR code';
    END IF;
    
    IF NOT v_route.is_active THEN
        RAISE EXCEPTION 'Route is not active';
    END IF;
    
    -- Verificar se já existe atividade ativa para este participante/evento
    SELECT id INTO v_existing_activity
    FROM track_activities
    WHERE event_id = v_qr.event_id
        AND participant_id = v_qr.participant_id
        AND status IN ('armed', 'running', 'paused')
    LIMIT 1;
    
    IF v_existing_activity IS NOT NULL THEN
        RAISE EXCEPTION 'Participant already has an active activity (ID: %). Please finish or discard it first.', v_existing_activity;
    END IF;
    
    -- Criar nova atividade em status 'armed'
    INSERT INTO track_activities (
        event_id,
        participant_id,
        route_id,
        status,
        source,
        created_by
    ) VALUES (
        v_qr.event_id,
        v_qr.participant_id,
        p_route_id,
        'armed',
        'backoffice',
        auth.uid()
    ) RETURNING id INTO v_activity_id;
    
    -- Registrar em audit log
    INSERT INTO track_audit_log (
        event_id,
        participant_id,
        activity_id,
        action,
        actor_id,
        details
    ) VALUES (
        v_qr.event_id,
        v_qr.participant_id,
        v_activity_id,
        'activity_armed',
        auth.uid(),
        json_build_object(
            'qr_id', v_qr.id,
            'route_id', p_route_id,
            'route_name', v_route.name,
            'notes', p_notes
        )
    );
    
    -- Retornar dados da atividade
    RETURN json_build_object(
        'success', true,
        'activity_id', v_activity_id,
        'event_id', v_qr.event_id,
        'participant_id', v_qr.participant_id,
        'route_id', p_route_id,
        'status', 'armed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. RECEBER BATCH DE PONTOS GPS
-- ============================================================================
CREATE OR REPLACE FUNCTION track_submit_gps_batch(
    p_activity_id UUID,
    p_points JSONB, -- Array de pontos: [{lat, lng, alt_m, speed_kmh, accuracy_m, bearing, device_ts}, ...]
    p_device_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_activity RECORD;
    v_route RECORD;
    v_batch_id UUID;
    v_point JSONB;
    v_seq INTEGER := 0;
    v_inserted INTEGER := 0;
    v_rejected INTEGER := 0;
    v_first_batch BOOLEAN := false;
    v_validation_flags JSONB;
    v_is_valid BOOLEAN;
BEGIN
    v_batch_id := gen_random_uuid();
    
    -- Buscar atividade e rota
    SELECT 
        ta.*,
        tr.max_speed_kmh,
        tr.max_accuracy_m
    INTO v_activity
    FROM track_activities ta
    JOIN track_routes tr ON tr.id = ta.route_id
    WHERE ta.id = p_activity_id;
    
    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'Activity not found';
    END IF;
    
    -- Verificar permissões (participante deve ser dono da atividade)
    IF NOT is_my_participant(v_activity.participant_id) THEN
        RAISE EXCEPTION 'Not authorized to submit points for this activity';
    END IF;
    
    -- Validar status
    IF v_activity.status NOT IN ('armed', 'running', 'paused') THEN
        RAISE EXCEPTION 'Activity status does not allow GPS submission (current: %)', v_activity.status;
    END IF;
    
    -- Se é o primeiro batch e atividade está armed, mudar para running
    IF v_activity.status = 'armed' THEN
        UPDATE track_activities
        SET status = 'running',
            start_time = NOW()
        WHERE id = p_activity_id;
        
        v_first_batch := true;
        
        -- Audit log
        INSERT INTO track_audit_log (
            event_id,
            participant_id,
            activity_id,
            action,
            actor_id,
            details
        ) VALUES (
            v_activity.event_id,
            v_activity.participant_id,
            p_activity_id,
            'activity_started',
            auth.uid(),
            json_build_object('batch_id', v_batch_id)
        );
    END IF;
    
    -- Processar cada ponto
    FOR v_point IN SELECT * FROM jsonb_array_elements(p_points)
    LOOP
        v_seq := v_seq + 1;
        v_is_valid := true;
        v_validation_flags := '{}'::jsonb;
        
        -- Validações
        -- 1. Velocidade máxima
        IF (v_point->>'speed_kmh')::decimal > v_activity.max_speed_kmh THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('speed_exceeded', true);
        END IF;
        
        -- 2. Precisão GPS
        IF (v_point->>'accuracy_m')::decimal > v_activity.max_accuracy_m THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('accuracy_poor', true);
        END IF;
        
        -- 3. Coordenadas válidas
        IF (v_point->>'lat')::decimal < -90 OR (v_point->>'lat')::decimal > 90 THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('lat_invalid', true);
        END IF;
        
        IF (v_point->>'lng')::decimal < -180 OR (v_point->>'lng')::decimal > 180 THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('lng_invalid', true);
        END IF;
        
        -- Inserir ponto
        BEGIN
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
                batch_id,
                seq,
                is_valid,
                validation_flags
            ) VALUES (
                p_activity_id,
                v_activity.participant_id,
                (v_point->>'lat')::decimal,
                (v_point->>'lng')::decimal,
                (v_point->>'alt_m')::decimal,
                (v_point->>'speed_kmh')::decimal,
                (v_point->>'accuracy_m')::decimal,
                (v_point->>'bearing')::decimal,
                (v_point->>'device_ts')::timestamptz,
                v_batch_id,
                v_seq,
                v_is_valid,
                NULLIF(v_validation_flags, '{}'::jsonb)
            );
            
            IF v_is_valid THEN
                v_inserted := v_inserted + 1;
            ELSE
                v_rejected := v_rejected + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_rejected := v_rejected + 1;
        END;
    END LOOP;
    
    -- Atualizar contadores da atividade
    UPDATE track_activities
    SET total_points = total_points + v_inserted + v_rejected,
        valid_points = valid_points + v_inserted,
        updated_at = NOW()
    WHERE id = p_activity_id;
    
    -- Atualizar device session se fornecido
    IF p_device_id IS NOT NULL THEN
        INSERT INTO track_device_session (
            participant_id,
            event_id,
            device_id,
            total_batches,
            total_points
        ) VALUES (
            v_activity.participant_id,
            v_activity.event_id,
            p_device_id,
            1,
            v_inserted + v_rejected
        )
        ON CONFLICT (participant_id, event_id, device_id) 
        WHERE is_active = true
        DO UPDATE SET
            total_batches = track_device_session.total_batches + 1,
            total_points = track_device_session.total_points + v_inserted + v_rejected,
            last_activity_at = NOW();
    END IF;
    
    -- Retornar resultado
    RETURN json_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'activity_id', p_activity_id,
        'points_inserted', v_inserted,
        'points_rejected', v_rejected,
        'first_batch', v_first_batch,
        'activity_status', CASE WHEN v_first_batch THEN 'running' ELSE v_activity.status END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FINALIZAR ATIVIDADE
-- ============================================================================
CREATE OR REPLACE FUNCTION track_finish_activity(
    p_activity_id UUID,
    p_force BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    v_activity RECORD;
    v_stats RECORD;
    v_summary_points JSONB;
BEGIN
    -- Buscar atividade
    SELECT * INTO v_activity
    FROM track_activities
    WHERE id = p_activity_id;
    
    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'Activity not found';
    END IF;
    
    -- Verificar permissões
    IF NOT (is_my_participant(v_activity.participant_id) OR is_event_staff(v_activity.event_id)) THEN
        RAISE EXCEPTION 'Not authorized to finish this activity';
    END IF;
    
    -- Validar status
    IF v_activity.status NOT IN ('running', 'paused', 'armed') AND NOT p_force THEN
        RAISE EXCEPTION 'Activity cannot be finished from status: %', v_activity.status;
    END IF;
    
    -- Calcular estatísticas a partir dos pontos GPS
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_valid = true) as valid,
        AVG(accuracy_m) FILTER (WHERE is_valid = true) as avg_accuracy,
        MAX(speed_kmh) FILTER (WHERE is_valid = true) as max_speed
    INTO v_stats
    FROM track_gps_live
    WHERE activity_id = p_activity_id;
    
    -- Calcular distância total (simplificado - Haversine entre pontos consecutivos)
    -- Em produção, considerar usar PostGIS para cálculos mais precisos
    
    -- Gerar polyline simplificada (pegar pontos a cada N segundos)
    SELECT jsonb_agg(
        jsonb_build_object('lat', lat, 'lng', lng)
        ORDER BY device_ts
    )
    INTO v_summary_points
    FROM (
        SELECT DISTINCT ON (date_trunc('minute', device_ts))
            lat, lng, device_ts
        FROM track_gps_live
        WHERE activity_id = p_activity_id
            AND is_valid = true
        ORDER BY date_trunc('minute', device_ts), device_ts
        LIMIT 500
    ) simplified;
    
    -- Atualizar atividade
    UPDATE track_activities
    SET status = 'finished',
        end_time = NOW(),
        total_time_sec = EXTRACT(EPOCH FROM (NOW() - COALESCE(start_time, NOW())))::integer,
        total_points = v_stats.total,
        valid_points = v_stats.valid,
        avg_accuracy_m = v_stats.avg_accuracy,
        max_speed_kmh = v_stats.max_speed,
        summary_points = v_summary_points,
        finished_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_activity_id;
    
    -- Audit log
    INSERT INTO track_audit_log (
        event_id,
        participant_id,
        activity_id,
        action,
        actor_id,
        details
    ) VALUES (
        v_activity.event_id,
        v_activity.participant_id,
        p_activity_id,
        'activity_finished',
        auth.uid(),
        json_build_object(
            'total_points', v_stats.total,
            'valid_points', v_stats.valid,
            'forced', p_force
        )
    );
    
    -- Retornar resultado
    RETURN json_build_object(
        'success', true,
        'activity_id', p_activity_id,
        'status', 'finished',
        'total_points', v_stats.total,
        'valid_points', v_stats.valid,
        'avg_accuracy_m', v_stats.avg_accuracy,
        'max_speed_kmh', v_stats.max_speed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. OBTER POSIÇÕES LIVE (para dashboard)
-- ============================================================================
CREATE OR REPLACE FUNCTION track_get_live_positions(
    p_event_id UUID,
    p_route_id UUID DEFAULT NULL
)
RETURNS TABLE (
    activity_id UUID,
    participant_id UUID,
    participant_name TEXT,
    dorsal_number VARCHAR,
    route_id UUID,
    route_name VARCHAR,
    status VARCHAR,
    lat DECIMAL,
    lng DECIMAL,
    speed_kmh DECIMAL,
    last_update TIMESTAMPTZ,
    elapsed_sec INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ta.id)
        ta.id as activity_id,
        ta.participant_id,
        p.full_name as participant_name,
        p.dorsal_number,
        ta.route_id,
        tr.name as route_name,
        ta.status,
        gps.lat,
        gps.lng,
        gps.speed_kmh,
        gps.device_ts as last_update,
        EXTRACT(EPOCH FROM (NOW() - ta.start_time))::integer as elapsed_sec
    FROM track_activities ta
    JOIN participants p ON p.id = ta.participant_id
    JOIN track_routes tr ON tr.id = ta.route_id
    LEFT JOIN track_gps_live gps ON gps.activity_id = ta.id AND gps.is_valid = true
    WHERE ta.event_id = p_event_id
        AND ta.status IN ('running', 'paused')
        AND (p_route_id IS NULL OR ta.route_id = p_route_id)
    ORDER BY ta.id, gps.device_ts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. OBTER RANKINGS
-- ============================================================================
CREATE OR REPLACE FUNCTION track_get_rankings(
    p_event_id UUID,
    p_route_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    rank INTEGER,
    activity_id UUID,
    participant_id UUID,
    participant_name TEXT,
    dorsal_number VARCHAR,
    route_name VARCHAR,
    total_time_sec INTEGER,
    formatted_time TEXT,
    avg_speed_kmh DECIMAL,
    avg_pace_min_km DECIMAL,
    total_distance_m DECIMAL,
    finished_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (
            PARTITION BY ta.route_id 
            ORDER BY ta.total_time_sec ASC
        )::integer as rank,
        ta.id as activity_id,
        ta.participant_id,
        p.full_name as participant_name,
        p.dorsal_number,
        tr.name as route_name,
        ta.total_time_sec,
        to_char(ta.total_time_sec * interval '1 second', 'HH24:MI:SS') as formatted_time,
        ta.avg_speed_kmh,
        ta.avg_pace_min_km,
        ta.total_distance_m,
        ta.end_time as finished_at
    FROM track_activities ta
    JOIN participants p ON p.id = ta.participant_id
    JOIN track_routes tr ON tr.id = ta.route_id
    WHERE ta.event_id = p_event_id
        AND ta.status = 'finished'
        AND ta.total_time_sec IS NOT NULL
        AND (p_route_id IS NULL OR ta.route_id = p_route_id)
    ORDER BY ta.route_id, ta.total_time_sec ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. PAUSAR/RETOMAR ATIVIDADE
-- ============================================================================
CREATE OR REPLACE FUNCTION track_pause_activity(
    p_activity_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_activity RECORD;
BEGIN
    SELECT * INTO v_activity
    FROM track_activities
    WHERE id = p_activity_id;
    
    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'Activity not found';
    END IF;
    
    IF NOT is_my_participant(v_activity.participant_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    IF v_activity.status != 'running' THEN
        RAISE EXCEPTION 'Can only pause running activities';
    END IF;
    
    UPDATE track_activities
    SET status = 'paused',
        updated_at = NOW()
    WHERE id = p_activity_id;
    
    RETURN json_build_object('success', true, 'status', 'paused');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION track_resume_activity(
    p_activity_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_activity RECORD;
BEGIN
    SELECT * INTO v_activity
    FROM track_activities
    WHERE id = p_activity_id;
    
    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'Activity not found';
    END IF;
    
    IF NOT is_my_participant(v_activity.participant_id) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    IF v_activity.status != 'paused' THEN
        RAISE EXCEPTION 'Can only resume paused activities';
    END IF;
    
    UPDATE track_activities
    SET status = 'running',
        updated_at = NOW()
    WHERE id = p_activity_id;
    
    RETURN json_build_object('success', true, 'status', 'running');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. DESCARTAR ATIVIDADE
-- ============================================================================
CREATE OR REPLACE FUNCTION track_discard_activity(
    p_activity_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_activity RECORD;
BEGIN
    SELECT * INTO v_activity
    FROM track_activities
    WHERE id = p_activity_id;
    
    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'Activity not found';
    END IF;
    
    IF NOT (is_my_participant(v_activity.participant_id) OR is_event_staff(v_activity.event_id)) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    UPDATE track_activities
    SET status = 'discarded',
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('discard_reason', p_reason)
    WHERE id = p_activity_id;
    
    INSERT INTO track_audit_log (
        event_id,
        participant_id,
        activity_id,
        action,
        actor_id,
        details
    ) VALUES (
        v_activity.event_id,
        v_activity.participant_id,
        p_activity_id,
        'activity_discarded',
        auth.uid(),
        json_build_object('reason', p_reason)
    );
    
    RETURN json_build_object('success', true, 'status', 'discarded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DAS FUNÇÕES
-- ============================================================================

