-- Corrigir trigger de email de classificações
-- O trigger está a tentar acessar participant_id que não existe na tabela classifications

-- 1. Remover trigger problemático
DROP TRIGGER IF EXISTS trigger_classification_notification_email ON classifications;

-- 2. Recriar função sem participant_id
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
                'checkpoint_order', NEW.device_order,
                'checkpoint_time', NEW.checkpoint_time
            )
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar trigger
CREATE TRIGGER trigger_classification_notification_email
    AFTER INSERT OR UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_classification_email();

-- 4. Verificar se foi criado
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_classification_notification_email';


