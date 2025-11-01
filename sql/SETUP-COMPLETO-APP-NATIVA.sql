-- ============================================================================
-- KROMI - SETUP COMPLETO APP NATIVA (TUDO EM UM)
-- ============================================================================
-- Execute ESTE arquivo no Supabase Dashboard → SQL Editor
-- Este script cria TUDO necessário de uma vez!
-- ============================================================================

-- ============================================================================
-- PARTE 0: GARANTIR COLUNAS EM detections (se necessário)
-- ============================================================================
DO $$ 
BEGIN
    -- Adicionar event_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'event_id') THEN
        ALTER TABLE detections ADD COLUMN event_id UUID;
        CREATE INDEX IF NOT EXISTS idx_detections_event ON detections(event_id);
    END IF;
    
    -- Adicionar device_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'device_id') THEN
        ALTER TABLE detections ADD COLUMN device_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_detections_device ON detections(device_id);
    END IF;
    
    -- Adicionar device_order se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'device_order') THEN
        ALTER TABLE detections ADD COLUMN device_order INTEGER;
    END IF;
    
    -- Adicionar checkpoint_time se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'checkpoint_time') THEN
        ALTER TABLE detections ADD COLUMN checkpoint_time TIMESTAMPTZ;
    END IF;
    
    -- Adicionar proof_image se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'proof_image') THEN
        ALTER TABLE detections ADD COLUMN proof_image TEXT;
    END IF;
    
    -- Adicionar detection_method se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'detections' AND column_name = 'detection_method') THEN
        ALTER TABLE detections ADD COLUMN detection_method TEXT;
        CREATE INDEX IF NOT EXISTS idx_detections_method ON detections(detection_method);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar erros se tabela não existir
        NULL;
END $$;

-- ============================================================================
-- PARTE 1: CRIAR TABELA device_detections
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
    detection_id UUID,                    -- Se foi para detections
    buffer_id UUID,                       -- Se foi para image_buffer
    
    -- Informações do dispositivo (cache - preenchido pelo serviço)
    event_id UUID,  -- Referência será adicionada depois se necessário
    device_id UUID,  -- Referência será adicionada depois se necessário
    device_order INTEGER,
    checkpoint_name TEXT,
    checkpoint_type TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_device_detections_status ON device_detections(status);
CREATE INDEX IF NOT EXISTS idx_device_detections_created ON device_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_detections_access_code ON device_detections(access_code);
CREATE INDEX IF NOT EXISTS idx_device_detections_session ON device_detections(session_id);
CREATE INDEX IF NOT EXISTS idx_device_detections_dorsal ON device_detections(dorsal_number) WHERE dorsal_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_detections_pending ON device_detections(status, created_at) WHERE status = 'pending';

-- ============================================================================
-- PARTE 2: VIEW device_qr_info (Login via QR code)
-- ============================================================================
CREATE OR REPLACE VIEW device_qr_info AS
SELECT 
    ed.id as association_id,
    ed.access_code,
    ed.device_pin,
    ed.max_sessions,
    ed.active_sessions,
    
    -- Informações do Evento
    e.id as event_id,
    e.name as event_name,
    e.description as event_description,
    e.event_date,
    e.location as event_location,
    e.event_type,
    e.event_started_at,
    e.status as event_status,
    
    -- Informações do Dispositivo
    d.id as device_id,
    d.device_name,
    d.device_type,
    
    -- Informações do Checkpoint
    ed.checkpoint_name,
    ed.checkpoint_type,
    ed.checkpoint_order,
    ed.role,
    ed.assigned_at,
    
    -- Configurações
    ed.max_sessions as max_concurrent_sessions,
    
    -- Timestamps
    ed.assigned_at as device_assigned_at,
    d.last_seen as device_last_seen,
    
    -- Status
    ed.active_sessions < ed.max_sessions as can_create_session,
    CASE 
        WHEN ed.active_sessions >= ed.max_sessions THEN 'device_busy'
        WHEN e.status != 'active' THEN 'event_inactive'
        ELSE 'ready'
    END as status_message
    
FROM event_devices ed
JOIN events e ON e.id = ed.event_id
JOIN devices d ON d.id = ed.device_id
WHERE ed.access_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_devices_access_code ON event_devices(access_code) WHERE access_code IS NOT NULL;

-- ============================================================================
-- PARTE 3: FUNÇÃO gerar access_code
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    code VARCHAR(6);
    exists_check BOOLEAN;
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    max_attempts INT := 100;
    attempts INT := 0;
