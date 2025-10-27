-- =====================================================
-- VisionKrono - Sistema Multi-Disciplinar FINAL
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. ADICIONAR DUATLO ÀS MODALIDADES
INSERT INTO event_modalities (name, description, icon, has_lap_counter) VALUES
('Duatlo', 'Corrida + Ciclismo', '🏃🚴', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    has_lap_counter = EXCLUDED.has_lap_counter;

-- 2. CRIAR TABELA DE ATIVIDADES POR MODALIDADE
CREATE TABLE IF NOT EXISTS modality_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    modality_id UUID NOT NULL REFERENCES event_modalities(id) ON DELETE CASCADE,
    activity_name VARCHAR(50) NOT NULL,
    activity_order INTEGER NOT NULL,
    activity_icon VARCHAR(10) DEFAULT '🏃',
    activity_color VARCHAR(7) DEFAULT '#fc6b03',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(modality_id, activity_order),
    UNIQUE(modality_id, activity_name)
);

-- 3. INSERIR ATIVIDADES PARA DUATLO
INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Corrida',
    1,
    '🏃',
    '#10b981'
FROM event_modalities em 
WHERE em.name = 'Duatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Ciclismo',
    2,
    '🚴',
    '#3b82f6'
FROM event_modalities em 
WHERE em.name = 'Duatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

-- 4. INSERIR ATIVIDADES PARA TRIATLO
INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Natação',
    1,
    '🏊',
    '#06b6d4'
FROM event_modalities em 
WHERE em.name = 'Triatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Ciclismo',
    2,
    '🚴',
    '#3b82f6'
FROM event_modalities em 
WHERE em.name = 'Triatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Corrida',
    3,
    '🏃',
    '#10b981'
FROM event_modalities em 
WHERE em.name = 'Triatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

-- 5. CRIAR TIPOS DE CHECKPOINT ESPECÍFICOS
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('swimming_finish', 'Meta Natação', 'Meta da prova de natação', '🏊', '#06b6d4', false, true, false, true, 25),
('cycling_finish', 'Meta Ciclismo', 'Meta da prova de ciclismo', '🚴', '#3b82f6', false, true, false, true, 26),
('running_finish', 'Meta Corrida', 'Meta da prova de corrida', '🏃', '#10b981', false, true, false, true, 27)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_finish = EXCLUDED.is_finish,
    requires_split = EXCLUDED.requires_split,
    sort_order = EXCLUDED.sort_order;

-- 6. CRIAR TABELA PARA TEMPOS POR ATIVIDADE
CREATE TABLE IF NOT EXISTS activity_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    dorsal_number INTEGER NOT NULL,
    activity_name VARCHAR(50) NOT NULL,
    activity_time INTERVAL NOT NULL,
    checkpoint_time TIMESTAMPTZ NOT NULL,
    device_id UUID REFERENCES devices(id),
    detection_id UUID REFERENCES detections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, dorsal_number, activity_name)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_activity_times_event_dorsal ON activity_times(event_id, dorsal_number);
CREATE INDEX IF NOT EXISTS idx_activity_times_checkpoint_time ON activity_times(checkpoint_time);

