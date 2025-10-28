-- ==========================================
-- Adicionar Suporte para Configurações de Email
-- ==========================================
-- 
-- Este script adiciona suporte para configurações de email
-- na tabela platform_configurations
-- 
-- Versão: 1.1
-- Data: 2025-10-27
-- ==========================================

-- 1. Atualizar constraint se necessário
DO $$ 
BEGIN
    -- Verificar se a coluna existe e atualizar o CHECK
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'platform_configurations' 
        AND column_name = 'config_type'
    ) THEN
        -- Remover constraint antiga se existir
        ALTER TABLE platform_configurations 
        DROP CONSTRAINT IF EXISTS platform_configurations_config_type_check;
        
        -- Adicionar nova constraint com tipo 'email'
        ALTER TABLE platform_configurations 
        ADD CONSTRAINT platform_configurations_config_type_check 
        CHECK (config_type IN ('api_key', 'processor_setting', 'global_setting', 'email'));
        
        RAISE NOTICE '✅ Constraint atualizada para incluir tipo email';
    ELSE
        RAISE NOTICE '⚠️ Tabela platform_configurations não encontrada';
    END IF;
END $$;

-- 2. Atualizar comentário da coluna
COMMENT ON COLUMN platform_configurations.config_type IS 'Tipo: api_key, processor_setting, global_setting, email';

-- 3. Inserir configurações de email padrão (se não existirem)
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES 
    ('EMAIL_USER', 'system@kromi.online', 'email', false, 'Email do sistema para envio de notificações'),
    ('EMAIL_PASSWORD', '', 'email', true, 'App Password do Gmail para envio de emails'),
    ('APP_URL', 'https://kromi.online', 'email', false, 'URL da aplicação usada nos emails')
ON CONFLICT (config_key) 
DO UPDATE SET 
    config_type = EXCLUDED.config_type,
    description = EXCLUDED.description,
    updated_at = NOW()
WHERE platform_configurations.config_key IN ('EMAIL_USER', 'EMAIL_PASSWORD', 'APP_URL');

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

-- Verificar se as configurações foram inseridas
SELECT 
    config_key,
    CASE WHEN config_key = 'EMAIL_PASSWORD' THEN '***' ELSE LEFT(config_value, 20) || '...' END as config_value_preview,
    config_type,
    is_encrypted,
    description,
    created_at
FROM platform_configurations 
WHERE config_type = 'email'
ORDER BY config_key;

-- Verificar se o tipo 'email' está disponível
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'platform_configurations' 
AND column_name = 'config_type';

