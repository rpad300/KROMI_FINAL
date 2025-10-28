-- ==========================================
-- Adicionar Suporte para OpenAI
-- ==========================================
-- 
-- Este script adiciona suporte para OpenAI na base de dados:
-- 1. Adiciona campo openai_model na tabela event_configurations
-- 2. Adiciona OPENAI_API_KEY na tabela platform_configurations
-- 3. Atualiza funções SQL para suportar modelo OpenAI
-- 
-- Versão: 1.0
-- Data: Dezembro 2024
-- ==========================================

-- 1. ADICIONAR CAMPO OPENAI_MODEL EM EVENT_CONFIGURATIONS
DO $$ 
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_configurations' 
        AND column_name = 'openai_model'
    ) THEN
        ALTER TABLE event_configurations 
        ADD COLUMN openai_model TEXT DEFAULT 'gpt-4o';
        
        COMMENT ON COLUMN event_configurations.openai_model IS 'Modelo OpenAI selecionado (ex: gpt-4o, gpt-4-turbo, gpt-4)';
        
        RAISE NOTICE '✅ Campo openai_model adicionado à tabela event_configurations';
    ELSE
        RAISE NOTICE '⚠️ Campo openai_model já existe na tabela event_configurations';
    END IF;
END $$;

-- Add gemini_model to event_configurations if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_configurations' 
        AND column_name = 'gemini_model'
    ) THEN
        ALTER TABLE event_configurations 
        ADD COLUMN gemini_model TEXT DEFAULT 'gemini-1.5-flash';
        
        COMMENT ON COLUMN event_configurations.gemini_model IS 'Modelo Gemini selecionado (ex: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp)';
        
        RAISE NOTICE '✅ Campo gemini_model adicionado à tabela event_configurations';
    ELSE
        RAISE NOTICE '⚠️ Campo gemini_model já existe na tabela event_configurations';
    END IF;
END $$;

-- 2. ADICIONAR OPENAI À LISTA DE PROCESSORES VÁLIDOS
DO $$ 
BEGIN
    -- Verificar se a constraint já aceita 'openai'
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'event_configurations' 
        AND constraint_name = 'event_configurations_processor_type_check'
    ) THEN
        -- Atualizar constraint para incluir 'openai'
        ALTER TABLE event_configurations 
        DROP CONSTRAINT IF EXISTS event_configurations_processor_type_check;
        
        ALTER TABLE event_configurations 
        ADD CONSTRAINT event_configurations_processor_type_check 
        CHECK (processor_type IN ('gemini', 'openai', 'google-vision', 'ocr', 'hybrid', 'manual'));
        
        RAISE NOTICE '✅ Constraint atualizada para incluir openai';
    ELSE
        RAISE NOTICE '⚠️ Constraint event_configurations_processor_type_check não encontrada';
    END IF;
END $$;

-- 3. ADICIONAR OPENAI_API_KEY NA TABELA PLATFORM_CONFIGURATIONS
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description)
VALUES 
    ('OPENAI_API_KEY', '', 'api_key', true, 'Chave da API do OpenAI')
ON CONFLICT (config_key) 
DO UPDATE SET 
    description = EXCLUDED.description,
    updated_at = NOW();

-- 4. ATUALIZAR FUNÇÃO get_event_processor_config PARA RETORNAR OPENAI_MODEL
-- Primeiro remover função antiga se existir
DROP FUNCTION IF EXISTS get_event_processor_config(UUID);

