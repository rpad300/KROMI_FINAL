-- =====================================================
-- Adicionar checkpoint_order à tabela event_devices
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Adicionar coluna checkpoint_order se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_devices' AND column_name = 'checkpoint_order'
    ) THEN
        ALTER TABLE event_devices ADD COLUMN checkpoint_order INTEGER DEFAULT 1;
        CREATE INDEX IF NOT EXISTS idx_event_devices_order ON event_devices(event_id, checkpoint_order);
        
        RAISE NOTICE 'Coluna checkpoint_order adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna checkpoint_order já existe';
    END IF;
END $$;

-- 2. Atualizar checkpoint_order para dispositivos existentes
-- Se tiver apenas 1 dispositivo por evento, será checkpoint 1
-- Se tiver múltiplos, usar a ordem de assigned_at
UPDATE event_devices ed
SET checkpoint_order = subquery.row_num
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY assigned_at) as row_num
    FROM event_devices
) subquery
WHERE ed.id = subquery.id;

-- 3. Verificar resultado
SELECT 
    ed.event_id,
    e.name as event_name,
    ed.device_id,
    ed.checkpoint_order,
    ed.role,
    ed.assigned_at
FROM event_devices ed
JOIN events e ON e.id = ed.event_id
ORDER BY ed.event_id, ed.checkpoint_order;

-- 4. Comentário explicativo
COMMENT ON COLUMN event_devices.checkpoint_order IS 
'Ordem do checkpoint no percurso (1=início/meta, 2=checkpoint intermediário, etc). 
Usado para calcular splits nas classificações.';

-- =====================================================
-- CHECKPOINT_ORDER CONFIGURADO!
-- Agora você pode:
-- 1. Definir a ordem dos checkpoints em cada evento
-- 2. Calcular splits corretamente
-- 3. Mostrar tempos parciais nas classificações
-- =====================================================



