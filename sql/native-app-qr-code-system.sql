-- ============================================================================
-- KROMI NATIVE APP - SISTEMA DE QR CODE E DUAS OPÇÕES DE FUNCIONAMENTO
-- ============================================================================
-- Este script cria o sistema completo para app nativa:
-- 1. View para buscar informações do dispositivo pelo QR code (access_code)
-- 2. Função RPC para salvar detecção diretamente (se app mandar dorsal)
-- 3. Função RPC para salvar imagem no buffer (se app não mandar dorsal)
-- ============================================================================

-- ============================================================================
-- 1. VIEW: Informações do Dispositivo pelo QR Code
-- ============================================================================
-- Esta view retorna TODAS as informações que a app nativa precisa
-- quando faz login via QR code (access_code)
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

-- Índice para performance na busca por access_code
CREATE INDEX IF NOT EXISTS idx_event_devices_access_code ON event_devices(access_code) 
WHERE access_code IS NOT NULL;

-- Comentário
COMMENT ON VIEW device_qr_info IS 
'View que retorna todas as informações do dispositivo e evento baseado no access_code (QR code).
Usado pela app nativa para fazer login e obter configurações.';

-- ============================================================================
-- 2. FUNÇÃO RPC: Buscar Informações pelo QR Code
-- ============================================================================
CREATE OR REPLACE FUNCTION get_device_info_by_qr(p_access_code VARCHAR(6))
RETURNS TABLE (
    -- Identificação
    association_id UUID,
    access_code VARCHAR(6),
    device_pin TEXT,
    max_sessions INTEGER,
    active_sessions INTEGER,
    
    -- Evento
    event_id UUID,
    event_name TEXT,
    event_description TEXT,
    event_date DATE,
    event_location TEXT,
    event_type VARCHAR(50),
    event_started_at TIMESTAMPTZ,
    event_status TEXT,
    
    -- Dispositivo
    device_id UUID,
    device_name TEXT,
    device_type TEXT,
    
    -- Checkpoint
    checkpoint_name TEXT,
    checkpoint_type TEXT,
    checkpoint_order INTEGER,
    role TEXT,
    device_assigned_at TIMESTAMPTZ,
    device_last_seen TIMESTAMPTZ,
    
    -- Status
    can_create_session BOOLEAN,
    status_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.access_code,
        ed.device_pin,
        ed.max_sessions,
        ed.active_sessions,
        e.id,
        e.name,
        e.description,
        e.event_date,
        e.location,
        e.event_type,
        e.event_started_at,
        e.status,
        d.id,
        d.device_name,
        d.device_type,
        ed.checkpoint_name,
        ed.checkpoint_type,
        ed.checkpoint_order,
        ed.role,
        ed.assigned_at,
        d.last_seen,
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
-- 3. FUNÇÃO RPC: Salvar Detecção Direta (App mandou dorsal)
-- ============================================================================
-- Usado quando a app nativa conseguiu ler o dorsal e envia diretamente
CREATE OR REPLACE FUNCTION save_detection_direct(
    p_access_code VARCHAR(6),
    p_dorsal_number INTEGER,
    p_session_id TEXT,
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL,
    p_accuracy DECIMAL(10, 2) DEFAULT NULL,
    p_proof_image TEXT DEFAULT NULL,
    p_detection_method TEXT DEFAULT 'native_app'
)
RETURNS JSON AS $$
DECLARE
    v_device_info RECORD;
    v_detection_id UUID;
    v_device_order INTEGER;
BEGIN
    -- Buscar informações do dispositivo
    SELECT * INTO v_device_info
    FROM device_qr_info
    WHERE access_code = p_access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code inválido'
        );
    END IF;
    
    -- Verificar se pode criar sessão
    IF NOT v_device_info.can_create_session THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Dispositivo ocupado',
            'message', 'Limite de sessões atingido'
        );
    END IF;
    
    -- Obter checkpoint_order
    v_device_order := v_device_info.checkpoint_order;
    
    -- Inserir detecção diretamente
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
        p_dorsal_number,
        NOW(),
        p_latitude,
        p_longitude,
        p_accuracy,
        'android',
        p_session_id,
        v_device_info.device_id,
        v_device_order,
        NOW(),
        p_proof_image,
        p_detection_method
    )
    RETURNING id INTO v_detection_id;
    
    RETURN json_build_object(
        'success', true,
        'detection_id', v_detection_id,
        'event_id', v_device_info.event_id,
        'device_order', v_device_order,
        'checkpoint_name', v_device_info.checkpoint_name,
        'checkpoint_type', v_device_info.checkpoint_type,
        'message', 'Detecção salva com sucesso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FUNÇÃO RPC: Salvar Imagem no Buffer (App não mandou dorsal)
-- ============================================================================
-- Usado quando a app nativa não conseguiu ler o dorsal, envia imagem
CREATE OR REPLACE FUNCTION save_image_to_buffer(
    p_access_code VARCHAR(6),
    p_session_id TEXT,
    p_image_data TEXT,
    p_display_image TEXT DEFAULT NULL,
    p_image_metadata JSONB DEFAULT '{}',
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL,
    p_accuracy DECIMAL(10, 2) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_device_info RECORD;
    v_buffer_id UUID;
BEGIN
    -- Buscar informações do dispositivo
    SELECT * INTO v_device_info
    FROM device_qr_info
    WHERE access_code = p_access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code inválido'
        );
    END IF;
    
    -- Verificar se pode criar sessão
    IF NOT v_device_info.can_create_session THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Dispositivo ocupado',
            'message', 'Limite de sessões atingido'
        );
    END IF;
    
    -- Inserir no buffer
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
        p_session_id,
        p_image_data,
        p_display_image,
        p_image_metadata,
        NOW(),
        p_latitude,
        p_longitude,
        p_accuracy,
        'pending'
    )
    RETURNING id INTO v_buffer_id;
    
    RETURN json_build_object(
        'success', true,
        'buffer_id', v_buffer_id,
        'event_id', v_device_info.event_id,
        'device_order', v_device_info.checkpoint_order,
        'checkpoint_name', v_device_info.checkpoint_name,
        'checkpoint_type', v_device_info.checkpoint_type,
        'message', 'Imagem salva no buffer com sucesso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FUNÇÃO RPC: Validar PIN do Dispositivo
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
    -- Buscar informações do dispositivo
    SELECT * INTO v_device_info
    FROM device_qr_info
    WHERE access_code = p_access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'QR code inválido'
        );
    END IF;
    
    -- Verificar PIN
    v_pin_match := (v_device_info.device_pin = p_pin);
    
    IF NOT v_pin_match THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PIN incorreto'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'PIN válido'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. PERMISSÕES E SEGURANÇA
