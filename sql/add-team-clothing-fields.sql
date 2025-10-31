-- ==========================================
-- ADICIONAR CAMPOS DE EQUIPA/CLUBE E DIMENSÕES DE ROUPA
-- ==========================================
-- 
-- Adiciona campos para informações de equipa/clube e dimensões de roupa
-- na tabela user_profiles
-- 
-- Versão: 1.0
-- Data: 2025-10-30
-- ==========================================

-- ==========================================
-- 1. INFORMAÇÕES DE EQUIPA/CLUBE
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_club_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_club_category TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_position TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_athlete_number TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_join_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS team_notes TEXT;

-- ==========================================
-- 2. DIMENSÕES DE ROUPA
-- ==========================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS clothing_sizes JSONB DEFAULT '{}';
-- Estrutura esperada em clothing_sizes:
-- {
--   "tshirt": "M",
--   "casaco": "L",
--   "calcoes": "M",
--   "jersey": "L",
--   "calcas": "M",
--   "sapatos": "42"
-- }

SELECT '✅ Campos de equipa/clube e dimensões de roupa adicionados!' as status;

