-- Script simplificado para criar classificações para teste1
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos verificar o que temos
SELECT 'EVENTOS:' as tipo;
SELECT id, name, event_started_at, is_active FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%';

SELECT 'DETECÇÕES:' as tipo;
SELECT id, event_id, number, detected_at FROM detections 
WHERE event_id IN (SELECT id FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%')
ORDER BY detected_at DESC LIMIT 10;

SELECT 'CLASSIFICAÇÕES EXISTENTES:' as tipo;
SELECT id, event_id, dorsal_number, checkpoint_time FROM classifications 
WHERE event_id IN (SELECT id FROM events WHERE name ILIKE '%teste1%' OR name ILIKE '%test%');

-- 2. Criar classificações baseadas nas detecções
INSERT INTO classifications (event_id, dorsal_number, device_order, checkpoint_time, detection_id)
SELECT DISTINCT ON (d.event_id, d.number)
    d.event_id,
    d.number as dorsal_number,
    1 as device_order,
    d.detected_at as checkpoint_time,
    d.id as detection_id
FROM detections d
JOIN events e ON d.event_id = e.id
WHERE (e.name ILIKE '%teste1%' OR e.name ILIKE '%test%')
AND NOT EXISTS (
    SELECT 1 FROM classifications c 
    WHERE c.event_id = d.event_id 
    AND c.dorsal_number = d.number
)
ORDER BY d.event_id, d.number, d.detected_at ASC;

-- 3. Iniciar o evento se não estiver iniciado
UPDATE events 
SET event_started_at = COALESCE(event_started_at, NOW()),
    is_active = true,
    status = 'active'
WHERE (name ILIKE '%teste1%' OR name ILIKE '%test%')
AND event_started_at IS NULL;

-- 4. Atualizar classificações
SELECT update_classifications(id) 
FROM events 
WHERE name ILIKE '%teste1%' OR name ILIKE '%test%';

-- 5. Verificar resultado final
SELECT 'RESULTADO FINAL:' as tipo;
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