-- Agora criar função com novo formato
CREATE FUNCTION get_event_processor_config(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2),
    openai_model TEXT,
    gemini_model TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.processor_type,
        ec.processor_speed,
        ec.processor_confidence,
        COALESCE(ec.openai_model, 'gpt-4o'::TEXT) as openai_model,
        COALESCE(ec.gemini_model, 'gemini-1.5-flash'::TEXT) as gemini_model
    FROM event_configurations ec
    WHERE ec.event_id = event_id_param
    LIMIT 1;
    
    -- Se não encontrar configuração, retornar valores padrão
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'gemini'::TEXT, 'balanced'::TEXT, 0.7::DECIMAL(3,2), 'gpt-4o'::TEXT, 'gemini-1.5-flash'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. ATUALIZAR FUNÇÃO update_event_processor_config PARA ACEITAR OPENAI_MODEL
-- Primeiro remover todas as versões da função antiga se existirem
DROP FUNCTION IF EXISTS update_event_processor_config(UUID, TEXT, TEXT, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS update_event_processor_config(UUID, TEXT, TEXT, DECIMAL, TEXT) CASCADE;

-- Agora criar função com novo formato
CREATE FUNCTION update_event_processor_config(
    event_id_param UUID,
    processor_type_param TEXT,
    processor_speed_param TEXT,
    processor_confidence_param DECIMAL(3,2),
    openai_model_param TEXT DEFAULT 'gpt-4o',
    gemini_model_param TEXT DEFAULT 'gemini-1.5-flash'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar parâmetros
    IF processor_type_param NOT IN ('gemini', 'openai', 'google-vision', 'ocr', 'hybrid', 'manual') THEN
        RAISE EXCEPTION 'Tipo de processador inválido: %', processor_type_param;
    END IF;
    
    IF processor_speed_param NOT IN ('fast', 'balanced', 'accurate', 'manual') THEN
        RAISE EXCEPTION 'Velocidade de processador inválida: %', processor_speed_param;
    END IF;
    
    IF processor_confidence_param < 0.1 OR processor_confidence_param > 1.0 THEN
        RAISE EXCEPTION 'Confiança deve estar entre 0.1 e 1.0: %', processor_confidence_param;
    END IF;
    
    -- Validar modelo OpenAI se openai estiver selecionado
    IF processor_type_param = 'openai' AND openai_model_param IS NOT NULL THEN
        -- Verificar se o modelo é válido (básico check)
        IF openai_model_param NOT SIMILAR TO 'gpt-%' THEN
            RAISE EXCEPTION 'Modelo OpenAI inválido: %', openai_model_param;
        END IF;
    END IF;
    
    -- Inserir ou atualizar configuração
    INSERT INTO event_configurations (
        event_id,
        processor_type,
        processor_speed,
        processor_confidence,
        openai_model,
        gemini_model,
        updated_at
    ) VALUES (
        event_id_param,
        processor_type_param,
        processor_speed_param,
        processor_confidence_param,
        openai_model_param,
        gemini_model_param,
        NOW()
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET
        processor_type = EXCLUDED.processor_type,
        processor_speed = EXCLUDED.processor_speed,
        processor_confidence = EXCLUDED.processor_confidence,
        openai_model = EXCLUDED.openai_model,
        gemini_model = EXCLUDED.gemini_model,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. ATUALIZAR event_processor_settings SE EXISTIR
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_processor_settings'
    ) THEN
        -- Adicionar coluna openai_model se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_processor_settings' 
            AND column_name = 'openai_model'
        ) THEN
            ALTER TABLE event_processor_settings 
            ADD COLUMN openai_model TEXT DEFAULT 'gpt-4o';
            
            COMMENT ON COLUMN event_processor_settings.openai_model IS 'Modelo OpenAI selecionado (ex: gpt-4o, gpt-4-turbo, gpt-4)';
        END IF;
        
        -- Adicionar coluna gemini_model se não existir
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_processor_settings' 
            AND column_name = 'gemini_model'
        ) THEN
            ALTER TABLE event_processor_settings 
            ADD COLUMN gemini_model TEXT DEFAULT 'gemini-1.5-flash';
            
            COMMENT ON COLUMN event_processor_settings.gemini_model IS 'Modelo Gemini selecionado (ex: gemini-1.5-flash, gemini-1.5-pro)';
        END IF;
        
        -- Atualizar constraint
        ALTER TABLE event_processor_settings 
        DROP CONSTRAINT IF EXISTS event_processor_settings_processor_type_check;
        
        ALTER TABLE event_processor_settings 
        ADD CONSTRAINT event_processor_settings_processor_type_check 
        CHECK (processor_type IN ('gemini', 'openai', 'google-vision', 'ocr', 'hybrid', 'manual', 'inherited'));
        
        RAISE NOTICE '✅ Tabela event_processor_settings atualizada com suporte para OpenAI';
    END IF;
END $$;

-- 7. VERIFICAR E INFORMAR SUCESSO
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'event_configurations' 
    AND column_name = 'openai_model';
    
    IF col_count > 0 THEN
        RAISE NOTICE '✅ Script executado com sucesso!';
        RAISE NOTICE '✅ Campo openai_model adicionado à event_configurations';
        RAISE NOTICE '✅ OPENAI_API_KEY adicionado à platform_configurations';
        RAISE NOTICE '✅ Funções SQL atualizadas para suportar OpenAI';
    ELSE
        RAISE WARNING '⚠️ Erro ao adicionar campo openai_model';
    END IF;
END $$;

-- 8. MOSTRAR ESTRUTURA ATUAL
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'event_configurations'
AND column_name IN ('processor_type', 'processor_speed', 'processor_confidence', 'openai_model')
ORDER BY ordinal_position;

