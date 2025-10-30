-- ==========================================
-- TABELA: site_global_metadata
-- ==========================================
-- Tabela para armazenar metadados globais do site
-- ==========================================

-- Criar tabela site_global_metadata
CREATE TABLE IF NOT EXISTS site_global_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_title TEXT NOT NULL,
    site_description TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    og_site_name TEXT NOT NULL DEFAULT 'Kromi.online',
    canonical_url TEXT NOT NULL DEFAULT 'https://kromi.online',
    robots_directives TEXT NOT NULL DEFAULT 'index,follow',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_site_global_metadata_status ON site_global_metadata(status);
CREATE INDEX IF NOT EXISTS idx_site_global_metadata_created_at ON site_global_metadata(created_at);
CREATE INDEX IF NOT EXISTS idx_site_global_metadata_updated_at ON site_global_metadata(updated_at);
CREATE INDEX IF NOT EXISTS idx_site_global_metadata_deleted_at ON site_global_metadata(deleted_at);

-- RLS (Row Level Security)
ALTER TABLE site_global_metadata ENABLE ROW LEVEL SECURITY;

-- Política: Apenas utilizadores autenticados podem ver metadados globais
CREATE POLICY "Users can view global metadata" ON site_global_metadata
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política: Apenas utilizadores autenticados podem inserir metadados globais
CREATE POLICY "Users can insert global metadata" ON site_global_metadata
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: Apenas utilizadores autenticados podem atualizar metadados globais
CREATE POLICY "Users can update global metadata" ON site_global_metadata
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política: Apenas utilizadores autenticados podem fazer soft delete
CREATE POLICY "Users can soft delete global metadata" ON site_global_metadata
    FOR DELETE USING (auth.role() = 'authenticated');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_site_global_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_site_global_metadata_updated_at
    BEFORE UPDATE ON site_global_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_site_global_metadata_updated_at();

-- Inserir dados iniciais
INSERT INTO site_global_metadata (
    site_title,
    site_description,
    keywords,
    og_site_name,
    canonical_url,
    robots_directives,
    status
) VALUES (
    'Kromi.online - Sistema de Cronometragem Inteligente',
    'Plataforma completa para gestão de eventos desportivos com tecnologia de visão computacional, cronometragem automática e análise de resultados em tempo real.',
    ARRAY['cronometragem', 'eventos desportivos', 'visão computacional', 'análise de resultados', 'gestão de eventos', 'tecnologia desportiva'],
    'Kromi.online',
    'https://kromi.online',
    'index,follow',
    'draft'
) ON CONFLICT DO NOTHING;

-- Comentários da tabela
COMMENT ON TABLE site_global_metadata IS 'Metadados globais do site para SEO e branding';
COMMENT ON COLUMN site_global_metadata.site_title IS 'Título padrão do site (50-60 caracteres)';
COMMENT ON COLUMN site_global_metadata.site_description IS 'Descrição padrão do site (140-160 caracteres)';
COMMENT ON COLUMN site_global_metadata.keywords IS 'Palavras-chave globais do site';
COMMENT ON COLUMN site_global_metadata.og_site_name IS 'Nome do site para Open Graph';
COMMENT ON COLUMN site_global_metadata.canonical_url IS 'URL canónica base do site';
COMMENT ON COLUMN site_global_metadata.robots_directives IS 'Directivas para robots de busca';
COMMENT ON COLUMN site_global_metadata.status IS 'Status dos metadados (draft/published)';
