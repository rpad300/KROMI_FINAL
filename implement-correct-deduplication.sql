-- Script para implementar deduplicação correta
-- Regra: Apenas a primeira detecção de cada dorsal em cada checkpoint conta
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais antes da limpeza
SELECT 'DADOS ANTES DA LIMPEZA:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id,
    ROW_NUMBER() OVER (PARTITION BY dorsal_number, device_order ORDER BY checkpoint_time ASC) as ordem_deteccao
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order, checkpoint_time;

-- 2. Identificar registros duplicados (manter apenas o primeiro de cada dorsal/checkpoint)
SELECT 'REGISTROS A MANTER (PRIMEIRA DETECÇÃO):' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id
FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY dorsal_number, device_order ORDER BY checkpoint_time ASC) as rn
    FROM classifications 
    WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
) ranked
WHERE rn = 1
ORDER BY dorsal_number, device_order;

-- 3. Deletar registros duplicados (manter apenas a primeira detecção)
DELETE FROM classifications 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY dorsal_number, device_order ORDER BY checkpoint_time ASC) as rn
        FROM classifications 
        WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
    ) ranked
    WHERE rn > 1
);

-- 4. Verificar resultado após limpeza
SELECT 'DADOS APÓS LIMPEZA:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 5. Recalcular split_time após limpeza
UPDATE classifications c2
SET split_time = c2.checkpoint_time - c1.checkpoint_time
FROM classifications c1
WHERE c2.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND c2.device_order > 1
AND c1.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND c1.dorsal_number = c2.dorsal_number
AND c1.device_order = c2.device_order - 1;

-- 6. Verificar resultado final
SELECT 'RESULTADO FINAL:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 7. Contar estatísticas finais
SELECT 'ESTATÍSTICAS FINAIS:' as info;
SELECT 
    COUNT(DISTINCT dorsal_number) as total_dorsais,
    COUNT(DISTINCT CASE WHEN total_time IS NOT NULL AND is_penalty = false THEN dorsal_number END) as dorsais_completados,
    MIN(CASE WHEN is_penalty = false THEN total_time END) as melhor_tempo,
    AVG(CASE WHEN is_penalty = false THEN EXTRACT(EPOCH FROM total_time) END) as tempo_medio_segundos
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';
