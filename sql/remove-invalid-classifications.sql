-- ============================================================================
-- Remover classificações de dorsais que NÃO estão registados como participantes
-- ============================================================================

-- 1. Ver quais dorsais têm classificações mas NÃO são participantes
SELECT 
    'CLASSIFICAÇÕES INVÁLIDAS:' as tipo,
    c.dorsal_number,
    c.event_id,
    COUNT(*) as total_classificacoes
FROM classifications c
WHERE NOT EXISTS (
    SELECT 1 FROM participants p 
    WHERE p.event_id = c.event_id 
    AND p.dorsal_number = c.dorsal_number
)
GROUP BY c.event_id, c.dorsal_number
ORDER BY c.event_id, c.dorsal_number;

-- 2. Ver detalhes das classificações inválidas
SELECT 
    'DETALHES DAS INVÁLIDAS:' as tipo,
    c.id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE NOT EXISTS (
    SELECT 1 FROM participants p 
    WHERE p.event_id = c.event_id 
    AND p.dorsal_number = c.dorsal_number
)
ORDER BY c.checkpoint_time DESC
LIMIT 10;

-- 3. REMOVER classificações inválidas (descomente para executar)
DELETE FROM classifications
WHERE NOT EXISTS (
    SELECT 1 FROM participants p 
    WHERE p.event_id = classifications.event_id 
    AND p.dorsal_number = classifications.dorsal_number
);

-- 4. Verificar resultado
-- SELECT 
--     'APÓS REMOÇÃO:' as tipo,
--     COUNT(*) as total_classificacoes_restantes
-- FROM classifications;

