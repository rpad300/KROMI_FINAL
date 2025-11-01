-- ============================================================================
-- Remover classificações DUPLICADAS
-- Manter apenas a mais antiga por (event_id, dorsal_number, device_order)
-- ============================================================================

-- 1. Ver quais dorsais têm classificações duplicadas
SELECT 
    'CLASSIFICAÇÕES DUPLICADAS:' as tipo,
    event_id,
    dorsal_number,
    device_order,
    COUNT(*) as total
FROM classifications
GROUP BY event_id, dorsal_number, device_order
HAVING COUNT(*) > 1
ORDER BY event_id, dorsal_number, device_order;

-- 2. Ver detalhes completos dos duplicados
WITH duplicates AS (
    SELECT 
        event_id,
        dorsal_number,
        device_order,
        COUNT(*) as total
    FROM classifications
    GROUP BY event_id, dorsal_number, device_order
    HAVING COUNT(*) > 1
)
SELECT 
    'DETALHES DOS DUPLICADOS:' as tipo,
    c.id,
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.created_at,
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id, c.dorsal_number, c.device_order 
        ORDER BY c.created_at ASC
    ) as numero_ordem
FROM classifications c
INNER JOIN duplicates d ON 
    c.event_id = d.event_id 
    AND c.dorsal_number = d.dorsal_number 
    AND c.device_order = d.device_order
ORDER BY c.event_id, c.dorsal_number, c.device_order, c.created_at;

-- 3. REMOVER DUPLICADOS (manter apenas o mais antigo)
DELETE FROM classifications
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY event_id, dorsal_number, device_order 
                ORDER BY created_at ASC
            ) as rn
        FROM classifications
    ) sub
    WHERE rn > 1  -- Manter apenas o primeiro (rn = 1), remover os outros
);

-- 4. Criar CONSTRAINT UNIQUE para evitar futuros duplicados
DO $$
BEGIN
    -- Verificar se já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'classifications_event_dorsal_checkpoint_unique'
    ) THEN
        ALTER TABLE classifications 
        ADD CONSTRAINT classifications_event_dorsal_checkpoint_unique 
        UNIQUE (event_id, dorsal_number, device_order);
        
        RAISE NOTICE '✅ Constraint UNIQUE adicionada - duplicados não serão mais possíveis';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint UNIQUE já existe';
    END IF;
END $$;

-- 5. Verificar resultado final
SELECT 
    'APÓS LIMPEZA:' as tipo,
    event_id,
    dorsal_number,
    device_order,
    COUNT(*) as total
FROM classifications
GROUP BY event_id, dorsal_number, device_order
HAVING COUNT(*) > 1;  -- Não deve retornar nada

-- 6. Estatísticas finais
SELECT 
    'ESTATÍSTICAS FINAIS:' as tipo,
    COUNT(*) as total_classificacoes,
    COUNT(DISTINCT event_id) as total_eventos,
    COUNT(DISTINCT dorsal_number) as total_dorsais
FROM classifications;

