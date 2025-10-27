-- ============================================================================
-- VisionKrono Live Stream - Schema Simplificado
-- ============================================================================
-- 
-- Versão otimizada do schema de livestream usando Socket.IO para signaling
-- WebRTC P2P direto, Supabase apenas para persistência de configurações
--
-- IMPORTANTE: Execute este script no Supabase SQL Editor para atualizar
-- ============================================================================

-- Remover tabelas antigas (se existirem)
DROP TABLE IF EXISTS livestream_frames CASCADE;
DROP TABLE IF EXISTS livestream_offers CASCADE;
DROP TABLE IF EXISTS livestream_commands CASCADE;

-- Tabela simplificada para registrar dispositivos (apenas histórico)
-- Socket.IO gerencia dispositivos online em tempo real
CREATE TABLE IF NOT EXISTS livestream_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    event_id UUID NOT NULL,
    
    -- Status e timestamps
    status TEXT NOT NULL DEFAULT 'online',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Informações adicionais
    capabilities TEXT[] DEFAULT ARRAY['livestream', 'detection'],
    
    -- Constraint: device_id único por evento (pode ser reusado em eventos diferentes)
    UNIQUE(device_id, event_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_livestream_devices_device_id ON livestream_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_event_id ON livestream_devices(event_id);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_status ON livestream_devices(status);
CREATE INDEX IF NOT EXISTS idx_livestream_devices_last_seen ON livestream_devices(last_seen);

-- RLS Policies (permitir acesso público para registrar presença)
ALTER TABLE livestream_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on livestream_devices" ON livestream_devices;
CREATE POLICY "Allow all operations on livestream_devices" 
ON livestream_devices FOR ALL USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_livestream_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_livestream_devices_updated_at ON livestream_devices;
CREATE TRIGGER trigger_update_livestream_devices_updated_at
    BEFORE UPDATE ON livestream_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_livestream_devices_updated_at();

-- Função para limpar dispositivos offline (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_offline_devices()
RETURNS void AS $$
BEGIN
    -- Marcar como offline dispositivos que não enviaram heartbeat há mais de 2 minutos
    UPDATE livestream_devices 
    SET status = 'offline'
    WHERE status = 'online' 
    AND last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Estatísticas e Views Úteis
-- ============================================================================

-- View para dispositivos online ativos
CREATE OR REPLACE VIEW livestream_devices_online AS
SELECT 
    device_id,
    device_name,
    event_id,
    status,
    last_seen,
    capabilities,
    EXTRACT(EPOCH FROM (NOW() - last_seen)) as seconds_since_last_seen
FROM livestream_devices
WHERE status = 'online'
AND last_seen > NOW() - INTERVAL '2 minutes'
ORDER BY last_seen DESC;

-- View para estatísticas por evento
CREATE OR REPLACE VIEW livestream_event_stats AS
SELECT 
    event_id,
    COUNT(*) as total_devices,
    COUNT(*) FILTER (WHERE status = 'online' AND last_seen > NOW() - INTERVAL '2 minutes') as online_devices,
    MAX(last_seen) as last_activity
FROM livestream_devices
GROUP BY event_id;

-- ============================================================================
-- Dados de Exemplo e Validação
-- ============================================================================

-- Comentário: Esta tabela simplificada é suficiente porque:
-- 1. Socket.IO gerencia presença em tempo real (não precisa polling no DB)
-- 2. WebRTC P2P elimina necessidade de armazenar offers/answers
-- 3. Não armazenamos frames (streaming direto P2P)
-- 4. Comandos são enviados via Socket.IO (não precisam persistência)

SELECT 'Schema simplificado criado com sucesso!' as message;

-- Verificar estrutura
SELECT 
    'livestream_devices' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE status = 'online') as online,
    COUNT(*) FILTER (WHERE status = 'offline') as offline
FROM livestream_devices;

