-- ==========================================
-- Sistema de Branding e SEO - VisionKrono
-- ==========================================
-- Tabelas e funções para gestão completa de logos, 
-- thumbnails, metadados SEO e geração com IA
-- ==========================================

-- 1. TABELA DE ASSETS DE MARCA (Logos, Favicons, etc.)
CREATE TABLE IF NOT EXISTS site_brand_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('logo_primary', 'logo_secondary', 'favicon', 'app_icon', 'wordmark')),
    file_path TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('png', 'svg', 'webp', 'ico')),
    width INTEGER,
    height INTEGER,
    background TEXT CHECK (background IN ('transparent', 'light', 'dark')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE site_brand_assets IS 'Assets de marca do site (logos, favicons)';
COMMENT ON COLUMN site_brand_assets.type IS 'Tipo: logo_primary, logo_secondary, favicon, app_icon, wordmark';
COMMENT ON COLUMN site_brand_assets.file_path IS 'Caminho no Storage (bucket/key)';
COMMENT ON COLUMN site_brand_assets.status IS 'draft ou published';

-- 2. TABELA DE REGISTRO DE PÁGINAS
CREATE TABLE IF NOT EXISTS page_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    is_indexable BOOLEAN DEFAULT true,
    canonical_url TEXT,
    sitemap_priority NUMERIC(2,1) DEFAULT 0.5 CHECK (sitemap_priority >= 0 AND sitemap_priority <= 1),
    changefreq TEXT CHECK (changefreq IN ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')),
    deep_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE page_registry IS 'Registro de todas as páginas do site';
COMMENT ON COLUMN page_registry.route IS 'Rota única (ex: /, /about, /product/:id)';
COMMENT ON COLUMN page_registry.label IS 'Nome amigável da página';
COMMENT ON COLUMN page_registry.deep_link IS 'Deep link opcional (ex: myapp://screen/product?id=123)';

-- 3. TABELA DE METADADOS POR PÁGINA
CREATE TABLE IF NOT EXISTS page_meta (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES page_registry(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    keywords TEXT[],
    og_title TEXT,
    og_description TEXT,
    og_type TEXT DEFAULT 'website',
    og_site_name TEXT,
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_card TEXT DEFAULT 'summary_large_image',
    robots_directives TEXT DEFAULT 'index,follow',
    canonical_url TEXT,
    structured_data_json JSONB,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE page_meta IS 'Metadados SEO por página';
COMMENT ON COLUMN page_meta.structured_data_json IS 'Schema.org structured data (JSON)';

-- 4. TABELA DE THUMBNAILS POR PÁGINA
CREATE TABLE IF NOT EXISTS page_thumbnails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID NOT NULL REFERENCES page_registry(id) ON DELETE CASCADE,
    usage TEXT NOT NULL CHECK (usage IN ('og_image', 'twitter_image', 'preview')),
    file_path TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('png', 'jpg', 'webp', 'svg')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    focal_point JSONB,
    alt_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE page_thumbnails IS 'Thumbnails para partilha social por página';
COMMENT ON COLUMN page_thumbnails.focal_point IS 'Ponto focal {x:0..1, y:0..1}';

-- 5. TABELA DE VARIANTES DE MEDIA
CREATE TABLE IF NOT EXISTS media_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_asset_id UUID,
    source_type TEXT CHECK (source_type IN ('brand_asset', 'page_thumbnail')),
    variant_key TEXT NOT NULL,
    file_path TEXT NOT NULL,
    format TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    quality INTEGER,
    generated_by TEXT,
    pipeline_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE media_variants IS 'Variantes geradas de imagens (WEBP, redimensionadas)';
COMMENT ON COLUMN media_variants.variant_key IS 'Chave da variante (ex: og_1200x630, logo_512_png)';

-- 6. TABELA DE JOBS DE GERAÇÃO COM IA
CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_table TEXT NOT NULL,
    target_id UUID NOT NULL,
    input_prompt TEXT,
    draft_text TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('seo_text', 'title_variations', 'desc_variations', 'og_image_prompt')),
    provider TEXT CHECK (provider IN ('openai', 'google', 'anthropic', 'gemini')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    result_json JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ai_generation_jobs IS 'Jobs de geração de conteúdo com IA';

-- 7. TABELA DE AUDITORIA (extensão para branding)
CREATE TABLE IF NOT EXISTS branding_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'publish', 'unpublish', 'delete', 'restore')),
    diff_json JSONB,
    actor_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE branding_audit_log IS 'Log de auditoria para branding e SEO';

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_type ON site_brand_assets(type);
CREATE INDEX IF NOT EXISTS idx_site_brand_assets_status ON site_brand_assets(status);
CREATE INDEX IF NOT EXISTS idx_page_registry_route ON page_registry(route);
CREATE INDEX IF NOT EXISTS idx_page_meta_page_id ON page_meta(page_id);
CREATE INDEX IF NOT EXISTS idx_page_meta_status ON page_meta(status);
CREATE INDEX IF NOT EXISTS idx_page_thumbnails_page_id ON page_thumbnails(page_id);
CREATE INDEX IF NOT EXISTS idx_page_thumbnails_usage ON page_thumbnails(usage);
CREATE INDEX IF NOT EXISTS idx_media_variants_source ON media_variants(source_asset_id, source_type);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_target ON ai_generation_jobs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_jobs_status ON ai_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_branding_audit_entity ON branding_audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_branding_audit_action ON branding_audit_log(action);

-- TRIGGERS DE UPDATED_AT
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_site_brand_assets_updated_at
    BEFORE UPDATE ON site_brand_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_page_registry_updated_at
    BEFORE UPDATE ON page_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_page_meta_updated_at
    BEFORE UPDATE ON page_meta
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_page_thumbnails_updated_at
    BEFORE UPDATE ON page_thumbnails
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_ai_generation_jobs_updated_at
    BEFORE UPDATE ON ai_generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

-- RLS (Row Level Security)
ALTER TABLE site_brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Admin tem acesso total, outros só leitura publicada
DROP POLICY IF EXISTS "site_brand_assets_admin_all" ON site_brand_assets;
CREATE POLICY "site_brand_assets_admin_all" ON site_brand_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "page_registry_admin_all" ON page_registry;
CREATE POLICY "page_registry_admin_all" ON page_registry
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        ) OR deleted_at IS NULL
    );

