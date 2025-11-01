-- ============================================================================
-- KROMI NATIVE APP - TABELA ÚNICA DE RECOLHA DE DADOS
-- ============================================================================
-- Esta tabela recebe TODOS os dados da app nativa (com ou sem dorsal).
-- Um serviço backend processa e decide:
-- - Se tem dorsal_number → Cria classificação diretamente
-- - Se não tem dorsal_number → Envia para image_buffer para processamento
-- ============================================================================

-- ============================================================================
-- 1. TABELA: device_detections (recolha de dados da app nativa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_detections (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Identificação do dispositivo (via QR code)
    access_code VARCHAR(6) NOT NULL,
    session_id TEXT NOT NULL,
    
    -- Dados do dorsal (se app conseguiu ler)
    dorsal_number INTEGER,  -- NULL = não leu, INTEGER = leu
    
    -- Dados da imagem (sempre presente)
    image_data TEXT NOT NULL,           -- Base64 (70% quality)
    display_image TEXT,                 -- Base64 (90% quality, opcional)
    image_metadata JSONB DEFAULT '{}',  -- Metadados da imagem
    
    -- GPS
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),
    
    -- Timestamp da captura
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status de processamento
    status TEXT DEFAULT 'pending',  -- pending, processing, processed, failed
    
    -- Resultado do processamento
    processed_at TIMESTAMPTZ,
    processing_result JSONB,  -- Informações do processamento
    processing_error TEXT,    -- Erro se falhar
    
    -- Referências (preenchidas após processamento)
    detection_id UUID REFERENCES detections(id),      -- Se foi para detections
    buffer_id UUID,                                   -- Se foi para image_buffer
    
    -- Informações do dispositivo (cache - preenchido pelo serviço)
    event_id UUID REFERENCES events(id),
    device_id UUID REFERENCES devices(id),
    device_order INTEGER,
    checkpoint_name TEXT,
    checkpoint_type TEXT
);

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_device_detections_status ON device_detections(status);
CREATE INDEX IF NOT EXISTS idx_device_detections_created ON device_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_detections_access_code ON device_detections(access_code);
CREATE INDEX IF NOT EXISTS idx_device_detections_session ON device_detections(session_id);
CREATE INDEX IF NOT EXISTS idx_device_detections_dorsal ON device_detections(dorsal_number) WHERE dorsal_number IS NOT NULL;

-- Índice composto para processamento eficiente
CREATE INDEX IF NOT EXISTS idx_device_detections_pending ON device_detections(status, created_at) 
WHERE status = 'pending';

-- ============================================================================
-- 3. FUNÇÃO RPC: Salvar Dados da App Nativa
-- ============================================================================
-- Função simples que a app nativa chama - apenas recebe dados, não decide nada
-- ⚠️ GPS e TIMESTAMP são OBRIGATÓRIOS!
CREATE OR REPLACE FUNCTION save_device_detection(
    p_access_code VARCHAR(6),
    p_session_id TEXT,
    p_dorsal_number INTEGER DEFAULT NULL,  -- NULL se não leu
    p_image_data TEXT,                     -- Sempre presente
    p_display_image TEXT DEFAULT NULL,     -- Opcional
    p_image_metadata JSONB DEFAULT '{}',
    p_latitude DECIMAL(10, 8) NOT NULL,     -- OBRIGATÓRIO: GPS Latitude
    p_longitude DECIMAL(11, 8) NOT NULL,   -- OBRIGATÓRIO: GPS Longitude
    p_accuracy DECIMAL(10, 2) DEFAULT NULL, -- Opcional (precisão do GPS)
    p_captured_at TIMESTAMPTZ NOT NULL      -- OBRIGATÓRIO: Timestamp da captura
)
RETURNS JSON AS $$
DECLARE
    v_detection_id UUID;
