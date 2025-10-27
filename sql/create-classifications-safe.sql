-- Script seguro para criar classificações (usando apenas colunas conhecidas)
-- Execute este script no Supabase SQL Editor

-- 1. Verificar eventos existentes
SELECT 'EVENTOS:' as tipo;
SELECT id, name, created_at FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%';

-- 2. Verificar detecções existentes (usando apenas colunas básicas)
SELECT 'DETECÇÕES:' as tipo;
SELECT id, event_id, number FROM detections 
WHERE event_id IN (SELECT id FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%')
LIMIT 10;

-- 3. Verificar classificações existentes
SELECT 'CLASSIFICAÇÕES EXISTENTES:' as tipo;
SELECT id, event_id, dorsal_number FROM classifications 
WHERE event_id IN (SELECT id FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%');

-- 4. Criar classificações básicas (sem timestamp específico)
INSERT INTO classifications (event_id, dorsal_number, device_order, checkpoint_time)
SELECT DISTINCT ON (d.event_id, d.number)
    d.event_id,
    d.number as dorsal_number,
    1 as device_order,
    NOW() as checkpoint_time  -- Usar timestamp atual
FROM detections d
JOIN events e ON d.event_id = e.id
WHERE (e.name ILIKE '%teste1%' OR e.name ILIKE '%test%')
AND NOT EXISTS (
    SELECT 1 FROM classifications c 
    WHERE c.event_id = d.event_id 
    AND c.dorsal_number = d.number
)
ORDER BY d.event_id, d.number;

-- 5. Iniciar o evento se não estiver iniciado
UPDATE events 
SET event_started_at = COALESCE(event_started_at, NOW()),
    is_active = true,
    status = 'active'
WHERE (name ILIKE '%teste1%' OR name ILIKE '%test%')
AND event_started_at IS NULL;

-- 6. Verificar resultado final
SELECT 'RESULTADO FINAL:' as tipo;
SELECT 
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.total_time,
    c.is_penalty
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
ORDER BY c.dorsal_number;
