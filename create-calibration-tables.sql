-- =====================================================
-- TABELAS PARA SISTEMA DE CALIBRAÇÃO VISIONKRONO
-- =====================================================

-- Tabela para configurações de calibração
CREATE TABLE IF NOT EXISTS event_calibrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- Dados da imagem
    image_data TEXT, -- Base64 da imagem de calibração
    image_width INTEGER,
    image_height INTEGER,
    
    -- Área de detecção (coordenadas normalizadas 0-1)
    detection_area_x DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    detection_area_y DECIMAL(5,4) NOT NULL DEFAULT 0.0,
    detection_area_width DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    detection_area_height DECIMAL(5,4) NOT NULL DEFAULT 1.0,
    
    -- Configuração de nomenclatura
    nomenclature_type TEXT NOT NULL DEFAULT 'numeric',
    nomenclature_config JSONB, -- Configurações específicas da nomenclatura
    
    -- Configuração da IA
    ai_config JSONB NOT NULL DEFAULT '{}',
    
    -- Resultados da calibração
    detected_number TEXT,
    confidence DECIMAL(3,2), -- 0.00 a 1.00
    processing_time_ms INTEGER,
    ai_description TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_calibrations_event_id ON event_calibrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_calibrations_device_id ON event_calibrations(device_id);
CREATE INDEX IF NOT EXISTS idx_event_calibrations_active ON event_calibrations(is_active);
CREATE INDEX IF NOT EXISTS idx_event_calibrations_complete ON event_calibrations(is_complete);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_event_calibrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_calibrations_updated_at
    BEFORE UPDATE ON event_calibrations
    FOR EACH ROW
    EXECUTE FUNCTION update_event_calibrations_updated_at();

-- Tabela para histórico de calibrações (manter histórico)
CREATE TABLE IF NOT EXISTS calibration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calibration_id UUID NOT NULL REFERENCES event_calibrations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Dados do teste
    test_number TEXT,
    test_confidence DECIMAL(3,2),
    test_processing_time_ms INTEGER,
    test_success BOOLEAN NOT NULL DEFAULT false,
    
    -- Dados da imagem de teste
    test_image_data TEXT,
    
    -- Timestamp
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_calibration_history_calibration_id ON calibration_history(calibration_id);
CREATE INDEX IF NOT EXISTS idx_calibration_history_event_id ON calibration_history(event_id);
CREATE INDEX IF NOT EXISTS idx_calibration_history_tested_at ON calibration_history(tested_at);

-- Função para obter calibração ativa de um evento
CREATE OR REPLACE FUNCTION get_active_calibration(event_uuid UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    device_id UUID,
    image_data TEXT,
    image_width INTEGER,
    image_height INTEGER,
    detection_area_x DECIMAL(5,4),
    detection_area_y DECIMAL(5,4),
    detection_area_width DECIMAL(5,4),
    detection_area_height DECIMAL(5,4),
    nomenclature_type TEXT,
    nomenclature_config JSONB,
    ai_config JSONB,
    detected_number TEXT,
    confidence DECIMAL(3,2),
    processing_time_ms INTEGER,
    ai_description TEXT,
    is_complete BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id,
        ec.event_id,
        ec.device_id,
        ec.image_data,
        ec.image_width,
        ec.image_height,
        ec.detection_area_x,
        ec.detection_area_y,
        ec.detection_area_width,
        ec.detection_area_height,
        ec.nomenclature_type,
        ec.nomenclature_config,
        ec.ai_config,
        ec.detected_number,
        ec.confidence,
        ec.processing_time_ms,
        ec.ai_description,
        ec.is_complete,
        ec.created_at,
        ec.completed_at
    FROM event_calibrations ec
    WHERE ec.event_id = event_uuid 
      AND ec.is_active = true
    ORDER BY ec.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para criar nova calibração
CREATE OR REPLACE FUNCTION create_calibration(
    p_event_id UUID,
    p_device_id UUID DEFAULT NULL,
    p_image_data TEXT DEFAULT NULL,
    p_image_width INTEGER DEFAULT NULL,
    p_image_height INTEGER DEFAULT NULL,
    p_detection_area_x DECIMAL(5,4) DEFAULT 0.0,
    p_detection_area_y DECIMAL(5,4) DEFAULT 0.0,
    p_detection_area_width DECIMAL(5,4) DEFAULT 1.0,
    p_detection_area_height DECIMAL(5,4) DEFAULT 1.0,
    p_nomenclature_type TEXT DEFAULT 'numeric',
    p_nomenclature_config JSONB DEFAULT '{}',
    p_ai_config JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    calibration_id UUID;
BEGIN
    -- Desativar calibrações anteriores do evento
    UPDATE event_calibrations 
    SET is_active = false 
    WHERE event_id = p_event_id;
    
    -- Criar nova calibração
    INSERT INTO event_calibrations (
        event_id,
        device_id,
        image_data,
        image_width,
        image_height,
        detection_area_x,
        detection_area_y,
        detection_area_width,
        detection_area_height,
        nomenclature_type,
        nomenclature_config,
        ai_config
    ) VALUES (
        p_event_id,
        p_device_id,
        p_image_data,
        p_image_width,
        p_image_height,
        p_detection_area_x,
        p_detection_area_y,
        p_detection_area_width,
        p_detection_area_height,
        p_nomenclature_type,
        p_nomenclature_config,
        p_ai_config
    ) RETURNING id INTO calibration_id;
    
    RETURN calibration_id;
END;
$$ LANGUAGE plpgsql;

-- Função para completar calibração
CREATE OR REPLACE FUNCTION complete_calibration(
    p_calibration_id UUID,
    p_detected_number TEXT,
    p_confidence DECIMAL(3,2),
    p_processing_time_ms INTEGER,
    p_ai_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE event_calibrations 
    SET 
        detected_number = p_detected_number,
        confidence = p_confidence,
        processing_time_ms = p_processing_time_ms,
        ai_description = p_ai_description,
        is_complete = true,
        completed_at = NOW()
    WHERE id = p_calibration_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE event_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_history ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento (remover em produção)
CREATE POLICY "Allow all operations on event_calibrations" ON event_calibrations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on calibration_history" ON calibration_history
    FOR ALL USING (true) WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE event_calibrations IS 'Configurações de calibração de IA para eventos';
COMMENT ON TABLE calibration_history IS 'Histórico de testes de calibração';
COMMENT ON FUNCTION get_active_calibration(UUID) IS 'Retorna a calibração ativa de um evento';
COMMENT ON FUNCTION create_calibration(UUID, UUID, TEXT, INTEGER, INTEGER, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, JSONB, JSONB) IS 'Cria uma nova calibração para um evento';
COMMENT ON FUNCTION complete_calibration(UUID, TEXT, DECIMAL, INTEGER, TEXT) IS 'Completa uma calibração com os resultados do teste';