BEGIN
    LOOP
        code := '';
        FOR i IN 1..6 LOOP
            code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        SELECT EXISTS(SELECT 1 FROM event_devices WHERE access_code = code) INTO exists_check;
        
        IF NOT exists_check THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Não foi possível gerar código único após % tentativas', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 4: TRIGGER gerar access_code automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_generate_access_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
        NEW.access_code := generate_access_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_access_code ON event_devices;
CREATE TRIGGER trigger_auto_generate_access_code
    BEFORE INSERT OR UPDATE ON event_devices
    FOR EACH ROW
    WHEN (NEW.access_code IS NULL OR NEW.access_code = '')
    EXECUTE FUNCTION auto_generate_access_code();

-- ============================================================================
-- PARTE 5: TRIGGER preencher informações automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_device_info_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- Garantir access_code
    IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
        NEW.access_code := generate_access_code();
    END IF;
    
    -- Garantir checkpoint_name
    IF NEW.checkpoint_name IS NULL OR NEW.checkpoint_name = '' THEN
        NEW.checkpoint_name := 'Checkpoint #' || COALESCE(NEW.checkpoint_order, 1);
    END IF;
    
    -- Garantir checkpoint_type
    IF NEW.checkpoint_type IS NULL OR NEW.checkpoint_type = '' THEN
        NEW.checkpoint_type := 'checkpoint';
    END IF;
    
    -- Garantir checkpoint_order
    IF NEW.checkpoint_order IS NULL THEN
        SELECT COALESCE(MAX(checkpoint_order), 0) + 1
        INTO NEW.checkpoint_order
        FROM event_devices
        WHERE event_id = NEW.event_id;
    END IF;
    
    -- Garantir max_sessions
    IF NEW.max_sessions IS NULL THEN
        NEW.max_sessions := 1;
    END IF;
    
    -- Garantir active_sessions
    IF NEW.active_sessions IS NULL THEN
        NEW.active_sessions := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_device_info_complete ON event_devices;
CREATE TRIGGER trigger_ensure_device_info_complete
    BEFORE INSERT OR UPDATE ON event_devices
    FOR EACH ROW
    EXECUTE FUNCTION ensure_device_info_complete();

