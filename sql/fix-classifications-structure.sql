-- Script corrigido para atualizar classificações (sem detection_id)
-- Execute este script no Supabase SQL Editor

-- 1. Verificar dados atuais
SELECT 'VERIFICAÇÃO INICIAL:' as info;
SELECT 
    dorsal_number,
    device_order,
    checkpoint_time,
    total_time
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Recriar a view sem detection_id
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
    -- Remover detection_id se não existir
    NULL::uuid as detection_id, -- Placeholder para compatibilidade
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
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status_foto
FROM event_classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY position;

-- 4. Adicionar coluna detection_id se necessário
DO $$
BEGIN
    -- Verificar se a coluna detection_id existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classifications' 
        AND column_name = 'detection_id'
    ) THEN
        -- Adicionar coluna detection_id
        ALTER TABLE classifications ADD COLUMN detection_id UUID REFERENCES detections(id);
        RAISE NOTICE 'Coluna detection_id adicionada à tabela classifications';
    ELSE
        RAISE NOTICE 'Coluna detection_id já existe na tabela classifications';
    END IF;
END $$;

-- 5. Verificar se a coluna foi adicionada
SELECT 'VERIFICAÇÃO PÓS-ADIÇÃO:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'classifications' 
            AND column_name = 'detection_id'
        ) THEN '✅ Coluna detection_id existe'
        ELSE '❌ Coluna detection_id NÃO existe'
    END as status_detection_id;
