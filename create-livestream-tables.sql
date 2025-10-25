-- Tabela para comunicação entre dispositivos do Live Stream
CREATE TABLE IF NOT EXISTS livestream_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    event_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'online', -- online, offline, streaming
    capabilities TEXT[] DEFAULT ARRAY['livestream', 'detection'],
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para comandos entre dispositivos
CREATE TABLE IF NOT EXISTS livestream_commands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    command TEXT NOT NULL, -- start, stop, status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, received, completed
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 seconds')
);

-- Tabela para ofertas WebRTC
CREATE TABLE IF NOT EXISTS livestream_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    offer_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, answered, expired
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
CREATE INDEX IF NOT EXISTS idx_livestream_commands_created_at ON livestream_commands(created_at);

CREATE INDEX IF NOT EXISTS idx_livestream_offers_device_id ON livestream_offers(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_offers_status ON livestream_offers(status);

-- RLS Policies
ALTER TABLE livestream_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestream_offers ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acesso público (para comunicação entre dispositivos)
CREATE POLICY "Allow all operations on livestream_devices" ON livestream_devices
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on livestream_commands" ON livestream_commands
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on livestream_offers" ON livestream_offers
    FOR ALL USING (true);

-- Função para limpar registros expirados
CREATE OR REPLACE FUNCTION cleanup_expired_livestream_data()
RETURNS void AS $$
BEGIN
    -- Limpar comandos expirados
    DELETE FROM livestream_commands 
    WHERE expires_at < NOW();
    
    -- Limpar ofertas expiradas
    DELETE FROM livestream_offers 
    WHERE expires_at < NOW();
    
    -- Marcar dispositivos como offline se não foram vistos há mais de 30 segundos
    UPDATE livestream_devices 
    SET status = 'offline', updated_at = NOW()
    WHERE last_seen < (NOW() - INTERVAL '30 seconds') 
    AND status != 'offline';
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
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

-- Comentários
COMMENT ON TABLE livestream_devices IS 'Dispositivos conectados ao Live Stream';
COMMENT ON TABLE livestream_commands IS 'Comandos enviados entre dispositivos';
COMMENT ON TABLE livestream_offers IS 'Ofertas WebRTC entre dispositivos';
