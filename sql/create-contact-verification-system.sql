-- ==========================================
-- Sistema de Verificação de Contacto
-- ==========================================
-- 
-- Sistema que garante que utilizadores só ficam ativos
-- após confirmarem pelo menos um contacto (telefone ou email)
-- 
-- Versão: 1.0
-- Data: 2025-10-30
-- ==========================================

-- ==========================================
-- 1. ATUALIZAR TABELA user_profiles
-- ==========================================

-- Adicionar colunas de verificação se não existirem
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended', 'deleted'));

-- Adicionar campos de confirmação
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos de verificação
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_verification_code TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_code_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sms_code_attempts INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_verification_channel TEXT; -- 'email' ou 'phone'
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMP WITH TIME ZONE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_confirmed ON user_profiles(email_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_confirmed ON user_profiles(phone_confirmed_at);

-- ==========================================
-- 2. TABELA DE RATE LIMITING
-- ==========================================

CREATE TABLE IF NOT EXISTS verification_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('sms_send', 'sms_verify', 'email_resend')),
    attempt_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON verification_rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON verification_rate_limits(window_start);

-- ==========================================
-- 3. FUNÇÃO PARA ATUALIZAR STATUS BASEADO EM CONFIRMAÇÕES
-- ==========================================

CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se email ou telefone confirmado, e status é pending_verification, mudar para active
    IF NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL THEN
        IF OLD.status = 'pending_verification' OR NEW.status = 'pending_verification' THEN
            NEW.status := 'active';
            
            -- Registar qual canal foi confirmado
            IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
                NEW.last_verification_channel := 'email';
            ELSIF NEW.phone_confirmed_at IS NOT NULL AND OLD.phone_confirmed_at IS NULL THEN
                NEW.last_verification_channel := 'phone';
            END IF;
            
            -- Se for primeiro contacto confirmado, registar timestamp
            IF OLD.email_confirmed_at IS NULL AND OLD.phone_confirmed_at IS NULL THEN
                NEW.first_login_at := NOW();
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_verification_status ON user_profiles;
CREATE TRIGGER trigger_update_verification_status
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_status();

-- ==========================================
-- 4. FUNÇÃO PARA LIMPAR CÓDIGOS EXPIRADOS
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
    UPDATE user_profiles
    SET 
        sms_verification_code = NULL,
        sms_code_expires_at = NULL,
        sms_code_attempts = 0
    WHERE sms_code_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. ATUALIZAR UTILIZADORES EXISTENTES
-- ==========================================

-- Atualizar status de utilizadores que já têm email ou telefone confirmado
UPDATE user_profiles
SET 
    status = CASE 
        WHEN email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL THEN 'active'
        ELSE 'pending_verification'
    END,
    email_confirmed_at = COALESCE(email_confirmed_at, 
        CASE WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = user_profiles.user_id 
            AND auth.users.email_confirmed_at IS NOT NULL
        ) THEN (SELECT email_confirmed_at FROM auth.users WHERE auth.users.id = user_profiles.user_id)
        ELSE NULL
        END
    )
WHERE status IS NULL OR status NOT IN ('pending_verification', 'active', 'suspended', 'deleted');

-- ==========================================
-- 6. COMENTÁRIOS
-- ==========================================

COMMENT ON COLUMN user_profiles.status IS 'Estado do utilizador: pending_verification (sem contacto confirmado), active (pelo menos um confirmado), suspended, deleted';
COMMENT ON COLUMN user_profiles.email_confirmed_at IS 'Data de confirmação do email';
COMMENT ON COLUMN user_profiles.phone_confirmed_at IS 'Data de confirmação do telefone';
COMMENT ON COLUMN user_profiles.sms_verification_code IS 'Código SMS temporário (6 dígitos)';
COMMENT ON COLUMN user_profiles.sms_code_expires_at IS 'Data de expiração do código SMS (10 minutos)';
COMMENT ON COLUMN user_profiles.sms_code_attempts IS 'Tentativas de validação do código SMS';
COMMENT ON COLUMN user_profiles.last_verification_channel IS 'Último canal confirmado: email ou phone';
COMMENT ON COLUMN user_profiles.first_login_at IS 'Data do primeiro contacto confirmado';

-- ==========================================
-- 7. VERIFICAÇÃO
-- ==========================================

SELECT 
    '✅ Sistema de verificação de contacto criado!' as status,
    COUNT(*) FILTER (WHERE status = 'pending_verification') as pending_verification,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as email_confirmed,
    COUNT(*) FILTER (WHERE phone_confirmed_at IS NOT NULL) as phone_confirmed
FROM user_profiles;

