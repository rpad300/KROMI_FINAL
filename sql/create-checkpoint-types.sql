-- =====================================================
-- VisionKrono - Sistema de Tipos de Checkpoints
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. CRIAR TABELA DE TIPOS DE CHECKPOINTS
CREATE TABLE IF NOT EXISTS checkpoint_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📍',
    color TEXT DEFAULT '#fc6b03',
    is_start BOOLEAN DEFAULT false,
    is_finish BOOLEAN DEFAULT false,
    is_intermediate BOOLEAN DEFAULT true,
    requires_split BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSERIR TIPOS PADRÃO DE CHECKPOINTS
INSERT INTO checkpoint_types (code, name, description, icon, color, is_start, is_finish, is_intermediate, requires_split, sort_order) VALUES
('start', 'Início', 'Ponto de largada do evento', '🏁', '#10b981', true, false, false, false, 1),
('finish', 'Meta', 'Linha de chegada/meta final', '🏁', '#ef4444', false, true, false, true, 99),
('intermediate', 'Intermédio', 'Checkpoint intermédio no percurso', '📍', '#fc6b03', false, false, true, true, 50),
('timing', 'Cronometragem', 'Ponto de cronometragem adicional', '⏱️', '#f59e0b', false, false, true, true, 60),
('control', 'Controlo', 'Ponto de controlo/verificação', '✓', '#3b82f6', false, false, true, false, 70),
('aid_station', 'Abastecimento', 'Posto de abastecimento', '💧', '#06b6d4', false, false, true, false, 80)
ON CONFLICT (code) DO NOTHING;

-- 3. ADICIONAR COLUNA checkpoint_type À TABELA event_devices
DO $$ 
BEGIN
    -- Adicionar checkpoint_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'checkpoint_type'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN checkpoint_type TEXT DEFAULT 'intermediate' REFERENCES checkpoint_types(code);
        CREATE INDEX IF NOT EXISTS idx_event_devices_type ON event_devices(checkpoint_type);
        RAISE NOTICE 'Coluna checkpoint_type adicionada!';
    END IF;
    
    -- Adicionar checkpoint_order se ainda não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'checkpoint_order'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN checkpoint_order INTEGER DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_event_devices_order ON event_devices(event_id, checkpoint_order);
        RAISE NOTICE 'Coluna checkpoint_order adicionada!';
    END IF;
    
    -- Adicionar checkpoint_name para facilitar identificação
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'checkpoint_name'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN checkpoint_name TEXT;
        RAISE NOTICE 'Coluna checkpoint_name adicionada!';
    END IF;
END $$;

-- 4. ATUALIZAR DISPOSITIVOS EXISTENTES
-- Primeiro dispositivo = início, último = meta, resto = intermédio
DO $$
DECLARE
    evt RECORD;
    dev RECORD;
    total_devices INTEGER;
BEGIN
    FOR evt IN SELECT DISTINCT event_id FROM event_devices LOOP
        -- Contar dispositivos no evento
        SELECT COUNT(*) INTO total_devices 
        FROM event_devices 
        WHERE event_id = evt.event_id;
        
        -- Atualizar checkpoint_order se ainda não definido
        UPDATE event_devices ed
        SET checkpoint_order = subquery.row_num
        FROM (
            SELECT 
                id,
                ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY assigned_at) as row_num
            FROM event_devices
            WHERE event_id = evt.event_id AND checkpoint_order IS NULL
        ) subquery
        WHERE ed.id = subquery.id;
        
        -- Atualizar tipos
        -- Primeiro = início
        UPDATE event_devices
        SET checkpoint_type = 'start',
            checkpoint_name = 'Início/Largada'
        WHERE event_id = evt.event_id 
        AND checkpoint_order = 1
        AND checkpoint_type IS NULL;
        
        -- Último = meta (se houver mais de 1)
        IF total_devices > 1 THEN
            UPDATE event_devices
            SET checkpoint_type = 'finish',
                checkpoint_name = 'Meta/Chegada'
            WHERE event_id = evt.event_id 
            AND checkpoint_order = total_devices
            AND checkpoint_type IS NULL;
        END IF;
        
        -- Resto = intermédio
        UPDATE event_devices
        SET checkpoint_type = 'intermediate',
            checkpoint_name = 'Checkpoint ' || checkpoint_order
        WHERE event_id = evt.event_id 
        AND checkpoint_order > 1 
        AND checkpoint_order < total_devices
        AND checkpoint_type IS NULL;
    END LOOP;
END $$;

-- 5. CRIAR VIEW PARA CHECKPOINTS COM TIPOS
CREATE OR REPLACE VIEW event_checkpoints_view AS
SELECT 
    ed.id,
    ed.event_id,
    ed.device_id,
    ed.checkpoint_order,
    ed.checkpoint_name,
    ed.checkpoint_type,
    ed.role,
    ed.assigned_at,
    ct.name as type_name,
    ct.description as type_description,
    ct.icon as type_icon,
    ct.color as type_color,
    ct.is_start,
    ct.is_finish,
    ct.is_intermediate,
    ct.requires_split,
    e.name as event_name,
    d.device_name,
    d.device_type
FROM event_devices ed
LEFT JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
LEFT JOIN events e ON ed.event_id = e.id
LEFT JOIN devices d ON ed.device_id = d.id
ORDER BY ed.event_id, ed.checkpoint_order;

-- 6. ADICIONAR COMENTÁRIOS
COMMENT ON TABLE checkpoint_types IS 'Tipos de checkpoints configuráveis (início, meta, intermédio, etc)';
COMMENT ON COLUMN checkpoint_types.code IS 'Código único do tipo (start, finish, intermediate, etc)';
COMMENT ON COLUMN checkpoint_types.requires_split IS 'Se true, este checkpoint gera um split time nas classificações';
COMMENT ON COLUMN event_devices.checkpoint_order IS 'Ordem sequencial do checkpoint no percurso (1, 2, 3...)';
COMMENT ON COLUMN event_devices.checkpoint_type IS 'Tipo do checkpoint (referência a checkpoint_types.code)';
COMMENT ON COLUMN event_devices.checkpoint_name IS 'Nome descritivo do checkpoint (ex: Km 5, Subida, etc)';

-- 7. VERIFICAR RESULTADO
SELECT 'TIPOS DE CHECKPOINTS DISPONÍVEIS:' as info;
SELECT code, name, icon, color, is_start, is_finish, is_intermediate, requires_split
FROM checkpoint_types
ORDER BY sort_order;

SELECT '' as separator;

SELECT 'CHECKPOINTS CONFIGURADOS POR EVENTO:' as info;
SELECT * FROM event_checkpoints_view;

-- =====================================================
-- SISTEMA DE CHECKPOINTS COMPLETO!
-- Agora você pode:
-- 1. Definir tipos personalizados de checkpoints
-- 2. Associar dispositivos a eventos com tipo e ordem
-- 3. Calcular splits automaticamente baseado na ordem
-- 4. Visualizar percurso completo do evento
-- =====================================================



