-- Recriar trigger com logging para debug

CREATE OR REPLACE FUNCTION update_classification_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_start_time TIMESTAMPTZ;
    v_previous_checkpoint_time TIMESTAMPTZ;
BEGIN
    -- Logging
    RAISE NOTICE 'Trigger executando para dorsal % no evento %', NEW.dorsal_number, NEW.event_id;
    
    -- Buscar o tempo de início do evento
    SELECT event_started_at INTO v_event_start_time 
    FROM events 
    WHERE id = NEW.event_id;
    
    RAISE NOTICE 'Event start time: %', v_event_start_time;
    RAISE NOTICE 'Checkpoint time: %', NEW.checkpoint_time;

    -- Calcular total_time se o evento foi iniciado
    IF v_event_start_time IS NOT NULL THEN
        NEW.total_time := NEW.checkpoint_time - v_event_start_time;
        RAISE NOTICE 'Total time calculado: %', NEW.total_time;
    ELSE
        RAISE NOTICE 'Event start time é NULL, não calculando total_time';
    END IF;

    -- Calcular split_time (tempo desde o checkpoint anterior)
    SELECT checkpoint_time
    INTO v_previous_checkpoint_time
    FROM classifications
    WHERE event_id = NEW.event_id
      AND dorsal_number = NEW.dorsal_number
      AND device_order < NEW.device_order
    ORDER BY device_order DESC
    LIMIT 1;

    -- Se há checkpoint anterior, calcular split_time
    IF v_previous_checkpoint_time IS NOT NULL THEN
        NEW.split_time := NEW.checkpoint_time - v_previous_checkpoint_time;
        RAISE NOTICE 'Split time calculado: %', NEW.split_time;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERRO no trigger: % - %', SQLSTATE, SQLERRM;
        RETURN NEW; -- Retornar mesmo com erro para não bloquear INSERT
END;
$$;

-- Verificar se evento tem start time
SELECT 
    id,
    name,
    event_started_at,
    CASE 
        WHEN event_started_at IS NOT NULL THEN '✅ Tem start time'
        ELSE '❌ start time NULL'
    END as status
FROM events
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

