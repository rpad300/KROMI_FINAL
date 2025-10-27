-- Script para implementar sistema completo de classificações profissionais
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar tipos de evento à tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'running';
ALTER TABLE events ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2) DEFAULT 10.0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS has_categories BOOLEAN DEFAULT true;

-- 2. Criar tabela de participantes
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    dorsal_number INTEGER NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    gender VARCHAR(10) CHECK (gender IN ('M', 'F')),
    team_name VARCHAR(255),
    category VARCHAR(50),
    registration_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, dorsal_number)
);

-- 3. Adicionar RLS para participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policies para participants
DROP POLICY IF EXISTS "Allow public read access" ON participants;
CREATE POLICY "Allow public read access" ON participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert participants" ON participants;
CREATE POLICY "Allow authenticated users to insert participants" ON participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to update participants" ON participants;
CREATE POLICY "Allow authenticated users to update participants" ON participants FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to delete participants" ON participants;
CREATE POLICY "Allow authenticated users to delete participants" ON participants FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Função para calcular categoria automaticamente
CREATE OR REPLACE FUNCTION calculate_category(
    p_gender VARCHAR(10),
    p_birth_date DATE,
    p_event_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_age INTEGER;
    v_category VARCHAR(50);
BEGIN
    IF p_gender IS NULL OR p_birth_date IS NULL THEN
        RETURN 'Open';
    END IF;
    
    v_age := EXTRACT(YEAR FROM AGE(p_event_date, p_birth_date));
    
    -- Categorias por idade e gênero
    IF p_gender = 'M' THEN
        CASE 
            WHEN v_age < 20 THEN v_category := 'M20';
            WHEN v_age < 30 THEN v_category := 'M30';
            WHEN v_age < 40 THEN v_category := 'M40';
            WHEN v_age < 50 THEN v_category := 'M50';
            WHEN v_age < 60 THEN v_category := 'M60';
            ELSE v_category := 'M70+';
        END CASE;
    ELSE
        CASE 
            WHEN v_age < 20 THEN v_category := 'F20';
            WHEN v_age < 30 THEN v_category := 'F30';
            WHEN v_age < 40 THEN v_category := 'F40';
            WHEN v_age < 50 THEN v_category := 'F50';
            WHEN v_age < 60 THEN v_category := 'F60';
            ELSE v_category := 'F70+';
        END CASE;
    END IF;
    
    RETURN v_category;
END;
$$;

-- 5. Trigger para calcular categoria automaticamente
CREATE OR REPLACE FUNCTION update_participant_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.category := calculate_category(NEW.gender, NEW.birth_date);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_participant_category ON participants;
CREATE TRIGGER trg_update_participant_category
BEFORE INSERT OR UPDATE ON participants
FOR EACH ROW EXECUTE FUNCTION update_participant_category();

-- 6. Atualizar view event_classifications com dados dos participantes
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
        -- Calcular posição geral
        ROW_NUMBER() OVER (
            PARTITION BY c.event_id 
            ORDER BY 
                CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                dbt.best_total_time ASC NULLS LAST
        ) as position,
        -- Calcular tempo para o da frente
        CASE 
            WHEN ROW_NUMBER() OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    dbt.best_total_time ASC NULLS LAST
            ) = 1 THEN NULL
            ELSE dbt.best_total_time - LAG(dbt.best_total_time) OVER (
                PARTITION BY c.event_id 
                ORDER BY 
                    CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
                    dbt.best_total_time ASC NULLS LAST
            )
        END as gap_to_leader,
        -- Calcular velocidade média baseada na distância do evento
        CASE 
            WHEN dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                (e.distance_km * 3600) / EXTRACT(EPOCH FROM dbt.best_total_time)
            ELSE NULL
        END as avg_speed_kmh,
        -- Calcular ritmo por km (apenas para corridas)
        CASE 
            WHEN e.event_type = 'running' AND dbt.best_total_time IS NOT NULL AND dbt.best_total_time > INTERVAL '0' THEN
                EXTRACT(EPOCH FROM dbt.best_total_time) / e.distance_km
            ELSE NULL
        END as pace_per_km_seconds
    FROM classifications c
    JOIN dorsal_best_times dbt ON c.event_id = dbt.event_id AND c.dorsal_number = dbt.dorsal_number
    JOIN events e ON c.event_id = e.id
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
    e.event_started_at,
    e.name as event_name,
    e.event_type,
    e.distance_km,
    es.total_athletes,
    es.fastest_time
FROM category_rankings cr
JOIN classifications c ON cr.event_id = c.event_id AND cr.dorsal_number = c.dorsal_number AND cr.total_time = c.total_time
JOIN events e ON cr.event_id = e.id
JOIN event_stats es ON cr.event_id = es.event_id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY cr.event_id, cr.dorsal_number, cr.total_time ASC NULLS LAST;

-- 7. Inserir alguns participantes de exemplo para o evento teste1
INSERT INTO participants (event_id, dorsal_number, full_name, birth_date, gender, team_name) VALUES
('a6301479-56c8-4269-a42d-aa8a7650a575', 24, 'João Silva', '1985-03-15', 'M', 'Clube Atlético'),
('a6301479-56c8-4269-a42d-aa8a7650a575', 101, 'Maria Santos', '1990-07-22', 'F', 'Equipa Speed'),
('a6301479-56c8-4269-a42d-aa8a7650a575', 401, 'Pedro Costa', '1978-11-08', 'M', 'Clube Atlético'),
('a6301479-56c8-4269-a42d-aa8a7650a575', 999, 'Ana Oliveira', '1995-05-30', 'F', 'Equipa Speed')
ON CONFLICT (event_id, dorsal_number) DO NOTHING;

-- 8. Atualizar tipo de evento para corrida
UPDATE events 
SET event_type = 'running', distance_km = 10.0, has_categories = true
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 9. Testar a nova view
SELECT 'TESTE DA NOVA VIEW COM PARTICIPANTES:' as info;
SELECT 
    dorsal_number,
    full_name,
    team_name,
    category,
    position,
    category_position,
    total_time,
    gap_to_leader,
    avg_speed_kmh,
    pace_per_km_seconds
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;
