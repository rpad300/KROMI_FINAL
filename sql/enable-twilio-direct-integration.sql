-- ==========================================
-- Habilitar Integração Direta Twilio
-- ==========================================
-- 
-- Este script garante que a tabela user_profiles tem
-- todos os campos necessários para códigos OTP locais
-- 
-- Versão: 1.0
-- Data: 2025-10-31
-- ==========================================

-- Verificar se campos já existem (criados pelo create-contact-verification-system.sql)
-- Se não existirem, criar

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_verification_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_code_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_code_attempts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_sms_code ON user_profiles(sms_verification_code) WHERE sms_verification_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_confirmed ON user_profiles(phone_confirmed_at) WHERE phone_confirmed_at IS NOT NULL;

-- Comentários
COMMENT ON COLUMN user_profiles.sms_verification_code IS 'Código OTP SMS gerado localmente (6 dígitos)';
COMMENT ON COLUMN user_profiles.sms_code_expires_at IS 'Data de expiração do código (10 minutos)';
COMMENT ON COLUMN user_profiles.sms_code_attempts IS 'Tentativas de verificação do código';
COMMENT ON COLUMN user_profiles.phone_confirmed_at IS 'Data de confirmação do telefone (sincronizado com Supabase)';

SELECT '✅ Campos para integração direta Twilio verificados!' as status;

