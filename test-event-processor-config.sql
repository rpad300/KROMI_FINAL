-- Script de teste para verificar configurações de processador por evento
-- Execute este script no Supabase SQL Editor para testar

-- 1. Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_processor_settings'
) as tabela_existe;

-- 2. Se a tabela não existir, criar
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

-- 3. Habilitar RLS
ALTER TABLE event_processor_settings ENABLE ROW LEVEL SECURITY;

-- 4. Criar política permissiva para desenvolvimento
DROP POLICY IF EXISTS "event_processor_settings_policy" ON event_processor_settings;
CREATE POLICY "event_processor_settings_policy" ON event_processor_settings
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Criar função RPC se não existir
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

-- 6. Remover função existente se houver conflito
DROP FUNCTION IF EXISTS get_event_processor_setting(UUID);

-- 7. Criar função para buscar configurações
CREATE OR REPLACE FUNCTION get_event_processor_setting(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2),
    is_forced BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eps.processor_type,
        eps.processor_speed,
        eps.processor_confidence,
        eps.is_forced
    FROM event_processor_settings eps
    WHERE eps.event_id = event_id_param;
END;
$$ LANGUAGE plpgsql;

-- 8. Testar inserção manual
INSERT INTO event_processor_settings (event_id, processor_type, processor_speed, processor_confidence, is_forced)
SELECT 
    id as event_id,
    'gemini' as processor_type,
    'balanced' as processor_speed,
    0.7 as processor_confidence,
    true as is_forced
FROM events 
WHERE name = 'teste1'
ON CONFLICT (event_id) 
DO UPDATE SET
    processor_type = EXCLUDED.processor_type,
    processor_speed = EXCLUDED.processor_speed,
    processor_confidence = EXCLUDED.processor_confidence,
    is_forced = EXCLUDED.is_forced,
    updated_at = NOW();

-- 9. Verificar resultado
SELECT 
    e.name as evento,
    eps.processor_type,
    eps.processor_speed,
    eps.processor_confidence,
    eps.is_forced,
    eps.created_at,
    eps.updated_at
FROM event_processor_settings eps
LEFT JOIN events e ON e.id = eps.event_id
ORDER BY eps.updated_at DESC;