DROP POLICY IF EXISTS "page_meta_admin_all" ON page_meta;
CREATE POLICY "page_meta_admin_all" ON page_meta
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        ) OR (status = 'published' AND deleted_at IS NULL)
    );

DROP POLICY IF EXISTS "page_thumbnails_admin_all" ON page_thumbnails;
CREATE POLICY "page_thumbnails_admin_all" ON page_thumbnails
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        ) OR (status = 'published' AND deleted_at IS NULL)
    );

DROP POLICY IF EXISTS "media_variants_admin_all" ON media_variants;
CREATE POLICY "media_variants_admin_all" ON media_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        ) OR deleted_at IS NULL
    );

DROP POLICY IF EXISTS "ai_generation_jobs_admin_all" ON ai_generation_jobs;
CREATE POLICY "ai_generation_jobs_admin_all" ON ai_generation_jobs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        )
    );

DROP POLICY IF EXISTS "branding_audit_log_admin_read" ON branding_audit_log;
CREATE POLICY "branding_audit_log_admin_read" ON branding_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = (auth.jwt() ->> 'user_id')::uuid
            AND role IN ('admin', 'superadmin')
        )
    );

-- FUNÇÕES RPC

-- Função para obter metadados publicados de uma página
CREATE OR REPLACE FUNCTION get_published_page_meta(route_param TEXT)
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
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'og_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
        pm.twitter_title,
        pm.twitter_description,
        (SELECT file_path FROM page_thumbnails 
         WHERE page_id = pm.page_id AND usage = 'twitter_image' 
         AND status = 'published' AND deleted_at IS NULL LIMIT 1),
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

-- Função para publicar um asset de marca
CREATE OR REPLACE FUNCTION publish_brand_asset(asset_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    old_status TEXT;
BEGIN
    SELECT status INTO old_status
    FROM site_brand_assets
    WHERE id = asset_id;
    
    IF old_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status
    UPDATE site_brand_assets
    SET status = 'published', updated_by = actor_id
    WHERE id = asset_id;
    
    -- Registrar no audit log
    INSERT INTO branding_audit_log (entity, entity_id, action, diff_json, actor_id)
    VALUES ('site_brand_assets', asset_id, 'publish', 
            jsonb_build_object('old_status', old_status, 'new_status', 'published'), 
            actor_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para publicar metadados de página
CREATE OR REPLACE FUNCTION publish_page_meta(meta_id UUID, actor_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    old_status TEXT;
BEGIN
    SELECT status INTO old_status
    FROM page_meta
    WHERE id = meta_id;
    
    IF old_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status
    UPDATE page_meta
    SET status = 'published', updated_by = actor_id
    WHERE id = meta_id;
    
    -- Registrar no audit log
    INSERT INTO branding_audit_log (entity, entity_id, action, diff_json, actor_id)
    VALUES ('page_meta', meta_id, 'publish', 
            jsonb_build_object('old_status', old_status, 'new_status', 'published'), 
            actor_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir página inicial padrão
INSERT INTO page_registry (route, label, is_indexable, sitemap_priority, changefreq)
VALUES ('/', 'Home', true, 1.0, 'daily')
ON CONFLICT (route) DO NOTHING;

