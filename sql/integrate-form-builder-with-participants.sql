-- =====================================================
-- VisionKrono - Integração Form Builder com Participants
-- Adicionar campos de pagamento e estado de inscrição
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. ADICIONAR CAMPOS DE PAGAMENTO E ESTADO AOS PARTICIPANTS
DO $$ 
BEGIN
    -- Adicionar registration_status (pending, paid, free, cancelled)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'registration_status'
    ) THEN
        ALTER TABLE participants ADD COLUMN registration_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Coluna registration_status adicionada!';
    END IF;
    
    -- Adicionar payment_status (pending, paid, failed, refunded)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE participants ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Coluna payment_status adicionada!';
    END IF;
    
    -- Adicionar is_free (inscrição gratuita/patrocinada)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'is_free'
    ) THEN
        ALTER TABLE participants ADD COLUMN is_free BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna is_free adicionada!';
    END IF;
    
    -- Adicionar payment_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE participants ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Coluna payment_amount adicionada!';
    END IF;
    
    -- Adicionar payment_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE participants ADD COLUMN payment_date TIMESTAMPTZ;
        RAISE NOTICE 'Coluna payment_date adicionada!';
    END IF;
    
    -- Adicionar payment_id (ID do pagamento externo - Stripe, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE participants ADD COLUMN payment_id VARCHAR(200);
        RAISE NOTICE 'Coluna payment_id adicionada!';
    END IF;
    
    -- Adicionar form_submission_id (ligação com form_submissions)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'form_submission_id'
    ) THEN
        ALTER TABLE participants ADD COLUMN form_submission_id UUID REFERENCES form_submissions(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna form_submission_id adicionada!';
    END IF;
    
    -- Adicionar notes (notas do organizador)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'participants' AND column_name = 'notes'
    ) THEN
        ALTER TABLE participants ADD COLUMN notes TEXT;
        RAISE NOTICE 'Coluna notes adicionada!';
    END IF;
END $$;

-- 2. ADICIONAR CONSTRAINTS E CHECK CONSTRAINTS
DO $$
BEGIN
    -- Constraint para registration_status
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'participants_registration_status_check'
    ) THEN
        ALTER TABLE participants ADD CONSTRAINT participants_registration_status_check 
        CHECK (registration_status IN ('pending', 'paid', 'free', 'cancelled', 'refunded'));
        RAISE NOTICE 'Constraint registration_status_check adicionada!';
    END IF;
    
    -- Constraint para payment_status
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'participants_payment_status_check'
    ) THEN
        ALTER TABLE participants ADD CONSTRAINT participants_payment_status_check 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'));
        RAISE NOTICE 'Constraint payment_status_check adicionada!';
    END IF;
END $$;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_participants_registration_status ON participants(registration_status);
CREATE INDEX IF NOT EXISTS idx_participants_payment_status ON participants(payment_status);
CREATE INDEX IF NOT EXISTS idx_participants_is_free ON participants(is_free);
CREATE INDEX IF NOT EXISTS idx_participants_form_submission ON participants(form_submission_id);

-- 4. COMENTÁRIOS NAS COLUNAS
COMMENT ON COLUMN participants.registration_status IS 'Estado da inscrição: pending=pending payment, paid=confirmed, free=sponsored/free, cancelled, refunded';
COMMENT ON COLUMN participants.payment_status IS 'Estado do pagamento: pending, paid, failed, refunded, cancelled';
COMMENT ON COLUMN participants.is_free IS 'True se a inscrição é gratuita/patrocinada (não requer pagamento)';
COMMENT ON COLUMN participants.payment_amount IS 'Valor pago pela inscrição';
COMMENT ON COLUMN participants.payment_date IS 'Data do pagamento';
COMMENT ON COLUMN participants.payment_id IS 'ID externo do pagamento (Stripe, PayPal, etc.)';
COMMENT ON COLUMN participants.form_submission_id IS 'Referência para a submissão do formulário de inscrição';
COMMENT ON COLUMN participants.notes IS 'Notas adicionais do organizador';

-- 5. FUNÇÃO: Atualizar estado de inscrição baseado no pagamento
CREATE OR REPLACE FUNCTION update_participant_registration_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se is_free = true, registration_status = 'paid'
    IF NEW.is_free = true THEN
        NEW.registration_status := 'paid';
    -- Se pagamento foi confirmado, registration_status = 'paid'
    ELSIF NEW.payment_status = 'paid' THEN
        NEW.registration_status := 'paid';
    -- Se pagamento falhou ou foi cancelado
    ELSIF NEW.payment_status IN ('failed', 'cancelled') THEN
        NEW.registration_status := 'pending';
    -- Se foi reembolsado
    ELSIF NEW.payment_status = 'refunded' THEN
        NEW.registration_status := 'refunded';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER: Auto-atualizar registration_status
DROP TRIGGER IF EXISTS trigger_update_participant_registration_status ON participants;
CREATE TRIGGER trigger_update_participant_registration_status
    BEFORE INSERT OR UPDATE OF payment_status, is_free ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_registration_status();

