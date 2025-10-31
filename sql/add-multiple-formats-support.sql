-- ==========================================
-- Suporte a Múltiplos Formatos por Tipo de Logo
-- ==========================================
-- Permite ter múltiplos formatos (SVG, PNG, WebP, JPG) do mesmo tipo de logo
-- Adiciona coluna para marcar formato preferido/padrão
-- ==========================================

-- 1. Adicionar coluna para formato preferido (marca qual formato usar por padrão)
ALTER TABLE site_brand_assets ADD COLUMN IF NOT EXISTS is_preferred BOOLEAN DEFAULT false;

-- 2. Atualizar constraint de formatos para incluir 'jpg' (além de converter para png)
ALTER TABLE site_brand_assets DROP CONSTRAINT IF EXISTS site_brand_assets_format_check;
ALTER TABLE site_brand_assets ADD CONSTRAINT site_brand_assets_format_check 
    CHECK (format IN ('png', 'svg', 'webp', 'ico', 'jpg'));

-- 3. Criar índice para melhorar queries por tipo e formato
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_type_format ON site_brand_assets(type, format) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_preferred ON site_brand_assets(type, is_preferred) WHERE is_preferred = true AND deleted_at IS NULL;

-- 4. Atualizar comentário
COMMENT ON COLUMN site_brand_assets.is_preferred IS 'Marca se este é o formato preferido para este tipo (true = usar por padrão)';
COMMENT ON COLUMN site_brand_assets.format IS 'Formato: png, svg, webp, ico, jpg';

-- 5. Garantir que apenas um formato por tipo pode ser preferido
-- Criar trigger function para garantir unicidade de is_preferred por tipo
CREATE OR REPLACE FUNCTION ensure_single_preferred_format()
RETURNS TRIGGER AS $$
BEGIN
    -- Se estamos definindo is_preferred = true
    IF NEW.is_preferred = true THEN
        -- Desmarcar todos os outros formatos do mesmo tipo como não preferidos
        UPDATE site_brand_assets
        SET is_preferred = false
        WHERE type = NEW.type
          AND id != NEW.id
          AND deleted_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_ensure_single_preferred_format ON site_brand_assets;
CREATE TRIGGER trigger_ensure_single_preferred_format
    BEFORE INSERT OR UPDATE ON site_brand_assets
    FOR EACH ROW
    WHEN (NEW.is_preferred = true)
    EXECUTE FUNCTION ensure_single_preferred_format();

-- 6. Criar função auxiliar para obter todos os formatos de um tipo
CREATE OR REPLACE FUNCTION get_logo_formats(logo_type TEXT)
RETURNS TABLE (
    id UUID,
    format TEXT,
    file_path TEXT,
    width INTEGER,
    height INTEGER,
    is_preferred BOOLEAN,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sba.id,
        sba.format,
        sba.file_path,
        sba.width,
        sba.height,
        sba.is_preferred,
        sba.status,
        sba.created_at
    FROM site_brand_assets sba
    WHERE sba.type = logo_type
      AND sba.deleted_at IS NULL
    ORDER BY 
        sba.is_preferred DESC, -- Preferido primeiro
        CASE sba.format 
            WHEN 'svg' THEN 1
            WHEN 'png' THEN 2
            WHEN 'webp' THEN 3
            WHEN 'jpg' THEN 4
            WHEN 'ico' THEN 5
            ELSE 6
        END,
        sba.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_logo_formats IS 'Retorna todos os formatos disponíveis para um tipo de logo, ordenados por preferência';

