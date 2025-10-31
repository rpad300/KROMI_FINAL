-- ==========================================
-- Adicionar Suporte a Logos Horizontais e Verticais
-- ==========================================
-- Este script atualiza a tabela site_brand_assets para suportar
-- versões horizontais e verticais dos logos primários e secundários
-- ==========================================

-- 1. Remover constraint antiga do tipo
ALTER TABLE site_brand_assets DROP CONSTRAINT IF EXISTS site_brand_assets_type_check;

-- 2. Adicionar nova constraint com tipos horizontais e verticais
ALTER TABLE site_brand_assets ADD CONSTRAINT site_brand_assets_type_check 
    CHECK (type IN (
        'logo_primary', 
        'logo_primary_horizontal',
        'logo_primary_vertical',
        'logo_secondary',
        'logo_secondary_horizontal',
        'logo_secondary_vertical',
        'favicon', 
        'app_icon', 
        'wordmark'
    ));

-- 3. Atualizar comentário da coluna type
COMMENT ON COLUMN site_brand_assets.type IS 'Tipo: logo_primary (legacy), logo_primary_horizontal, logo_primary_vertical, logo_secondary (legacy), logo_secondary_horizontal, logo_secondary_vertical, favicon, app_icon, wordmark';

-- 4. Criar índices adicionais para melhor performance
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_type_orientation ON site_brand_assets(type) WHERE type LIKE '%_horizontal' OR type LIKE '%_vertical';
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_type_primary ON site_brand_assets(type) WHERE type LIKE 'logo_primary%';
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_type_secondary ON site_brand_assets(type) WHERE type LIKE 'logo_secondary%';

-- 5. Criar função auxiliar para obter logo conforme contexto
CREATE OR REPLACE FUNCTION get_logo_for_context(
    logo_base_type TEXT, -- 'primary' ou 'secondary'
    orientation_param TEXT DEFAULT 'horizontal', -- 'horizontal' ou 'vertical'
    prefer_horizontal BOOLEAN DEFAULT true
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    file_path TEXT,
    format TEXT,
    width INTEGER,
    height INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sba.id,
        sba.type,
        sba.file_path,
        sba.format,
        sba.width,
        sba.height,
        sba.status
    FROM site_brand_assets sba
    WHERE sba.deleted_at IS NULL
    AND sba.status = 'published'
    AND (
        -- Tentar primeiro o tipo específico solicitado
        (sba.type = 'logo_' || logo_base_type || '_' || orientation_param)
        OR
        -- Fallback para tipo genérico se prefer_horizontal
        (prefer_horizontal AND sba.type = 'logo_' || logo_base_type || '_horizontal')
        OR
        -- Fallback para tipo legacy se existir
        (sba.type = 'logo_' || logo_base_type)
    )
    ORDER BY 
        CASE 
            WHEN sba.type = 'logo_' || logo_base_type || '_' || orientation_param THEN 1
            WHEN sba.type = 'logo_' || logo_base_type || '_horizontal' THEN 2
            WHEN sba.type = 'logo_' || logo_base_type THEN 3
            ELSE 4
        END
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_logo_for_context IS 'Obtém o logo apropriado conforme o contexto (orientação e tipo base)';

-- 6. Criar função para obter logo horizontal (para headers, navbars)
CREATE OR REPLACE FUNCTION get_horizontal_logo(logo_base_type TEXT DEFAULT 'primary')
RETURNS TABLE (
    id UUID,
    type TEXT,
    file_path TEXT,
    format TEXT,
    width INTEGER,
    height INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_logo_for_context(logo_base_type, 'horizontal', true);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_horizontal_logo IS 'Obtém logo horizontal (para headers, navbars)';

-- 7. Criar função para obter logo vertical (para mobile, apps)
CREATE OR REPLACE FUNCTION get_vertical_logo(logo_base_type TEXT DEFAULT 'primary')
RETURNS TABLE (
    id UUID,
    type TEXT,
    file_path TEXT,
    format TEXT,
    width INTEGER,
    height INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_logo_for_context(logo_base_type, 'vertical', false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_vertical_logo IS 'Obtém logo vertical (para mobile, apps)';

-- ==========================================
-- Migração de dados existentes (opcional)
-- ==========================================
-- Se existirem logos antigos com tipo 'logo_primary' ou 'logo_secondary',
-- podem ser marcados como horizontais por padrão:
-- 
-- UPDATE site_brand_assets 
-- SET type = 'logo_primary_horizontal' 
-- WHERE type = 'logo_primary' AND deleted_at IS NULL;
-- 
-- UPDATE site_brand_assets 
-- SET type = 'logo_secondary_horizontal' 
-- WHERE type = 'logo_secondary' AND deleted_at IS NULL;
-- 
-- NOTA: Descomente as linhas acima apenas se quiser migrar dados existentes
-- ==========================================

