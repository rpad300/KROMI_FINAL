-- ============================================================================
-- KROMI - Fix Device ID UUID Conversion
-- ============================================================================
-- Correção para garantir que device_id seja sempre tratado como UUID
-- quando retornado por get_device_info_by_qr e usado em process_device_detection
-- ============================================================================

-- ============================================================================
-- PARTE 1: VERIFICAR ESTRUTURA ATUAL
-- ============================================================================
-- Execute estas queries primeiro para verificar tipos:

-- Ver estrutura da view device_qr_info
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'device_qr_info' 
AND column_name = 'device_id';

-- Ver estrutura da tabela device_detections
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'device_detections' 
AND column_name = 'device_id';

-- Ver estrutura da tabela detections
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'detections' 
AND column_name = 'device_id';

-- Ver estrutura da tabela image_buffer
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'image_buffer' 
AND column_name = 'device_id';

-- Ver dados de exemplo da view
SELECT access_code, device_id, pg_typeof(device_id) as device_id_type
FROM device_qr_info 
LIMIT 5;

-- ============================================================================
-- PARTE 2: ATUALIZAR FUNÇÃO process_device_detection
-- ============================================================================
-- Garantir que device_id seja sempre tratado como UUID explicitamente

CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_device_info RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
    v_device_id_uuid UUID;  -- Variável explícita para UUID
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
    SELECT ed.event_id, ed.device_id, ed.checkpoint_order, ed.checkpoint_name, ed.checkpoint_type, e.status as event_status
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
    
    -- CONVERSÃO EXPLÍCITA: Garantir que device_id é UUID
    -- v_device_info.device_id vem de event_devices.device_id que é UUID
    -- Mas fazemos conversão explícita para garantir compatibilidade
    v_device_id_uuid := v_device_info.device_id::UUID;
    
    -- Atualizar cache de informações
    UPDATE device_detections
    SET event_id = v_device_info.event_id, 
        device_id = v_device_id_uuid,  -- Usar variável UUID explícita
        device_order = v_device_info.checkpoint_order, 
        checkpoint_name = v_device_info.checkpoint_name,
        checkpoint_type = v_device_info.checkpoint_type
    WHERE id = p_detection_id;
    
    -- Verificar se tem dorsal
    v_has_dorsal := (v_detection.dorsal_number IS NOT NULL);
    
    IF v_has_dorsal THEN
        -- Tem dorsal → Criar detecção diretamente
        -- detections.device_id é TEXT, então convertemos UUID para TEXT
        INSERT INTO detections (
            event_id, number, timestamp, latitude, longitude, accuracy,
            device_type, session_id, device_id, device_order, checkpoint_time, proof_image, detection_method
        ) VALUES (
            v_device_info.event_id, v_detection.dorsal_number, v_detection.captured_at,
            v_detection.latitude, v_detection.longitude, v_detection.accuracy,
            'android', v_detection.session_id, v_device_id_uuid::TEXT,  -- UUID → TEXT para detections
            v_device_info.checkpoint_order, v_detection.captured_at, v_detection.display_image, 'native_app'
        )
        RETURNING id INTO v_detection_result_id;
        
        UPDATE device_detections
        SET status = 'processed', detection_id = v_detection_result_id, processed_at = NOW(),
            processing_result = json_build_object('action', 'direct_detection', 'detection_id', v_detection_result_id,
                'checkpoint_order', v_device_info.checkpoint_order, 'checkpoint_name', v_device_info.checkpoint_name)
        WHERE id = p_detection_id;
        
        RETURN json_build_object('success', true, 'action', 'direct_detection',
            'detection_id', v_detection_result_id, 'message', 'Detecção criada diretamente');
    ELSE
        -- Não tem dorsal → Enviar para image_buffer
        -- image_buffer.device_id é TEXT, então convertemos UUID para TEXT
        INSERT INTO image_buffer (
            event_id, device_id, session_id, image_data, display_image, image_metadata,
            captured_at, latitude, longitude, accuracy, status
        ) VALUES (
            v_device_info.event_id, v_device_id_uuid::TEXT, v_detection.session_id,  -- UUID → TEXT para image_buffer
            v_detection.image_data, v_detection.display_image, v_detection.image_metadata,
            v_detection.captured_at, v_detection.latitude, v_detection.longitude, v_detection.accuracy, 'pending'
        )
        RETURNING id INTO v_buffer_result_id;
        
        UPDATE device_detections
        SET status = 'processed', buffer_id = v_buffer_result_id, processed_at = NOW(),
            processing_result = json_build_object('action', 'sent_to_buffer', 'buffer_id', v_buffer_result_id,
                'checkpoint_order', v_device_info.checkpoint_order, 'checkpoint_name', v_device_info.checkpoint_name)
        WHERE id = p_detection_id;
        
        RETURN json_build_object('success', true, 'action', 'sent_to_buffer',
            'buffer_id', v_buffer_result_id, 'message', 'Imagem enviada para buffer');
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        UPDATE device_detections SET status = 'failed', processing_error = SQLERRM, processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMENTÁRIO ATUALIZADO
-- ============================================================================
COMMENT ON FUNCTION process_device_detection IS 
'Função que processa um registro de device_detections.
Garante conversão explícita de device_id para UUID antes de usar.
Converte para TEXT quando necessário (detections e image_buffer usam TEXT).';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Verificar se função foi atualizada
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'process_device_detection'
LIMIT 1;

-- ============================================================================
-- ✅ CORREÇÃO APLICADA
-- ============================================================================
-- Agora a função process_device_detection:
-- 1. ✅ Converte device_id explicitamente para UUID (v_device_id_uuid)
-- 2. ✅ Usa UUID na tabela device_detections (que é UUID)
-- 3. ✅ Converte UUID para TEXT ao inserir em detections (que é TEXT)
-- 4. ✅ Converte UUID para TEXT ao inserir em image_buffer (que é TEXT)
-- ============================================================================

