-- ==========================================
-- Atualizar page_thumbnails para suportar todas as plataformas sociais
-- ==========================================
-- Adiciona novos valores ao CHECK constraint do campo 'usage'
-- ==========================================

-- Remover constraint antiga
ALTER TABLE page_thumbnails 
    DROP CONSTRAINT IF EXISTS page_thumbnails_usage_check;

-- Adicionar nova constraint com todas as plataformas sociais
ALTER TABLE page_thumbnails 
    ADD CONSTRAINT page_thumbnails_usage_check 
    CHECK (usage IN (
        'og_image',           -- Open Graph (legado, mantém compatibilidade)
        'facebook_image',     -- Facebook / Open Graph
        'twitter_image',      -- Twitter Card
        'instagram_image',    -- Instagram
        'linkedin_image',     -- LinkedIn
        'google_image',       -- Google Search / Rich Snippets
        'tiktok_image',       -- TikTok (vertical)
        'whatsapp_image',     -- WhatsApp (opcional)
        'telegram_image',     -- Telegram (opcional)
        'preview'             -- Preview interno (mantém compatibilidade)
    ));

COMMENT ON COLUMN page_thumbnails.usage IS 'Uso da imagem: og_image, facebook_image, twitter_image, instagram_image, linkedin_image, google_image, tiktok_image, whatsapp_image, telegram_image, preview';

-- Atualizar função get_published_page_meta para incluir suporte a todas as plataformas
-- IMPORTANTE: Dropar a função antiga primeiro porque estamos a mudar o tipo de retorno
DROP FUNCTION IF EXISTS get_published_page_meta(TEXT);

CREATE FUNCTION get_published_page_meta(route_param TEXT)
RETURNS TABLE (
    page_id UUID,
    title TEXT,
    description TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    facebook_image TEXT,
    instagram_image TEXT,
    linkedin_image TEXT,
    google_image TEXT,
    tiktok_image TEXT,
    whatsapp_image TEXT,
    telegram_image TEXT,
    canonical_url TEXT,
    robots_directives TEXT,
    structured_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.page_id,
        pm.title,
        pm.description,
        pm.og_title,
        pm.og_description,
        -- OG/Facebook image (usa facebook_image se disponível, senão og_image como fallback)
        COALESCE(
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'facebook_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1),
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'og_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1)
        ),
        pm.twitter_title,
        pm.twitter_description,
        -- Twitter image
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'twitter_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- Facebook image (específico)
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'facebook_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- Instagram image
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'instagram_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- LinkedIn image
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'linkedin_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- Google image
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'google_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- TikTok image
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'tiktok_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        -- WhatsApp image (fallback para facebook_image se não especificado)
        COALESCE(
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'whatsapp_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1),
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'facebook_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1)
        ),
        -- Telegram image (fallback para facebook_image se não especificado)
        COALESCE(
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'telegram_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1),
            (SELECT file_path FROM page_thumbnails 
             WHERE page_id = pm.page_id AND usage = 'facebook_image' 
             AND status = 'published' AND deleted_at IS NULL LIMIT 1)
        ),
        pm.canonical_url,
        pm.robots_directives,
        pm.structured_data_json
    FROM page_meta pm
    JOIN page_registry pr ON pr.id = pm.page_id
    WHERE pr.route = route_param
    AND pm.status = 'published'
    AND pm.deleted_at IS NULL
    AND pr.deleted_at IS NULL
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_published_page_meta IS 'Retorna metadados publicados de uma página incluindo imagens de todas as plataformas sociais';

-- Garantir que o índice existe para todas as novas plataformas
CREATE INDEX IF NOT EXISTS idx_page_thumbnails_usage ON page_thumbnails(usage);
CREATE INDEX IF NOT EXISTS idx_page_thumbnails_page_id_usage ON page_thumbnails(page_id, usage);

