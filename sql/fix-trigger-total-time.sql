-- Script para corrigir e recriar o trigger de total_time
-- Execute este script no Supabase SQL Editor

-- 1. Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_update_classification_times ON classifications;

-- 2. Recriar função de trigger
CREATE OR REPLACE FUNCTION update_classification_times()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_start_time TIMESTAMPTZ;
    v_previous_checkpoint_time TIMESTAMPTZ;
BEGIN
    -- Buscar o tempo de início do evento
    SELECT event_started_at INTO v_event_start_time 
    FROM events 
    WHERE id = NEW.event_id;

    -- Calcular total_time se o evento foi iniciado
    IF v_event_start_time IS NOT NULL THEN
        NEW.total_time := NEW.checkpoint_time - v_event_start_time;
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
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Recriar trigger
CREATE TRIGGER trg_update_classification_times
BEFORE INSERT OR UPDATE ON classifications
FOR EACH ROW EXECUTE FUNCTION update_classification_times();

-- 4. Testar o trigger com uma atualização
UPDATE classifications 
SET checkpoint_time = checkpoint_time  -- Força uma atualização para testar o trigger
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL;

-- 5. Verificar se o trigger funcionou
SELECT 'VERIFICAÇÃO DO TRIGGER:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    split_time
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;
