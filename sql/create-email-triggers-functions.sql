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
                'bib_number', NEW.bib_number,
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
    is_finish BOOLEAN;
BEGIN
    -- Buscar dados do participante
    SELECT * INTO participant_record
    FROM participants
    WHERE id = NEW.participant_id;
    
    -- Verificar se é checkpoint final (finish)
    is_finish := (NEW.is_finish = true OR NEW.checkpoint ILIKE '%meta%' OR NEW.checkpoint ILIKE '%finish%');
    
    -- Notificar aplicação
    PERFORM pg_notify(
        'email_trigger',
        json_build_object(
            'trigger', CASE WHEN is_finish THEN 'finish' ELSE 'checkpoint' END,
            'event_id', NEW.event_id,
            'participant_data', json_build_object(
                'name', participant_record.full_name,
                'email', participant_record.email,
                'bib_number', participant_record.bib_number,
                'category', participant_record.category,
                'checkpoint_name', NEW.checkpoint,
                'detection_time', NEW.timestamp,
                'lap_number', NEW.lap_count
            )
        )::text
    );
    
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
    -- Buscar dados do participante
    SELECT p.*, c.final_time, c.overall_position, c.category_position
    INTO participant_record
    FROM participants p
    LEFT JOIN classifications c ON c.participant_id = p.id
    WHERE p.id = NEW.participant_id;
    
    -- Notificar aplicação
    PERFORM pg_notify(
        'email_trigger',
        json_build_object(
            'trigger', 'classification',
            'event_id', NEW.event_id,
            'participant_data', json_build_object(
                'name', participant_record.full_name,
                'email', participant_record.email,
                'bib_number', participant_record.bib_number,
                'category', participant_record.category,
                'total_time', participant_record.final_time,
                'overall_position', participant_record.overall_position,
                'category_position', participant_record.category_position
            )
        )::text
    );
    
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

