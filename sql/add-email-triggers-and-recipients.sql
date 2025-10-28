-- ==========================================
-- Adicionar Triggers e Destinatários aos Templates
-- ==========================================
-- Este script adiciona colunas para configurar:
-- 1. Quando o email é enviado (trigger)
-- 2. Para quem o email é enviado (recipients)
-- ==========================================

-- Adicionar colunas à tabela email_templates
DO $$ 
BEGIN
    -- Coluna para definir quando o email é enviado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'send_trigger'
    ) THEN
        ALTER TABLE email_templates ADD COLUMN send_trigger TEXT;
        RAISE NOTICE '✅ Coluna send_trigger adicionada';
    END IF;
    
    -- Coluna para configurações do trigger (ex: dias antes/depois, hora específica)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'trigger_config'
    ) THEN
        ALTER TABLE email_templates ADD COLUMN trigger_config JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Coluna trigger_config adicionada';
    END IF;
    
    -- Coluna para definir destinatários
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'recipient_type'
    ) THEN
        ALTER TABLE email_templates ADD COLUMN recipient_type TEXT;
        RAISE NOTICE '✅ Coluna recipient_type adicionada';
    END IF;
    
    -- Coluna para configurações de destinatários (ex: filtros, emails específicos)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'email_templates' 
        AND column_name = 'recipient_config'
    ) THEN
        ALTER TABLE email_templates ADD COLUMN recipient_config JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Coluna recipient_config adicionada';
    END IF;
END $$;

-- Adicionar constraints para validação
DO $$
BEGIN
    -- Constraint para send_trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_templates_send_trigger_check'
    ) THEN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_send_trigger_check 
        CHECK (send_trigger IS NULL OR send_trigger IN (
            'manual',              -- Envio manual apenas
            'registration',        -- Na inscrição
            'event_start',         -- No início do evento
            'event_end',           -- No fim do evento
            'checkpoint',          -- Ao passar por checkpoint
            'finish',              -- Ao terminar a prova
            'classification',      -- Após classificação final
            'day_before',          -- 1 dia antes do evento
            'days_before',         -- X dias antes (configurável)
            'day_after',           -- 1 dia depois do evento
            'days_after',          -- X dias depois (configurável)
            'scheduled'            -- Agendado (data/hora específica)
        ));
        RAISE NOTICE '✅ Constraint send_trigger adicionada';
    END IF;
    
    -- Constraint para recipient_type
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_templates_recipient_type_check'
    ) THEN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_recipient_type_check 
        CHECK (recipient_type IS NULL OR recipient_type IN (
            'all_participants',     -- Todos os participantes do evento
            'specific_category',    -- Participantes de categoria específica
            'specific_participants',-- Participantes específicos
            'specific_emails',      -- Emails específicos
            'organizer',            -- Apenas organizador
            'checkpoint_participants' -- Participantes que passaram por checkpoint específico
        ));
        RAISE NOTICE '✅ Constraint recipient_type adicionada';
    END IF;
END $$;

-- Comentários
COMMENT ON COLUMN email_templates.send_trigger IS 'Define quando o email é enviado (registration, event_start, checkpoint, etc.)';
COMMENT ON COLUMN email_templates.trigger_config IS 'Configurações do trigger: {"days": 3, "time": "09:00", "checkpoint_id": "uuid"}';
COMMENT ON COLUMN email_templates.recipient_type IS 'Define para quem o email é enviado (all_participants, specific_category, etc.)';
COMMENT ON COLUMN email_templates.recipient_config IS 'Configurações de destinatários: {"category": "Masculino 30-39", "emails": ["email@example.com"]}';

-- Criar tabela para agendamento de emails
CREATE TABLE IF NOT EXISTS email_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'partially_sent')),
    recipient_filters JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE email_schedule IS 'Agendamento de emails para envio automático';
COMMENT ON COLUMN email_schedule.scheduled_for IS 'Data/hora agendada para envio';
COMMENT ON COLUMN email_schedule.recipient_filters IS 'Filtros para selecionar destinatários';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_schedule_template ON email_schedule(template_id);
CREATE INDEX IF NOT EXISTS idx_email_schedule_event ON email_schedule(event_id);
CREATE INDEX IF NOT EXISTS idx_email_schedule_status ON email_schedule(status);
CREATE INDEX IF NOT EXISTS idx_email_schedule_scheduled_for ON email_schedule(scheduled_for);

-- RLS para email_schedule
ALTER TABLE email_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_schedule_policy" ON email_schedule;
CREATE POLICY "email_schedule_policy" ON email_schedule
    FOR ALL USING (true) WITH CHECK (true);

-- Verificação
SELECT 
    '✅ Sistema de triggers e destinatários configurado!' as status,
    COUNT(*) FILTER (WHERE send_trigger IS NOT NULL) as templates_with_trigger,
    COUNT(*) FILTER (WHERE recipient_type IS NOT NULL) as templates_with_recipients
FROM email_templates;