-- ============================================================================
-- PARTE 6: FUNÇÃO RPC - Salvar dados da app (save_device_detection)
-- ============================================================================
CREATE OR REPLACE FUNCTION save_device_detection(
    -- Parâmetros obrigatórios (sem DEFAULT)
    p_access_code VARCHAR(6),
    p_session_id TEXT,
    p_image_data TEXT,
    p_latitude DECIMAL(10, 8),  -- OBRIGATÓRIO
    p_longitude DECIMAL(11, 8),  -- OBRIGATÓRIO
    p_captured_at TIMESTAMPTZ,  -- OBRIGATÓRIO
    -- Parâmetros opcionais (com DEFAULT)
    p_dorsal_number INTEGER DEFAULT NULL,
    p_display_image TEXT DEFAULT NULL,
    p_image_metadata JSONB DEFAULT '{}',
    p_accuracy DECIMAL(10, 2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_detection_id UUID;
BEGIN
    -- Validar access_code
    IF NOT EXISTS (SELECT 1 FROM event_devices WHERE access_code = p_access_code) THEN
        RETURN json_build_object('success', false, 'error', 'QR code inválido');
    END IF;
    
    -- Validar campos obrigatórios
    IF p_latitude IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Latitude é obrigatória');
    END IF;
    
    IF p_longitude IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Longitude é obrigatória');
    END IF;
    
    IF p_captured_at IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Timestamp de captura é obrigatório');
    END IF;
    
    -- Validar GPS (valores válidos)
    IF p_latitude < -90 OR p_latitude > 90 THEN
        RETURN json_build_object('success', false, 'error', 'Latitude inválida (deve estar entre -90 e 90)');
    END IF;
    
    IF p_longitude < -180 OR p_longitude > 180 THEN
        RETURN json_build_object('success', false, 'error', 'Longitude inválida (deve estar entre -180 e 180)');
    END IF;
    
    -- Inserir
    INSERT INTO device_detections (
        access_code, session_id, dorsal_number, image_data, display_image,
        image_metadata, latitude, longitude, accuracy, captured_at, status
    ) VALUES (
        p_access_code, p_session_id, p_dorsal_number, p_image_data, p_display_image,
        p_image_metadata, p_latitude, p_longitude, p_accuracy, p_captured_at, 'pending'
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
-- PARTE 7: FUNÇÃO RPC - Obter informações do dispositivo (get_device_info_by_qr)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_device_info_by_qr(p_access_code VARCHAR(6))
RETURNS TABLE (
    association_id UUID,
    access_code VARCHAR(6),
    device_pin TEXT,
    max_sessions INTEGER,
    active_sessions INTEGER,
    event_id UUID,
    event_name TEXT,
    event_description TEXT,
    event_date DATE,
    event_location TEXT,
    event_type VARCHAR(50),
    event_started_at TIMESTAMPTZ,
    event_status TEXT,
    device_id UUID,
    device_name TEXT,
    device_type TEXT,
    checkpoint_name TEXT,
    checkpoint_type TEXT,
    checkpoint_order INTEGER,
    role TEXT,
    device_assigned_at TIMESTAMPTZ,
    device_last_seen TIMESTAMPTZ,
    can_create_session BOOLEAN,
    status_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id, ed.access_code, ed.device_pin, ed.max_sessions, ed.active_sessions,
        e.id, e.name, e.description, e.event_date, e.location, e.event_type,
        e.event_started_at, e.status,
        d.id, d.device_name, d.device_type,
        ed.checkpoint_name, ed.checkpoint_type, ed.checkpoint_order, ed.role,
        ed.assigned_at, d.last_seen,
        (ed.active_sessions < ed.max_sessions),
        CASE 
            WHEN ed.active_sessions >= ed.max_sessions THEN 'device_busy'::TEXT
            WHEN e.status != 'active' THEN 'event_inactive'::TEXT
            ELSE 'ready'::TEXT
        END
    FROM event_devices ed
    JOIN events e ON e.id = ed.event_id
    JOIN devices d ON d.id = ed.device_id
    WHERE ed.access_code = p_access_code
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 8: FUNÇÃO RPC - Validar PIN (validate_device_pin)
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_device_pin(
    p_access_code VARCHAR(6),
    p_pin TEXT
)
RETURNS JSON AS $$
DECLARE
    v_device_info RECORD;
    v_pin_match BOOLEAN;
BEGIN
    SELECT * INTO v_device_info
    FROM device_qr_info
    WHERE access_code = p_access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'QR code inválido');
    END IF;
    
    v_pin_match := (v_device_info.device_pin = p_pin);
    
    IF NOT v_pin_match THEN
        RETURN json_build_object('success', false, 'error', 'PIN incorreto');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'PIN válido');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 9: FUNÇÃO RPC - Processar um registro (process_device_detection)
-- ============================================================================
CREATE OR REPLACE FUNCTION process_device_detection(p_detection_id UUID)
RETURNS JSON AS $$
DECLARE
    v_detection RECORD;
    v_device_info RECORD;
    v_detection_result_id UUID;
    v_buffer_result_id UUID;
    v_has_dorsal BOOLEAN;
    v_device_id_uuid UUID;  -- Variável explícita para garantir tipo UUID
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
    -- IMPORTANTE: Converter device_id explicitamente para UUID na query
    SELECT ed.event_id, 
           ed.device_id::UUID as device_id,  -- Garantir tipo UUID na query
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
    
    -- CONVERSÃO EXPLÍCITA: Garantir que device_id é UUID
    -- v_device_info.device_id já foi convertido para UUID na query acima
    -- Mas fazemos conversão adicional para garantir tipo correto na variável
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
        -- (Colunas já foram garantidas no início do script)
        INSERT INTO detections (
            event_id, number, timestamp, latitude, longitude, accuracy,
            device_type, session_id, device_id, device_order, checkpoint_time, proof_image, detection_method
        ) VALUES (
            v_device_info.event_id, v_detection.dorsal_number, v_detection.captured_at,
            v_detection.latitude, v_detection.longitude, v_detection.accuracy,
            'android', v_detection.session_id, v_device_id_uuid::TEXT,  -- UUID → TEXT (detections usa TEXT)
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
        INSERT INTO image_buffer (
            event_id, device_id, session_id, image_data, display_image, image_metadata,
            captured_at, latitude, longitude, accuracy, status
        ) VALUES (
            v_device_info.event_id, v_device_id_uuid::TEXT, v_detection.session_id,  -- UUID → TEXT (image_buffer usa TEXT)
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
-- PARTE 10: FUNÇÃO RPC - Processar lote (process_pending_detections)
-- ============================================================================
CREATE OR REPLACE FUNCTION process_pending_detections(p_batch_size INTEGER DEFAULT 10)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_results JSON[] := '{}';
    v_result JSON;
BEGIN
    FOR v_record IN 
        SELECT id FROM device_detections 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT p_batch_size
    LOOP
        SELECT process_device_detection(v_record.id) INTO v_result;
        v_results := array_append(v_results, v_result);
        
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
-- PARTE 11: VIEW - Registros pendentes
-- ============================================================================
CREATE OR REPLACE VIEW pending_device_detections AS
SELECT 
    id, access_code, session_id, dorsal_number, captured_at, created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM device_detections
WHERE status = 'pending'
ORDER BY created_at ASC;

-- ============================================================================
-- PARTE 12: Preencher informações em dispositivos existentes
-- ============================================================================
-- Gerar access_code para dispositivos que não têm
UPDATE event_devices
SET access_code = generate_access_code()
WHERE access_code IS NULL OR access_code = '';

-- Preencher checkpoint_name se não tiver
UPDATE event_devices
SET checkpoint_name = 'Checkpoint #' || COALESCE(checkpoint_order, 1)
WHERE checkpoint_name IS NULL OR checkpoint_name = '';

-- Preencher checkpoint_type se não tiver
UPDATE event_devices
SET checkpoint_type = 'checkpoint'
WHERE checkpoint_type IS NULL OR checkpoint_type = '';

-- Preencher checkpoint_order se não tiver
UPDATE event_devices ed
SET checkpoint_order = subquery.row_num
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY assigned_at) as row_num
    FROM event_devices WHERE checkpoint_order IS NULL
) subquery
WHERE ed.id = subquery.id AND ed.checkpoint_order IS NULL;

-- Preencher max_sessions se não tiver
UPDATE event_devices
SET max_sessions = 1
WHERE max_sessions IS NULL;

-- Preencher active_sessions se não tiver
UPDATE event_devices
SET active_sessions = 0
WHERE active_sessions IS NULL;

-- ============================================================================
-- PARTE 13: COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON TABLE device_detections IS 'Tabela única que recebe todos os dados da app nativa. Um serviço backend processa e decide se vai para detections ou image_buffer.';
COMMENT ON COLUMN device_detections.dorsal_number IS 'NULL = app não conseguiu ler dorsal, INTEGER = app leu dorsal. Define qual caminho o processamento vai seguir.';
COMMENT ON VIEW device_qr_info IS 'View que retorna TODAS as informações necessárias para login da app nativa. Sempre consultar esta view quando app escanear QR code.';
COMMENT ON FUNCTION save_device_detection IS 'Função que a app nativa chama para enviar dados. Apenas recebe e salva, não decide nada.';
COMMENT ON FUNCTION process_device_detection IS 'Função que o serviço backend chama para processar um registro. Decide se vai para detections (tem dorsal) ou image_buffer (não tem).';

-- ============================================================================
-- PARTE 14: VERIFICAÇÃO FINAL
-- ============================================================================
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_view_exists BOOLEAN;
    v_functions_count INTEGER;
BEGIN
    -- Verificar tabela
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_detections')
    INTO v_table_exists;
    
    -- Verificar view
    SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'device_qr_info')
    INTO v_view_exists;
    
    -- Contar funções
    SELECT COUNT(*) INTO v_functions_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN ('save_device_detection', 'get_device_info_by_qr', 'process_device_detection', 'process_pending_detections');
    
    -- Mostrar resultado
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESULTADO DO SETUP:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabela device_detections: %', CASE WHEN v_table_exists THEN '✅ CRIADA' ELSE '❌ NÃO CRIADA' END;
    RAISE NOTICE 'View device_qr_info: %', CASE WHEN v_view_exists THEN '✅ CRIADA' ELSE '❌ NÃO CRIADA' END;
    RAISE NOTICE 'Funções RPC: %/4', v_functions_count;
    RAISE NOTICE '========================================';
    
    IF v_table_exists AND v_view_exists AND v_functions_count = 4 THEN
        RAISE NOTICE '✅ SETUP COMPLETO! Tudo criado com sucesso.';
    ELSE
        RAISE NOTICE '⚠️ Algumas coisas podem estar faltando. Verifique os erros acima.';
    END IF;
END $$;

-- ============================================================================
-- ✅ PRONTO! TUDO CRIADO!
-- ============================================================================
-- Agora você tem:
-- ✅ Tabela device_detections
-- ✅ View device_qr_info
-- ✅ Funções RPC (save, get, process)
-- ✅ Triggers automáticos
-- ✅ Índices de performance
--
-- Próximos passos:
-- 1. Reiniciar servidor: node server.js
-- 2. Verificar logs: deve aparecer "✅ Processador de device detections ativo"
-- 3. Testar com app nativa
-- ============================================================================

