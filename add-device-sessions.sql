-- =====================================================
-- Sistema de Múltiplas Sessões por Dispositivo
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar max_sessions em event_devices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'max_sessions'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN max_sessions INTEGER DEFAULT 1;
        RAISE NOTICE 'Coluna max_sessions adicionada!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'active_sessions'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN active_sessions INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna active_sessions adicionada!';
    END IF;
END $$;

-- 2. Criar tabela de sessões ativas
CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    operator_name TEXT,
    user_agent TEXT,
    ip_address TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_event ON device_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active ON device_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_sessions_session ON device_sessions(session_id);

-- 4. Função para iniciar sessão
CREATE OR REPLACE FUNCTION start_device_session(
    p_event_id UUID,
    p_device_id UUID,
    p_session_id TEXT,
    p_operator_name TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    max_allowed INTEGER;
    current_active INTEGER;
    new_session_id UUID;
BEGIN
    -- Buscar limite de sessões
    SELECT max_sessions INTO max_allowed
    FROM event_devices
    WHERE event_id = p_event_id AND device_id = p_device_id;
    
    IF max_allowed IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Device not found');
    END IF;
    
    -- Contar sessões ativas (últimos 5 minutos)
    SELECT COUNT(*) INTO current_active
    FROM device_sessions
    WHERE device_id = p_device_id 
    AND event_id = p_event_id
    AND is_active = true
    AND last_heartbeat > NOW() - INTERVAL '5 minutes';
    
    -- Verificar se excedeu limite
    IF current_active >= max_allowed THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Max sessions exceeded',
            'max_allowed', max_allowed,
            'current_active', current_active
        );
    END IF;
    
    -- Criar nova sessão
    INSERT INTO device_sessions (
        event_id, device_id, session_id, operator_name, user_agent, is_active
    ) VALUES (
        p_event_id, p_device_id, p_session_id, p_operator_name, p_user_agent, true
    ) RETURNING id INTO new_session_id;
    
    -- Atualizar contador
    UPDATE event_devices 
    SET active_sessions = current_active + 1
    WHERE event_id = p_event_id AND device_id = p_device_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'session_id', new_session_id,
        'current_active', current_active + 1,
        'max_allowed', max_allowed
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Função para encerrar sessão
CREATE OR REPLACE FUNCTION end_device_session(
    p_session_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE device_sessions
    SET is_active = false,
        ended_at = NOW()
    WHERE session_id = p_session_id;
    
    -- Atualizar contador
    UPDATE event_devices ed
    SET active_sessions = (
        SELECT COUNT(*)
        FROM device_sessions ds
        WHERE ds.device_id = ed.device_id
        AND ds.event_id = ed.event_id
        AND ds.is_active = true
        AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para heartbeat (manter sessão viva)
CREATE OR REPLACE FUNCTION update_session_heartbeat(
    p_session_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE device_sessions
    SET last_heartbeat = NOW()
    WHERE session_id = p_session_id
    AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Função para limpar sessões inativas
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- Marcar como inativas sessões sem heartbeat há mais de 5 minutos
    UPDATE device_sessions
    SET is_active = false,
        ended_at = NOW()
    WHERE is_active = true
    AND last_heartbeat < NOW() - INTERVAL '5 minutes';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Atualizar contadores
    UPDATE event_devices ed
    SET active_sessions = (
        SELECT COUNT(*)
        FROM device_sessions ds
        WHERE ds.device_id = ed.device_id
        AND ds.event_id = ed.event_id
        AND ds.is_active = true
        AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
    );
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 8. View para monitoramento
CREATE OR REPLACE VIEW active_device_sessions AS
SELECT 
    ds.*,
    ed.checkpoint_name,
    ed.max_sessions,
    ed.active_sessions,
    d.device_name,
    e.name as event_name,
    EXTRACT(EPOCH FROM (NOW() - ds.last_heartbeat)) as seconds_since_heartbeat
FROM device_sessions ds
LEFT JOIN event_devices ed ON ds.device_id = ed.device_id AND ds.event_id = ed.event_id
LEFT JOIN devices d ON ds.device_id = d.id
LEFT JOIN events e ON ds.event_id = e.id
WHERE ds.is_active = true
ORDER BY ds.last_heartbeat DESC;

-- 9. Políticas RLS
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on device_sessions" ON device_sessions;
CREATE POLICY "Allow all operations on device_sessions" 
ON device_sessions FOR ALL USING (true) WITH CHECK (true);

-- 10. Comentários
COMMENT ON TABLE device_sessions IS 'Sessões ativas de dispositivos de detecção';
COMMENT ON COLUMN event_devices.max_sessions IS 'Número máximo de sessões simultâneas permitidas (1-10)';
COMMENT ON COLUMN event_devices.active_sessions IS 'Número de sessões atualmente ativas';
COMMENT ON COLUMN device_sessions.last_heartbeat IS 'Última atualização da sessão (enviada a cada 30s)';

-- 11. Teste
SELECT * FROM active_device_sessions;

-- =====================================================
-- SISTEMA DE SESSÕES COMPLETO!
-- Agora você pode:
-- 1. Definir quantas sessões cada dispositivo permite
-- 2. Múltiplos operadores no mesmo dispositivo
-- 3. Monitorar sessões ativas
-- 4. Limpeza automática de sessões inativas
-- =====================================================