-- 7. FUNÇÃO: Criar participante a partir de form_submission
CREATE OR REPLACE FUNCTION create_participant_from_submission(
    p_form_submission_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_dorsal_number INTEGER;
    v_full_name TEXT;
    v_birth_date DATE;
    v_gender VARCHAR(10);
    v_email TEXT;
    v_phone TEXT;
    v_submission_data JSONB;
    v_payment_status VARCHAR(50);
    v_participant_id UUID;
BEGIN
    -- Buscar dados da submissão
    SELECT 
        s.event_id,
        s.submission_data,
        s.payment_status
    INTO v_event_id, v_submission_data, v_payment_status
    FROM form_submissions s
    WHERE s.id = p_form_submission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Form submission não encontrada: %', p_form_submission_id;
    END IF;
    
    -- Extrair campos da submissão
    v_full_name := v_submission_data->>'full_name';
    v_email := v_submission_data->>'email';
    v_phone := v_submission_data->>'phone';
    v_birth_date := (v_submission_data->>'birth_date')::DATE;
    v_gender := v_submission_data->>'gender';
    
    -- Gerar próximo dorsal
    SELECT COALESCE(MAX(dorsal_number), 0) + 1 INTO v_dorsal_number
    FROM participants
    WHERE event_id = v_event_id;
    
    -- Criar participante (estado será definido pelo trigger baseado no payment_status)
    INSERT INTO participants (
        event_id,
        dorsal_number,
        full_name,
        birth_date,
        gender,
        email,
        phone,
        form_submission_id,
        payment_status,
        created_at
    )
    VALUES (
        v_event_id,
        v_dorsal_number,
        v_full_name,
        v_birth_date,
        v_gender,
        v_email,
        v_phone,
        p_form_submission_id,
        COALESCE(v_payment_status, 'pending'),
        NOW()
    )
    RETURNING id INTO v_participant_id;
    
    RETURN v_participant_id;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNÇÃO: Verificar se participante qualifica para classificações
-- Apenas participantes com registration_status = 'paid' (pagos ou gratuitos) qualificam
CREATE OR REPLACE FUNCTION can_participate_in_classifications(p_participant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    SELECT registration_status INTO v_status
    FROM participants
    WHERE id = p_participant_id;
    
    -- Apenas 'paid' qualifica (inclui is_free = true)
    RETURN v_status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- 9. ATUALIZAR PARTICIPANTES EXISTENTES
-- Se já existem participantes, configurar valores padrão
UPDATE participants
SET 
    registration_status = CASE 
        WHEN registration_status IS NULL THEN 'paid'  -- Assumir que existentes já estão pagos
        ELSE registration_status
    END,
    payment_status = CASE 
        WHEN payment_status IS NULL THEN 'paid'
        ELSE payment_status
    END,
    is_free = false
WHERE registration_status IS NULL OR payment_status IS NULL OR is_free IS NULL;

-- 10. VIEW: Apenas participantes qualificados para classificações
CREATE OR REPLACE VIEW participants_qualified AS
SELECT 
    p.*,
    CASE 
        WHEN p.registration_status = 'paid' THEN true
        ELSE false
    END AS is_qualified
FROM participants p
WHERE p.registration_status = 'paid';

COMMENT ON VIEW participants_qualified IS 'Apenas participantes com inscrição paga ou gratuita, qualificados para classificações';

-- 11. POLÍTICA RLS: Organizadores podem atualizar estados de pagamento
DROP POLICY IF EXISTS "Organizers can update payment status" ON participants;
CREATE POLICY "Organizers can update payment status" 
ON participants 
FOR UPDATE 
USING (
    -- Admin pode tudo
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Organizador do evento pode atualizar
    EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = participants.event_id
        AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT OR e.manager_id = auth.uid())
    )
)
WITH CHECK (
    -- Mesmas condições para o CHECK
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = participants.event_id
        AND (e.organizer_id = auth.uid() OR e.created_by = auth.uid()::TEXT OR e.manager_id = auth.uid())
    )
);

-- 12. VALIDAÇÃO: Garantir que is_free=false se payment_status=paid E payment_amount > 0
CREATE OR REPLACE FUNCTION validate_payment_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Se payment_status = paid e payment_amount > 0, is_free deve ser false
    IF NEW.payment_status = 'paid' AND NEW.payment_amount > 0 AND NEW.is_free = true THEN
        RAISE EXCEPTION 'Inconsistência: pagamento pago mas marcado como gratuito';
    END IF;
    
    -- Se is_free = true, payment_amount deve ser 0
    IF NEW.is_free = true AND NEW.payment_amount > 0 THEN
        RAISE EXCEPTION 'Inconsistência: inscrição gratuita mas com valor pago';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_payment_consistency ON participants;
CREATE TRIGGER trigger_validate_payment_consistency
    BEFORE INSERT OR UPDATE OF payment_status, is_free, payment_amount ON participants
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_consistency();

-- =====================================================
-- ✅ INTEGRAÇÃO COMPLETA!
-- =====================================================
SELECT '✅ Integração Form Builder com Participants concluída!' AS status,
       NOW() AS created_at;

-- 13. VERIFICAR ESTRUTURA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'participants'
ORDER BY ordinal_position;

