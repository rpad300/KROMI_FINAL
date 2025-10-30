-- ==========================================
-- Adicionar suporte para múltiplas plataformas sociais
-- Facebook, Instagram, LinkedIn, Google, TikTok
-- ==========================================

-- Adicionar colunas para plataformas sociais na tabela page_meta
ALTER TABLE page_meta 
ADD COLUMN IF NOT EXISTS facebook_title TEXT,
ADD COLUMN IF NOT EXISTS facebook_description TEXT,
ADD COLUMN IF NOT EXISTS instagram_title TEXT,
ADD COLUMN IF NOT EXISTS instagram_description TEXT,
ADD COLUMN IF NOT EXISTS linkedin_title TEXT,
ADD COLUMN IF NOT EXISTS linkedin_description TEXT,
ADD COLUMN IF NOT EXISTS google_title TEXT,
ADD COLUMN IF NOT EXISTS google_description TEXT,
ADD COLUMN IF NOT EXISTS tiktok_title TEXT,
ADD COLUMN IF NOT EXISTS tiktok_description TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_title TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_description TEXT,
ADD COLUMN IF NOT EXISTS telegram_title TEXT,
ADD COLUMN IF NOT EXISTS telegram_description TEXT;

COMMENT ON COLUMN page_meta.facebook_title IS 'Título específico para Facebook (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.facebook_description IS 'Descrição específica para Facebook (usa og_description se não especificado)';
COMMENT ON COLUMN page_meta.instagram_title IS 'Título específico para Instagram (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.instagram_description IS 'Descrição específica para Instagram (usa og_description se não especificado)';
COMMENT ON COLUMN page_meta.linkedin_title IS 'Título específico para LinkedIn (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.linkedin_description IS 'Descrição específica para LinkedIn (usa og_description se não especificado)';
COMMENT ON COLUMN page_meta.google_title IS 'Título específico para Google (usa title se não especificado)';
COMMENT ON COLUMN page_meta.google_description IS 'Descrição específica para Google (usa description se não especificado)';
COMMENT ON COLUMN page_meta.tiktok_title IS 'Título específico para TikTok (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.tiktok_description IS 'Descrição específica para TikTok (usa og_description se não especificado)';
COMMENT ON COLUMN page_meta.whatsapp_title IS 'Título específico para WhatsApp (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.whatsapp_description IS 'Descrição específica para WhatsApp (usa og_description se não especificado)';
COMMENT ON COLUMN page_meta.telegram_title IS 'Título específico para Telegram (usa og_title se não especificado)';
COMMENT ON COLUMN page_meta.telegram_description IS 'Descrição específica para Telegram (usa og_description se não especificado)';

