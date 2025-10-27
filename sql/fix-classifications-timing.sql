-- Script para corrigir as classificações existentes
-- Execute este script no Supabase SQL Editor

-- 1. Verificar eventos e suas datas de início
SELECT 'EVENTOS:' as info;
SELECT id, name, event_started_at, is_active FROM events 
WHERE name ILIKE '%teste1%' OR name ILIKE '%test%';

-- 2. Iniciar o evento se não estiver iniciado
UPDATE events 
SET event_started_at = NOW(),
    is_active = true,
    status = 'active'
WHERE (name ILIKE '%teste1%' OR name ILIKE '%test%')
AND event_started_at IS NULL;

-- 3. Verificar se foi iniciado
SELECT 'EVENTO INICIADO:' as info;
SELECT id, name, event_started_at, is_active FROM events 
WHERE name ILIKE '%teste1%' OR name ILIKE '%test%';

-- 4. Atualizar classificações para calcular total_time
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at FROM events WHERE id = classifications.event_id
)
WHERE event_id IN (
    SELECT id FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%'
);

-- 5. Verificar resultado final
SELECT 'CLASSIFICAÇÕES FINAIS:' as info;
SELECT 
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.total_time,
    c.is_penalty,
    ROW_NUMBER() OVER (ORDER BY c.total_time ASC NULLS LAST) as position
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
ORDER BY c.total_time ASC NULLS LAST;
