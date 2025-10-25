-- =====================================================
-- VisionKrono - Sistema de Contador de Voltas (CORRIGIDO)
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. ADICIONAR CAMPO has_lap_counter À TABELA event_modalities
ALTER TABLE event_modalities 
ADD COLUMN IF NOT EXISTS has_lap_counter BOOLEAN DEFAULT false;

-- 2. ADICIONAR CAMPO has_lap_counter À TABELA events (para eventos específicos)
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS has_lap_counter BOOLEAN DEFAULT false;

-- 3. CRIAR TABELA PARA ARMAZENAR DADOS DE VOLTAS
CREATE TABLE IF NOT EXISTS lap_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    dorsal_number INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    lap_time INTERVAL NOT NULL,
    lap_speed_kmh DECIMAL(5,2),
    checkpoint_time TIMESTAMPTZ NOT NULL,
    device_id UUID REFERENCES devices(id),
    detection_id UUID REFERENCES detections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices para performance
    UNIQUE(event_id, dorsal_number, lap_number)
);

-- Criar índices separadamente
CREATE INDEX IF NOT EXISTS idx_lap_data_event_dorsal ON lap_data(event_id, dorsal_number);
CREATE INDEX IF NOT EXISTS idx_lap_data_checkpoint_time ON lap_data(checkpoint_time);

-- 4. CRIAR TABELA PARA CONFIGURAÇÃO DE VOLTAS POR EVENTO
CREATE TABLE IF NOT EXISTS event_lap_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    modality_id UUID REFERENCES event_modalities(id),
    has_lap_counter BOOLEAN DEFAULT false,
    lap_distance_km DECIMAL(5,2), -- Distância de cada volta em km
    total_laps INTEGER, -- Número total de voltas esperadas
    min_laps_for_classification INTEGER DEFAULT 1, -- Mínimo de voltas para classificar
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, modality_id)
);

