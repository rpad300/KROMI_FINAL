-- =====================================================
-- VisionKrono - Sistema de Buffer de Imagens
-- =====================================================

-- 1. TABELA DE BUFFER DE IMAGENS
CREATE TABLE IF NOT EXISTS image_buffer (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id),
    session_id TEXT NOT NULL,
    
    -- Dados da imagem (duas versões)
    image_data TEXT NOT NULL, -- Base64 otimizada para IA (menor)
    display_image TEXT, -- Base64 para visualização (legível)
    image_metadata JSONB DEFAULT '{}', -- Tamanhos, compressão, etc
    
    -- Dados de contexto
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    
    -- Status de processamento
    status TEXT DEFAULT 'pending', -- pending, processing, processed, discarded
    processed_at TIMESTAMPTZ,
    processed_by TEXT, -- ID do processador
    
    -- Resultados do processamento
    detection_results JSONB, -- Dorsais detectados
    processing_method TEXT, -- gemini, google, ocr
    processing_time_ms INTEGER,
    
    -- Limpeza automática
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_image_buffer_event ON image_buffer(event_id);
CREATE INDEX IF NOT EXISTS idx_image_buffer_device ON image_buffer(device_id);
CREATE INDEX IF NOT EXISTS idx_image_buffer_status ON image_buffer(status);
CREATE INDEX IF NOT EXISTS idx_image_buffer_captured ON image_buffer(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_buffer_expires ON image_buffer(expires_at);

-- 3. TABELA DE PROCESSAMENTO EM LOTE
CREATE TABLE IF NOT EXISTS batch_processing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id),
    batch_size INTEGER DEFAULT 5,
    image_ids UUID[] NOT NULL, -- Array de IDs das imagens
    
    -- Status do lote
    status TEXT DEFAULT 'queued', -- queued, processing, completed, failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Configuração do processamento
    processing_method TEXT DEFAULT 'gemini',
    prompt_config JSONB,
    
    -- Resultados
    results JSONB,
    total_detections INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES PARA LOTES
CREATE INDEX IF NOT EXISTS idx_batch_processing_event ON batch_processing(event_id);
CREATE INDEX IF NOT EXISTS idx_batch_processing_status ON batch_processing(status);
CREATE INDEX IF NOT EXISTS idx_batch_processing_created ON batch_processing(created_at DESC);

-- 5. HABILITAR RLS
ALTER TABLE image_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_processing ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO
DROP POLICY IF EXISTS "Allow all operations on image_buffer" ON image_buffer;
CREATE POLICY "Allow all operations on image_buffer" 
ON image_buffer FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on batch_processing" ON batch_processing;
CREATE POLICY "Allow all operations on batch_processing" 
ON batch_processing FOR ALL 
USING (true) 
WITH CHECK (true);

-- 7. FUNÇÃO PARA CRIAR LOTE DE PROCESSAMENTO
CREATE OR REPLACE FUNCTION create_processing_batch(
    p_event_id UUID,
    p_batch_size INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
    batch_id UUID;
    pending_images UUID[];
BEGIN
    -- Buscar imagens pendentes
    SELECT array_agg(id) INTO pending_images
    FROM image_buffer
    WHERE event_id = p_event_id 
    AND status = 'pending'
    ORDER BY captured_at ASC
    LIMIT p_batch_size;
    
    -- Se não há imagens pendentes, retornar null
    IF pending_images IS NULL OR array_length(pending_images, 1) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Criar lote
    INSERT INTO batch_processing (event_id, batch_size, image_ids, status)
    VALUES (p_event_id, array_length(pending_images, 1), pending_images, 'queued')
    RETURNING id INTO batch_id;
    
    -- Marcar imagens como em processamento
    UPDATE image_buffer 
    SET status = 'processing'
    WHERE id = ANY(pending_images);
    
    RETURN batch_id;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO PARA LIMPEZA AUTOMÁTICA
CREATE OR REPLACE FUNCTION cleanup_expired_images()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remover imagens expiradas que foram processadas ou descartadas
    DELETE FROM image_buffer 
    WHERE expires_at < NOW() 
    AND status IN ('processed', 'discarded');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. VIEW PARA ESTATÍSTICAS DO BUFFER
CREATE OR REPLACE VIEW buffer_stats AS
SELECT 
    event_id,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_images,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_images,
    COUNT(*) FILTER (WHERE status = 'processed') as processed_images,
    COUNT(*) FILTER (WHERE status = 'discarded') as discarded_images,
    MAX(captured_at) as last_capture,
    AVG(processing_time_ms) as avg_processing_time
FROM image_buffer
GROUP BY event_id;

-- 10. COMENTÁRIOS
COMMENT ON TABLE image_buffer IS 'Buffer de imagens capturadas pelos dispositivos';
COMMENT ON TABLE batch_processing IS 'Lotes para processamento em background';

COMMENT ON COLUMN image_buffer.status IS 'pending, processing, processed, discarded';
COMMENT ON COLUMN image_buffer.detection_results IS 'Dorsais detectados na imagem';
COMMENT ON COLUMN image_buffer.expires_at IS 'Data de expiração para limpeza automática';

COMMENT ON COLUMN batch_processing.image_ids IS 'Array de IDs das imagens do lote';
COMMENT ON COLUMN batch_processing.results IS 'Resultados do processamento do lote';

-- =====================================================
-- SISTEMA DE BUFFER COMPLETO!
-- Os dispositivos capturam imagens continuamente
-- O processamento acontece em lotes em background
-- Limpeza automática remove imagens antigas
-- =====================================================
