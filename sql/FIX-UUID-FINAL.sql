-- ============================================================================
-- KROMI - Fix UUID Error FINAL (Versão Robusta)
-- ============================================================================
-- Correção definitiva para erro: "column device_id is of type uuid but expression is of type text"
-- Esta versão força a conversão mesmo que event_devices.device_id seja de outro tipo
-- ============================================================================

-- Primeiro, verificar se a tabela event_devices tem device_id como UUID
DO $$
DECLARE
    v_device_id_type TEXT;
BEGIN
    SELECT data_type INTO v_device_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'event_devices'
    AND column_name = 'device_id';
    
    RAISE NOTICE 'event_devices.device_id tipo: %', v_device_id_type;
END $$;

-- Atualizar função com conversão FORÇADA
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
    -- CORREÇÃO ROBUSTA: Converter explicitamente para UUID mesmo que venha como TEXT
    SELECT ed.event_id::UUID as event_id,  -- ✅ Forçar UUID
           COALESCE(ed.device_id::UUID, NULL::UUID) as device_id,  -- ✅ Forçar UUID com COALESCE
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
    
    -- CONVERSÃO FORÇADA: Garantir tipos UUID
    -- Mesmo que já venham como UUID da query, forçamos conversão explícita
    v_event_id_uuid := v_device_info.event_id::UUID;
    
    -- Se device_id vier como NULL, isso causaria erro - mas não deve acontecer
    -- Forçamos conversão explícita para UUID
    BEGIN
        v_device_id_uuid := v_device_info.device_id::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            -- Se falhar, tentar converter de texto
            v_device_id_uuid := v_device_info.device_id::TEXT::UUID;
    END;
    
    -- Se ainda for NULL, retornar erro
    IF v_device_id_uuid IS NULL THEN
        UPDATE device_detections SET status = 'failed', processing_error = 'device_id não pode ser NULL', processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', 'device_id não pode ser NULL');
    END IF;
    
    -- Atualizar cache de informações
    -- device_detections.device_id é UUID, então usamos UUID diretamente
    UPDATE device_detections
    SET event_id = v_event_id_uuid,      -- ✅ UUID explícito
        device_id = v_device_id_uuid,    -- ✅ UUID explícito
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
            v_event_id_uuid, v_detection.dorsal_number, v_detection.captured_at,  -- ✅ event_id UUID
            v_detection.latitude, v_detection.longitude, v_detection.accuracy,
            'android', v_detection.session_id, v_device_id_uuid::TEXT,  -- ✅ UUID → TEXT
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
        -- image_buffer.device_id é TEXT, então convertemos UUID → TEXT
        INSERT INTO image_buffer (
            event_id, device_id, session_id, image_data, display_image, image_metadata,
            captured_at, latitude, longitude, accuracy, status
        ) VALUES (
            v_event_id_uuid, v_device_id_uuid::TEXT, v_detection.session_id,  -- ✅ UUID → TEXT
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
-- VERIFICAR TIPOS REAIS DAS COLUNAS
-- ============================================================================
-- Execute estas queries para verificar:
/*
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name IN ('event_devices', 'device_detections', 'detections', 'image_buffer')
AND column_name IN ('device_id', 'event_id')
ORDER BY table_name, column_name;
*/

-- ============================================================================
-- ✅ CORREÇÃO APLICADA
-- ============================================================================
-- A função agora:
-- 1. ✅ Força conversão UUID na query SELECT com COALESCE
-- 2. ✅ Usa variáveis UUID explícitas (v_device_id_uuid, v_event_id_uuid)
-- 3. ✅ Insere UUID diretamente em device_detections
-- 4. ✅ Converte UUID → TEXT ao inserir em detections e image_buffer
-- 5. ✅ Tratamento de erros para conversão
-- ============================================================================

