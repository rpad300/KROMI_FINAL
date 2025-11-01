-- ==========================================
-- Funções e Triggers para Automação de Emails
-- ==========================================
-- Dispara emails automaticamente baseado em eventos do DB
-- ==========================================

-- Função para disparar email quando participante é criado
CREATE OR REPLACE FUNCTION trigger_registration_email()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url TEXT;
BEGIN
    -- Notificar aplicação via LISTEN/NOTIFY
    PERFORM pg_notify(
        'email_trigger',
        json_build_object(
            'trigger', 'registration',
            'event_id', NEW.event_id,
            'participant_data', json_build_object(
                'name', NEW.full_name,
                'email', NEW.email,
                'bib_number', NEW.dorsal_number,
                'category', NEW.category
            )
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela participants
DROP TRIGGER IF EXISTS trigger_participant_registration_email ON participants;
CREATE TRIGGER trigger_participant_registration_email
    AFTER INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registration_email();

-- Função para disparar email quando deteção é criada (checkpoint/finish)
CREATE OR REPLACE FUNCTION trigger_detection_email()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Buscar dados do participante usando dorsal number e event_id
    -- (A tabela detections não tem participant_id, usa number + event_id)
    SELECT * INTO participant_record
    FROM participants
    WHERE dorsal_number = NEW.number
      AND event_id = NEW.event_id
    LIMIT 1;
    
    -- Se encontrou participante, enviar notificação
    IF participant_record IS NOT NULL THEN
        -- Notificar aplicação
        PERFORM pg_notify(
            'email_trigger',
            json_build_object(
                'trigger', 'detection',
                'event_id', NEW.event_id,
                'dorsal_number', NEW.number,
                'participant_data', json_build_object(
                    'name', participant_record.full_name,
                    'email', participant_record.email,
                    'bib_number', participant_record.dorsal_number,
                    'category', participant_record.category,
                    'detection_time', NEW.timestamp
                )
            )::text
        );
    END IF;
    -- Se não encontrou participante, simplesmente não enviar email (não é erro)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela detections
DROP TRIGGER IF EXISTS trigger_detection_notification_email ON detections;
CREATE TRIGGER trigger_detection_notification_email
    AFTER INSERT ON detections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_detection_email();

-- Função para disparar email quando classificação é atualizada
CREATE OR REPLACE FUNCTION trigger_classification_email()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- Buscar dados do participante usando dorsal_number e event_id
    -- (A tabela classifications não tem participant_id, usa dorsal_number + event_id)
    SELECT p.*
    INTO participant_record
    FROM participants p
    WHERE p.dorsal_number = NEW.dorsal_number
      AND p.event_id = NEW.event_id
    LIMIT 1;
    
    -- Se encontrou participante, enviar notificação
    IF participant_record IS NOT NULL THEN
        -- Notificar aplicação
        PERFORM pg_notify(
            'email_trigger',
            json_build_object(
                'trigger', 'classification',
                'event_id', NEW.event_id,
                'dorsal_number', NEW.dorsal_number,
                'participant_data', json_build_object(
                    'name', participant_record.full_name,
                    'email', participant_record.email,
                    'bib_number', participant_record.dorsal_number,  -- 'bib_number' é apenas nome do campo JSON, não afeta BD
                    'category', participant_record.category,
                    'checkpoint_order', NEW.device_order,
                    'checkpoint_time', NEW.checkpoint_time,
                    'total_time', NEW.total_time,
                    'split_time', NEW.split_time
                )
            )::text
        );
    END IF;
    -- Se não encontrou participante, simplesmente não enviar email (não é erro)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na tabela classifications
DROP TRIGGER IF EXISTS trigger_classification_notification_email ON classifications;
CREATE TRIGGER trigger_classification_notification_email
    AFTER INSERT OR UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_classification_email();

-- Comentários
COMMENT ON FUNCTION trigger_registration_email() IS 'Dispara notificação para envio de email quando participante se inscreve';
COMMENT ON FUNCTION trigger_detection_email() IS 'Dispara notificação para envio de email quando participante passa por checkpoint';
COMMENT ON FUNCTION trigger_classification_email() IS 'Dispara notificação para envio de email quando classificação é atualizada';

-- Verificação
SELECT 
    '✅ Triggers de email configurados!' as status,
    COUNT(*) FILTER (WHERE tgname LIKE '%email%') as email_triggers
FROM pg_trigger;

