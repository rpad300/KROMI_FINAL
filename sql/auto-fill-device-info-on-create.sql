-- ============================================================================
-- KROMI - Preencher Automaticamente Informações ao Criar Dispositivo
-- ============================================================================
-- Quando um dispositivo é criado/associado a um evento, garante que:
-- 1. access_code é gerado (se não tiver)
-- 2. Todas as informações necessárias estão disponíveis
-- 3. A view device_qr_info retorna todos os dados corretamente
-- ============================================================================

-- ============================================================================
-- 1. GARANTIR QUE access_code SEMPRE EXISTE
-- ============================================================================
-- Trigger já existe em add-access-code.sql, mas vamos garantir que funciona

-- Verificar se função generate_access_code existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'generate_access_code'
    ) THEN
        -- Criar função se não existir
        CREATE OR REPLACE FUNCTION generate_access_code()
        RETURNS VARCHAR(6) AS $func$
        DECLARE
            code VARCHAR(6);
            exists_check BOOLEAN;
            chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            max_attempts INT := 100;
            attempts INT := 0;
        BEGIN
            LOOP
                code := '';
                FOR i IN 1..6 LOOP
                    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
                END LOOP;
                
                SELECT EXISTS(SELECT 1 FROM event_devices WHERE access_code = code) INTO exists_check;
                
                IF NOT exists_check THEN
                    RETURN code;
                END IF;
                
                attempts := attempts + 1;
                IF attempts >= max_attempts THEN
                    RAISE EXCEPTION 'Não foi possível gerar código único após % tentativas', max_attempts;
                END IF;
            END LOOP;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Garantir que função auto_generate_access_code existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_access_code'
    ) THEN
        CREATE OR REPLACE FUNCTION auto_generate_access_code()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
                NEW.access_code := generate_access_code();
            END IF;
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Garantir que trigger existe e gera access_code automaticamente
DROP TRIGGER IF EXISTS trigger_auto_generate_access_code ON event_devices;

CREATE TRIGGER trigger_auto_generate_access_code
    BEFORE INSERT OR UPDATE ON event_devices
    FOR EACH ROW
    WHEN (NEW.access_code IS NULL OR NEW.access_code = '')
    EXECUTE FUNCTION auto_generate_access_code();

-- ============================================================================
-- 2. VIEW: device_qr_info (Informações Completas para Login)
-- ============================================================================
-- Esta view é consultada pela app nativa para fazer login
-- Deve sempre retornar TODAS as informações necessárias
CREATE OR REPLACE VIEW device_qr_info AS
SELECT 
    ed.id as association_id,
    ed.access_code,
    ed.device_pin,
    ed.max_sessions,
    ed.active_sessions,
    
    -- Informações do Evento
    e.id as event_id,
    e.name as event_name,
    e.description as event_description,
    e.event_date,
    e.location as event_location,
    e.event_type,
    e.event_started_at,
    e.status as event_status,
    
    -- Informações do Dispositivo
    d.id as device_id,
    d.device_name,
    d.device_type,
    
    -- Informações do Checkpoint (OBRIGATÓRIAS para app)
    ed.checkpoint_name,
    ed.checkpoint_type,
    ed.checkpoint_order,
    ed.role,
    ed.assigned_at,
    
    -- Configurações
    ed.max_sessions as max_concurrent_sessions,
    
    -- Timestamps
    ed.assigned_at as device_assigned_at,
    d.last_seen as device_last_seen,
    
    -- Status
    ed.active_sessions < ed.max_sessions as can_create_session,
    CASE 
        WHEN ed.active_sessions >= ed.max_sessions THEN 'device_busy'
        WHEN e.status != 'active' THEN 'event_inactive'
        ELSE 'ready'
    END as status_message
    
FROM event_devices ed
JOIN events e ON e.id = ed.event_id
JOIN devices d ON d.id = ed.device_id
WHERE ed.access_code IS NOT NULL;

