-- =====================================================
-- Adicionar PIN aos Dispositivos - Segurança
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar coluna device_pin em event_devices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'device_pin'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN device_pin TEXT;
        RAISE NOTICE 'Coluna device_pin adicionada!';
    ELSE
        RAISE NOTICE 'Coluna device_pin já existe';
    END IF;
END $$;

-- 2. Comentário
COMMENT ON COLUMN event_devices.device_pin IS 
'PIN de segurança para acesso ao dispositivo (4-6 dígitos)';

-- 3. Verificar
SELECT 
    event_id,
    device_id,
    device_pin,
    checkpoint_name,
    role
FROM event_devices
ORDER BY assigned_at DESC
LIMIT 10;

-- =====================================================
-- DEVICE PIN CONFIGURADO!
-- Agora ao adicionar dispositivo, defina um PIN.
-- Ao abrir /detection, o operador terá que inserir o PIN.
-- =====================================================

