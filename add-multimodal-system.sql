-- =====================================================
-- VisionKrono - Sistema Multi-Disciplinar (Duatlo/Triatlo)
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

-- 9. ATUALIZAR VIEW event_classifications PARA INCLUIR TEMPOS POR ATIVIDADE
DROP VIEW IF EXISTS event_classifications;

CREATE VIEW event_classifications AS
WITH dorsal_best_times AS (
    SELECT 
        event_id,
        dorsal_number,
        MIN(total_time) as best_total_time
    FROM classifications 
    GROUP BY event_id, dorsal_number
),
lap_statistics AS (
    SELECT 
        ld.event_id,
        ld.dorsal_number,
        COUNT(*) as total_laps,
        MIN(ld.lap_time) as fastest_lap,
        MAX(ld.lap_time) as slowest_lap,
        AVG(ld.lap_time) as avg_lap_time,
        AVG(ld.lap_speed_kmh) as avg_lap_speed,
        MAX(ld.lap_speed_kmh) as fastest_lap_speed,
        SUM(ld.lap_time) as total_lap_time
    FROM lap_data ld
    GROUP BY ld.event_id, ld.dorsal_number
),
activity_times_summary AS (
    SELECT 
        at.event_id,
        at.dorsal_number,
        MAX(CASE WHEN at.activity_name = 'Natação' THEN at.activity_time END) as swimming_time,
        MAX(CASE WHEN at.activity_name = 'Ciclismo' THEN at.activity_time END) as cycling_time,
        MAX(CASE WHEN at.activity_name = 'Corrida' THEN at.activity_time END) as running_time,
        MAX(CASE WHEN at.activity_name = 'Final' THEN at.activity_time END) as final_time
    FROM activity_times at
    GROUP BY at.event_id, at.dorsal_number
),
event_stats AS (
    SELECT 
        event_id,
        COUNT(DISTINCT dorsal_number) as total_athletes,
        MIN(best_total_time) as fastest_time
    FROM dorsal_best_times
    GROUP BY event_id
),
ranked_dorsals AS (
    SELECT 
        c.event_id,
        c.dorsal_number,
        c.device_order,
        c.checkpoint_time,
        c.split_time,
        c.total_time,
        c.is_penalty,
        c.penalty_reason,
        c.detection_id,
        dbt.best_total_time,
        -- Dados de voltas (se disponíveis)
        ls.total_laps,
        ls.fastest_lap,
        ls.slowest_lap,
        ls.avg_lap_time,
        ls.avg_lap_speed,
        ls.fastest_lap_speed,
        ls.total_lap_time,
        -- Dados de atividades específicas
        ats.swimming_time,
        ats.cycling_time,
        ats.running_time,
        ats.final_time,
        -- Calcular posição baseada em voltas + tempo (se tem voltas) ou apenas tempo
        ROW_NUMBER() OVER (
            PARTITION BY c.event_id 
            ORDER BY 
                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                COALESCE(ls.total_laps, 0) DESC,
                dbt.best_total_time ASC NULLS LAST
        ) as position,
        -- Calcular tempo para o da frente (gap)
        CASE 
            WHEN ROW_NUMBER() OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    COALESCE(ls.total_laps, 0) DESC,
                    dbt.best_total_time ASC NULLS LAST
            ) = 1 THEN NULL -- Líder não tem gap
            ELSE 
                CASE 
                    WHEN ls.total_laps IS NOT NULL THEN
                        -- Gap baseado em voltas e tempo
                        CASE 
                            WHEN ls.total_laps < LAG(ls.total_laps) OVER (
                                PARTITION BY c.event_id 
                                ORDER BY 
                                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                    COALESCE(ls.total_laps, 0) DESC,
                                    dbt.best_total_time ASC NULLS LAST
                            ) THEN 
                                -- Menos voltas = penalidade
                                INTERVAL '999:59:59'
                            ELSE 
                                -- Mesmo número de voltas, calcular diferença de tempo
                                dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                                    PARTITION BY c.event_id 
                                    ORDER BY 
                                        CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                        COALESCE(ls.total_laps, 0) DESC,
                                        dbt.best_total_time ASC NULLS LAST
                                )
                        END
                    ELSE 
                        -- Sem voltas, gap normal
                        dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                            PARTITION BY c.event_id 
                            ORDER BY 
                                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                                dbt.best_total_time ASC NULLS LAST
                        )
                END
        END as gap_to_leader,
        -- Calcular velocidade média (assumindo distância padrão de 10km se não especificada)
        CASE 
            WHEN e.distance_km IS NOT NULL AND e.distance_km > 0 AND dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                (e.distance_km / EXTRACT(EPOCH FROM dbt.best_total_time)) * 3600
            ELSE NULL
        END as avg_speed_kmh,
        -- Calcular ritmo por km (apenas para corridas)
        CASE 
            WHEN e.event_type = 'running' AND dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                EXTRACT(EPOCH FROM dbt.best_total_time) / COALESCE(e.distance_km, 10)
            ELSE NULL
        END as pace_per_km_seconds
    FROM classifications c
    JOIN dorsal_best_times dbt ON c.event_id = dbt.event_id AND c.dorsal_number = dbt.dorsal_number
    JOIN events e ON c.event_id = e.id
    LEFT JOIN lap_statistics ls ON c.event_id = ls.event_id AND c.dorsal_number = ls.dorsal_number
    LEFT JOIN activity_times_summary ats ON c.event_id = ats.event_id AND c.dorsal_number = ats.dorsal_number
    WHERE c.total_time = dbt.best_total_time
),
category_rankings AS (
    SELECT 
        rd.*,
        p.full_name,
        p.team_name,
        p.category,
        p.gender,
        p.birth_date,
        -- Posição por categoria
        ROW_NUMBER() OVER (
            PARTITION BY rd.event_id, p.category 
            ORDER BY 
                CASE WHEN rd.is_penalty THEN 1 ELSE 0 END,
                COALESCE(rd.total_laps, 0) DESC,
                rd.best_total_time ASC NULLS LAST
        ) as category_position
    FROM ranked_dorsals rd
    LEFT JOIN participants p ON rd.event_id = p.event_id AND rd.dorsal_number = p.dorsal_number
)
SELECT DISTINCT ON (cr.event_id, cr.dorsal_number)
    c.id,
    cr.event_id,
    cr.dorsal_number,
    cr.device_order,
    cr.checkpoint_time,
    cr.split_time,
    cr.total_time,
    cr.is_penalty,
    cr.penalty_reason,
    cr.detection_id,
    cr.position,
    cr.gap_to_leader,
    cr.avg_speed_kmh,
    cr.pace_per_km_seconds,
    cr.category_position,
    cr.full_name,
    cr.team_name,
    cr.category,
    cr.gender,
    cr.birth_date,
    -- Dados de voltas
    cr.total_laps,
    cr.fastest_lap,
    cr.slowest_lap,
    cr.avg_lap_time,
    cr.avg_lap_speed,
    cr.fastest_lap_speed,
    cr.total_lap_time,
    -- Dados de atividades específicas
    cr.swimming_time,
    cr.cycling_time,
    cr.running_time,
    cr.final_time,
    e.event_started_at,
    e.name as event_name,
    e.event_type,
    e.distance_km,
    e.has_lap_counter,
    es.total_athletes,
    es.fastest_time
FROM category_rankings cr
JOIN classifications c ON cr.event_id = c.event_id AND cr.dorsal_number = c.dorsal_number AND cr.total_time = c.total_time
JOIN events e ON cr.event_id = e.id
JOIN event_stats es ON cr.event_id = es.event_id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY cr.event_id, cr.dorsal_number, cr.total_time ASC NULLS LAST;

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
    RAISE NOTICE '   - Meta Corrida (Duatlo/Triatlo)';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '   1. Atualizar interface de configuração';
    RAISE NOTICE '   2. Modificar páginas de classificações';
    RAISE NOTICE '   3. Testar com evento multi-disciplinar';
END $$;
