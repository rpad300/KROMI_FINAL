-- ============================================================================
-- KROMI - Criar Tabela device_detections (SIMPLIFICADO)
-- ============================================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CRIAR TABELA device_detections
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
    event_id UUID,
    device_id UUID,
    device_order INTEGER,
    checkpoint_name TEXT,
    checkpoint_type TEXT
);

-- ============================================================================
-- 2. CRIAR ÍNDICES
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
-- 3. VERIFICAR SE FOI CRIADA
-- ============================================================================
-- Execute esta query para verificar:
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'device_detections'
ORDER BY ordinal_position;

-- ============================================================================
-- PRONTO! Tabela criada.
-- ============================================================================
-- Agora execute também:
-- - sql/native-app-detections-table.sql (funções RPC)
-- - sql/native-app-qr-code-system.sql (view e login)
-- - sql/auto-fill-device-info-on-create.sql (triggers)
-- ============================================================================