-- ============================================================================

-- Habilitar RLS nas funções (já tem nas tabelas)
-- As funções usam SECURITY DEFINER para permitir acesso público controlado

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para testar:

-- 1. Ver todos os dispositivos com QR code
-- SELECT * FROM device_qr_info LIMIT 10;

-- 2. Testar função de busca
-- SELECT * FROM get_device_info_by_qr('ABC123'); -- Substitua por código real

-- 3. Testar salvamento direto (substitua valores)
/*
SELECT save_detection_direct(
    'ABC123',              -- access_code
    42,                     -- dorsal_number
    'session-123',          -- session_id
    40.7128,                -- latitude
    -74.0060,              -- longitude
    10.5,                   -- accuracy
    NULL,                   -- proof_image (opcional)
    'native_app'            -- detection_method
);
*/

-- 4. Testar salvamento no buffer (substitua valores)
/*
SELECT save_image_to_buffer(
    'ABC123',              -- access_code
    'session-123',          -- session_id
    'iVBORw0KGgo...',      -- image_data (Base64)
    'iVBORw0KGgo...',      -- display_image (Base64, opcional)
    '{"width": 1920, "height": 1080}'::JSONB, -- metadata
    40.7128,                -- latitude
    -74.0060,              -- longitude
    10.5                    -- accuracy
);
*/

-- ============================================================================
-- DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON FUNCTION get_device_info_by_qr IS 
'Busca todas as informações do dispositivo e evento baseado no access_code (QR code).
Retorna erro se QR code inválido.';

COMMENT ON FUNCTION save_detection_direct IS 
'Salva detecção diretamente quando app nativa conseguiu ler dorsal.
Retorna sucesso com informações do checkpoint.';

COMMENT ON FUNCTION save_image_to_buffer IS 
'Salva imagem no buffer quando app nativa não conseguiu ler dorsal.
A imagem será processada depois por IA.';

COMMENT ON FUNCTION validate_device_pin IS 
'Valida PIN do dispositivo antes de permitir acesso.
Usado para autenticação na app nativa.';

-- ============================================================================
-- PRONTO! Sistema completo configurado
-- ============================================================================
-- Agora a app nativa pode:
-- 1. Escanear QR code (access_code)
-- 2. Chamar get_device_info_by_qr() para obter todas as informações
-- 3. Validar PIN (opcional) com validate_device_pin()
-- 4. Enviar detecção direta com save_detection_direct() OU
-- 5. Enviar imagem para buffer com save_image_to_buffer()
-- ============================================================================

