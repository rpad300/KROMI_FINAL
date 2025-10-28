-- ==========================================
-- ENHANCEMENT: Ficha Completa de Utilizador
-- ==========================================
-- 
-- Este script adiciona campos adicionais à tabela user_profiles
-- para criar uma ficha de utilizador mais completa
-- 
-- Versão: 2.0
-- Data: 2025-10-27
-- ==========================================

-- ==========================================
-- 1. INFORMAÇÕES PESSOAIS ADICIONAIS
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- ==========================================
-- 2. INFORMAÇÕES DE CONTACTO ADICIONAIS
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_alt TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_alt TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';

-- ==========================================
-- 3. MORADA E LOCALIZAÇÃO
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state_province TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Portugal';

-- ==========================================
-- 4. INFORMAÇÕES PROFISSIONAIS
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS biography TEXT;

-- ==========================================
-- 5. INFORMAÇÕES DE EMERGÊNCIA
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- ==========================================
-- 6. INFORMAÇÕES TÉCNICAS E SISTEMA
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Lisbon';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS terms_accepted_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS privacy_accepted_date TIMESTAMP WITH TIME ZONE;

-- ==========================================
-- 7. ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_tax_id ON user_profiles(tax_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_city ON user_profiles(city);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON user_profiles(country);

SELECT '✅ Ficha de utilizador melhorada com sucesso!' as status;
