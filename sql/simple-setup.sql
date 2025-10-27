-- =====================================================
-- VisionKrono - Setup Simples (Execute passo a passo)
-- =====================================================

-- PASSO 1: Criar tabela de imagens
CREATE TABLE IF NOT EXISTS images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_type TEXT NOT NULL,
    image_data TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 2: Criar tabela de detecções (sem referências primeiro)
CREATE TABLE IF NOT EXISTS detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    device_type TEXT DEFAULT 'mobile',
    session_id TEXT NOT NULL,
    dorsal_region JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 3: Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_type TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSO 4: Adicionar colunas de referência (se não existirem)
DO $$ 
BEGIN
    -- Adicionar coluna proof_image_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'proof_image_id'
    ) THEN
        ALTER TABLE detections ADD COLUMN proof_image_id UUID;
    END IF;
    
    -- Adicionar coluna config_image_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'configurations' AND column_name = 'config_image_id'
    ) THEN
        ALTER TABLE configurations ADD COLUMN config_image_id UUID;
    END IF;
END $$;

-- PASSO 5: Criar índices
CREATE INDEX IF NOT EXISTS idx_images_type ON images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detections_session ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_number ON detections(number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_configurations_type ON configurations(config_type);

-- PASSO 6: Habilitar RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- PASSO 7: Criar políticas (remover existentes primeiro)
DROP POLICY IF EXISTS "Allow all operations on images" ON images;
DROP POLICY IF EXISTS "Allow all operations on detections" ON detections;
DROP POLICY IF EXISTS "Allow all operations on configurations" ON configurations;

CREATE POLICY "Allow all operations on images" ON images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on detections" ON detections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on configurations" ON configurations FOR ALL USING (true) WITH CHECK (true);

-- PASSO 8: Criar views úteis
CREATE OR REPLACE VIEW detections_with_images AS
SELECT 
    d.*,
    pi.image_data as proof_image_data
FROM detections d
LEFT JOIN images pi ON d.proof_image_id = pi.id;

CREATE OR REPLACE VIEW detection_stats AS
SELECT 
    COUNT(*) as total_detections,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT number) as unique_dorsals,
    MAX(timestamp) as last_detection,
    COUNT(*) FILTER (WHERE proof_image_id IS NOT NULL) as detections_with_proof
FROM detections;
