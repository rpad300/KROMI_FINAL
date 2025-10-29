-- Trigger completo com lógica de checkpoints (META, intermediários, voltas, Triatlo, Duatlo)

CREATE OR REPLACE FUNCTION calculate_classification_times()
RETURNS TRIGGER AS $$
DECLARE
    v_event_start_time TIMESTAMPTZ;
    v_previous_checkpoint_time TIMESTAMPTZ;
    v_checkpoint_type VARCHAR(50);
    v_event_type VARCHAR(50);
    v_has_lap_counter BOOLEAN;
    v_is_finish BOOLEAN;
    v_is_last_checkpoint BOOLEAN;
    v_total_checkpoints INTEGER;
BEGIN
    -- Buscar dados do evento
    SELECT 
        event_started_at,
        event_type,
        has_lap_counter
    INTO 
        v_event_start_time,
        v_event_type,
        v_has_lap_counter
    FROM events 
    WHERE id = NEW.event_id;
    
    -- Buscar tipo do checkpoint
    SELECT checkpoint_type INTO v_checkpoint_type
    FROM event_devices
    WHERE event_id = NEW.event_id
    AND checkpoint_order = NEW.device_order
    LIMIT 1;
    
    -- Verificar se o checkpoint é do tipo finish
    SELECT is_finish INTO v_is_finish
    FROM checkpoint_types
    WHERE code = v_checkpoint_type
    LIMIT 1;
    
    -- Se não encontrou em checkpoint_types, assumir baseado no tipo
    IF v_is_finish IS NULL THEN
        v_is_finish := (v_checkpoint_type IN ('finish', 'final', 'meta'));
    END IF;
    
    -- Verificar se é o último checkpoint do evento
    SELECT COUNT(*) INTO v_total_checkpoints
    FROM event_devices
    WHERE event_id = NEW.event_id;
    
    v_is_last_checkpoint := (NEW.device_order >= v_total_checkpoints);
    
    -- ==============================================================
    -- LÓGICA POR TIPO DE EVENTO
    -- ==============================================================
    
    -- 1. EVENTOS COM CONTADOR DE VOLTAS
    IF v_has_lap_counter = true THEN
        -- Checkpoint lap_counter: registrar volta
        IF v_checkpoint_type = 'lap_counter' THEN
            -- Split time = tempo da volta
            SELECT checkpoint_time
            INTO v_previous_checkpoint_time
            FROM classifications
            WHERE event_id = NEW.event_id
              AND dorsal_number = NEW.dorsal_number
              AND device_order = NEW.device_order
            ORDER BY checkpoint_time DESC
            LIMIT 1 OFFSET 1; -- Pegar penúltima passagem
            
            IF v_previous_checkpoint_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_previous_checkpoint_time;
            ELSIF v_event_start_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_event_start_time;
            END IF;
        END IF;
        
        -- Meta final: calcular tempo total
        IF v_is_finish THEN
            NEW.total_time := NEW.checkpoint_time - v_event_start_time;
        END IF;
    
    -- 2. EVENTOS MULTI-DISCIPLINARES (Triatlo, Duatlo)
    ELSIF v_event_type IN ('triathlon', 'duathlon') THEN
        -- Metas de atividade (swimming_finish, cycling_finish, running_finish)
        IF v_checkpoint_type LIKE '%_finish' THEN
            -- Split time desde checkpoint anterior
            SELECT checkpoint_time
            INTO v_previous_checkpoint_time
            FROM classifications
            WHERE event_id = NEW.event_id
              AND dorsal_number = NEW.dorsal_number
              AND device_order < NEW.device_order
            ORDER BY device_order DESC
            LIMIT 1;
            
            IF v_previous_checkpoint_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_previous_checkpoint_time;
            ELSIF v_event_start_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_event_start_time;
            END IF;
            
            -- Se for último checkpoint (running_finish geralmente), calcular total
            IF v_is_last_checkpoint OR v_checkpoint_type = 'running_finish' THEN
                NEW.total_time := NEW.checkpoint_time - v_event_start_time;
            END IF;
        END IF;
    
    -- 3. EVENTOS SIMPLES (corrida, ciclismo, etc)
    ELSE
        -- Checkpoints intermediários: apenas split_time
        IF v_checkpoint_type = 'intermediate' OR v_checkpoint_type = 'timing' THEN
            SELECT checkpoint_time
            INTO v_previous_checkpoint_time
            FROM classifications
            WHERE event_id = NEW.event_id
              AND dorsal_number = NEW.dorsal_number
              AND device_order < NEW.device_order
            ORDER BY device_order DESC
            LIMIT 1;
            
            IF v_previous_checkpoint_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_previous_checkpoint_time;
            ELSIF v_event_start_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_event_start_time;
            END IF;
        END IF;
        
        -- Meta final: calcular tempo total
        IF v_is_finish AND v_event_start_time IS NOT NULL THEN
            NEW.total_time := NEW.checkpoint_time - v_event_start_time;
            
            -- Split time também
            SELECT checkpoint_time
            INTO v_previous_checkpoint_time
            FROM classifications
            WHERE event_id = NEW.event_id
              AND dorsal_number = NEW.dorsal_number
              AND device_order < NEW.device_order
            ORDER BY device_order DESC
            LIMIT 1;
            
            IF v_previous_checkpoint_time IS NOT NULL THEN
                NEW.split_time := NEW.checkpoint_time - v_previous_checkpoint_time;
            ELSE
                NEW.split_time := NEW.total_time;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trg_calculate_classification_times ON classifications;
DROP TRIGGER IF EXISTS trg_update_classification_times ON classifications;
DROP TRIGGER IF EXISTS trg_auto_total_time ON classifications;

CREATE TRIGGER trg_calculate_classification_times
    BEFORE INSERT OR UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION calculate_classification_times();

-- Calcular tempos das classificações existentes
UPDATE classifications
SET updated_at = now()
WHERE total_time IS NULL OR split_time IS NULL;

-- Verificar resultado
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    split_time,
    total_time,
    CASE 
        WHEN total_time IS NOT NULL THEN '✅ Total OK'
        ELSE '⚠️ Total NULL'
    END as status_total,
    CASE 
        WHEN split_time IS NOT NULL THEN '✅ Split OK'
        ELSE '⚠️ Split NULL'
    END as status_split
FROM classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY device_order, dorsal_number;

-- Ver na VIEW
SELECT COUNT(*) as total_na_view
FROM event_classifications
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

