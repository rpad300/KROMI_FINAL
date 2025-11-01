-- ============================================================================
-- FORCE DROP CASCADE e RECREATE
-- ============================================================================

-- DROP FUNCTION com CASCADE para remover todas as dependências
DROP FUNCTION IF EXISTS process_device_detection(UUID) CASCADE;
DROP FUNCTION IF EXISTS process_device_detection CASCADE;

-- Aguardar um momento (comentário para separação)
-- ============================================================================

-- RECRIAR função do zero
CREATE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_detection RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
    v_event_id_text TEXT;
    v_device_id_text TEXT;
    v_checkpoint_order INTEGER;
    v_checkpoint_name TEXT;
    v_checkpoint_type TEXT;
    v_event_status TEXT;
BEGIN
    SELECT * INTO v_detection FROM device_detections WHERE id = p_detection_id AND status = 'pending';
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Registro não encontrado'); END IF;
    
    UPDATE device_detections SET status = 'processing' WHERE id = p_detection_id;
    
    SELECT ed.event_id::TEXT, ed.device_id::TEXT, ed.checkpoint_order, ed.checkpoint_name, ed.checkpoint_type, e.status
    INTO v_event_id_text, v_device_id_text, v_checkpoint_order, v_checkpoint_name, v_checkpoint_type, v_event_status
    FROM event_devices ed JOIN events e ON e.id = ed.event_id WHERE ed.access_code = v_detection.access_code LIMIT 1;
    
    IF NOT FOUND OR v_device_id_text IS NULL THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Dispositivo não encontrado', processed_at = NOW() WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Dispositivo não encontrado');
    END IF;
    
    IF v_event_status != 'active' THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Evento não ativo', processed_at = NOW() WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Evento não ativo');
    END IF;
    
    BEGIN
        UPDATE device_detections SET event_id = v_event_id_text::UUID, device_id = v_device_id_text::UUID, device_order = v_checkpoint_order, checkpoint_name = v_checkpoint_name, checkpoint_type = v_checkpoint_type WHERE id = p_detection_id;
        
        v_has_dorsal := (v_detection.dorsal_number IS NOT NULL);
        
        IF v_has_dorsal THEN
            INSERT INTO detections (event_id, number, timestamp, latitude, longitude, accuracy, device_type, session_id, device_id, device_order, checkpoint_time, proof_image, detection_method)
            VALUES (v_event_id_text::UUID, v_detection.dorsal_number, v_detection.captured_at, v_detection.latitude, v_detection.longitude, v_detection.accuracy, 'android', v_detection.session_id, v_device_id_text, v_checkpoint_order, v_detection.captured_at, v_detection.display_image, 'native_app')
            RETURNING id INTO v_detection_result_id;
            
            UPDATE device_detections SET status = 'processed', detection_id = v_detection_result_id, processed_at = NOW(), processing_result = json_build_object('action', 'direct_detection', 'detection_id', v_detection_result_id) WHERE id = p_detection_id;
            RETURN json_build_object('success', true, 'action', 'direct_detection', 'detection_id', v_detection_result_id, 'message', 'Detecção criada');
        ELSE
            INSERT INTO image_buffer (event_id, device_id, session_id, image_data, display_image, image_metadata, captured_at, latitude, longitude, accuracy, status)
            VALUES (v_event_id_text::UUID, v_device_id_text, v_detection.session_id, v_detection.image_data, v_detection.display_image, v_detection.image_metadata, v_detection.captured_at, v_detection.latitude, v_detection.longitude, v_detection.accuracy, 'pending')
            RETURNING id INTO v_buffer_result_id;
            
            UPDATE device_detections SET status = 'processed', buffer_id = v_buffer_result_id, processed_at = NOW(), processing_result = json_build_object('action', 'sent_to_buffer', 'buffer_id', v_buffer_result_id) WHERE id = p_detection_id;
            RETURN json_build_object('success', true, 'action', 'sent_to_buffer', 'buffer_id', v_buffer_result_id, 'message', 'Buffer');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        UPDATE device_detections SET status = 'failed', processing_error = SQLERRM, processed_at = NOW() WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$;

