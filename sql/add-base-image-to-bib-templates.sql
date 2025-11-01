-- =====================================================
-- ADICIONAR CAMPO base_image_base64 À TABELA bib_templates
-- =====================================================
-- 
-- Este script adiciona o campo base_image_base64 para guardar
-- a imagem original (sem retângulo verde)
--
-- Versão: 1.1
-- Data: 2025-01-27
-- =====================================================

-- Adicionar coluna base_image_base64 se não existir
ALTER TABLE bib_templates 
ADD COLUMN IF NOT EXISTS base_image_base64 TEXT;

-- Atualizar comentário da coluna
COMMENT ON COLUMN bib_templates.base_image_base64 IS 'Imagem Base64 original do dorsal (sem marcações)';
COMMENT ON COLUMN bib_templates.template_image_base64 IS 'Imagem Base64 do dorsal com retângulo verde marcando a área selecionada';

-- Remover função existente para poder alterar o tipo de retorno
DROP FUNCTION IF EXISTS get_bib_template(UUID);

-- Recriar função get_bib_template para incluir base_image_base64
CREATE FUNCTION get_bib_template(event_uuid UUID)
RETURNS TABLE (
    id UUID,
    event_id UUID,
    base_image_base64 TEXT,
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
        bt.base_image_base64,
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

