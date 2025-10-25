-- Execute este SQL no Supabase Dashboard para criar as tabelas do Live Stream

-- Tabela para dispositivos conectados
CREATE TABLE IF NOT EXISTS livestream_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'online',
    capabilities TEXT[] DEFAULT ARRAY['livestream', 'detection'],
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para comandos entre dispositivos
CREATE TABLE IF NOT EXISTS livestream_commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    command TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 seconds')
);

-- Tabela para ofertas WebRTC
CREATE TABLE IF NOT EXISTS livestream_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    offer_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    answer_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '60 seconds')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_livestream_devices_device_id ON livestream_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_event_id ON livestream_devices(event_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_status ON livestream_devices(status);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_last_seen ON livestream_devices(last_seen);

CREATE INDEX IF NOT EXISTS idx_livestream_commands_device_id ON livestream_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_commands_status ON livestream_commands(status);

CREATE INDEX IF NOT EXISTS idx_livestream_offers_device_id ON livestream_offers(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_offers_status ON livestream_offers(status);

-- RLS Policies (permitir acesso público para comunicação)
ALTER TABLE livestream_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on livestream_devices" ON livestream_devices FOR ALL USING (true);
CREATE POLICY "Allow all operations on livestream_commands" ON livestream_commands FOR ALL USING (true);
CREATE POLICY "Allow all operations on livestream_offers" ON livestream_offers FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_livestream_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_livestream_devices_updated_at
    BEFORE UPDATE ON livestream_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_livestream_devices_updated_at();

-- Tabela para frames capturados (fallback para streaming via servidor)
CREATE TABLE IF NOT EXISTS livestream_frames (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    image_data TEXT NOT NULL, -- Base64 encoded image
    status TEXT DEFAULT 'ready',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 seconds')
);

-- Índices para frames
CREATE INDEX IF NOT EXISTS idx_livestream_frames_device_id ON livestream_frames(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_frames_status ON livestream_frames(status);
CREATE INDEX IF NOT EXISTS idx_livestream_frames_created_at ON livestream_frames(created_at);

-- RLS para frames
ALTER TABLE livestream_frames ENABLE ROW LEVEL SECURITY;

-- Política para frames (permitir todas as operações)
CREATE POLICY "Allow all operations on livestream_frames" ON livestream_frames
    FOR ALL USING (true);
