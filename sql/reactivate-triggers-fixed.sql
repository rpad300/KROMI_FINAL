-- Reativar triggers corrigidos em detections e classifications

-- 1. Desabilitar triggers antigos
ALTER TABLE detections DISABLE TRIGGER USER;
ALTER TABLE classifications DISABLE TRIGGER USER;

-- 2. Corrigir função trigger_classification_email (device_order)
CREATE OR REPLACE FUNCTION trigger_classification_email()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Buscar dados do participante pelo dorsal_number
    SELECT p.*
    INTO participant_record
    FROM participants p
    WHERE p.dorsal_number = NEW.dorsal_number
    AND p.event_id = NEW.event_id;
    
    -- Notificar aplicação
    PERFORM pg_notify(
        'email_trigger',
        json_build_object(
            'trigger', 'classification',
            'event_id', NEW.event_id,
            'dorsal_number', NEW.dorsal_number,
            'participant_data', json_build_object(
                'name', COALESCE(participant_record.full_name, 'Participante'),
                'email', COALESCE(participant_record.email, ''),
                'bib_number', NEW.dorsal_number,
                'checkpoint_order', NEW.device_order,  -- Campo correto: device_order
                'checkpoint_time', NEW.checkpoint_time
            )
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Corrigir função trigger_detection_email (se existir)
CREATE OR REPLACE FUNCTION trigger_detection_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar aplicação sobre nova detecção
    PERFORM pg_notify(
        'email_trigger',
        json_build_object(
            'trigger', 'detection',
            'event_id', NEW.event_id,
            'dorsal_number', NEW.number,
            'detection_time', NEW.timestamp
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Garantir que trigger de cálculo de tempos está ativo
ALTER TABLE classifications ENABLE TRIGGER trg_update_classification_times;

-- 5. Reabilitar todos os triggers
ALTER TABLE detections ENABLE TRIGGER USER;
ALTER TABLE classifications ENABLE TRIGGER USER;

-- 5. Verificar se foram reabilitados
SELECT 
    'TRIGGERS EM DETECTIONS:' as info;

SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'O' THEN '✅ Habilitado'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status
FROM pg_trigger
WHERE tgrelid = 'detections'::regclass
AND NOT tgisinternal;

SELECT 
    'TRIGGERS EM CLASSIFICATIONS:' as info;

SELECT 
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'O' THEN '✅ Habilitado'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status
FROM pg_trigger
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal;

