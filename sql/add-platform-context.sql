-- ==========================================
-- Adicionar contexto da plataforma
-- Descrição do objetivo e propósito da plataforma
-- ==========================================

-- Criar tabela para contexto da plataforma
CREATE TABLE IF NOT EXISTS platform_context (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform_name TEXT NOT NULL DEFAULT 'kromi.online',
    platform_objective TEXT,
    platform_description TEXT,
    target_audience TEXT,
    key_features TEXT[],
    brand_voice TEXT,
    brand_personality TEXT,
    industry_sector TEXT,
    use_cases TEXT[],
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE platform_context IS 'Contexto e objetivos da plataforma para uso em geração de conteúdo com IA';
COMMENT ON COLUMN platform_context.platform_objective IS 'Objetivo principal da plataforma';
COMMENT ON COLUMN platform_context.platform_description IS 'Descrição detalhada do que a plataforma faz';
COMMENT ON COLUMN platform_context.target_audience IS 'Descrição do público-alvo';
COMMENT ON COLUMN platform_context.key_features IS 'Array de características principais';
COMMENT ON COLUMN platform_context.brand_voice IS 'Tom e voz da marca';
COMMENT ON COLUMN platform_context.brand_personality IS 'Personalidade da marca';
COMMENT ON COLUMN platform_context.industry_sector IS 'Setor/indústria da plataforma';
COMMENT ON COLUMN platform_context.use_cases IS 'Array de casos de uso principais';

-- Índice
CREATE INDEX IF NOT EXISTS idx_platform_context_status ON platform_context(status);

-- Trigger para updated_at
CREATE TRIGGER update_platform_context_updated_at
    BEFORE UPDATE ON platform_context
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

