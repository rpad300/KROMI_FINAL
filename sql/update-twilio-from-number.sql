-- ==========================================
-- Atualizar TWILIO_FROM_NUMBER com o número correto
-- ==========================================

-- Inserir ou atualizar a configuração do número Twilio
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES ('TWILIO_FROM_NUMBER', '+13188893212', 'api-key', false, 'Número Twilio para envio de SMS (Phone Number SID: PN0cc2a2f4ef19f7afb36db389c602a1f5)')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    config_type = EXCLUDED.config_type,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verificar se foi atualizado
SELECT 
    config_key,
    config_value,
    description,
    updated_at
FROM platform_configurations
WHERE config_key = 'TWILIO_FROM_NUMBER';

