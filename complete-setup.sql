-- =====================================================
-- VisionKrono - Setup Completo da Base de Dados
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. TABELA DE IMAGENS (criar primeiro)
CREATE TABLE IF NOT EXISTS images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_type TEXT NOT NULL, -- 'configuration', 'proof', 'calibration'
    image_data TEXT NOT NULL, -- Base64 da imagem
    metadata JSONB DEFAULT '{}', -- Informações adicionais
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para imagens
CREATE INDEX IF NOT EXISTS idx_images_type ON images(image_type);
CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);

-- 2. TABELA DE DETECÇÕES (criar depois das imagens)
CREATE TABLE IF NOT EXISTS detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    device_type TEXT DEFAULT 'mobile',
    session_id TEXT NOT NULL,
    dorsal_region JSONB DEFAULT '{}', -- Coordenadas do dorsal na imagem
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna de referência para imagem DEPOIS de criar a tabela images
ALTER TABLE detections 
ADD COLUMN IF NOT EXISTS proof_image_id UUID;

-- Índices para detecções
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detections_session ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_number ON detections(number);
CREATE INDEX IF NOT EXISTS idx_detections_proof_image ON detections(proof_image_id);

-- 3. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_type TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar referência para imagem DEPOIS
ALTER TABLE configurations 
ADD COLUMN IF NOT EXISTS config_image_id UUID;

-- Índice único para configurações
CREATE UNIQUE INDEX IF NOT EXISTS idx_configurations_type ON configurations(config_type);

-- 4. HABILITAR RLS (Row Level Security) em todas as tabelas
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (permitir tudo por enquanto)

-- Políticas para imagens
DROP POLICY IF EXISTS "Allow all operations on images" ON images;
CREATE POLICY "Allow all operations on images" 
ON images FOR ALL 
USING (true) 
WITH CHECK (true);

-- Políticas para detecções
DROP POLICY IF EXISTS "Allow all operations on detections" ON detections;
CREATE POLICY "Allow all operations on detections" 
ON detections FOR ALL 
USING (true) 
WITH CHECK (true);

-- Políticas para configurações
DROP POLICY IF EXISTS "Allow all operations on configurations" ON configurations;
CREATE POLICY "Allow all operations on configurations" 
ON configurations FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. VIEW PARA DETECÇÕES COM IMAGENS
CREATE OR REPLACE VIEW detections_with_images AS
SELECT 
    d.*,
    pi.image_data as proof_image_data,
    pi.metadata as proof_image_metadata
FROM detections d
LEFT JOIN images pi ON d.proof_image_id = pi.id;

-- 7. VIEW PARA CONFIGURAÇÕES COM IMAGENS
CREATE OR REPLACE VIEW configurations_with_images AS
SELECT 
    c.*,
    ci.image_data as config_image_data,
    ci.metadata as config_image_metadata
FROM configurations c
LEFT JOIN images ci ON c.config_image_id = ci.id;

-- 8. VIEW PARA ESTATÍSTICAS
CREATE OR REPLACE VIEW detection_stats AS
SELECT 
    COUNT(*) as total_detections,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT number) as unique_dorsals,
    MAX(timestamp) as last_detection,
    MIN(timestamp) as first_detection,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as detections_last_hour,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 day') as detections_today,
    COUNT(*) FILTER (WHERE proof_image_id IS NOT NULL) as detections_with_proof
FROM detections;

-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE images IS 'Armazena todas as imagens: configuração, calibração e prova';
COMMENT ON TABLE detections IS 'Registros de detecção de dorsais com referência para imagem de prova';
COMMENT ON TABLE configurations IS 'Configurações compartilhadas entre dispositivos';

COMMENT ON COLUMN images.image_type IS 'Tipo: configuration, proof, calibration';
COMMENT ON COLUMN images.image_data IS 'Imagem em formato base64';
COMMENT ON COLUMN images.metadata IS 'Metadados: dimensões, qualidade, etc';

COMMENT ON COLUMN detections.number IS 'Número do dorsal detectado';
COMMENT ON COLUMN detections.proof_image_id IS 'ID da imagem que comprova a detecção';
COMMENT ON COLUMN detections.dorsal_region IS 'Coordenadas do dorsal na imagem de prova';

COMMENT ON COLUMN configurations.config_type IS 'Tipo: number_area, calibration, etc';
COMMENT ON COLUMN configurations.config_image_id IS 'ID da imagem de configuração/calibração';

-- 10. FUNÇÃO PARA LIMPEZA DE IMAGENS ANTIGAS (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_images()
RETURNS void AS $$
BEGIN
    -- Remover imagens de prova com mais de 30 dias
    DELETE FROM images 
    WHERE image_type = 'proof' 
    AND created_at < NOW() - INTERVAL '30 days'
    AND id NOT IN (SELECT proof_image_id FROM detections WHERE proof_image_id IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SETUP COMPLETO!
-- Agora você tem:
-- • Tabela de imagens para armazenar todas as fotos
-- • Tabela de detecções com referência para prova
-- • Tabela de configurações sincronizadas
-- • Views para consultas otimizadas
-- • Função de limpeza automática
-- =====================================================
