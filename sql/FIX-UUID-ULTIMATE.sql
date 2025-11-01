-- ============================================================================
-- KROMI - Fix UUID Error ULTIMATE (Correção Definitiva)
-- ============================================================================
-- Esta versão resolve o erro: "column device_id is of type uuid but expression is of type text"
-- A solução força a conversão UUID de forma explícita e robusta em TODOS os pontos
-- ============================================================================

-- Atualizar função process_device_detection com conversão FORÇADA em múltiplos pontos
CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_device_info RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
    v_device_id_uuid UUID;  -- Variável explícita para garantir tipo UUID
    v_event_id_uuid UUID;   -- Também garantir event_id como UUID
    v_device_id_text TEXT;   -- Variável auxiliar para conversão segura
BEGIN
    -- Buscar registro
    SELECT * INTO v_detection
    FROM device_detections
    WHERE id = p_detection_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Registro não encontrado ou já processado');
    END IF;
    
    -- Marcar como processando
    UPDATE device_detections SET status = 'processing' WHERE id = p_detection_id;
    
    -- Buscar informações do dispositivo
    -- ESTRATÉGIA: Buscar como TEXT primeiro, depois converter para UUID
    SELECT ed.event_id::TEXT as event_id_text, 
           ed.device_id::TEXT as device_id_text,  -- ✅ Primeiro como TEXT
           ed.checkpoint_order, 
           ed.checkpoint_name, 
           ed.checkpoint_type, 
           e.status as event_status
    INTO v_device_info
    FROM event_devices ed
    JOIN events e ON e.id = ed.event_id
    WHERE ed.access_code = v_detection.access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Dispositivo não encontrado', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Dispositivo não encontrado');
    END IF;
    
    -- Verificar se evento está ativo
    IF v_device_info.event_status != 'active' THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Evento não está ativo', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Evento não está ativo');
    END IF;
    
    -- CONVERSÃO FORÇADA: TEXT → UUID (passo a passo explícito)
    BEGIN
        -- Converter event_id
        v_event_id_uuid := v_device_info.event_id_text::UUID;
        
        -- Converter device_id com tratamento de erro robusto
        v_device_id_text := v_device_info.device_id_text;
        IF v_device_id_text IS NULL OR v_device_id_text = '' THEN
            RAISE EXCEPTION 'device_id não pode ser NULL ou vazio';
        END IF;
        
        v_device_id_uuid := v_device_id_text::UUID;
        
    EXCEPTION
        WHEN OTHERS THEN
            UPDATE device_detections SET status = 'failed', processing_error = 'Erro ao converter device_id: ' || SQLERRM, processed_at = NOW()
            WHERE id = p_detection_id;
            RETURN json_build_object('success', false, 'error', 'Erro ao converter device_id: ' || SQLERRM);
    END;
    
    -- Atualizar cache de informações em device_detections
    -- IMPORTANTE: Usar v_device_id_uuid diretamente (já é UUID)
    UPDATE device_detections
    SET event_id = v_event_id_uuid,      -- ✅ UUID explícito
        device_id = v_device_id_uuid,     -- ✅ UUID explícito (sem conversão aqui)
        device_order = v_device_info.checkpoint_order, 
        checkpoint_name = v_device_info.checkpoint_name,
        checkpoint_type = v_device_info.checkpoint_type
    WHERE id = p_detection_id;
    
    -- Verificar se tem dorsal
    v_has_dorsal := (v_detection.dorsal_number IS NOT NULL);
    
    IF v_has_dorsal THEN
        -- Tem dorsal → Criar detecção diretamente
        -- detections.device_id é TEXT, então convertemos UUID → TEXT
        INSERT INTO detections (
            event_id, number, timestamp, latitude, longitude, accuracy,
            device_type, session_id, device_id, device_order, checkpoint_time, proof_image, detection_method
        ) VALUES (
            v_event_id_uuid,  -- ✅ UUID direto
            v_detection.dorsal_number, 
            v_detection.captured_at, 
            v_detection.latitude, 
            v_detection.longitude, 
            v_detection.accuracy,
            'android', 
            v_detection.session_id, 
            v_device_id_uuid::TEXT,  -- ✅ UUID → TEXT para detections
            v_device_info.checkpoint_order, 
            v_detection.captured_at, 
            v_detection.display_image, 
            'native_app'
        )
        RETURNING id INTO v_detection_result_id;
        
        UPDATE device_detections
        SET status = 'processed', 
            detection_id = v_detection_result_id, 
            processed_at = NOW(),
            processing_result = json_build_object(
                'action', 'direct_detection', 
                'detection_id', v_detection_result_id,
                'checkpoint_order', v_device_info.checkpoint_order, 
                'checkpoint_name', v_device_info.checkpoint_name
            )
        WHERE id = p_detection_id;
        
        RETURN json_build_object(
            'success', true, 
            'action', 'direct_detection',
            'detection_id', v_detection_result_id, 
            'message', 'Detecção criada diretamente'
        );
    ELSE
        -- Não tem dorsal → Enviar para image_buffer
        -- image_buffer.device_id é TEXT, então convertemos UUID → TEXT
        INSERT INTO image_buffer (
            event_id, device_id, session_id, image_data, display_image, image_metadata,
            captured_at, latitude, longitude, accuracy, status
        ) VALUES (
            v_event_id_uuid,                    -- ✅ UUID direto
            v_device_id_uuid::TEXT,             -- ✅ UUID → TEXT para image_buffer
            v_detection.session_id, 
            v_detection.image_data, 
            v_detection.display_image, 
            v_detection.image_metadata,
            v_detection.captured_at, 
            v_detection.latitude, 
            v_detection.longitude, 
            v_detection.accuracy, 
            'pending'
        )
        RETURNING id INTO v_buffer_result_id;
        
        UPDATE device_detections
        SET status = 'processed', 
            buffer_id = v_buffer_result_id, 
            processed_at = NOW(),
            processing_result = json_build_object(
                'action', 'sent_to_buffer', 
                'buffer_id', v_buffer_result_id,
                'checkpoint_order', v_device_info.checkpoint_order, 
                'checkpoint_name', v_device_info.checkpoint_name
            )
        WHERE id = p_detection_id;
        
        RETURN json_build_object(
            'success', true, 
            'action', 'sent_to_buffer',
            'buffer_id', v_buffer_result_id, 
            'message', 'Imagem enviada para buffer'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        UPDATE device_detections SET status = 'failed', processing_error = SQLERRM, processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ✅ CORREÇÃO APLICADA
-- ============================================================================
-- Esta versão:
-- 1. ✅ Busca device_id como TEXT primeiro (evita problemas de tipo)
-- 2. ✅ Converte TEXT → UUID explicitamente com tratamento de erro
-- 3. ✅ Usa variáveis UUID explícitas (v_device_id_uuid, v_event_id_uuid)
-- 4. ✅ Insere UUID diretamente em device_detections (sem conversão no UPDATE)
-- 5. ✅ Converte UUID → TEXT apenas quando necessário (detections, image_buffer)
-- 6. ✅ Tratamento robusto de erros em todos os pontos críticos
-- ============================================================================

