-- =====================================================
-- TABELA bib_templates - Templates de Calibração de Dorsais
-- =====================================================
-- 
-- Esta tabela guarda templates de calibração de dorsais com:
-- - Imagem do dorsal com retângulo verde marcando a área
-- - Coordenadas da região do dorsal completo (bib_region)
-- - Coordenadas da região do número (number_region)
-- - Configurações de OCR e confiança
--
-- Versão: 1.0
-- Data: 2025-11-01
-- =====================================================

-- Criar tabela bib_templates
CREATE TABLE IF NOT EXISTS bib_templates (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Template image with green rectangle
    template_image_base64 TEXT NOT NULL,  -- Base64 encoded image with green rectangle marking bib location
    template_image_url TEXT,  -- URL alternativa para a imagem (opcional)
    
    -- Bib region (região completa do dorsal)
    bib_region_x DECIMAL(5,4) NOT NULL DEFAULT 0.0,  -- Coordenada X normalizada (0-1)
    bib_region_y DECIMAL(5,4) NOT NULL DEFAULT 0.0,  -- Coordenada Y normalizada (0-1)
    bib_region_width DECIMAL(5,4) NOT NULL DEFAULT 1.0,  -- Largura normalizada (0-1)
    bib_region_height DECIMAL(5,4) NOT NULL DEFAULT 1.0,  -- Altura normalizada (0-1)
    
    -- Number region (região só do número)
    number_region_x DECIMAL(5,4) NOT NULL DEFAULT 0.0,  -- Coordenada X normalizada (0-1)
    number_region_y DECIMAL(5,4) NOT NULL DEFAULT 0.0,  -- Coordenada Y normalizada (0-1)
    number_region_width DECIMAL(5,4) NOT NULL DEFAULT 1.0,  -- Largura normalizada (0-1)
    number_region_height DECIMAL(5,4) NOT NULL DEFAULT 1.0,  -- Altura normalizada (0-1)
    
    -- OCR configuration
    expected_digits INTEGER DEFAULT 4,  -- Number of digits in bib numbers (calculado baseado na nomenclatura)
    confidence_threshold DECIMAL(3,2) DEFAULT 0.75,  -- Threshold de confiança (0.00-1.00)
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one template per event
    CONSTRAINT unique_event_template UNIQUE(event_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bib_templates_event_id ON bib_templates(event_id);
CREATE INDEX IF NOT EXISTS idx_bib_templates_created_at ON bib_templates(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bib_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bib_templates_updated_at ON bib_templates;
CREATE TRIGGER trigger_update_bib_templates_updated_at
    BEFORE UPDATE ON bib_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_bib_templates_updated_at();

-- RLS Policies
ALTER TABLE bib_templates ENABLE ROW LEVEL SECURITY;

-- Política permissiva para desenvolvimento (ajustar em produção)
DROP POLICY IF EXISTS "Allow all operations on bib_templates" ON bib_templates;
CREATE POLICY "Allow all operations on bib_templates" ON bib_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Função para obter template de bib de um evento
CREATE OR REPLACE FUNCTION get_bib_template(event_uuid UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    template_image_base64 TEXT,
    template_image_url TEXT,
    bib_region_x DECIMAL(5,4),
    bib_region_y DECIMAL(5,4),
    bib_region_width DECIMAL(5,4),
    bib_region_height DECIMAL(5,4),
    number_region_x DECIMAL(5,4),
    number_region_y DECIMAL(5,4),
    number_region_width DECIMAL(5,4),
    number_region_height DECIMAL(5,4),
    expected_digits INTEGER,
    confidence_threshold DECIMAL(3,2),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id,
        bt.event_id,
        bt.template_image_base64,
        bt.template_image_url,
        bt.bib_region_x,
        bt.bib_region_y,
        bt.bib_region_width,
        bt.bib_region_height,
        bt.number_region_x,
        bt.number_region_y,
        bt.number_region_width,
        bt.number_region_height,
        bt.expected_digits,
        bt.confidence_threshold,
        bt.created_at,
        bt.updated_at
    FROM bib_templates bt
    WHERE bt.event_id = event_uuid
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE bib_templates IS 'Templates de calibração de dorsais para eventos';
COMMENT ON COLUMN bib_templates.template_image_base64 IS 'Imagem Base64 do dorsal com retângulo verde marcando a área selecionada';
COMMENT ON COLUMN bib_templates.template_image_url IS 'URL alternativa para a imagem (opcional)';
COMMENT ON COLUMN bib_templates.bib_region_x IS 'Posição X da região do dorsal completo (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.bib_region_y IS 'Posição Y da região do dorsal completo (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.bib_region_width IS 'Largura da região do dorsal completo (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.bib_region_height IS 'Altura da região do dorsal completo (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.number_region_x IS 'Posição X da região do número (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.number_region_y IS 'Posição Y da região do número (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.number_region_width IS 'Largura da região do número (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.number_region_height IS 'Altura da região do número (normalizada 0-1)';
COMMENT ON COLUMN bib_templates.expected_digits IS 'Número de dígitos esperados no dorsal (calculado baseado na nomenclatura)';
COMMENT ON COLUMN bib_templates.confidence_threshold IS 'Threshold mínimo de confiança para aceitar detecção (0.00-1.00)';
COMMENT ON FUNCTION get_bib_template(UUID) IS 'Retorna o template de bib de um evento';

