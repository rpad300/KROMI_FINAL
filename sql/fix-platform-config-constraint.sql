-- Script para corrigir a constraint platform_configurations_config_type_check
-- Inclui todos os tipos de configuração necessários

DO $$
BEGIN
    -- Remover constraint antiga
    ALTER TABLE platform_configurations 
    DROP CONSTRAINT IF EXISTS platform_configurations_config_type_check;
    
    -- Atualizar registros existentes para valores válidos
    UPDATE platform_configurations 
    SET config_type = CASE 
        WHEN config_key LIKE '%GEMINI%' THEN 'gemini-api-key'
        WHEN config_key LIKE '%OPENAI%' THEN 'openai'
        WHEN config_key LIKE '%DEEPSEEK%' THEN 'deepseek'
        WHEN config_key LIKE '%GOOGLE_VISION%' THEN 'google-vision-api-key'
        WHEN config_key LIKE '%SUPABASE_URL%' THEN 'supabase-url'
        WHEN config_key LIKE '%SUPABASE%' THEN 'supabase-key'
        ELSE 'api-key'
    END
    WHERE config_type NOT IN (
        'google-vision-api-key', 
        'gemini-api-key', 
        'supabase-url', 
        'supabase-key', 
        'openai', 
        'deepseek',
        'api-key',
        'processor_setting',
        'global_setting',
        'email'
    );
    
    -- Criar constraint com todos os valores necessários
    ALTER TABLE platform_configurations 
    ADD CONSTRAINT platform_configurations_config_type_check 
    CHECK (config_type IN (
        'google-vision-api-key', 
        'gemini-api-key', 
        'supabase-url', 
        'supabase-key', 
        'openai', 
        'deepseek',
        'api-key',
        'processor_setting',
        'global_setting',
        'email'
    ));
    
    RAISE NOTICE '✅ Constraint atualizada com sucesso';
END $$;

