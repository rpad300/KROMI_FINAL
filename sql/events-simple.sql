-- =====================================================
-- VisionKrono - Eventos (Versão Simples)
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. CRIAR TABELA DE EVENTOS
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    location TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRIAR TABELA DE DISPOSITIVOS
CREATE TABLE IF NOT EXISTS devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_name TEXT NOT NULL UNIQUE,
    device_type TEXT DEFAULT 'mobile',
    user_agent TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CRIAR TABELA DE ASSOCIAÇÃO EVENTO-DISPOSITIVO
CREATE TABLE IF NOT EXISTS event_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'detector',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by TEXT,
    UNIQUE(event_id, device_id)
);

-- 4. CRIAR TABELA DE CONFIGURAÇÕES POR EVENTO
CREATE TABLE IF NOT EXISTS event_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    config_type TEXT NOT NULL,
    config_data JSONB NOT NULL,
    config_image_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, config_type)
);

-- 5. ADICIONAR COLUNAS event_id ÀS TABELAS EXISTENTES (se não existirem)
DO $$ 
BEGIN
    -- Verificar e adicionar event_id em detections
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'detections' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE detections ADD COLUMN event_id UUID;
        CREATE INDEX idx_detections_event ON detections(event_id);
    END IF;
    
    -- Verificar e adicionar event_id em images
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE images ADD COLUMN event_id UUID;
        CREATE INDEX idx_images_event ON images(event_id);
    END IF;
END $$;

-- 6. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_event_devices_event ON event_devices(event_id);
CREATE INDEX IF NOT EXISTS idx_event_configurations_event ON event_configurations(event_id);

-- 7. HABILITAR RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;

-- 8. CRIAR POLÍTICAS
DROP POLICY IF EXISTS "Allow all operations on events" ON events;
CREATE POLICY "Allow all operations on events" ON events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on devices" ON devices;
CREATE POLICY "Allow all operations on devices" ON devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on event_devices" ON event_devices;
CREATE POLICY "Allow all operations on event_devices" ON event_devices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on event_configurations" ON event_configurations;
CREATE POLICY "Allow all operations on event_configurations" ON event_configurations FOR ALL USING (true) WITH CHECK (true);

-- 9. CRIAR VIEW DE EVENTOS COM ESTATÍSTICAS
CREATE OR REPLACE VIEW events_with_stats AS
SELECT 
    e.*,
    COUNT(DISTINCT ed.device_id) as total_devices,
    COUNT(DISTINCT det.id) as total_detections,
    COUNT(DISTINCT det.number) as unique_dorsals,
    MAX(det.timestamp) as last_detection
FROM events e
LEFT JOIN event_devices ed ON e.id = ed.event_id
LEFT JOIN detections det ON e.id = det.event_id
GROUP BY e.id;

-- 10. FUNÇÃO PARA CRIAR EVENTO
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

-- =====================================================
-- SETUP DE EVENTOS COMPLETO!
-- Agora você pode criar e gerir eventos esportivos
-- =====================================================
