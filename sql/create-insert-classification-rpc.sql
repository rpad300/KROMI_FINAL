-- RPC para inserir classificação COM triggers garantidos

CREATE OR REPLACE FUNCTION insert_classification_with_times(
    p_event_id UUID,
    p_dorsal_number INTEGER,
    p_device_order INTEGER,
    p_checkpoint_time TIMESTAMPTZ,
    p_detection_id UUID
)
RETURNS TABLE (
    id UUID,
    total_time INTERVAL,
    split_time INTERVAL,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_classification_id UUID;
    v_total_time INTERVAL;
    v_split_time INTERVAL;
    v_event_start_time TIMESTAMPTZ;
    v_checkpoint_type TEXT;
    v_is_finish BOOLEAN;
BEGIN
    -- Buscar dados do evento
    SELECT event_started_at INTO v_event_start_time
    FROM events
    WHERE events.id = p_event_id;
    
    -- Buscar tipo de checkpoint
    SELECT checkpoint_type INTO v_checkpoint_type
    FROM event_devices
    WHERE event_devices.event_id = p_event_id
    AND checkpoint_order = p_device_order
    LIMIT 1;
    
    -- Verificar se é finish
    SELECT is_finish INTO v_is_finish
    FROM checkpoint_types
    WHERE code = v_checkpoint_type;
    
    IF v_is_finish IS NULL THEN
        v_is_finish := (v_checkpoint_type IN ('finish', 'final', 'meta'));
    END IF;
    
    -- Calcular total_time (se for finish)
    IF v_is_finish AND v_event_start_time IS NOT NULL THEN
        v_total_time := p_checkpoint_time - v_event_start_time;
        v_split_time := v_total_time;
    END IF;
    
    -- Inserir classificação
    INSERT INTO classifications (
        event_id,
        dorsal_number,
        device_order,
        checkpoint_time,
        detection_id,
        total_time,
        split_time
    ) VALUES (
        p_event_id,
        p_dorsal_number,
        p_device_order,
        p_checkpoint_time,
        p_detection_id,
        v_total_time,
        v_split_time
    ) RETURNING 
        classifications.id,
        classifications.total_time,
        classifications.split_time,
        classifications.created_at
    INTO 
        v_classification_id,
        v_total_time,
        v_split_time,
        created_at;
    
    -- Retornar dados
    RETURN QUERY SELECT 
        v_classification_id,
        v_total_time,
        v_split_time,
        created_at;
END;
$$;

-- Testar a função
SELECT * FROM insert_classification_with_times(
    'a6301479-56c8-4269-a42d-aa8a7650a575',
    888,  -- Dorsal de teste
    1,
    NOW(),
    NULL
);

