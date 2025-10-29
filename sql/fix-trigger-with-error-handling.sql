-- Trigger com tratamento de erros robusto

CREATE OR REPLACE FUNCTION calculate_classification_times()
RETURNS TRIGGER AS $$
DECLARE
    v_event_start_time TIMESTAMPTZ;
    v_checkpoint_type VARCHAR(50);
    v_is_finish BOOLEAN;
BEGIN
    -- Logging básico
    RAISE NOTICE 'Trigger executando para dorsal % no device_order %', NEW.dorsal_number, NEW.device_order;
    
    -- Buscar event_started_at
    BEGIN
        SELECT event_started_at INTO v_event_start_time 
        FROM events 
        WHERE id = NEW.event_id;
        
        RAISE NOTICE 'Event started_at: %', v_event_start_time;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERRO ao buscar event: % %', SQLSTATE, SQLERRM;
            RETURN NEW; -- Retornar sem falhar
    END;
    
    -- Buscar checkpoint_type
    BEGIN
        SELECT checkpoint_type INTO v_checkpoint_type
        FROM event_devices
        WHERE event_id = NEW.event_id
        AND checkpoint_order = NEW.device_order
        LIMIT 1;
        
        RAISE NOTICE 'Checkpoint type: %', v_checkpoint_type;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ERRO ao buscar checkpoint_type: % %', SQLSTATE, SQLERRM;
            v_checkpoint_type := 'finish'; -- Fallback
    END;
    
    -- Verificar se é finish
    BEGIN
        SELECT is_finish INTO v_is_finish
        FROM checkpoint_types
        WHERE code = v_checkpoint_type;
        
        IF v_is_finish IS NULL THEN
            v_is_finish := (v_checkpoint_type IN ('finish', 'final', 'meta'));
        END IF;
        
        RAISE NOTICE 'Is finish: %', v_is_finish;
    EXCEPTION
        WHEN OTHERS THEN
            v_is_finish := true; -- Assumir que é finish por padrão
    END;
    
    -- CALCULAR TEMPOS
    IF v_is_finish AND v_event_start_time IS NOT NULL THEN
        BEGIN
            NEW.total_time := NEW.checkpoint_time - v_event_start_time;
            NEW.split_time := NEW.total_time; -- Para simplificar
            
            RAISE NOTICE 'Total time calculado: %', NEW.total_time;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'ERRO ao calcular tempos: % %', SQLSTATE, SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Não calculando: is_finish=% event_started_at=%', v_is_finish, v_event_start_time;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERRO GERAL no trigger: % %', SQLSTATE, SQLERRM;
        RETURN NEW; -- Sempre retornar para não bloquear INSERT
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_calculate_classification_times ON classifications;
CREATE TRIGGER trg_calculate_classification_times
    BEFORE INSERT OR UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION calculate_classification_times();

-- Verificar se está ativo
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    CASE tgenabled
        WHEN 'O' THEN '✅ Habilitado'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status
FROM pg_trigger t
JOIN information_schema.triggers i ON t.tgname = i.trigger_name
WHERE i.event_object_table = 'classifications'
AND t.tgname = 'trg_calculate_classification_times';


