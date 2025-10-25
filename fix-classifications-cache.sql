-- Script para resolver problema de cache nas classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'VERIFICAÇÃO INICIAL:' as info;
SELECT 
    dorsal_number,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Recriar a view para forçar atualização
DROP VIEW IF EXISTS event_classifications;

CREATE VIEW event_classifications AS
SELECT 
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.split_time,
    c.total_time,
    c.is_penalty,
    c.penalty_reason,
    c.detection_id,
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id 
        ORDER BY 
            CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
            c.total_time ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY c.event_id, position;

-- 3. Verificar resultado final
SELECT 'RESULTADO FINAL:' as info;
SELECT 
    dorsal_number,
    position,
    total_time,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status_foto
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;

-- 4. Verificar se há dados inconsistentes
SELECT 'VERIFICAÇÃO DE INCONSISTÊNCIAS:' as info;
SELECT 
    c.dorsal_number,
    c.detection_id,
    d.id as detection_exists,
    CASE 
        WHEN d.id IS NOT NULL THEN '✅ Detecção existe'
        ELSE '❌ Detecção não encontrada'
    END as status_detection
FROM classifications c
LEFT JOIN detections d ON c.detection_id = d.id
WHERE c.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY c.dorsal_number;
