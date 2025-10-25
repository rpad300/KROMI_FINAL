-- Sistema de Configurações da Plataforma VisionKrono
-- Este script cria as tabelas e funções para configuração global da plataforma

-- 1. TABELA DE CONFIGURAÇÕES GLOBAIS DA PLATAFORMA
CREATE TABLE IF NOT EXISTS platform_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type TEXT NOT NULL CHECK (config_type IN ('api_key', 'processor_setting', 'global_setting')),
    is_encrypted BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE platform_configurations IS 'Configurações globais da plataforma VisionKrono';
COMMENT ON COLUMN platform_configurations.config_key IS 'Chave da configuração (ex: GEMINI_API_KEY)';
COMMENT ON COLUMN platform_configurations.config_value IS 'Valor da configuração (encriptado se is_encrypted=true)';
COMMENT ON COLUMN platform_configurations.config_type IS 'Tipo: api_key, processor_setting, global_setting';
COMMENT ON COLUMN platform_configurations.is_encrypted IS 'Se o valor está encriptado';
COMMENT ON COLUMN platform_configurations.description IS 'Descrição da configuração';

-- 2. TABELA DE CONFIGURAÇÕES DE PROCESSADOR POR EVENTO
CREATE TABLE IF NOT EXISTS event_processor_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    processor_type TEXT NOT NULL CHECK (processor_type IN ('gemini', 'google-vision', 'ocr', 'hybrid', 'manual', 'inherited')),
    processor_speed TEXT DEFAULT 'balanced' CHECK (processor_speed IN ('fast', 'balanced', 'accurate', 'manual')),
    processor_confidence DECIMAL(3,2) DEFAULT 0.7 CHECK (processor_confidence >= 0.1 AND processor_confidence <= 1.0),
    is_forced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id)
);

-- Comentários para documentação
COMMENT ON TABLE event_processor_settings IS 'Configurações específicas de processador por evento';
COMMENT ON COLUMN event_processor_settings.event_id IS 'ID do evento';
COMMENT ON COLUMN event_processor_settings.processor_type IS 'Tipo de processador (inherited = usa configuração global)';
COMMENT ON COLUMN event_processor_settings.processor_speed IS 'Velocidade de processamento';
COMMENT ON COLUMN event_processor_settings.processor_confidence IS 'Confiança mínima para aceitar detecções';
COMMENT ON COLUMN event_processor_settings.is_forced IS 'Se esta configuração força o tipo de processador';

-- 3. TABELA DE CONFIGURAÇÕES GLOBAIS DE PROCESSADOR
CREATE TABLE IF NOT EXISTS global_processor_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários para documentação
COMMENT ON TABLE global_processor_settings IS 'Configurações globais de processador';
COMMENT ON COLUMN global_processor_settings.setting_key IS 'Chave da configuração';
COMMENT ON COLUMN global_processor_settings.setting_value IS 'Valor da configuração';

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_platform_configurations_key ON platform_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_platform_configurations_type ON platform_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_event_processor_settings_event ON event_processor_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_processor_settings_type ON event_processor_settings(processor_type);
CREATE INDEX IF NOT EXISTS idx_global_processor_settings_key ON global_processor_settings(setting_key);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_platform_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_event_processor_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_global_processor_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_configurations_updated_at
    BEFORE UPDATE ON platform_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_configurations_updated_at();

CREATE TRIGGER trigger_update_event_processor_settings_updated_at
    BEFORE UPDATE ON event_processor_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_event_processor_settings_updated_at();

CREATE TRIGGER trigger_update_global_processor_settings_updated_at
    BEFORE UPDATE ON global_processor_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_global_processor_settings_updated_at();

-- Habilitar RLS
ALTER TABLE platform_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_processor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_processor_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir leitura e escrita
DROP POLICY IF EXISTS "platform_configurations_policy" ON platform_configurations;
CREATE POLICY "platform_configurations_policy" ON platform_configurations
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_processor_settings_policy" ON event_processor_settings;
CREATE POLICY "event_processor_settings_policy" ON event_processor_settings
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "global_processor_settings_policy" ON global_processor_settings;
CREATE POLICY "global_processor_settings_policy" ON global_processor_settings
    FOR ALL USING (true) WITH CHECK (true);

-- FUNÇÕES RPC PARA GERENCIAMENTO DE CONFIGURAÇÕES

