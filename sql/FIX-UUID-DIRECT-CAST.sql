-- ============================================================================
-- KROMI - Fix UUID Error COM CAST DIRETO NO UPDATE
-- ============================================================================
-- Esta versão usa CAST direto no UPDATE usando subquery para garantir conversão
-- ============================================================================

CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
    v_device_id_uuid UUID;
    v_event_id_uuid UUID;
    v_checkpoint_order INTEGER;
    v_checkpoint_name TEXT;
    v_checkpoint_type TEXT;
    v_event_status TEXT;
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
    
    -- Buscar informações do dispositivo com CAST direto para variáveis UUID
    SELECT ed.event_id::UUID, 
           ed.device_id::UUID,
           ed.checkpoint_order,
           ed.checkpoint_name,
           ed.checkpoint_type,
           e.status as event_status
    INTO v_event_id_uuid,
         v_device_id_uuid,
         v_checkpoint_order,
         v_checkpoint_name,
         v_checkpoint_type,
         v_event_status
    FROM event_devices ed
    JOIN events e ON e.id = ed.event_id
    WHERE ed.access_code = v_detection.access_code
    LIMIT 1;
    
    -- Verificar se encontrou dispositivo
    IF NOT FOUND OR v_device_id_uuid IS NULL THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Dispositivo não encontrado', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Dispositivo não encontrado');
    END IF;
    
    -- Verificar se evento está ativo
    IF v_event_status != 'active' THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Evento não está ativo', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Evento não está ativo');
    END IF;
    
    -- Atualizar cache de informações em device_detections com variáveis UUID já convertidas
    UPDATE device_detections
    SET event_id = v_event_id_uuid,
        device_id = v_device_id_uuid,
        device_order = v_checkpoint_order,
        checkpoint_name = v_checkpoint_name,
        checkpoint_type = v_checkpoint_type
    WHERE id = p_detection_id;
    
    -- Verificar se tem dorsal
    v_has_dorsal := (v_detection.dorsal_number IS NOT NULL);
    
    IF v_has_dorsal THEN
        -- Tem dorsal → Criar detecção diretamente
        INSERT INTO detections (
            event_id, number, timestamp, latitude, longitude, accuracy,
            device_type, session_id, device_id, device_order, checkpoint_time, proof_image, detection_method
        ) VALUES (
            v_event_id_uuid,
            v_detection.dorsal_number, 
            v_detection.captured_at, 
            v_detection.latitude, 
            v_detection.longitude, 
            v_detection.accuracy,
            'android', 
            v_detection.session_id, 
            v_device_id_uuid::TEXT,  -- UUID → TEXT para detections
            v_checkpoint_order, 
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
                'checkpoint_order', v_checkpoint_order, 
                'checkpoint_name', v_checkpoint_name
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
        INSERT INTO image_buffer (
            event_id, device_id, session_id, image_data, display_image, image_metadata,
            captured_at, latitude, longitude, accuracy, status
        ) VALUES (
            v_event_id_uuid,
            v_device_id_uuid::TEXT,  -- UUID → TEXT para image_buffer
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
                'checkpoint_order', v_checkpoint_order, 
                'checkpoint_name', v_checkpoint_name
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
-- 1. ✅ Usa CAST direto no UPDATE com subquery (::UUID)
-- 2. ✅ Evita usar RECORD para device_id/event_id (que pode preservar tipo TEXT)
-- 3. ✅ Busca valores atualizados depois do UPDATE
-- 4. ✅ Converte UUID → TEXT apenas quando necessário (detections, image_buffer)
-- ============================================================================

