-- Adicionar sistema de timing aos eventos
-- Executar no Supabase SQL Editor

-- Adicionar colunas de timing à tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_started_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_ended_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS device_sequence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS auto_start_enabled BOOLEAN DEFAULT true;

-- Adicionar colunas de timing às detecções
ALTER TABLE detections ADD COLUMN IF NOT EXISTS device_order INTEGER;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS checkpoint_time TIMESTAMPTZ;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS split_time INTERVAL;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS total_time INTERVAL;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS is_penalty BOOLEAN DEFAULT false;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS penalty_reason TEXT;

-- Criar tabela de classificações
CREATE TABLE IF NOT EXISTS classifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    dorsal_number INTEGER NOT NULL,
    device_order INTEGER NOT NULL,
    checkpoint_time TIMESTAMPTZ NOT NULL,
    split_time INTERVAL,
    total_time INTERVAL,
    is_penalty BOOLEAN DEFAULT false,
    penalty_reason TEXT,
    detection_id UUID REFERENCES detections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_classifications_event_dorsal ON classifications(event_id, dorsal_number);
CREATE INDEX IF NOT EXISTS idx_classifications_event_order ON classifications(event_id, device_order);
CREATE INDEX IF NOT EXISTS idx_classifications_total_time ON classifications(event_id, total_time) WHERE is_penalty = false;

-- Função para calcular tempo total
CREATE OR REPLACE FUNCTION calculate_total_time(
    p_event_id UUID,
    p_dorsal_number INTEGER
) RETURNS INTERVAL AS $$
DECLARE
    event_start TIMESTAMPTZ;
    first_detection TIMESTAMPTZ;
BEGIN
    -- Buscar início do evento
    SELECT event_started_at INTO event_start
    FROM events 
    WHERE id = p_event_id AND event_started_at IS NOT NULL;
    
    IF event_start IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Buscar primeira detecção do dorsal
    SELECT MIN(checkpoint_time) INTO first_detection
    FROM classifications
    WHERE event_id = p_event_id 
    AND dorsal_number = p_dorsal_number
    AND is_penalty = false;
    
    IF first_detection IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN first_detection - event_start;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar classificações
CREATE OR REPLACE FUNCTION update_classifications(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Atualizar tempo total para todos os dorsais
    UPDATE classifications 
    SET total_time = calculate_total_time(event_id, dorsal_number)
    WHERE event_id = p_event_id;
    
    -- Atualizar timestamp
    UPDATE classifications 
    SET updated_at = NOW()
    WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar classificações automaticamente
CREATE OR REPLACE FUNCTION trigger_update_classifications()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_classifications(NEW.event_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'tr_update_classifications'
    ) THEN
        CREATE TRIGGER tr_update_classifications
            AFTER INSERT OR UPDATE ON classifications
            FOR EACH ROW
            EXECUTE FUNCTION trigger_update_classifications();
    END IF;
END $$;

-- View para classificações ordenadas
CREATE OR REPLACE VIEW event_classifications AS
SELECT 
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.split_time,
    c.total_time,
    c.is_penalty,
    c.penalty_reason,
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id 
        ORDER BY 
            CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
            c.total_time ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.is_active = true
ORDER BY c.event_id, position;

-- Comentários
COMMENT ON TABLE classifications IS 'Classificações dos atletas por evento';
COMMENT ON COLUMN classifications.device_order IS 'Ordem do dispositivo (1=início, último=meta)';
COMMENT ON COLUMN classifications.split_time IS 'Tempo entre checkpoints';
COMMENT ON COLUMN classifications.total_time IS 'Tempo total desde início do evento';
COMMENT ON COLUMN classifications.is_penalty IS 'Se é penalização por falha de passagem';
COMMENT ON COLUMN event_classifications.position IS 'Posição na classificação (1=primeiro)';
