-- =====================================================
-- VisionKrono - Sistema Multi-Disciplinar CORRIGIDO
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
    activity_name VARCHAR(50) NOT NULL, -- 'Natação', 'Ciclismo', 'Corrida'
    activity_order INTEGER NOT NULL, -- Ordem da atividade (1, 2, 3...)
    activity_icon VARCHAR(10) DEFAULT '🏃', -- Ícone da atividade
    activity_color VARCHAR(7) DEFAULT '#fc6b03', -- Cor da atividade
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(modality_id, activity_order),
    UNIQUE(modality_id, activity_name)
);

-- 3. INSERIR ATIVIDADES PARA MODALIDADES EXISTENTES
-- Duatlo: Corrida + Ciclismo
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

-- Triatlo: Natação + Ciclismo + Corrida
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

-- 4. CRIAR TIPOS DE CHECKPOINT ESPECÍFICOS POR MODALIDADE
-- Meta de Natação (apenas para Triatlo)
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('swimming_finish', 'Meta Natação', 'Meta da prova de natação', '🏊', '#06b6d4', false, true, false, true, 25)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_finish = EXCLUDED.is_finish,
    requires_split = EXCLUDED.requires_split,
    sort_order = EXCLUDED.sort_order;

-- Meta de Ciclismo (para Duatlo e Triatlo)
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('cycling_finish', 'Meta Ciclismo', 'Meta da prova de ciclismo', '🚴', '#3b82f6', false, true, false, true, 26)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_finish = EXCLUDED.is_finish,
    requires_split = EXCLUDED.requires_split,
    sort_order = EXCLUDED.sort_order;

-- Meta de Corrida (para Duatlo e Triatlo)
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('running_finish', 'Meta Corrida', 'Meta da prova de corrida', '🏃', '#10b981', false, true, false, true, 27)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_finish = EXCLUDED.is_finish,
    requires_split = EXCLUDED.requires_split,
    sort_order = EXCLUDED.sort_order;

-- 5. CRIAR TABELA PARA TEMPOS POR ATIVIDADE
CREATE TABLE IF NOT EXISTS activity_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    dorsal_number INTEGER NOT NULL,
    activity_name VARCHAR(50) NOT NULL, -- 'Natação', 'Ciclismo', 'Corrida'
    activity_time INTERVAL NOT NULL, -- Tempo da atividade específica
    checkpoint_time TIMESTAMPTZ NOT NULL, -- Momento da passagem
    device_id UUID REFERENCES devices(id),
    detection_id UUID REFERENCES detections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, dorsal_number, activity_name)
);

-- Criar índices separadamente
CREATE INDEX IF NOT EXISTS idx_activity_times_event_dorsal ON activity_times(event_id, dorsal_number);
CREATE INDEX IF NOT EXISTS idx_activity_times_checkpoint_time ON activity_times(checkpoint_time);

-- 6. FUNÇÃO PARA PROCESSAR DETECÇÕES DE ATIVIDADES ESPECÍFICAS
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
        WHEN 'finish' THEN v_activity_name := 'Final';
        ELSE RETURN NEW; -- Não é uma meta de atividade específica
    END CASE;
    
    -- Calcular tempo da atividade
    IF v_activity_name = 'Natação' THEN
        -- Tempo de natação = tempo desde início do evento
        SELECT e.event_started_at INTO v_previous_activity_time
        FROM events e
        WHERE e.id = NEW.event_id;
    ELSE
        -- Tempo de ciclismo/corrida = tempo desde última atividade
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

-- 7. CRIAR TRIGGER PARA PROCESSAR DETECÇÕES DE ATIVIDADES
DROP TRIGGER IF EXISTS trg_process_activity_detection ON detections;
CREATE TRIGGER trg_process_activity_detection
    AFTER INSERT ON detections
    FOR EACH ROW
    EXECUTE FUNCTION process_activity_detection();

-- 8. FUNÇÃO PARA VALIDAR CONFIGURAÇÃO DE MODALIDADES MULTI-DISCIPLINARES
CREATE OR REPLACE FUNCTION validate_multimodal_setup(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_modality VARCHAR(100);
    v_required_checkpoints TEXT[];
    v_missing_checkpoints TEXT[];
    v_checkpoint_count INTEGER;
    v_checkpoint TEXT;
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
    
    -- Definir checkpoints necessários por modalidade
    IF v_event_modality = 'Duatlo' THEN
        v_required_checkpoints := ARRAY['running_finish', 'cycling_finish', 'finish'];
    ELSIF v_event_modality = 'Triatlo' THEN
        v_required_checkpoints := ARRAY['swimming_finish', 'cycling_finish', 'running_finish', 'finish'];
    END IF;
    
    -- Verificar se todos os checkpoints necessários estão configurados
    FOREACH v_checkpoint IN ARRAY v_required_checkpoints
    LOOP
        SELECT COUNT(*) INTO v_checkpoint_count
        FROM event_devices ed
        JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
        WHERE ed.event_id = p_event_id 
        AND ct.code = v_checkpoint
        AND ct.is_active = true;
        
        IF v_checkpoint_count = 0 THEN
            v_missing_checkpoints := array_append(v_missing_checkpoints, v_checkpoint);
        END IF;
    END LOOP;
    
    -- Se há checkpoints em falta, configuração é inválida
    RETURN array_length(v_missing_checkpoints, 1) IS NULL;
END;
$$;

-- 9. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE modality_activities IS 'Atividades específicas de cada modalidade multi-disciplinar';
COMMENT ON TABLE activity_times IS 'Tempos específicos por atividade em eventos multi-disciplinares';
COMMENT ON FUNCTION process_activity_detection IS 'Processa automaticamente detecções de atividades específicas';
COMMENT ON FUNCTION validate_multimodal_setup IS 'Valida configuração de eventos multi-disciplinares';

-- 10. MENSAGEM DE SUCESSO
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema multi-disciplinar implementado com sucesso!';
    RAISE NOTICE '📋 Modalidades suportadas:';
    RAISE NOTICE '   - Duatlo: Corrida + Ciclismo';
    RAISE NOTICE '   - Triatlo: Natação + Ciclismo + Corrida';
    RAISE NOTICE '📋 Checkpoints específicos criados:';
    RAISE NOTICE '   - Meta Natação (Triatlo)';
    RAISE NOTICE '   - Meta Ciclismo (Duatlo/Triatlo)';
    RAISE NOTICE '   - Meta Corrida (Duatlo/Triatlo)';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '   1. Atualizar interface de configuração';
    RAISE NOTICE '   2. Modificar páginas de classificações';
    RAISE NOTICE '   3. Testar com evento multi-disciplinar';
END $$;