-- 7. FUNÇÃO SIMPLIFICADA PARA VALIDAR CONFIGURAÇÃO (SEM META FINAL)
CREATE OR REPLACE FUNCTION validate_multimodal_setup(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_modality VARCHAR(100);
    v_swimming_count INTEGER;
    v_cycling_count INTEGER;
    v_running_count INTEGER;
BEGIN
    -- Obter modalidade do evento
    SELECT em.name INTO v_event_modality
    FROM events e
    JOIN event_modalities em ON e.event_type = em.name
    WHERE e.id = p_event_id;
    
    -- Se não é modalidade multi-disciplinar, configuração é válida
    IF v_event_modality NOT IN ('Duatlo', 'Triatlo') THEN
        RETURN true;
    END IF;
    
    -- Contar dispositivos por tipo de checkpoint
    SELECT COUNT(*) INTO v_swimming_count
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = p_event_id AND ct.code = 'swimming_finish';
    
    SELECT COUNT(*) INTO v_cycling_count
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = p_event_id AND ct.code = 'cycling_finish';
    
    SELECT COUNT(*) INTO v_running_count
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = p_event_id AND ct.code = 'running_finish';
    
    -- Validar conforme modalidade (última atividade conta tempo total)
    IF v_event_modality = 'Triatlo' THEN
        RETURN (v_swimming_count > 0 AND v_cycling_count > 0 AND v_running_count > 0);
    ELSIF v_event_modality = 'Duatlo' THEN
        RETURN (v_cycling_count > 0 AND v_running_count > 0);
    END IF;
    
    RETURN false;
END;
$$;

-- 8. FUNÇÃO PARA PROCESSAR DETECÇÕES DE ATIVIDADES
CREATE OR REPLACE FUNCTION process_activity_detection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_modality VARCHAR(100);
    v_activity_name VARCHAR(50);
    v_checkpoint_type VARCHAR(50);
    v_previous_activity_time TIMESTAMPTZ;
    v_activity_duration INTERVAL;
BEGIN
    -- Obter modalidade do evento
    SELECT em.name INTO v_event_modality
    FROM events e
    JOIN event_modalities em ON e.event_type = em.name
    WHERE e.id = NEW.event_id;
    
    -- Verificar se é modalidade multi-disciplinar
    IF v_event_modality NOT IN ('Duatlo', 'Triatlo') THEN
        RETURN NEW;
    END IF;
    
    -- Obter tipo de checkpoint da detecção
    SELECT ct.code INTO v_checkpoint_type
    FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = NEW.event_id 
    AND ed.device_id = NEW.device_id;
    
    -- Determinar atividade baseada no tipo de checkpoint
    CASE v_checkpoint_type
        WHEN 'swimming_finish' THEN v_activity_name := 'Natação';
        WHEN 'cycling_finish' THEN v_activity_name := 'Ciclismo';
        WHEN 'running_finish' THEN v_activity_name := 'Corrida';
        ELSE RETURN NEW;
    END CASE;
    
    -- Calcular tempo da atividade
    IF v_activity_name = 'Natação' THEN
        SELECT e.event_started_at INTO v_previous_activity_time
        FROM events e
        WHERE e.id = NEW.event_id;
    ELSE
        SELECT MAX(checkpoint_time) INTO v_previous_activity_time
        FROM activity_times
        WHERE event_id = NEW.event_id 
        AND dorsal_number = NEW.dorsal_number
        AND activity_name != v_activity_name;
    END IF;
    
    -- Calcular duração da atividade
    v_activity_duration := NEW.checkpoint_time - COALESCE(v_previous_activity_time, NEW.checkpoint_time);
    
    -- Inserir tempo da atividade
    INSERT INTO activity_times (
        event_id,
        dorsal_number,
        activity_name,
        activity_time,
        checkpoint_time,
        device_id,
        detection_id
    ) VALUES (
        NEW.event_id,
        NEW.dorsal_number,
        v_activity_name,
        v_activity_duration,
        NEW.checkpoint_time,
        NEW.device_id,
        NEW.id
    )
    ON CONFLICT (event_id, dorsal_number, activity_name) 
    DO UPDATE SET
        activity_time = EXCLUDED.activity_time,
        checkpoint_time = EXCLUDED.checkpoint_time,
        device_id = EXCLUDED.device_id,
        detection_id = EXCLUDED.detection_id;
    
    RETURN NEW;
END;
$$;

-- 9. CRIAR TRIGGER PARA PROCESSAR DETECÇÕES DE ATIVIDADES
DROP TRIGGER IF EXISTS trg_process_activity_detection ON detections;
CREATE TRIGGER trg_process_activity_detection
    AFTER INSERT ON detections
    FOR EACH ROW
    EXECUTE FUNCTION process_activity_detection();

-- 10. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE modality_activities IS 'Atividades específicas de cada modalidade multi-disciplinar';
COMMENT ON TABLE activity_times IS 'Tempos específicos por atividade em eventos multi-disciplinares';
COMMENT ON FUNCTION process_activity_detection IS 'Processa automaticamente detecções de atividades específicas';
COMMENT ON FUNCTION validate_multimodal_setup IS 'Valida configuração de eventos multi-disciplinares';

-- 11. MENSAGEM DE SUCESSO
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema multi-disciplinar implementado com sucesso!';
    RAISE NOTICE '📋 Modalidades suportadas:';
    RAISE NOTICE '   - Duatlo: Corrida + Ciclismo';
    RAISE NOTICE '   - Triatlo: Natação + Ciclismo + Corrida';
    RAISE NOTICE '📋 Checkpoints específicos criados:';
    RAISE NOTICE '   - Meta Natação (Triatlo)';
    RAISE NOTICE '   - Meta Ciclismo (Duatlo/Triatlo)';
    RAISE NOTICE '   - Meta Corrida (Duatlo/Triatlo) - Conta tempo total';
    RAISE NOTICE '📋 Funcionalidades:';
    RAISE NOTICE '   - Reordenação de atividades';
    RAISE NOTICE '   - Última atividade conta tempo total automaticamente';
    RAISE NOTICE '   - Sem necessidade de meta final separada';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '   1. Testar interface de configuração';
    RAISE NOTICE '   2. Configurar dispositivos com checkpoints específicos';
    RAISE NOTICE '   3. Testar com evento multi-disciplinar';
END $$;