-- 5. FUNÇÃO PARA CALCULAR ESTATÍSTICAS DE VOLTAS
CREATE OR REPLACE FUNCTION calculate_lap_statistics(
    p_event_id UUID,
    p_dorsal_number INTEGER
)
RETURNS TABLE (
    total_laps INTEGER,
    fastest_lap INTERVAL,
    slowest_lap INTERVAL,
    avg_lap_time INTERVAL,
    avg_lap_speed DECIMAL(5,2),
    fastest_lap_speed DECIMAL(5,2),
    total_lap_time INTERVAL
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_laps,
        MIN(ld.lap_time) as fastest_lap,
        MAX(ld.lap_time) as slowest_lap,
        AVG(ld.lap_time) as avg_lap_time,
        AVG(ld.lap_speed_kmh) as avg_lap_speed,
        MAX(ld.lap_speed_kmh) as fastest_lap_speed,
        SUM(ld.lap_time) as total_lap_time
    FROM lap_data ld
    WHERE ld.event_id = p_event_id 
    AND ld.dorsal_number = p_dorsal_number;
END;
$$;

-- 6. FUNÇÃO PARA VALIDAR CONFIGURAÇÃO DE VOLTAS
CREATE OR REPLACE FUNCTION validate_lap_counter_setup(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_lap_counter BOOLEAN;
    v_lap_counter_devices INTEGER;
    v_finish_devices INTEGER;
BEGIN
    -- Verificar se o evento tem contador de voltas ativado
    SELECT has_lap_counter INTO v_has_lap_counter
    FROM events 
    WHERE id = p_event_id;
    
    -- Se não tem contador de voltas, configuração é válida
    IF NOT v_has_lap_counter THEN
        RETURN true;
    END IF;
    
    -- Contar dispositivos com checkpoint de contador de voltas
    SELECT COUNT(*) INTO v_lap_counter_devices
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = p_event_id 
    AND ct.code = 'lap_counter'
    AND ct.is_active = true;
    
    -- Contar dispositivos de meta
    SELECT COUNT(*) INTO v_finish_devices
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = p_event_id 
    AND ct.is_finish = true
    AND ct.is_active = true;
    
    -- Validar: precisa de pelo menos 1 contador de voltas e 1 meta
    RETURN (v_lap_counter_devices >= 1 AND v_finish_devices >= 1);
END;
$$;

-- 7. TRIGGER PARA CALCULAR AUTOMATICAMENTE DADOS DE VOLTAS
CREATE OR REPLACE FUNCTION process_lap_detection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_has_laps BOOLEAN;
    v_lap_distance DECIMAL(5,2);
    v_current_lap INTEGER;
    v_lap_time INTERVAL;
    v_lap_speed DECIMAL(5,2);
BEGIN
    -- Verificar se o evento tem contador de voltas
    SELECT has_lap_counter INTO v_event_has_laps
    FROM events 
    WHERE id = NEW.event_id;
    
    -- Se não tem contador de voltas, não processar
    IF NOT v_event_has_laps THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se a detecção é de um checkpoint contador de voltas
    IF NOT EXISTS (
        SELECT 1 FROM event_devices ed
        JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
        WHERE ed.event_id = NEW.event_id 
        AND ed.device_id = NEW.device_id
        AND ct.code = 'lap_counter'
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Obter distância da volta da configuração
    SELECT lap_distance_km INTO v_lap_distance
    FROM event_lap_config
    WHERE event_id = NEW.event_id;
    
    -- Calcular número da volta atual
    SELECT COALESCE(MAX(lap_number), 0) + 1 INTO v_current_lap
    FROM lap_data
    WHERE event_id = NEW.event_id 
    AND dorsal_number = NEW.dorsal_number;
    
    -- Calcular tempo da volta (tempo desde última passagem)
    SELECT NEW.checkpoint_time - COALESCE(MAX(checkpoint_time), NEW.checkpoint_time) INTO v_lap_time
    FROM lap_data
    WHERE event_id = NEW.event_id 
    AND dorsal_number = NEW.dorsal_number;
    
    -- Calcular velocidade da volta (se temos distância)
    IF v_lap_distance > 0 AND v_lap_time > INTERVAL '0' THEN
        v_lap_speed := (v_lap_distance / EXTRACT(EPOCH FROM v_lap_time)) * 3600;
    ELSE
        v_lap_speed := NULL;
    END IF;
    
    -- Inserir dados da volta
    INSERT INTO lap_data (
        event_id,
        dorsal_number,
        lap_number,
        lap_time,
        lap_speed_kmh,
        checkpoint_time,
        device_id,
        detection_id
    ) VALUES (
        NEW.event_id,
        NEW.dorsal_number,
        v_current_lap,
        v_lap_time,
        v_lap_speed,
        NEW.checkpoint_time,
        NEW.device_id,
        NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- 8. CRIAR TRIGGER PARA PROCESSAR DETECÇÕES DE VOLTAS
DROP TRIGGER IF EXISTS trg_process_lap_detection ON detections;
CREATE TRIGGER trg_process_lap_detection
    AFTER INSERT ON detections
    FOR EACH ROW
    EXECUTE FUNCTION process_lap_detection();

-- 9. CRIAR FUNÇÃO PARA CONFIGURAR CONTADOR DE VOLTAS
CREATE OR REPLACE FUNCTION configure_lap_counter(
    p_event_id UUID,
    p_modality_id UUID DEFAULT NULL,
    p_has_lap_counter BOOLEAN DEFAULT false,
    p_lap_distance_km DECIMAL(5,2) DEFAULT NULL,
    p_total_laps INTEGER DEFAULT NULL,
    p_min_laps_for_classification INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atualizar evento
    UPDATE events 
    SET has_lap_counter = p_has_lap_counter,
        updated_at = NOW()
    WHERE id = p_event_id;
    
    -- Inserir/atualizar configuração de voltas
    INSERT INTO event_lap_config (
        event_id,
        modality_id,
        has_lap_counter,
        lap_distance_km,
        total_laps,
        min_laps_for_classification
    ) VALUES (
        p_event_id,
        p_modality_id,
        p_has_lap_counter,
        p_lap_distance_km,
        p_total_laps,
        p_min_laps_for_classification
    )
    ON CONFLICT (event_id, modality_id) 
    DO UPDATE SET
        has_lap_counter = EXCLUDED.has_lap_counter,
        lap_distance_km = EXCLUDED.lap_distance_km,
        total_laps = EXCLUDED.total_laps,
        min_laps_for_classification = EXCLUDED.min_laps_for_classification,
        updated_at = NOW();
    
    -- Validar configuração
    IF p_has_lap_counter AND NOT validate_lap_counter_setup(p_event_id) THEN
        RAISE EXCEPTION 'Configuração inválida: eventos com contador de voltas precisam de pelo menos 1 dispositivo contador de voltas e 1 dispositivo de meta';
    END IF;
    
    RETURN true;
END;
$$;

-- 10. INSERIR CONFIGURAÇÕES PADRÃO PARA MODALIDADES EXISTENTES
UPDATE event_modalities 
SET has_lap_counter = true 
WHERE name IN ('Ciclismo', 'Triatlo', 'Atletismo');

-- 11. ADICIONAR PERFIL ESPECÍFICO PARA CONTADOR DE VOLTAS
-- Criar perfil específico para eventos com contador de voltas
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('lap_counter', 'Contador de Voltas', 'Checkpoint que conta voltas completadas', '🔄', '#8b5cf6', false, false, true, true, 30)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_intermediate = EXCLUDED.is_intermediate,
    requires_split = EXCLUDED.requires_split,
    sort_order = EXCLUDED.sort_order;

-- 12. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE lap_data IS 'Armazena dados de cada volta completada por participante';
COMMENT ON TABLE event_lap_config IS 'Configuração de contador de voltas por evento e modalidade';
COMMENT ON FUNCTION calculate_lap_statistics IS 'Calcula estatísticas de voltas para um participante';
COMMENT ON FUNCTION validate_lap_counter_setup IS 'Valida se a configuração de voltas está correta';
COMMENT ON FUNCTION process_lap_detection IS 'Processa automaticamente detecções de voltas';
COMMENT ON FUNCTION configure_lap_counter IS 'Configura o sistema de contador de voltas para um evento';

-- 13. MENSAGEM DE SUCESSO
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de contador de voltas implementado com sucesso!';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '   1. Atualizar interface de configuração';
    RAISE NOTICE '   2. Modificar páginas de classificações';
    RAISE NOTICE '   3. Testar com evento de exemplo';
    RAISE NOTICE '   4. Configurar dispositivos com checkpoint "Contador de Voltas"';
END $$;
