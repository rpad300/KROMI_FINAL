-- =====================================================
-- VISIONKRONO - CRIAÇÃO DE TABELAS PARA CATEGORIAS E MODALIDADES
-- =====================================================
-- Execute este SQL no Supabase SQL Editor

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
-- 5. INSERIR MODALIDADES PADRÃO
-- =====================================================
INSERT INTO event_modalities (name, description, icon) VALUES
('Corrida', 'Corridas de rua e trail running', '🏃'),
('Ciclismo', 'Eventos de ciclismo de estrada e BTT', '🚴'),
('Triatlo', 'Natação, ciclismo e corrida', '🏊'),
('Caminhada', 'Caminhadas e marchas', '🚶'),
('Natação', 'Eventos de natação', '🏊'),
('Atletismo', 'Eventos de pista e campo', '🏃‍♂️')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. INSERIR CATEGORIAS PADRÃO
-- =====================================================
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
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_event_category_config_event_id ON event_category_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_category_config_category_id ON event_category_config(age_category_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_event_id ON event_modality_config(event_id);
CREATE INDEX IF NOT EXISTS idx_event_modality_config_modality_id ON event_modality_config(modality_id);
CREATE INDEX IF NOT EXISTS idx_age_categories_gender_age ON age_categories(gender, min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_age_categories_sort_order ON age_categories(sort_order);

-- =====================================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON TABLE event_modalities IS 'Modalidades de eventos configuráveis (Corrida, Ciclismo, etc.)';
COMMENT ON TABLE age_categories IS 'Categorias por idade e género configuráveis';
COMMENT ON TABLE event_category_config IS 'Configuração de categorias habilitadas por evento';
COMMENT ON TABLE event_modality_config IS 'Configuração de modalidades habilitadas por evento';
