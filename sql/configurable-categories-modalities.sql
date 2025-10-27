-- =====================================================
-- VISIONKRONO - CONFIGURAÇÃO DE CATEGORIAS E MODALIDADES
-- =====================================================
-- Este arquivo cria tabelas para configuração dinâmica
-- de categorias e modalidades em vez de hardcoded

-- =====================================================
-- 1. TABELA DE MODALIDADES DE EVENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS event_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🏃',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir modalidades padrão
INSERT INTO event_modalities (name, description, icon) VALUES
('Corrida', 'Corridas de rua e trail running', '🏃'),
('Ciclismo', 'Eventos de ciclismo de estrada e BTT', '🚴'),
('Triatlo', 'Natação, ciclismo e corrida', '🏊'),
('Caminhada', 'Caminhadas e marchas', '🚶'),
('Natação', 'Eventos de natação', '🏊'),
('Atletismo', 'Eventos de pista e campo', '🏃‍♂️')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. TABELA DE CATEGORIAS POR IDADE
-- =====================================================
CREATE TABLE IF NOT EXISTS age_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    min_age INTEGER NOT NULL,
    max_age INTEGER NOT NULL,
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'X')), -- X = ambos os géneros
    icon VARCHAR(10) DEFAULT '🏃',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão por idade
INSERT INTO age_categories (name, min_age, max_age, gender, icon, sort_order) VALUES
-- Categorias Masculinas
('M20', 0, 19, 'M', '👶', 1),
('M30', 20, 29, 'M', '🏃', 2),
('M40', 30, 39, 'M', '🏃‍♂️', 3),
('M50', 40, 49, 'M', '🏃‍♀️', 4),
('M60', 50, 59, 'M', '🚶', 5),
('M70+', 60, 999, 'M', '🚶‍♂️', 6),
-- Categorias Femininas
('F20', 0, 19, 'F', '👶', 7),
('F30', 20, 29, 'F', '🏃', 8),
('F40', 30, 39, 'F', '🏃‍♂️', 9),
('F50', 40, 49, 'F', '🏃‍♀️', 10),
('F60', 50, 59, 'F', '🚶', 11),
('F70+', 60, 999, 'F', '🚶‍♂️', 12),
-- Categorias Mistas (para eventos sem distinção de género)
('Open', 0, 999, 'X', '🏆', 13)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. TABELA DE CONFIGURAÇÃO DE CATEGORIAS POR EVENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS event_category_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    age_category_id UUID NOT NULL REFERENCES age_categories(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100), -- Nome personalizado para esta categoria neste evento
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, age_category_id)
);

-- =====================================================
-- 4. TABELA DE CONFIGURAÇÃO DE MODALIDADES POR EVENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS event_modality_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    modality_id UUID NOT NULL REFERENCES event_modalities(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_name VARCHAR(100), -- Nome personalizado para esta modalidade neste evento
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, modality_id)
);

-- =====================================================
-- 5. FUNÇÃO PARA CALCULAR CATEGORIA DINÂMICA
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_dynamic_category(
    p_event_id UUID,
    p_gender CHAR(1),
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
    IF p_gender IS NULL OR p_birth_date IS NULL OR p_event_id IS NULL THEN
        RETURN 'Open';
    END IF;
    
    v_age := EXTRACT(YEAR FROM AGE(p_event_date, p_birth_date));
    
    -- Buscar categoria configurada para este evento
    SELECT ac.name INTO v_category
    FROM age_categories ac
    JOIN event_category_config ecc ON ac.id = ecc.age_category_id
    WHERE ecc.event_id = p_event_id
      AND ecc.is_enabled = true
      AND (ac.gender = p_gender OR ac.gender = 'X')
      AND v_age >= ac.min_age 
      AND v_age <= ac.max_age
    ORDER BY ac.sort_order
    LIMIT 1;
    
    -- Se não encontrar categoria específica, usar padrão
    IF v_category IS NULL THEN
        SELECT ac.name INTO v_category
        FROM age_categories ac
        WHERE (ac.gender = p_gender OR ac.gender = 'X')
          AND v_age >= ac.min_age 
          AND v_age <= ac.max_age
        ORDER BY ac.sort_order
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(v_category, 'Open');
END;
$$;

-- =====================================================
-- 6. ATUALIZAR FUNÇÃO EXISTENTE PARA USAR CONFIGURAÇÃO DINÂMICA
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_category(
    p_gender CHAR(1),
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
    
    -- Categorias padrão (fallback)
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

-- =====================================================
-- 7. VIEWS PARA FACILITAR CONSULTAS
-- =====================================================

-- View para categorias ativas por evento
CREATE OR REPLACE VIEW event_active_categories AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    ac.id as category_id,
    ac.name as category_name,
    ac.min_age,
    ac.max_age,
    ac.gender,
    ac.icon,
    COALESCE(ecc.custom_name, ac.name) as display_name,
    COALESCE(ecc.custom_description, ac.description) as description
FROM events e
CROSS JOIN age_categories ac
LEFT JOIN event_category_config ecc ON e.id = ecc.event_id AND ac.id = ecc.age_category_id
WHERE ac.is_active = true
  AND (ecc.is_enabled IS NULL OR ecc.is_enabled = true);

-- View para modalidades ativas por evento
CREATE OR REPLACE VIEW event_active_modalities AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    em.id as modality_id,
    em.name as modality_name,
    em.icon,
    COALESCE(emc.custom_name, em.name) as display_name,
    COALESCE(emc.custom_description, em.description) as description
FROM events e
CROSS JOIN event_modalities em
LEFT JOIN event_modality_config emc ON e.id = emc.event_id AND em.id = emc.modality_id
WHERE em.is_active = true
  AND (emc.is_enabled IS NULL OR emc.is_enabled = true);

-- =====================================================
-- 8. TRIGGERS PARA ATUALIZAR TIMESTAMPS
-- =====================================================

-- Trigger para event_modalities
CREATE OR REPLACE FUNCTION update_modality_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_modality_timestamp
    BEFORE UPDATE ON event_modalities
    FOR EACH ROW EXECUTE FUNCTION update_modality_timestamp();

-- Trigger para age_categories
CREATE OR REPLACE FUNCTION update_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_category_timestamp
    BEFORE UPDATE ON age_categories
    FOR EACH ROW EXECUTE FUNCTION update_category_timestamp();

-- =====================================================
-- 9. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_event_category_config_event_id ON event_category_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_category_config_category_id ON event_category_config(age_category_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_event_id ON event_modality_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_modality_id ON event_modality_config(modality_id);
CREATE INDEX IF NOT EXISTS idx_age_categories_gender_age ON age_categories(gender, min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_age_categories_sort_order ON age_categories(sort_order);

-- =====================================================
-- 10. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE event_modalities IS 'Modalidades de eventos configuráveis (Corrida, Ciclismo, etc.)';
COMMENT ON TABLE age_categories IS 'Categorias por idade e género configuráveis';
COMMENT ON TABLE event_category_config IS 'Configuração de categorias habilitadas por evento';
COMMENT ON TABLE event_modality_config IS 'Configuração de modalidades habilitadas por evento';
COMMENT ON FUNCTION calculate_dynamic_category IS 'Calcula categoria usando configuração específica do evento';
COMMENT ON VIEW event_active_categories IS 'Categorias ativas e configuradas por evento';
COMMENT ON VIEW event_active_modalities IS 'Modalidades ativas e configuradas por evento';
