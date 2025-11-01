-- ==========================================
-- Configurar APP_URL para Produção
-- ==========================================

-- Inserir ou atualizar a configuração da URL da aplicação
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES ('APP_URL', 'https://myapp.kromi.online', 'api-key', false, 'URL da aplicação em produção (myapp.kromi.online)')
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
WHERE config_key = 'APP_URL';

-- ==========================================
-- NOTA: Para desenvolvimento local, configure no .env:
-- APP_URL=https://192.168.1.219:1144
-- ou
-- APP_URL=http://localhost:1144
-- ==========================================

