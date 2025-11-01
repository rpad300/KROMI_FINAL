-- ============================================================================
-- Verificar estrutura REAL e recriar função do zero
-- ============================================================================

-- 1. Verificar tipos REAIS das colunas
SELECT 
    'event_devices' as tabela,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'event_devices'
    AND column_name IN ('device_id', 'event_id');

SELECT 
    'device_detections' as tabela,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'device_detections'
    AND column_name IN ('device_id', 'event_id');

-- 2. DROP a função existente
DROP FUNCTION IF EXISTS process_device_detection(UUID);

-- 3. Criar versão SIMPLIFICADA para teste (sem subqueries, apenas variáveis TEXT)
CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_event_id_text TEXT;
    v_device_id_text TEXT;
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
    
    -- Buscar informações como TEXT primeiro
    SELECT ed.event_id::TEXT, 
           ed.device_id::TEXT,
           ed.checkpoint_order,
           ed.checkpoint_name,
           ed.checkpoint_type,
           e.status as event_status
    INTO v_event_id_text,
         v_device_id_text,
         v_checkpoint_order,
         v_checkpoint_name,
         v_checkpoint_type,
         v_event_status
    FROM event_devices ed
    JOIN events e ON e.id = ed.event_id
    WHERE ed.access_code = v_detection.access_code
    LIMIT 1;
    
    -- Verificar se encontrou dispositivo
    IF NOT FOUND OR v_device_id_text IS NULL THEN
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
    
    -- UPDATE com conversão TEXT -> UUID
    UPDATE device_detections
    SET event_id = v_event_id_text::UUID,
        device_id = v_device_id_text::UUID,
        device_order = v_checkpoint_order,
        checkpoint_name = v_checkpoint_name,
        checkpoint_type = v_checkpoint_type
    WHERE id = p_detection_id;
    
    -- Por enquanto, apenas marcar como processado (teste)
    UPDATE device_detections
    SET status = 'processed',
        processed_at = NOW(),
        processing_result = json_build_object('action', 'test', 'message', 'Teste de UPDATE bem sucedido')
    WHERE id = p_detection_id;
    
    RETURN json_build_object('success', true, 'message', 'UPDATE funcionou - teste bem sucedido');
    
EXCEPTION
    WHEN OTHERS THEN
        UPDATE device_detections SET status = 'failed', processing_error = SQLERRM, processed_at = NOW()
        WHERE id = p_detection_id;
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

