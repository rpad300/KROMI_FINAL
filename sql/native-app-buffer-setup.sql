-- ============================================================================
-- KROMI NATIVE APP - SUPABASE BUFFER SETUP (COMPATIBLE VERSION)
-- ============================================================================
-- Este script cria a tabela image_buffer compatível com:
-- - detection-kromi.html (web app)
-- - Android Native App
-- - Sistema de processamento existente
-- ============================================================================

-- ============================================================================
-- TABELA PRINCIPAL: image_buffer
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_buffer (
    -- Campos automáticos
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Identificação do evento e dispositivo
    event_id UUID NOT NULL,
    device_id TEXT NOT NULL, -- TEXT para compatibilidade (pode ser UUID como string)
    session_id TEXT NOT NULL,

    -- Dados da imagem (DUAS VERSÕES - IMPORTANTE!)
    image_data TEXT NOT NULL,          -- Base64 otimizada para IA (70% quality)
    display_image TEXT,                 -- Base64 para visualização (90% quality)
    image_metadata JSONB DEFAULT '{}', -- Metadados: width, height, device_type, timestamp, etc.

    -- Data e hora da captura
    captured_at TIMESTAMPTZ NOT NULL,

    -- GPS Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(10, 2),

    -- Status de processamento (CRÍTICO!)
    status TEXT DEFAULT 'pending', -- pending, processing, processed, discarded

    -- Campos opcionais de processamento (para sistema completo)
    processed_at TIMESTAMPTZ,
    processed_by TEXT,
    detection_results JSONB,          -- Dorsais detectados
    processing_method TEXT,            -- gemini, google, ocr
    processing_time_ms INTEGER,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_image_buffer_event_id ON image_buffer(event_id);
CREATE INDEX IF NOT EXISTS idx_image_buffer_session_id ON image_buffer(session_id);
CREATE INDEX IF NOT EXISTS idx_image_buffer_device_id ON image_buffer(device_id);
CREATE INDEX IF NOT EXISTS idx_image_buffer_captured_at ON image_buffer(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_buffer_status ON image_buffer(status);
CREATE INDEX IF NOT EXISTS idx_image_buffer_expires_at ON image_buffer(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Para desenvolvimento/testes: Permitir acesso público
ALTER TABLE image_buffer DISABLE ROW LEVEL SECURITY;

-- Para produção: Descomente as linhas abaixo para habilitar RLS
-- ALTER TABLE image_buffer ENABLE ROW LEVEL SECURITY;
-- 
-- -- Política: Permitir inserção pública (apps podem enviar imagens)
-- DROP POLICY IF EXISTS "Allow public insert" ON image_buffer;
-- CREATE POLICY "Allow public insert" ON image_buffer
--     FOR INSERT
--     TO public
--     WITH CHECK (true);
-- 
-- -- Política: Usuários autenticados podem ler
-- DROP POLICY IF EXISTS "Allow authenticated read" ON image_buffer;
-- CREATE POLICY "Allow authenticated read" ON image_buffer
--     FOR SELECT
--     TO authenticated
--     USING (true);
-- 
-- -- Política: Apenas service_role pode deletar (limpeza)
-- DROP POLICY IF EXISTS "Only service role can delete" ON image_buffer;
-- CREATE POLICY "Only service role can delete" ON image_buffer
--     FOR DELETE
--     TO service_role
--     USING (true);

-- ============================================================================
-- VIEWS DE ANÁLISE (OPCIONAIS - úteis para monitoramento)
-- ============================================================================

-- View: Resumo de imagens por evento
CREATE OR REPLACE VIEW image_summary AS
SELECT
    event_id,
    session_id,
    device_id,
    COUNT(*) as image_count,
    MIN(captured_at) as first_capture,
    MAX(captured_at) as last_capture,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'processed') as processed_count,
    ROUND(AVG(latitude)::numeric, 6) as avg_latitude,
    ROUND(AVG(longitude)::numeric, 6) as avg_longitude
FROM image_buffer
GROUP BY event_id, session_id, device_id
ORDER BY first_capture DESC;

-- View: Sessões ativas (últimas 6 horas)
CREATE OR REPLACE VIEW active_sessions AS
SELECT
    event_id,
    session_id,
    device_id,
    COUNT(*) as images_uploaded,
    MAX(created_at) as last_upload,
    MIN(captured_at) as session_start,
    MAX(captured_at) as session_end,
    EXTRACT(EPOCH FROM (MAX(captured_at) - MIN(captured_at))) / 60 as duration_minutes
FROM image_buffer
WHERE created_at >= NOW() - INTERVAL '6 hours'
GROUP BY event_id, session_id, device_id
ORDER BY last_upload DESC;

-- View: Estatísticas por dispositivo
CREATE OR REPLACE VIEW device_stats AS
SELECT
    device_id,
    COUNT(DISTINCT event_id) as events_captured,
    COUNT(DISTINCT session_id) as sessions_count,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_images,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM image_buffer
GROUP BY device_id
ORDER BY total_images DESC;

-- View: Uploads recentes (últimas 24 horas)
CREATE OR REPLACE VIEW recent_uploads AS
SELECT
    event_id,
    device_id,
    session_id,
    captured_at,
    created_at,
    status,
    ROUND(EXTRACT(EPOCH FROM (created_at - captured_at))::numeric, 2) as upload_lag_seconds,
    latitude,
    longitude,
    accuracy
FROM image_buffer
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- FUNÇÕES ÚTEIS (OPCIONAIS)
-- ============================================================================

-- Função: Limpar imagens expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM image_buffer 
    WHERE expires_at < NOW() 
    AND status IN ('processed', 'discarded');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Execute estas queries para verificar se tudo foi criado corretamente:

-- Verificar tabela
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'image_buffer';

-- Verificar índices
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'image_buffer';

-- Verificar views
-- SELECT table_name FROM information_schema.views
-- WHERE table_schema = 'public' AND table_name LIKE 'image%';

-- ============================================================================
-- EXEMPLO DE INSERÇÃO (para testar)
-- ============================================================================
/*
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
    '00000000-0000-0000-0000-000000000000'::UUID, -- substitua por UUID real
    'device-123',
    'session-456',
    'iVBORw0KGgoAAAANS...', -- Base64 da imagem (70% quality)
    'iVBORw0KGgoAAAANS...', -- Base64 da imagem (90% quality)
    '{"width": 1920, "height": 1080, "device_type": "android", "timestamp": "2024-01-01T12:00:00Z"}',
    NOW(),
    40.7128,  -- latitude
    -74.0060, -- longitude
    10.5,     -- accuracy em metros
    'pending'
);
*/

-- ============================================================================
-- DIFERENÇAS DO SCRIPT ORIGINAL CORRIGIDAS
-- ============================================================================
-- ✅ ADICIONADO: display_image (necessário para visualização)
-- ✅ ADICIONADO: image_metadata (JSONB com metadados da imagem)
-- ✅ ADICIONADO: status (controle de processamento)
-- ✅ ADICIONADO: Campos de processamento (processed_at, detection_results, etc.)
-- ✅ ADICIONADO: expires_at (limpeza automática)
-- ✅ CORRIGIDO: device_id como TEXT (compatível com web app)
-- ❌ REMOVIDO: event_name (redundante, buscar da tabela events)
-- ❌ REMOVIDO: capture_point (não usado)
-- ❌ REMOVIDO: device_model (não usado no sistema atual)
-- ============================================================================