-- Função para obter configuração da plataforma
CREATE OR REPLACE FUNCTION get_platform_config(config_key_param TEXT DEFAULT NULL)
RETURNS TABLE (
    config_key TEXT,
    config_value TEXT,
    config_type TEXT,
    is_encrypted BOOLEAN,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.config_key,
        pc.config_value,
        pc.config_type,
        pc.is_encrypted,
        pc.description
    FROM platform_configurations pc
    WHERE (config_key_param IS NULL OR pc.config_key = config_key_param)
    ORDER BY pc.config_key;
END;
$$ LANGUAGE plpgsql;

-- Função para definir configuração da plataforma
CREATE OR REPLACE FUNCTION set_platform_config(
    config_key_param TEXT,
    config_value_param TEXT,
    config_type_param TEXT DEFAULT 'global_setting',
    is_encrypted_param BOOLEAN DEFAULT true,
    description_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO platform_configurations (
        config_key, 
        config_value, 
        config_type, 
        is_encrypted, 
        description
    ) VALUES (
        config_key_param, 
        config_value_param, 
        config_type_param, 
        is_encrypted_param, 
        description_param
    )
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        config_type = EXCLUDED.config_type,
        is_encrypted = EXCLUDED.is_encrypted,
        description = EXCLUDED.description,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para obter configuração de processador de um evento
CREATE OR REPLACE FUNCTION get_event_processor_setting(event_id_param UUID)
RETURNS TABLE (
    event_id UUID,
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2),
    is_forced BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eps.event_id,
        eps.processor_type,
        eps.processor_speed,
        eps.processor_confidence,
        eps.is_forced
    FROM event_processor_settings eps
    WHERE eps.event_id = event_id_param;
END;
$$ LANGUAGE plpgsql;

-- Função para definir configuração de processador de um evento
CREATE OR REPLACE FUNCTION set_event_processor_setting(
    event_id_param UUID,
    processor_type_param TEXT,
    processor_speed_param TEXT DEFAULT 'balanced',
    processor_confidence_param DECIMAL(3,2) DEFAULT 0.7,
    is_forced_param BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO event_processor_settings (
        event_id,
        processor_type,
        processor_speed,
        processor_confidence,
        is_forced
    ) VALUES (
        event_id_param,
        processor_type_param,
        processor_speed_param,
        processor_confidence_param,
        is_forced_param
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET 
        processor_type = EXCLUDED.processor_type,
        processor_speed = EXCLUDED.processor_speed,
        processor_confidence = EXCLUDED.processor_confidence,
        is_forced = EXCLUDED.is_forced,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para obter configuração global de processador
CREATE OR REPLACE FUNCTION get_global_processor_setting(setting_key_param TEXT DEFAULT NULL)
RETURNS TABLE (
    setting_key TEXT,
    setting_value TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gps.setting_key,
        gps.setting_value,
        gps.description
    FROM global_processor_settings gps
    WHERE (setting_key_param IS NULL OR gps.setting_key = setting_key_param)
    ORDER BY gps.setting_key;
END;
$$ LANGUAGE plpgsql;

-- Função para definir configuração global de processador
CREATE OR REPLACE FUNCTION set_global_processor_setting(
    setting_key_param TEXT,
    setting_value_param TEXT,
    description_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO global_processor_settings (
        setting_key, 
        setting_value, 
        description
    ) VALUES (
        setting_key_param, 
        setting_value_param, 
        description_param
    )
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para obter configuração efetiva de processador (considera herança)
CREATE OR REPLACE FUNCTION get_effective_processor_setting(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2),
    source TEXT
) AS $$
DECLARE
    event_setting RECORD;
    global_setting RECORD;
BEGIN
    -- Buscar configuração específica do evento
    SELECT * INTO event_setting
    FROM event_processor_settings
    WHERE event_id = event_id_param;
    
    -- Se evento tem configuração específica e não é inherited
    IF FOUND AND event_setting.processor_type != 'inherited' THEN
        RETURN QUERY SELECT 
            event_setting.processor_type,
            event_setting.processor_speed,
            event_setting.processor_confidence,
            'event_specific'::TEXT;
        RETURN;
    END IF;
    
    -- Buscar configuração global
    SELECT * INTO global_setting
    FROM global_processor_settings
    WHERE setting_key = 'default_processor_type';
    
    -- Se encontrou configuração global
    IF FOUND THEN
        RETURN QUERY SELECT 
            global_setting.setting_value::TEXT,
            COALESCE((SELECT setting_value FROM global_processor_settings WHERE setting_key = 'default_processor_speed'), 'balanced')::TEXT,
            COALESCE((SELECT setting_value::DECIMAL(3,2) FROM global_processor_settings WHERE setting_key = 'default_processor_confidence'), 0.7),
            'global'::TEXT;
    ELSE
        -- Configuração padrão
        RETURN QUERY SELECT 
            'gemini'::TEXT,
            'balanced'::TEXT,
            0.7::DECIMAL(3,2),
            'default'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Inserir configurações padrão
INSERT INTO global_processor_settings (setting_key, setting_value, description) VALUES
('default_processor_type', 'gemini', 'Tipo de processador padrão para todos os eventos'),
('default_processor_speed', 'balanced', 'Velocidade de processamento padrão'),
('default_processor_confidence', '0.7', 'Confiança mínima padrão para aceitar detecções'),
('allow_event_override', 'true', 'Permite que eventos sobrescrevam configuração global'),
('force_global_processor', 'false', 'Força uso do processador global em todos os eventos')
ON CONFLICT (setting_key) DO NOTHING;

-- Inserir configurações de API padrão (vazias, para serem preenchidas)
INSERT INTO platform_configurations (config_key, config_value, config_type, is_encrypted, description) VALUES
('GEMINI_API_KEY', '', 'api_key', true, 'Chave da API do Google Gemini'),
('GOOGLE_VISION_API_KEY', '', 'api_key', true, 'Chave da API do Google Vision'),
('SUPABASE_URL', '', 'api_key', true, 'URL do Supabase'),
('SUPABASE_ANON_KEY', '', 'api_key', true, 'Chave anônima do Supabase'),
('SUPABASE_SERVICE_ROLE_KEY', '', 'api_key', true, 'Chave de serviço do Supabase')
ON CONFLICT (config_key) DO NOTHING;
