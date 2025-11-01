-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - MOBILE APP INBOX PATTERN
-- ============================================================================
-- Tabelas específicas para comunicação com app móvel
-- Modelo: App escreve em INBOX → Backend processa → Popula tabelas finais
-- ============================================================================

-- ============================================================================
-- 1. TRACK_PARTICIPANT_ACCESS - Tabela de Acesso (App CONSULTA)
-- ============================================================================
-- Finalidade: Mapear QR → Participante + Evento, validar estado e PIN
-- App faz SELECT aqui para validar QR antes de iniciar tracking

CREATE TABLE IF NOT EXISTS track_participant_access (
    association_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- QR Code e validação
    qr_code TEXT NOT NULL UNIQUE,
    device_pin TEXT, -- PIN de 4-6 dígitos (opcional, extra segurança)
    
    -- Relacionamentos
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Controle de sessões
    is_active BOOLEAN DEFAULT true,
    max_sessions INTEGER DEFAULT 1, -- Máximo de dispositivos simultâneos
    active_sessions INTEGER DEFAULT 0, -- Sessões ativas no momento
    
    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Expiração do QR (opcional)
    
    -- Metadados
    issued_by UUID, -- Quem emitiu
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_access_qr ON track_participant_access(qr_code) WHERE is_active = true;
CREATE INDEX idx_track_access_event ON track_participant_access(event_id);
CREATE INDEX idx_track_access_participant ON track_participant_access(participant_id);
CREATE INDEX idx_track_access_active ON track_participant_access(event_id, participant_id) WHERE is_active = true;

-- Constraint: 1 acesso ativo por participante/evento
CREATE UNIQUE INDEX idx_track_access_unique_active 
    ON track_participant_access(event_id, participant_id) 
    WHERE is_active = true;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION track_participant_access_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_participant_access_update_timestamp_trigger
    BEFORE UPDATE ON track_participant_access
    FOR EACH ROW
    EXECUTE FUNCTION track_participant_access_update_timestamp();

-- ============================================================================
-- 2. VIEW: CONTEXTO COMPLETO DO QR (App CONSULTA)
-- ============================================================================
-- Retorna tudo que a app precisa num único SELECT

CREATE OR REPLACE VIEW v_track_participant_qr_context AS
SELECT 
    -- Access Info
    tpa.association_id,
    tpa.qr_code,
    tpa.is_active,
    tpa.max_sessions,
    tpa.active_sessions,
    tpa.device_pin,
    tpa.expires_at,
    tpa.last_scanned_at,
    
    -- Event Info
    e.id as event_id,
    e.name as event_name,
    e.event_date as event_date,
    e.event_type,
    e.status as event_status,
    e.location as event_location,
    
    -- Participant Info
    p.id as participant_id,
    p.dorsal_number as dorsal_number,
    p.full_name,
    p.email,
    p.category,
    p.registration_status as registration_status,
    p.payment_status,
    
    -- Flags de validação
    CASE 
        WHEN NOT tpa.is_active THEN 'inactive'
        WHEN tpa.expires_at IS NOT NULL AND tpa.expires_at < NOW() THEN 'expired'
        WHEN tpa.active_sessions >= tpa.max_sessions THEN 'max_sessions'
        WHEN e.status NOT IN ('published', 'active') THEN 'event_not_active'
        WHEN p.registration_status NOT IN ('confirmed', 'registered') THEN 'participant_not_confirmed'
        ELSE 'valid'
    END as validation_status
    
FROM track_participant_access tpa
JOIN events e ON e.id = tpa.event_id
JOIN participants p ON p.id = tpa.participant_id;

COMMENT ON VIEW v_track_participant_qr_context IS 'Contexto completo para validação de QR pela app móvel';

-- ============================================================================
-- 3. TRACK_INBOX_MESSAGES - Caixa de Entrada (App ESCREVE)
-- ============================================================================
-- ÚNICO ponto de escrita da app. Backend processa daqui.

CREATE TABLE IF NOT EXISTS track_inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de mensagem
    message_type TEXT NOT NULL CHECK (message_type IN ('gps_batch', 'activity_event', 'heartbeat')),
    
    -- Idempotência (App gera UUID único por envio)
    dedupe_id UUID NOT NULL UNIQUE,
    
    -- Identificação do dispositivo
    device_id TEXT NOT NULL,
    app_version TEXT,
    device_info JSONB, -- {os, model, brand, etc}
    
    -- Contexto (se aplicável)
    qr_code TEXT, -- QR associado (se relevante)
    activity_id UUID, -- ID da atividade (se já tiver sido criada)
    
    -- Payload completo (JSON)
    payload JSONB NOT NULL,
    
    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    device_ts TIMESTAMPTZ, -- Timestamp do dispositivo (no payload também)
    
    -- Processamento
    processed_at TIMESTAMPTZ,
    processed_status TEXT CHECK (processed_status IN ('pending', 'success', 'failed', 'ignored')),
    processed_reason TEXT,
    processed_by TEXT, -- Worker/função que processou
    
    -- Retry (se falhar)
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_inbox_type ON track_inbox_messages(message_type);
CREATE INDEX idx_track_inbox_qr ON track_inbox_messages(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX idx_track_inbox_activity ON track_inbox_messages(activity_id) WHERE activity_id IS NOT NULL;
CREATE INDEX idx_track_inbox_device ON track_inbox_messages(device_id);
CREATE INDEX idx_track_inbox_received ON track_inbox_messages(received_at DESC);
CREATE INDEX idx_track_inbox_pending ON track_inbox_messages(received_at) WHERE processed_status IS NULL OR processed_status = 'pending';
CREATE INDEX idx_track_inbox_failed ON track_inbox_messages(received_at DESC) WHERE processed_status = 'failed';

-- Índice para cleanup (mensagens antigas já processadas)
CREATE INDEX idx_track_inbox_cleanup ON track_inbox_messages(processed_at) WHERE processed_status = 'success';

COMMENT ON TABLE track_inbox_messages IS 'Caixa de entrada única para todas as mensagens da app móvel';
COMMENT ON COLUMN track_inbox_messages.dedupe_id IS 'UUID único gerado pela app para garantir idempotência';
COMMENT ON COLUMN track_inbox_messages.payload IS 'Conteúdo completo da mensagem em JSON';

-- ============================================================================
-- 4. TRACK_DEVICE_REGISTRY - Registro de Dispositivos (Opcional)
-- ============================================================================
-- Autenticação simples por token
-- NOTA: Usando track_device_session do schema base, não duplicar

-- COMENTADO: Usando track_device_session do schema base
/* 
CREATE TABLE IF NOT EXISTS track_device_registry (
    device_id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('athlete', 'staff', 'detector')) DEFAULT 'athlete',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    device_info JSONB,
    app_version TEXT,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    total_messages INTEGER DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- Usar track_device_session da tabela base ao invés de track_device_registry

-- ============================================================================
-- 5. TRACK_INGEST_ERRORS - Log de Erros (Opcional)
-- ============================================================================
-- Auditoria detalhada de rejeições

CREATE TABLE IF NOT EXISTS track_ingest_errors (
    id BIGSERIAL PRIMARY KEY,
    
    -- Referência à mensagem
    inbox_id UUID REFERENCES track_inbox_messages(id) ON DELETE CASCADE,
    
    -- Erro
    error_code TEXT NOT NULL,
    error_detail TEXT,
    error_context JSONB,
    
    -- Classificação
    is_retriable BOOLEAN DEFAULT false,
    severity TEXT CHECK (severity IN ('warning', 'error', 'critical')) DEFAULT 'error',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_errors_inbox ON track_ingest_errors(inbox_id);
CREATE INDEX idx_track_errors_code ON track_ingest_errors(error_code);
CREATE INDEX idx_track_errors_created ON track_ingest_errors(created_at DESC);

COMMENT ON TABLE track_ingest_errors IS 'Log detalhado de erros no processamento de mensagens';

-- ============================================================================
-- 6. RPC: OBTER CONTEXTO POR QR (App CONSULTA via RPC)
-- ============================================================================

CREATE OR REPLACE FUNCTION track_get_participant_by_qr(
    p_qr_code TEXT,
    p_device_pin TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_context RECORD;
BEGIN
    -- Buscar contexto na view
    SELECT * INTO v_context
    FROM v_track_participant_qr_context
    WHERE qr_code = p_qr_code;
    
    -- QR não encontrado
    IF v_context.association_id IS NULL THEN
        RETURN json_build_object(
            'valid', false,
            'error', 'qr_not_found'
        );
    END IF;
    
    -- Verificar PIN se fornecido e configurado
    IF v_context.device_pin IS NOT NULL THEN
        IF p_device_pin IS NULL OR p_device_pin != v_context.device_pin THEN
            RETURN json_build_object(
                'valid', false,
                'error', 'invalid_pin'
            );
        END IF;
    END IF;
    
    -- Verificar validação geral
    IF v_context.validation_status != 'valid' THEN
        RETURN json_build_object(
            'valid', false,
            'error', v_context.validation_status,
            'event_name', v_context.event_name,
            'participant_name', v_context.full_name
        );
    END IF;
    
    -- Atualizar last_scanned_at
    UPDATE track_participant_access
    SET last_scanned_at = NOW()
    WHERE qr_code = p_qr_code;
    
    -- Retornar contexto completo
    RETURN json_build_object(
        'valid', true,
        'access', json_build_object(
            'association_id', v_context.association_id,
            'qr_code', v_context.qr_code,
            'max_sessions', v_context.max_sessions,
            'active_sessions', v_context.active_sessions
        ),
        'event', json_build_object(
            'id', v_context.event_id,
            'name', v_context.event_name,
            'date', v_context.event_date,
            'type', v_context.event_type,
            'location', v_context.event_location
        ),
        'participant', json_build_object(
            'id', v_context.participant_id,
            'dorsal', v_context.dorsal_number,
            'name', v_context.full_name,
            'email', v_context.email,
            'category', v_context.category
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION track_get_participant_by_qr IS 'Validar QR e retornar contexto completo para app móvel';

-- ============================================================================
-- 7. RPC: SUBMETER MENSAGEM PARA INBOX (App ESCREVE)
-- ============================================================================

CREATE OR REPLACE FUNCTION track_submit_message(
    p_message_type TEXT,
    p_dedupe_id UUID,
    p_device_id TEXT,
    p_app_version TEXT,
    p_payload JSONB,
    p_qr_code TEXT DEFAULT NULL,
    p_activity_id UUID DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_inbox_id UUID;
    v_already_exists BOOLEAN;
BEGIN
    -- Verificar idempotência
    SELECT EXISTS(
        SELECT 1 FROM track_inbox_messages WHERE dedupe_id = p_dedupe_id
    ) INTO v_already_exists;
    
    IF v_already_exists THEN
        -- Já foi processada, retornar sucesso
        SELECT id INTO v_inbox_id
        FROM track_inbox_messages
        WHERE dedupe_id = p_dedupe_id;
        
        RETURN json_build_object(
            'success', true,
            'inbox_id', v_inbox_id,
            'duplicate', true,
            'message', 'Message already received'
        );
    END IF;
    
    -- Inserir nova mensagem
    INSERT INTO track_inbox_messages (
        message_type,
        dedupe_id,
        device_id,
        app_version,
        device_info,
        qr_code,
        activity_id,
        payload,
        device_ts,
        processed_status
    ) VALUES (
        p_message_type,
        p_dedupe_id,
        p_device_id,
        p_app_version,
        p_device_info,
        p_qr_code,
        p_activity_id,
        p_payload,
        (p_payload->>'device_ts')::timestamptz,
        'pending'
    ) RETURNING id INTO v_inbox_id;
    
    -- Atualizar estatísticas do dispositivo (se registry existir)
    UPDATE track_device_registry
    SET total_messages = total_messages + 1,
        last_seen_at = NOW()
    WHERE device_id = p_device_id;
    
    RETURN json_build_object(
        'success', true,
        'inbox_id', v_inbox_id,
        'duplicate', false,
        'message', 'Message queued for processing'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION track_submit_message IS 'Submeter mensagem para inbox com garantia de idempotência';

-- ============================================================================
-- 8. MIGRAÇÃO: SINCRONIZAR COM TABELAS EXISTENTES
-- ============================================================================
-- Migrar QRs existentes de track_participant_qr para track_participant_access

CREATE OR REPLACE FUNCTION track_migrate_existing_qrs()
RETURNS JSON AS $$
DECLARE
    v_migrated INTEGER := 0;
    v_qr RECORD;
BEGIN
    -- Migrar QRs ativos
    FOR v_qr IN 
        SELECT * FROM track_participant_qr WHERE status = 'active'
    LOOP
        BEGIN
            INSERT INTO track_participant_access (
                qr_code,
                event_id,
                participant_id,
                is_active,
                assigned_at,
                issued_by
            ) VALUES (
                v_qr.qr_code,
                v_qr.event_id,
                v_qr.participant_id,
                true,
                v_qr.issued_at,
                v_qr.issued_by
            )
            ON CONFLICT (qr_code) DO NOTHING;
            
            v_migrated := v_migrated + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar duplicados ou erros
            CONTINUE;
        END;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'migrated', v_migrated
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON SCHEMA public IS 'Schema principal do VisionKrono com módulo GPS Tracking integrado';

-- ============================================================================
-- FIM DO MÓDULO MOBILE INBOX
-- ============================================================================

