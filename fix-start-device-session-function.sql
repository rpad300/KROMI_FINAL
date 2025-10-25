-- Melhorar função start_device_session para corrigir inconsistências automaticamente
-- Execute este script para atualizar a função

-- 1. Primeiro, corrigir contadores manualmente
UPDATE event_devices ed
SET active_sessions = (
    SELECT COUNT(*)
    FROM device_sessions ds
    WHERE ds.device_id = ed.device_id
    AND ds.event_id = ed.event_id
    AND ds.is_active = true
    AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes'
);

-- 2. Recriar função start_device_session com correção automática
CREATE OR REPLACE FUNCTION start_device_session(
    p_device_id UUID,
    p_event_id UUID,
    p_session_id TEXT,
    p_device_pin TEXT,
    p_location_lat DECIMAL,
    p_location_lng DECIMAL
) RETURNS JSON AS $$
DECLARE
    device_data RECORD;
    current_active_count INTEGER;
    max_sessions_allowed INTEGER;
    result JSON;
BEGIN
    -- Buscar dados do dispositivo
    SELECT 
        ed.device_pin,
        ed.max_sessions,
        ed.active_sessions,
        d.device_name
    INTO device_data
    FROM event_devices ed
    JOIN devices d ON d.id = ed.device_id
    WHERE ed.device_id = p_device_id 
    AND ed.event_id = p_event_id;
    
    -- Verificar se dispositivo existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Device not found in event'
        );
    END IF;
    
    -- Verificar PIN
    IF device_data.device_pin != p_device_pin THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid PIN'
        );
    END IF;
    
    -- CORREÇÃO AUTOMÁTICA: Recalcular contador real
    SELECT COUNT(*)
    INTO current_active_count
    FROM device_sessions ds
    WHERE ds.device_id = p_device_id
    AND ds.event_id = p_event_id
    AND ds.is_active = true
    AND ds.last_heartbeat > NOW() - INTERVAL '5 minutes';
    
    -- Atualizar contador na tabela se estiver incorreto
    IF device_data.active_sessions != current_active_count THEN
        UPDATE event_devices 
        SET active_sessions = current_active_count
        WHERE device_id = p_device_id AND event_id = p_event_id;
        
        RAISE NOTICE 'Contador corrigido: % -> %', device_data.active_sessions, current_active_count;
    END IF;
    
    max_sessions_allowed := device_data.max_sessions;
    
    -- Verificar limite de sessões
    IF current_active_count >= max_sessions_allowed THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Max sessions exceeded',
            'max_allowed', max_sessions_allowed,
            'current_active', current_active_count,
            'device_name', device_data.device_name
        );
    END IF;
    
    -- Criar nova sessão
    INSERT INTO device_sessions (
        session_id,
        device_id,
        event_id,
        device_pin,
        location_lat,
        location_lng,
        is_active,
        started_at,
        last_heartbeat
    ) VALUES (
        p_session_id,
        p_device_id,
        p_event_id,
        p_device_pin,
        p_location_lat,
        p_location_lng,
        true,
        NOW(),
        NOW()
    );
    
    -- Atualizar contador
    UPDATE event_devices 
    SET active_sessions = active_sessions + 1
    WHERE device_id = p_device_id AND event_id = p_event_id;
    
    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'device_name', device_data.device_name,
        'max_sessions', max_sessions_allowed,
        'active_sessions', current_active_count + 1
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Database error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
