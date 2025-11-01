-- ============================================================================
-- Função de debug - mostra cada passo
-- ============================================================================

DROP FUNCTION IF EXISTS process_device_detection(UUID) CASCADE;

CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_event_id_text TEXT;
    v_device_id_text TEXT;
    v_checkpoint_order INTEGER;
    v_event_status TEXT;
BEGIN
    RAISE NOTICE 'PASSO 1: Buscar registro...';
    
    SELECT * INTO v_detection
    FROM device_detections
    WHERE id = p_detection_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Registro não encontrado');
    END IF;
    
    RAISE NOTICE 'PASSO 2: access_code = %', v_detection.access_code;
    
    UPDATE device_detections SET status = 'processing' WHERE id = p_detection_id;
    
    RAISE NOTICE 'PASSO 3: Buscar event_devices...';
    
    SELECT ed.event_id::TEXT, 
           ed.device_id::TEXT,
           ed.checkpoint_order,
           e.status
    INTO v_event_id_text,
         v_device_id_text,
         v_checkpoint_order,
         v_event_status
    FROM event_devices ed
    JOIN events e ON e.id = ed.event_id
    WHERE ed.access_code = v_detection.access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'Dispositivo não encontrado', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'Dispositivo não encontrado');
    END IF;
    
    RAISE NOTICE 'PASSO 4: device_id_text = % (tipo: %)', v_device_id_text, pg_typeof(v_device_id_text);
    RAISE NOTICE 'PASSO 5: event_id_text = % (tipo: %)', v_event_id_text, pg_typeof(v_event_id_text);
    
    RAISE NOTICE 'PASSO 6: Tentando UPDATE...';
    
    BEGIN
        UPDATE device_detections
        SET event_id = v_event_id_text::UUID,
            device_id = v_device_id_text::UUID,
            device_order = v_checkpoint_order
        WHERE id = p_detection_id;
        
        RAISE NOTICE 'PASSO 7: UPDATE bem sucedido!';
        
        UPDATE device_detections
        SET status = 'processed', processed_at = NOW()
        WHERE id = p_detection_id;
        
        RETURN json_build_object('success', true, 'message', 'Teste bem sucedido');
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'PASSO 7 FALHOU: %', SQLERRM;
            UPDATE device_detections SET status = 'failed', processing_error = 'DEBUG: ' || SQLERRM, processed_at = NOW()
            WHERE id = p_detection_id;
            RETURN json_build_object('success', false, 'error', 'DEBUG: ' || SQLERRM);
    END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

