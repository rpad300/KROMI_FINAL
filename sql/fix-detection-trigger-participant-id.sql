-- ==========================================
-- CORREÇÃO: Trigger de detections usa campo inexistente
-- ==========================================
-- Problema: trigger_detection_email() tentava usar NEW.participant_id
-- Solução: Buscar participante usando NEW.number + NEW.event_id
-- 
-- ⚠️ IMPORTANTE: Não altera estruturas de tabelas
-- - Usa campos existentes: detections.number e participants.dorsal_number
-- - 'bib_number' no JSON é apenas output, não afeta BD
-- ==========================================

-- Corrigir função trigger_detection_email
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

-- ==========================================
-- CORREÇÃO ADICIONAL: trigger_classification_email
-- ==========================================
-- A tabela classifications também não tem participant_id, usa dorsal_number
-- ==========================================

-- Corrigir função trigger_classification_email
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
        PERFORM pg_notify(
            'email_trigger',
            json_build_object(
                'trigger', 'classification',
                'event_id', NEW.event_id,
                'dorsal_number', NEW.dorsal_number,
                'participant_data', json_build_object(
                    'name', participant_record.full_name,
                    'email', participant_record.email,
                    'bib_number', participant_record.dorsal_number,  -- Apenas nome do campo JSON
                    'category', participant_record.category
                )
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se as triggers existem e estão ativas
SELECT 
    '✅ Funções de triggers corrigidas!' as status,
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger
WHERE tgname IN ('trigger_detection_notification_email', 'trigger_classification_notification_email');

