-- ==========================================
-- Adicionar Suporte para DeepSeek
-- ==========================================
-- 
-- Este script adiciona suporte para DeepSeek na base de dados:
-- 1. Adiciona campo deepseek_model na tabela event_configurations
-- 2. Adiciona DEEPSEEK_API_KEY na tabela platform_configurations
-- 3. Atualiza funções SQL para suportar modelo DeepSeek
-- 
-- Versão: 1.0
-- Data: Janeiro 2025
-- ==========================================

-- 1. ADICIONAR CAMPO DEEPSEEK_MODEL EM EVENT_CONFIGURATIONS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_configurations' 
        AND column_name = 'deepseek_model'
    ) THEN
        ALTER TABLE event_configurations 
        ADD COLUMN deepseek_model TEXT DEFAULT 'deepseek-chat';
        
        COMMENT ON COLUMN event_configurations.deepseek_model IS 'Modelo DeepSeek selecionado (ex: deepseek-chat, deepseek-coder)';
        
        RAISE NOTICE '✅ Campo deepseek_model adicionado à tabela event_configurations';
    ELSE
        RAISE NOTICE '⚠️ Campo deepseek_model já existe na tabela event_configurations';
    END IF;
END $$;

-- 2. ADICIONAR DEEPSEEK_API_KEY EM PLATFORM_CONFIGURATIONS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'platform_configurations' 
        AND column_name = 'deepseek_api_key'
    ) THEN
        ALTER TABLE platform_configurations 
        ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT DEFAULT NULL;
        
        COMMENT ON COLUMN platform_configurations.deepseek_api_key IS 'API Key do DeepSeek';
        
        RAISE NOTICE '✅ Campo deepseek_api_key adicionado à tabela platform_configurations';
    ELSE
        RAISE NOTICE '⚠️ Campo deepseek_api_key já existe na tabela platform_configurations';
    END IF;
END $$;

-- 3. Atualizar constraint para incluir 'deepseek'
DO $$
BEGIN
    -- Remover constraint antiga se existir (começar do zero)
    ALTER TABLE platform_configurations DROP CONSTRAINT IF EXISTS platform_configurations_config_type_check;
    
    -- Atualizar qualquer registro inválido para um valor válido
    UPDATE platform_configurations 
    SET config_type = 'openai' 
    WHERE config_type NOT IN (
        'google-vision-api-key', 
        'gemini-api-key', 
        'supabase-url', 
        'supabase-key', 
        'openai', 
        'deepseek'
    );
    
    -- Criar nova constraint com deepseek incluído
    ALTER TABLE platform_configurations 
    ADD CONSTRAINT platform_configurations_config_type_check 
    CHECK (config_type IN ('google-vision-api-key', 'gemini-api-key', 'supabase-url', 'supabase-key', 'openai', 'deepseek'));
    
    RAISE NOTICE '✅ Constraint atualizada para incluir deepseek';
END $$;

-- 4. Atualizar função get_event_processor_config
DROP FUNCTION IF EXISTS get_event_processor_config(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_event_processor_config(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence NUMERIC,
    openai_model TEXT,
    gemini_model TEXT,
    deepseek_model TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ec.processor_type, 'gemini'::TEXT) as processor_type,
        COALESCE(ec.processor_speed, 'balanced'::TEXT) as processor_speed,
        COALESCE(ec.processor_confidence::NUMERIC, 0.7::NUMERIC) as processor_confidence,
        COALESCE(ec.openai_model, 'gpt-4o'::TEXT) as openai_model,
        COALESCE(ec.gemini_model, 'gemini-1.5-flash'::TEXT) as gemini_model,
        COALESCE(ec.deepseek_model, 'deepseek-chat'::TEXT) as deepseek_model
    FROM event_configurations ec
    WHERE ec.event_id = event_id_param;
END;
$$ LANGUAGE plpgsql;

-- 5. Atualizar função update_event_processor_config
DROP FUNCTION IF EXISTS update_event_processor_config(uuid, text, text, numeric, text, text) CASCADE;

CREATE OR REPLACE FUNCTION update_event_processor_config(
    event_id_param UUID,
    processor_type_param TEXT DEFAULT 'gemini',
    processor_speed_param TEXT DEFAULT 'balanced',
    processor_confidence_param NUMERIC DEFAULT 0.7,
    openai_model_param TEXT DEFAULT 'gpt-4o',
    gemini_model_param TEXT DEFAULT 'gemini-1.5-flash',
    deepseek_model_param TEXT DEFAULT 'deepseek-chat'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO event_configurations (
        event_id,
        processor_type,
        processor_speed,
        processor_confidence,
        openai_model,
        gemini_model,
        deepseek_model,
        created_at,
        updated_at
    )
    VALUES (
        event_id_param,
        processor_type_param,
        processor_speed_param,
        processor_confidence_param,
        openai_model_param,
        gemini_model_param,
        deepseek_model_param,
        NOW(),
        NOW()
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET
        processor_type = EXCLUDED.processor_type,
        processor_speed = EXCLUDED.processor_speed,
        processor_confidence = EXCLUDED.processor_confidence,
        openai_model = EXCLUDED.openai_model,
        gemini_model = EXCLUDED.gemini_model,
        deepseek_model = EXCLUDED.deepseek_model,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Confirmar conclusão
DO $$
BEGIN
    RAISE NOTICE '✅ Funções SQL atualizadas para suportar DeepSeek';
END $$;

