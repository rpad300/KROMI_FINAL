-- Script para verificar e corrigir inconsistências nas estatísticas
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados brutos das classificações
SELECT 'DADOS BRUTOS DAS CLASSIFICAÇÕES:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time,
    split_time,
    is_penalty,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;

-- 2. Contar dorsais únicos
SELECT 'CONTAGEM DE DORSAIS ÚNICOS:' as info;
SELECT 
    COUNT(DISTINCT dorsal_number) as total_dorsais_unicos,
    COUNT(DISTINCT CASE WHEN total_time IS NOT NULL AND is_penalty = false THEN dorsal_number END) as dorsais_completados
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Verificar melhor tempo por dorsal
SELECT 'MELHOR TEMPO POR DORSAL:' as info;
SELECT 
    dorsal_number,
    MIN(total_time) as melhor_tempo,
    COUNT(*) as num_checkpoints
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NOT NULL
AND is_penalty = false
GROUP BY dorsal_number
ORDER BY melhor_tempo ASC;

-- 4. Verificar se há registros duplicados ou inconsistentes
SELECT 'VERIFICAÇÃO DE DUPLICATAS:' as info;
SELECT 
    dorsal_number,
    COUNT(*) as num_registros,
    COUNT(DISTINCT device_order) as num_checkpoints_distintos,
    COUNT(DISTINCT total_time) as num_tempos_distintos
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
GROUP BY dorsal_number
ORDER BY dorsal_number;

-- 5. Limpar registros duplicados se necessário (manter apenas o melhor tempo por dorsal)
DELETE FROM classifications 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY event_id, dorsal_number 
                   ORDER BY total_time ASC NULLS LAST
               ) as rn
        FROM classifications 
        WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
    ) t 
    WHERE rn > 1
);

-- 6. Verificar resultado após limpeza
SELECT 'RESULTADO APÓS LIMPEZA:' as info;
SELECT 
    dorsal_number,
    device_order,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number, device_order;
