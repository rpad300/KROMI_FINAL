-- Adicionar configuração do processador de IA na tabela event_configurations
-- Este script adiciona campos para configurar o tipo de processador usado para detecção de dorsais

-- Adicionar colunas para configuração do processador
ALTER TABLE event_configurations 
ADD COLUMN IF NOT EXISTS processor_type TEXT DEFAULT 'gemini' CHECK (processor_type IN ('gemini', 'google-vision', 'ocr', 'hybrid', 'manual')),
ADD COLUMN IF NOT EXISTS processor_speed TEXT DEFAULT 'balanced' CHECK (processor_speed IN ('fast', 'balanced', 'accurate', 'manual')),
ADD COLUMN IF NOT EXISTS processor_confidence DECIMAL(3,2) DEFAULT 0.7 CHECK (processor_confidence >= 0.1 AND processor_confidence <= 1.0);

-- Comentários para documentação
COMMENT ON COLUMN event_configurations.processor_type IS 'Tipo de processador de IA: gemini, google-vision, ocr, hybrid, manual';
COMMENT ON COLUMN event_configurations.processor_speed IS 'Velocidade de processamento: fast, balanced, accurate, manual';
COMMENT ON COLUMN event_configurations.processor_confidence IS 'Confiança mínima para aceitar detecções (0.1 a 1.0)';

-- Criar índice para consultas rápidas por tipo de processador
CREATE INDEX IF NOT EXISTS idx_event_configurations_processor_type 
ON event_configurations(processor_type);

-- Atualizar configurações existentes com valores padrão
UPDATE event_configurations 
SET 
    processor_type = 'gemini',
    processor_speed = 'balanced',
    processor_confidence = 0.7
WHERE processor_type IS NULL;

-- Função para obter configuração do processador de um evento
CREATE OR REPLACE FUNCTION get_event_processor_config(event_id_param UUID)
RETURNS TABLE (
    processor_type TEXT,
    processor_speed TEXT,
    processor_confidence DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.processor_type,
        ec.processor_speed,
        ec.processor_confidence
    FROM event_configurations ec
    WHERE ec.event_id = event_id_param
    LIMIT 1;
    
    -- Se não encontrar configuração, retornar valores padrão
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'gemini'::TEXT, 'balanced'::TEXT, 0.7::DECIMAL(3,2);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar configuração do processador
CREATE OR REPLACE FUNCTION update_event_processor_config(
    event_id_param UUID,
    processor_type_param TEXT,
    processor_speed_param TEXT,
    processor_confidence_param DECIMAL(3,2)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar parâmetros
    IF processor_type_param NOT IN ('gemini', 'google-vision', 'ocr', 'hybrid', 'manual') THEN
        RAISE EXCEPTION 'Tipo de processador inválido: %', processor_type_param;
    END IF;
    
    IF processor_speed_param NOT IN ('fast', 'balanced', 'accurate', 'manual') THEN
        RAISE EXCEPTION 'Velocidade de processador inválida: %', processor_speed_param;
    END IF;
    
    IF processor_confidence_param < 0.1 OR processor_confidence_param > 1.0 THEN
        RAISE EXCEPTION 'Confiança deve estar entre 0.1 e 1.0: %', processor_confidence_param;
    END IF;
    
    -- Inserir ou atualizar configuração
    INSERT INTO event_configurations (
        event_id,
        processor_type,
        processor_speed,
        processor_confidence,
        updated_at
    ) VALUES (
        event_id_param,
        processor_type_param,
        processor_speed_param,
        processor_confidence_param,
        NOW()
    )
    ON CONFLICT (event_id) 
    DO UPDATE SET
        processor_type = EXCLUDED.processor_type,
        processor_speed = EXCLUDED.processor_speed,
        processor_confidence = EXCLUDED.processor_confidence,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS na tabela event_configurations se ainda não estiver habilitada
ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;

-- Política RLS para permitir leitura e escrita (ajustar conforme necessário)
DROP POLICY IF EXISTS "event_configurations_policy" ON event_configurations;
CREATE POLICY "event_configurations_policy" ON event_configurations
    FOR ALL USING (true);

-- Comentário final
COMMENT ON TABLE event_configurations IS 'Configurações de eventos incluindo processador de IA';
