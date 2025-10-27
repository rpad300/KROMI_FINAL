-- =====================================================
-- VisionKrono - Sistema de Gestão de Eventos
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. TABELA DE EVENTOS
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    location TEXT,
    status TEXT DEFAULT 'active', -- active, paused, completed, cancelled
    created_by TEXT, -- ID do criador
    settings JSONB DEFAULT '{}', -- Configurações específicas do evento
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONFIGURAÇÕES DE EVENTO
CREATE TABLE IF NOT EXISTS event_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL, -- 'number_area', 'calibration', 'detection_params'
    config_data JSONB NOT NULL,
    config_image_id UUID REFERENCES images(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, config_type)
);

-- 3. TABELA DE DISPOSITIVOS
CREATE TABLE IF NOT EXISTS devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_name TEXT NOT NULL,
    device_type TEXT DEFAULT 'mobile', -- mobile, desktop, tablet
    user_agent TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- active, inactive, banned
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índice único para device_name se não existir
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_name ON devices(device_name);

-- 4. TABELA DE DISPOSITIVOS POR EVENTO
CREATE TABLE IF NOT EXISTS event_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'detector', -- detector, supervisor, admin
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by TEXT,
    UNIQUE(event_id, device_id)
);

-- 5. ATUALIZAR TABELA DE DETECÇÕES (verificar se colunas existem)
DO $$ 
BEGIN
    -- Adicionar event_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE detections ADD COLUMN event_id UUID;
    END IF;
END $$;

-- 6. ATUALIZAR TABELA DE IMAGENS
DO $$ 
BEGIN
    -- Adicionar event_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE images ADD COLUMN event_id UUID;
    END IF;
END $$;

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_configurations_event ON event_configurations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_configurations_type ON event_configurations(config_type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_event_devices_event ON event_devices(event_id);
CREATE INDEX IF NOT EXISTS idx_event_devices_device ON event_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_detections_event ON detections(event_id);
CREATE INDEX IF NOT EXISTS idx_images_event ON images(event_id);

-- 8. HABILITAR RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_devices ENABLE ROW LEVEL SECURITY;

-- 9. POLÍTICAS DE ACESSO
DROP POLICY IF EXISTS "Allow all operations on events" ON events;
DROP POLICY IF EXISTS "Allow all operations on event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "Allow all operations on devices" ON devices;
DROP POLICY IF EXISTS "Allow all operations on event_devices" ON event_devices;

CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on event_configurations" ON event_configurations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on devices" ON devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on event_devices" ON event_devices FOR ALL USING (true) WITH CHECK (true);

-- 10. VIEWS PARA CONSULTAS OTIMIZADAS

-- View de eventos com estatísticas
CREATE OR REPLACE VIEW events_with_stats AS
SELECT 
    e.*,
    COUNT(DISTINCT ed.device_id) as total_devices,
    COUNT(DISTINCT CASE WHEN d.last_seen > NOW() - INTERVAL '5 minutes' THEN ed.device_id END) as active_devices,
    COUNT(det.id) as total_detections,
    COUNT(DISTINCT det.number) as unique_dorsals,
    MAX(det.timestamp) as last_detection
FROM events e
LEFT JOIN event_devices ed ON e.id = ed.event_id
LEFT JOIN devices d ON ed.device_id = d.id
LEFT JOIN detections det ON e.id = det.event_id
GROUP BY e.id, e.name, e.description, e.event_date, e.location, e.status, e.created_by, e.settings, e.created_at, e.updated_at;

-- View de detecções completas com evento e dispositivo
CREATE OR REPLACE VIEW detections_complete AS
SELECT 
    det.*,
    e.name as event_name,
    e.event_date,
    d.device_name,
    d.device_type,
    pi.image_data as proof_image_data
FROM detections det
LEFT JOIN events e ON det.event_id = e.id
LEFT JOIN devices d ON det.session_id = d.id::text
LEFT JOIN images pi ON det.proof_image_id = pi.id;

-- View de configurações por evento
CREATE OR REPLACE VIEW event_configurations_complete AS
SELECT 
    ec.*,
    e.name as event_name,
    ci.image_data as config_image_data
FROM event_configurations ec
JOIN events e ON ec.event_id = e.id
LEFT JOIN images ci ON ec.config_image_id = ci.id;

-- 11. FUNÇÕES ÚTEIS

-- Função para criar um novo evento
CREATE OR REPLACE FUNCTION create_event(
    event_name TEXT,
    event_description TEXT DEFAULT NULL,
    event_date DATE DEFAULT NULL,
    event_location TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_event_id UUID;
BEGIN
    INSERT INTO events (name, description, event_date, location)
    VALUES (event_name, event_description, event_date, event_location)
    RETURNING id INTO new_event_id;
    
    RETURN new_event_id;
END;
$$ LANGUAGE plpgsql;

-- Função para associar dispositivo a evento
CREATE OR REPLACE FUNCTION assign_device_to_event(
    event_id UUID,
    device_name TEXT,
    device_type TEXT DEFAULT 'mobile'
) RETURNS UUID AS $$
DECLARE
    device_id UUID;
BEGIN
    -- Inserir ou atualizar dispositivo
    INSERT INTO devices (device_name, device_type, last_seen)
    VALUES (device_name, device_type, NOW())
    ON CONFLICT (device_name) DO UPDATE SET
        last_seen = NOW(),
        device_type = EXCLUDED.device_type
    RETURNING id INTO device_id;
    
    -- Associar ao evento
    INSERT INTO event_devices (event_id, device_id)
    VALUES (event_id, device_id)
    ON CONFLICT (event_id, device_id) DO UPDATE SET
        assigned_at = NOW();
    
    RETURN device_id;
END;
$$ LANGUAGE plpgsql;

-- 12. COMENTÁRIOS
COMMENT ON TABLE events IS 'Eventos esportivos com detecção de dorsais';
COMMENT ON TABLE event_configurations IS 'Configurações específicas por evento';
COMMENT ON TABLE devices IS 'Dispositivos registados no sistema';
COMMENT ON TABLE event_devices IS 'Associação de dispositivos a eventos';

COMMENT ON COLUMN events.status IS 'Status: active, paused, completed, cancelled';
COMMENT ON COLUMN event_configurations.config_type IS 'Tipo: number_area, calibration, detection_params';
COMMENT ON COLUMN devices.device_type IS 'Tipo: mobile, desktop, tablet';
COMMENT ON COLUMN event_devices.role IS 'Papel: detector, supervisor, admin';

-- =====================================================
-- SETUP DE EVENTOS COMPLETO!
-- Agora você pode:
-- • Criar eventos com configurações específicas
-- • Associar múltiplos dispositivos por evento
-- • Rastrear detecções por evento
-- • Gestão completa de dispositivos
-- =====================================================