-- ============================================================================
-- 3. TRIGGER: Garantir Informações ao Criar/Atualizar Device
-- ============================================================================
-- Quando dispositivo é criado ou atualizado, garantir que tem:
-- - access_code (gerado automaticamente)
-- - checkpoint_name, checkpoint_type, checkpoint_order (valores padrão se não tiver)
CREATE OR REPLACE FUNCTION ensure_device_info_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Garantir access_code (se trigger anterior não funcionou)
    IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
        NEW.access_code := generate_access_code();
    END IF;
    
    -- 2. Garantir checkpoint_name (valor padrão se não tiver)
    IF NEW.checkpoint_name IS NULL OR NEW.checkpoint_name = '' THEN
        NEW.checkpoint_name := 'Checkpoint #' || COALESCE(NEW.checkpoint_order, 1);
    END IF;
    
    -- 3. Garantir checkpoint_type (valor padrão se não tiver)
    IF NEW.checkpoint_type IS NULL OR NEW.checkpoint_type = '' THEN
        -- Se checkpoint_order = 1, assumir 'start' ou 'finish' dependendo do contexto
        IF NEW.checkpoint_order = 1 THEN
            NEW.checkpoint_type := 'checkpoint';  -- Valor padrão seguro
        ELSE
            NEW.checkpoint_type := 'checkpoint';
        END IF;
    END IF;
    
    -- 4. Garantir checkpoint_order (valor padrão se não tiver)
    IF NEW.checkpoint_order IS NULL THEN
        -- Buscar próximo número disponível para este evento
        SELECT COALESCE(MAX(checkpoint_order), 0) + 1
        INTO NEW.checkpoint_order
        FROM event_devices
        WHERE event_id = NEW.event_id;
    END IF;
    
    -- 5. Garantir max_sessions (valor padrão se não tiver)
    IF NEW.max_sessions IS NULL THEN
        NEW.max_sessions := 1;
    END IF;
    
    -- 6. Garantir active_sessions (valor padrão se não tiver)
    IF NEW.active_sessions IS NULL THEN
        NEW.active_sessions := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_ensure_device_info_complete ON event_devices;
CREATE TRIGGER trigger_ensure_device_info_complete
    BEFORE INSERT OR UPDATE ON event_devices
    FOR EACH ROW
    EXECUTE FUNCTION ensure_device_info_complete();