BEGIN
    -- Validar access_code existe
    IF NOT EXISTS (
        SELECT 1 FROM event_devices WHERE access_code = p_access_code
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code inválido'
        );
    END IF;
    
    -- Validar GPS (deve estar entre valores válidos)
    IF p_latitude < -90 OR p_latitude > 90 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Latitude inválida (deve estar entre -90 e 90)'
        );
    END IF;
    
    IF p_longitude < -180 OR p_longitude > 180 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Longitude inválida (deve estar entre -180 e 180)'
        );
    END IF;
    
    -- Inserir dados (sempre, independente de ter dorsal ou não)
    INSERT INTO device_detections (
        access_code,
        session_id,
        dorsal_number,
        image_data,
        display_image,
        image_metadata,
        latitude,
        longitude,
        accuracy,
        captured_at,
        status
    ) VALUES (
        p_access_code,
        p_session_id,
        p_dorsal_number,  -- Pode ser NULL
        p_image_data,
        p_display_image,
        p_image_metadata,
        p_latitude,
        p_longitude,
        p_accuracy,
        p_captured_at,  -- OBRIGATÓRIO - não usa COALESCE
        'pending'  -- Sempre inicia como pending
    )
    RETURNING id INTO v_detection_id;
    
    RETURN json_build_object(
        'success', true,
        'detection_id', v_detection_id,
        'message', 'Dados recebidos com sucesso. Aguardando processamento.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNÇÃO: Processar Device Detection (chamada pelo serviço backend)
-- ============================================================================
-- Esta função é chamada pelo serviço backend que processa a tabela
CREATE OR REPLACE FUNCTION process_device_detection(
    p_detection_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_device_info RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
BEGIN
    -- Buscar registro
    SELECT * INTO v_detection
    FROM device_detections
    WHERE id = p_detection_id
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Registro não encontrado ou já processado'
        );
    END IF;
    
    -- Marcar como processando
    UPDATE device_detections
    SET status = 'processing'
    WHERE id = p_detection_id;
    
    -- Buscar informações do dispositivo
    SELECT 
        ed.event_id,
        ed.device_id,
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
        UPDATE device_detections
        SET 
            status = 'failed',
            processing_error = 'Dispositivo não encontrado',
            processed_at = NOW()
        WHERE id = p_detection_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Dispositivo não encontrado'
        );
    END IF;
    
    -- Verificar se evento está ativo
    IF v_device_info.event_status != 'active' THEN
        UPDATE device_detections
        SET 
            status = 'failed',
            processing_error = 'Evento não está ativo',
            processed_at = NOW()
        WHERE id = p_detection_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Evento não está ativo'
        );
    END IF;
    
    -- Atualizar cache de informações do dispositivo
    UPDATE device_detections
    SET 
        event_id = v_device_info.event_id,
        device_id = v_device_info.device_id,
        device_order = v_device_info.checkpoint_order,
        checkpoint_name = v_device_info.checkpoint_name,
        checkpoint_type = v_device_info.checkpoint_type
    WHERE id = p_detection_id;
    
    -- Verificar se tem dorsal
    v_has_dorsal := (v_detection.dorsal_number IS NOT NULL);
    
    IF v_has_dorsal THEN
        -- ============================================================
        -- OPÇÃO 1: Tem dorsal → Criar detecção diretamente
        -- ============================================================
        
        INSERT INTO detections (
            event_id,
            number,
            timestamp,
            latitude,
            longitude,
            accuracy,
            device_type,
            session_id,
            device_id,
            device_order,
            checkpoint_time,
            proof_image,
            detection_method
        ) VALUES (
            v_device_info.event_id,
            v_detection.dorsal_number,
            v_detection.captured_at,
            v_detection.latitude,
            v_detection.longitude,
            v_detection.accuracy,
            'android',
            v_detection.session_id,
            v_device_info.device_id::TEXT,
            v_device_info.checkpoint_order,
            v_detection.captured_at,
            v_detection.display_image,
            'native_app'
        )
        RETURNING id INTO v_detection_result_id;
        
        -- Atualizar registro com resultado
        UPDATE device_detections
        SET 
            status = 'processed',
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
        -- ============================================================
        -- OPÇÃO 2: Não tem dorsal → Enviar para image_buffer
        -- ============================================================
        
        INSERT INTO image_buffer (
            event_id,
            device_id,
            session_id,
            image_data,
            display_image,
            image_metadata,
            captured_at,
            latitude,
            longitude,
            accuracy,
            status
        ) VALUES (
            v_device_info.event_id,
            v_device_info.device_id::TEXT,
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
        
        -- Atualizar registro com resultado
        UPDATE device_detections
        SET 
            status = 'processed',
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
        -- Em caso de erro, marcar como failed
        UPDATE device_detections
        SET 
            status = 'failed',
            processing_error = SQLERRM,
            processed_at = NOW()
        WHERE id = p_detection_id;
        
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. VIEW: Device Detections Pendentes (para o serviço backend)
-- ============================================================================
CREATE OR REPLACE VIEW pending_device_detections AS
SELECT 
    id,
    access_code,
    session_id,
    dorsal_number,
    captured_at,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM device_detections
WHERE status = 'pending'
ORDER BY created_at ASC;

-- ============================================================================
-- 6. FUNÇÃO: Processar Próximo Lote (para o serviço backend)
-- ============================================================================
-- Processa até N registros pendentes
CREATE OR REPLACE FUNCTION process_pending_detections(
    p_batch_size INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_results JSON[] := '{}';
    v_result JSON;
BEGIN
    -- Processar até p_batch_size registros pendentes
    FOR v_record IN 
        SELECT id 
        FROM device_detections 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT p_batch_size
    LOOP
        -- Processar cada registro
        SELECT process_device_detection(v_record.id) INTO v_result;
        
        -- Adicionar ao array de resultados
        v_results := array_append(v_results, v_result);
        
        -- Contar sucessos/falhas
        IF (v_result->>'success')::BOOLEAN THEN
            v_processed := v_processed + 1;
        ELSE
            v_failed := v_failed + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed', v_processed,
        'failed', v_failed,
        'total', array_length(v_results, 1),
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE device_detections DISABLE ROW LEVEL SECURITY;  -- Para desenvolvimento

-- Para produção, descomente:
-- ALTER TABLE device_detections ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public insert" ON device_detections FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Allow service role read" ON device_detections FOR SELECT TO service_role USING (true);

-- ============================================================================
-- 8. COMENTÁRIOS
-- ============================================================================
COMMENT ON TABLE device_detections IS 
'Tabela única que recebe todos os dados da app nativa.
Um serviço backend processa e decide se vai para detections ou image_buffer.';

COMMENT ON COLUMN device_detections.dorsal_number IS 
'NULL = app não conseguiu ler dorsal, INTEGER = app leu dorsal.
Define qual caminho o processamento vai seguir.';

COMMENT ON COLUMN device_detections.status IS 
'pending = aguardando processamento,
processing = sendo processado,
processed = processado com sucesso,
failed = falhou no processamento';

COMMENT ON FUNCTION save_device_detection IS 
'Função que a app nativa chama para enviar dados.
Apenas recebe e salva, não decide nada.';

COMMENT ON FUNCTION process_device_detection IS 
'Função que o serviço backend chama para processar um registro.
Decide se vai para detections (tem dorsal) ou image_buffer (não tem).';

COMMENT ON FUNCTION process_pending_detections IS 
'Função que o serviço backend chama periodicamente.
Processa um lote de registros pendentes.';

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Ver registros pendentes
-- SELECT * FROM pending_device_detections LIMIT 10;

-- Processar um registro específico
-- SELECT process_device_detection('uuid-aqui');

-- Processar lote de 10 registros
-- SELECT process_pending_detections(10);

-- Ver estatísticas
-- SELECT 
--     status,
--     COUNT(*) as count,
--     COUNT(*) FILTER (WHERE dorsal_number IS NOT NULL) as with_dorsal,
--     COUNT(*) FILTER (WHERE dorsal_number IS NULL) as without_dorsal
-- FROM device_detections
-- GROUP BY status;

-- ============================================================================
-- PRONTO! Sistema de Recolha de Dados Criado
-- ============================================================================
-- App nativa: Apenas chama save_device_detection() com todos os dados
-- Serviço backend: Chama process_pending_detections() periodicamente
-- O serviço decide automaticamente onde colocar os dados
-- ============================================================================

