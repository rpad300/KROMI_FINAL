-- ============================================================================
-- VISIONKRONO - PROCESSADOR DA INBOX
-- ============================================================================
-- Funções que leem track_inbox_messages e populam as tabelas finais
-- Executar periodicamente (cron/scheduler) ou via trigger
-- ============================================================================

-- ============================================================================
-- 1. PROCESSADOR PRINCIPAL
-- ============================================================================

CREATE OR REPLACE FUNCTION track_process_inbox_messages(
    p_limit INTEGER DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
    v_msg RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_result JSON;
BEGIN
    -- Processar mensagens pendentes
    FOR v_msg IN 
        SELECT * FROM track_inbox_messages
        WHERE processed_status IS NULL OR processed_status = 'pending'
        ORDER BY received_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED -- Evitar lock em processamento paralelo
    LOOP
        BEGIN
            -- Processar conforme tipo
            CASE v_msg.message_type
                WHEN 'gps_batch' THEN
                    v_result := track_process_gps_batch(v_msg);
                    
                WHEN 'activity_event' THEN
                    v_result := track_process_activity_event(v_msg);
                    
                WHEN 'heartbeat' THEN
                    v_result := track_process_heartbeat(v_msg);
                    
                ELSE
                    v_result := json_build_object(
                        'success', false,
                        'error', 'unknown_message_type'
                    );
            END CASE;
            
            -- Atualizar status
            IF (v_result->>'success')::boolean THEN
                UPDATE track_inbox_messages
                SET processed_at = NOW(),
                    processed_status = 'success',
                    processed_by = 'track_process_inbox_messages'
                WHERE id = v_msg.id;
                
                v_processed := v_processed + 1;
            ELSE
                UPDATE track_inbox_messages
                SET processed_at = NOW(),
                    processed_status = 'failed',
                    processed_reason = v_result->>'error',
                    processed_by = 'track_process_inbox_messages',
                    retry_count = COALESCE(retry_count, 0) + 1,
                    last_retry_at = NOW()
                WHERE id = v_msg.id;
                
                -- Logar erro detalhado
                INSERT INTO track_ingest_errors (
                    inbox_id,
                    error_code,
                    error_detail,
                    error_context,
                    is_retriable
                ) VALUES (
                    v_msg.id,
                    v_result->>'error',
                    v_result->>'error_detail',
                    v_result->'context',
                    (v_result->>'retriable')::boolean
                );
                
                v_failed := v_failed + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Erro não tratado
            UPDATE track_inbox_messages
            SET processed_at = NOW(),
                processed_status = 'failed',
                processed_reason = SQLERRM,
                processed_by = 'track_process_inbox_messages',
                retry_count = COALESCE(retry_count, 0) + 1
            WHERE id = v_msg.id;
            
            INSERT INTO track_ingest_errors (
                inbox_id,
                error_code,
                error_detail,
                severity
            ) VALUES (
                v_msg.id,
                'unexpected_error',
                SQLERRM,
                'critical'
            );
            
            v_failed := v_failed + 1;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed', v_processed,
        'failed', v_failed,
        'total', v_processed + v_failed
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. PROCESSAR GPS BATCH
-- ============================================================================

CREATE OR REPLACE FUNCTION track_process_gps_batch(
    p_msg RECORD
)
RETURNS JSON AS $$
DECLARE
    v_activity_id UUID;
    v_participant_id UUID;
    v_point JSONB;
    v_inserted INTEGER := 0;
    v_rejected INTEGER := 0;
    v_validation_flags JSONB;
    v_is_valid BOOLEAN;
    v_route RECORD;
BEGIN
    -- Obter activity_id e participant_id
    v_activity_id := p_msg.activity_id;
    
    IF v_activity_id IS NULL THEN
        -- Tentar obter pela QR
        SELECT ta.id, ta.participant_id INTO v_activity_id, v_participant_id
        FROM track_activities ta
        JOIN track_participant_access tpa ON tpa.participant_id = ta.participant_id
        WHERE tpa.qr_code = p_msg.qr_code
            AND ta.status IN ('armed', 'running', 'paused')
        ORDER BY ta.created_at DESC
        LIMIT 1;
        
        IF v_activity_id IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'no_active_activity',
                'error_detail', 'No active activity found for this QR code',
                'retriable', false
            );
        END IF;
    ELSE
        -- Obter participant_id da atividade
        SELECT participant_id INTO v_participant_id
        FROM track_activities
        WHERE id = v_activity_id;
    END IF;
    
    -- Obter configurações da rota
    SELECT tr.max_speed_kmh, tr.max_accuracy_m
    INTO v_route
    FROM track_activities ta
    JOIN track_routes tr ON tr.id = ta.route_id
    WHERE ta.id = v_activity_id;
    
    -- Processar cada ponto do batch
    FOR v_point IN SELECT * FROM jsonb_array_elements(p_msg.payload->'points')
    LOOP
        v_is_valid := true;
        v_validation_flags := '{}'::jsonb;
        
        -- Validar velocidade
        IF (v_point->>'speed_kmh')::decimal > v_route.max_speed_kmh THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('speed_exceeded', true);
        END IF;
        
        -- Validar precisão
        IF (v_point->>'accuracy_m')::decimal > v_route.max_accuracy_m THEN
            v_is_valid := false;
            v_validation_flags := v_validation_flags || jsonb_build_object('accuracy_poor', true);
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
                is_valid,
                validation_flags
            ) VALUES (
                v_activity_id,
                v_participant_id,
                (v_point->>'lat')::decimal,
                (v_point->>'lng')::decimal,
                (v_point->>'alt_m')::decimal,
                (v_point->>'speed_kmh')::decimal,
                (v_point->>'accuracy_m')::decimal,
                (v_point->>'bearing')::decimal,
                (v_point->>'device_ts')::timestamptz,
                p_msg.id, -- Usar inbox message id como batch_id
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
    WHERE id = v_activity_id;
    
    -- Se é o primeiro batch e atividade está armed, mudar para running
    UPDATE track_activities
    SET status = 'running',
        start_time = (p_msg.payload->'points'->0->>'device_ts')::timestamptz
    WHERE id = v_activity_id
        AND status = 'armed';
    
    RETURN json_build_object(
        'success', true,
        'activity_id', v_activity_id,
        'points_inserted', v_inserted,
        'points_rejected', v_rejected
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. PROCESSAR ACTIVITY EVENT (start, pause, resume, finish)
-- ============================================================================

CREATE OR REPLACE FUNCTION track_process_activity_event(
    p_msg RECORD
)
RETURNS JSON AS $$
DECLARE
    v_event_type TEXT;
    v_activity_id UUID;
    v_participant_id UUID;
BEGIN
    v_event_type := p_msg.payload->>'type';
    v_activity_id := p_msg.activity_id;
    
    -- Se não tem activity_id, tentar obter pela QR
    IF v_activity_id IS NULL THEN
        SELECT ta.id, ta.participant_id INTO v_activity_id, v_participant_id
        FROM track_activities ta
        JOIN track_participant_access tpa ON tpa.participant_id = ta.participant_id
        WHERE tpa.qr_code = p_msg.qr_code
            AND ta.status IN ('armed', 'running', 'paused')
        ORDER BY ta.created_at DESC
        LIMIT 1;
    ELSE
        SELECT participant_id INTO v_participant_id
        FROM track_activities WHERE id = v_activity_id;
    END IF;
    
    IF v_activity_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'no_activity_found',
            'retriable', false
        );
    END IF;
    
    -- Processar conforme tipo de evento
    CASE v_event_type
        WHEN 'start' THEN
            UPDATE track_activities
            SET status = 'running',
                start_time = (p_msg.payload->>'device_ts')::timestamptz
            WHERE id = v_activity_id AND status = 'armed';
            
        WHEN 'pause' THEN
            UPDATE track_activities
            SET status = 'paused'
            WHERE id = v_activity_id AND status = 'running';
            
        WHEN 'resume' THEN
            UPDATE track_activities
            SET status = 'running'
            WHERE id = v_activity_id AND status = 'paused';
            
        WHEN 'finish' THEN
            -- Finalizar (chamar função existente)
            PERFORM track_finish_activity(v_activity_id, false);
            
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'unknown_event_type',
                'error_detail', 'Event type: ' || v_event_type
            );
    END CASE;
    
    RETURN json_build_object(
        'success', true,
        'activity_id', v_activity_id,
        'event_type', v_event_type
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. PROCESSAR HEARTBEAT
-- ============================================================================

CREATE OR REPLACE FUNCTION track_process_heartbeat(
    p_msg RECORD
)
RETURNS JSON AS $$
BEGIN
    -- Atualizar last_seen do dispositivo
    UPDATE track_device_session
    SET last_seen_at = NOW()
    WHERE device_id = p_msg.device_id;
    
    -- Atualizar sessão ativa se houver activity_id
    IF p_msg.activity_id IS NOT NULL THEN
        UPDATE track_activities
        SET updated_at = NOW()
        WHERE id = p_msg.activity_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'device_id', p_msg.device_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CLEANUP DE MENSAGENS ANTIGAS
-- ============================================================================

CREATE OR REPLACE FUNCTION track_cleanup_old_messages(
    p_days_old INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Deletar mensagens processadas com sucesso há mais de X dias
    DELETE FROM track_inbox_messages
    WHERE processed_status = 'success'
        AND processed_at < NOW() - (p_days_old || ' days')::interval;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'deleted', v_deleted
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. MONITORAMENTO DA INBOX
-- ============================================================================

CREATE OR REPLACE FUNCTION track_inbox_stats()
RETURNS TABLE (
    metric TEXT,
    value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_messages'::text, COUNT(*)::bigint FROM track_inbox_messages
    UNION ALL
    SELECT 'pending', COUNT(*) FROM track_inbox_messages WHERE processed_status IS NULL OR processed_status = 'pending'
    UNION ALL
    SELECT 'processing', COUNT(*) FROM track_inbox_messages WHERE processed_status = 'pending' AND processed_at IS NOT NULL
    UNION ALL
    SELECT 'success', COUNT(*) FROM track_inbox_messages WHERE processed_status = 'success'
    UNION ALL
    SELECT 'failed', COUNT(*) FROM track_inbox_messages WHERE processed_status = 'failed'
    UNION ALL
    SELECT 'gps_batches', COUNT(*) FROM track_inbox_messages WHERE message_type = 'gps_batch'
    UNION ALL
    SELECT 'activity_events', COUNT(*) FROM track_inbox_messages WHERE message_type = 'activity_event'
    UNION ALL
    SELECT 'heartbeats', COUNT(*) FROM track_inbox_messages WHERE message_type = 'heartbeat'
    UNION ALL
    SELECT 'last_hour', COUNT(*) FROM track_inbox_messages WHERE received_at > NOW() - INTERVAL '1 hour'
    UNION ALL
    SELECT 'errors_total', COUNT(*) FROM track_ingest_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. REPROCESSAR MENSAGENS FALHADAS
-- ============================================================================

CREATE OR REPLACE FUNCTION track_retry_failed_messages(
    p_max_retries INTEGER DEFAULT 3,
    p_limit INTEGER DEFAULT 50
)
RETURNS JSON AS $$
DECLARE
    v_reset INTEGER;
BEGIN
    -- Resetar status de mensagens falhadas que ainda podem ser retentadas
    UPDATE track_inbox_messages
    SET processed_status = 'pending',
        processed_at = NULL,
        processed_reason = NULL,
        last_retry_at = NOW()
    WHERE id IN (
        SELECT id FROM track_inbox_messages
        WHERE processed_status = 'failed'
            AND retry_count < p_max_retries
            AND last_retry_at < NOW() - INTERVAL '5 minutes' -- Esperar 5 min entre retries
        ORDER BY received_at
        LIMIT p_limit
    );
    
    GET DIAGNOSTICS v_reset = ROW_COUNT;
    
    -- Executar processador
    PERFORM track_process_inbox_messages(p_limit);
    
    RETURN json_build_object(
        'success', true,
        'messages_reset', v_reset
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGER PARA PROCESSAR AUTOMATICAMENTE (Opcional)
-- ============================================================================

-- Descomentado se quiser processamento automático via trigger
-- CUIDADO: pode gerar overhead. Melhor usar scheduler/cron.

/*
CREATE OR REPLACE FUNCTION track_inbox_auto_process_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Processar em background (usando pg_background ou similar)
    -- Ou simplesmente chamar direto (pode ser lento)
    PERFORM track_process_inbox_messages(10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_inbox_insert_trigger
    AFTER INSERT ON track_inbox_messages
    FOR EACH STATEMENT
    EXECUTE FUNCTION track_inbox_auto_process_trigger();
*/

-- ============================================================================
-- FIM DO PROCESSADOR
-- ============================================================================

COMMENT ON FUNCTION track_process_inbox_messages IS 'Processador principal da inbox - executar periodicamente';
COMMENT ON FUNCTION track_cleanup_old_messages IS 'Limpar mensagens processadas antigas';
COMMENT ON FUNCTION track_inbox_stats IS 'Estatísticas da inbox para monitoramento';

