-- Verificar estado do buffer de imagens

-- 1. Contar por status
SELECT 
    status,
    COUNT(*) as count,
    MIN(captured_at) as oldest,
    MAX(captured_at) as newest
FROM image_buffer
GROUP BY status
ORDER BY count DESC;

-- 2. Ver últimas 20 imagens
SELECT 
    id,
    event_id,
    device_id,
    status,
    captured_at,
    processed_at,
    LENGTH(image_data) as image_size
FROM image_buffer
ORDER BY captured_at DESC
LIMIT 20;

-- 3. Ver imagens pending (para processar)
SELECT 
    COUNT(*) as pending_count,
    MIN(captured_at) as oldest_pending,
    MAX(captured_at) as newest_pending
FROM image_buffer
WHERE status = 'pending';

-- 4. Se houver imagens pending mas não processam:
-- Marcar manualmente como pending para reprocessar
-- UPDATE image_buffer SET status = 'pending' WHERE status = 'processing';

