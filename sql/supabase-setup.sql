-- Criar tabela para detecções de dorsais
CREATE TABLE IF NOT EXISTS detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy DECIMAL(8, 2),
    device_type TEXT DEFAULT 'mobile',
    session_id TEXT NOT NULL,
    proof_image TEXT, -- Base64 da imagem de prova
    dorsal_region JSONB, -- Coordenadas da região do dorsal detectado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_detections_session ON detections(session_id);
CREATE INDEX IF NOT EXISTS idx_detections_number ON detections(number);

-- Habilitar RLS (Row Level Security)
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura e escrita para todos (ajuste conforme necessário)
DROP POLICY IF EXISTS "Allow all operations on detections" ON detections;
CREATE POLICY "Allow all operations on detections" 
ON detections FOR ALL 
USING (true) 
WITH CHECK (true);

-- Comentários na tabela
COMMENT ON TABLE detections IS 'Registros de detecção de dorsais pelo VisionKrono';
COMMENT ON COLUMN detections.number IS 'Número do dorsal detectado';
COMMENT ON COLUMN detections.timestamp IS 'Momento da detecção';
COMMENT ON COLUMN detections.latitude IS 'Latitude GPS da detecção';
COMMENT ON COLUMN detections.longitude IS 'Longitude GPS da detecção';
COMMENT ON COLUMN detections.accuracy IS 'Precisão do GPS em metros';
COMMENT ON COLUMN detections.device_type IS 'Tipo de dispositivo (mobile, desktop)';
COMMENT ON COLUMN detections.session_id IS 'ID da sessão de detecção';
COMMENT ON COLUMN detections.proof_image IS 'Imagem base64 que originou a detecção';
COMMENT ON COLUMN detections.dorsal_region IS 'Coordenadas da região do dorsal na imagem';

-- Tabela para configurações compartilhadas
CREATE TABLE IF NOT EXISTS configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_type TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para configurações
CREATE UNIQUE INDEX IF NOT EXISTS idx_configurations_type ON configurations(config_type);

-- RLS para configurações
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- Política para configurações
DROP POLICY IF EXISTS "Allow all operations on configurations" ON configurations;
CREATE POLICY "Allow all operations on configurations" 
ON configurations FOR ALL 
USING (true) 
WITH CHECK (true);

-- View para estatísticas rápidas
CREATE OR REPLACE VIEW detection_stats AS
SELECT 
    COUNT(*) as total_detections,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT number) as unique_dorsals,
    MAX(timestamp) as last_detection,
    MIN(timestamp) as first_detection,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as detections_last_hour,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 day') as detections_today
FROM detections;

COMMENT ON TABLE configurations IS 'Configurações compartilhadas do VisionKrono';
COMMENT ON COLUMN configurations.config_type IS 'Tipo de configuração (number_area, calibration, etc)';
COMMENT ON COLUMN configurations.config_data IS 'Dados da configuração em JSON';
COMMENT ON VIEW detection_stats IS 'Estatísticas resumidas das detecções';