-- ============================================================================
-- 4. FUNÇÃO: Criar Dispositivo Completo (Helper)
-- ============================================================================
-- Função auxiliar para criar dispositivo com todas as informações
CREATE OR REPLACE FUNCTION create_device_for_event(
    p_event_id UUID,
    p_device_name TEXT,
    p_device_type TEXT DEFAULT 'mobile',
    p_checkpoint_name TEXT DEFAULT NULL,
    p_checkpoint_type TEXT DEFAULT 'checkpoint',
    p_checkpoint_order INTEGER DEFAULT NULL,
    p_device_pin TEXT DEFAULT NULL,
    p_max_sessions INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    v_device_id UUID;
    v_access_code VARCHAR(6);
    v_checkpoint_order INTEGER;
BEGIN
    -- 1. Criar ou buscar dispositivo
    INSERT INTO devices (device_name, device_type, last_seen, status)
    VALUES (p_device_name, p_device_type, NOW(), 'active')
    ON CONFLICT (device_name) DO UPDATE SET
        last_seen = NOW(),
        device_type = EXCLUDED.device_type
    RETURNING id INTO v_device_id;
    
    -- 2. Calcular checkpoint_order se não fornecido
    IF p_checkpoint_order IS NULL THEN
        SELECT COALESCE(MAX(checkpoint_order), 0) + 1
        INTO v_checkpoint_order
        FROM event_devices
        WHERE event_id = p_event_id;
    ELSE
        v_checkpoint_order := p_checkpoint_order;
    END IF;
    
    -- 3. Associar dispositivo ao evento (trigger vai preencher info automaticamente)
    INSERT INTO event_devices (
        event_id,
        device_id,
        checkpoint_name,
        checkpoint_type,
        checkpoint_order,
        device_pin,
        max_sessions,
        active_sessions
    ) VALUES (
        p_event_id,
        v_device_id,
        COALESCE(p_checkpoint_name, 'Checkpoint #' || v_checkpoint_order),
        p_checkpoint_type,
        v_checkpoint_order,
        p_device_pin,
        p_max_sessions,
        0
    )
    ON CONFLICT (event_id, device_id) DO UPDATE SET
        checkpoint_name = EXCLUDED.checkpoint_name,
        checkpoint_type = EXCLUDED.checkpoint_type,
        checkpoint_order = EXCLUDED.checkpoint_order,
        device_pin = COALESCE(EXCLUDED.device_pin, event_devices.device_pin),
        max_sessions = EXCLUDED.max_sessions
    RETURNING access_code INTO v_access_code;
    
    -- 4. Buscar access_code gerado
    SELECT access_code INTO v_access_code
    FROM event_devices
    WHERE event_id = p_event_id AND device_id = v_device_id;
    
    RETURN json_build_object(
        'success', true,
        'device_id', v_device_id,
        'access_code', v_access_code,
        'checkpoint_order', v_checkpoint_order,
        'message', 'Dispositivo criado e configurado com sucesso'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ATUALIZAR DISPOSITIVOS EXISTENTES (Sem access_code ou info incompleta)
-- ============================================================================
-- Preencher informações faltantes em dispositivos existentes

-- Gerar access_code para dispositivos que não têm
UPDATE event_devices
SET access_code = generate_access_code()
WHERE access_code IS NULL OR access_code = '';

-- Preencher checkpoint_name se não tiver
UPDATE event_devices
SET checkpoint_name = 'Checkpoint #' || COALESCE(checkpoint_order, 1)
WHERE checkpoint_name IS NULL OR checkpoint_name = '';

-- Preencher checkpoint_type se não tiver
UPDATE event_devices
SET checkpoint_type = 'checkpoint'
WHERE checkpoint_type IS NULL OR checkpoint_type = '';

-- Preencher checkpoint_order se não tiver
UPDATE event_devices ed
SET checkpoint_order = subquery.row_num
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY assigned_at) as row_num
    FROM event_devices
    WHERE checkpoint_order IS NULL
) subquery
WHERE ed.id = subquery.id AND ed.checkpoint_order IS NULL;

-- Preencher max_sessions se não tiver
UPDATE event_devices
SET max_sessions = 1
WHERE max_sessions IS NULL;

-- Preencher active_sessions se não tiver
UPDATE event_devices
SET active_sessions = 0
WHERE active_sessions IS NULL;

-- ============================================================================
-- 6. VERIFICAÇÃO
-- ============================================================================
-- Verificar se todos os dispositivos têm informações completas
DO $$
DECLARE
    v_incomplete INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_incomplete
    FROM event_devices
    WHERE access_code IS NULL 
       OR checkpoint_name IS NULL 
       OR checkpoint_type IS NULL 
       OR checkpoint_order IS NULL
       OR max_sessions IS NULL
       OR active_sessions IS NULL;
    
    IF v_incomplete > 0 THEN
        RAISE NOTICE '⚠️ % dispositivos ainda têm informações incompletas', v_incomplete;
    ELSE
        RAISE NOTICE '✅ Todos os dispositivos têm informações completas!';
    END IF;
END $$;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================
COMMENT ON VIEW device_qr_info IS 
'View que retorna TODAS as informações necessárias para login da app nativa.
Sempre consultar esta view quando app escanear QR code.';

COMMENT ON FUNCTION create_device_for_event IS 
'Função auxiliar para criar dispositivo completo com todas as informações.
Garante que access_code e todas as informações estão preenchidas.';

COMMENT ON FUNCTION ensure_device_info_complete IS 
'Trigger que garante que ao criar/atualizar dispositivo, todas as informações
necessárias são preenchidas automaticamente.';

-- ============================================================================
-- PRONTO! Sistema Configurado
-- ============================================================================
-- Agora:
-- 1. Ao criar dispositivo, access_code é gerado automaticamente
-- 2. Informações faltantes são preenchidas com valores padrão
-- 3. View device_qr_info sempre retorna dados completos
-- 4. App nativa sempre consegue fazer login com QR code
-- ============================================================================

