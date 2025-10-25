-- Script para corrigir total_time do dorsal 401
-- Execute este script no Supabase SQL Editor

-- 1. Verificar status do evento
SELECT 'STATUS DO EVENTO:' as info;
SELECT 
    name,
    is_active,
    event_started_at,
    event_ended_at,
    status
FROM events 
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Verificar classificações antes da correção
SELECT 'CLASSIFICAÇÕES ANTES DA CORREÇÃO:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_time DESC;

-- 3. Atualizar total_time para o dorsal 401
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at 
    FROM events 
    WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
)
WHERE dorsal_number = 401 
AND event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL;

-- 4. Verificar classificações após a correção
SELECT 'CLASSIFICAÇÕES APÓS A CORREÇÃO:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    detection_id
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_time DESC;

-- 5. Verificar se o evento está ativo (se não estiver, ativar)
UPDATE events 
SET is_active = true,
    event_started_at = COALESCE(event_started_at, NOW() - INTERVAL '1 hour')
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND (is_active = false OR event_started_at IS NULL);

-- 6. Recalcular todos os total_time
UPDATE classifications 
SET total_time = checkpoint_time - (
    SELECT event_started_at 
    FROM events 
    WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
)
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
AND total_time IS NULL;

-- 7. Resultado final
SELECT 'RESULTADO FINAL:' as info;
SELECT 
    dorsal_number,
    checkpoint_time,
    total_time,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status_foto
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY total_time ASC NULLS LAST;
