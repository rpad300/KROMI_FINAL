-- Limpar completamente a tabela image_buffer

-- 1. Verificar antes
SELECT 
    'ANTES DE APAGAR:' as info,
    COUNT(*) as total_images,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'processing') as processing,
    COUNT(*) FILTER (WHERE status = 'processed') as processed,
    COUNT(*) FILTER (WHERE status = 'error') as errors
FROM image_buffer;

-- 2. APAGAR TUDO
DELETE FROM image_buffer;

-- 3. Verificar depois
SELECT 
    'APÓS APAGAR:' as info,
    COUNT(*) as total_images
FROM image_buffer;

-- Se quiser apagar apenas de um evento específico, use:
-- DELETE FROM image_buffer WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- Se quiser apagar apenas com status específico:
-- DELETE FROM image_buffer WHERE status IN ('error', 'discarded');

