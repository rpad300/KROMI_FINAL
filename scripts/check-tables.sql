-- ============================================================================
-- KROMI - Verificar Tabelas da App Nativa
-- ============================================================================
-- Execute este SQL no Supabase Dashboard → SQL Editor para verificar
-- ============================================================================

-- 1. Verificar se device_detections existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_detections')
        THEN '✅ Tabela device_detections EXISTE'
        ELSE '❌ Tabela device_detections NÃO EXISTE'
    END as status_device_detections;

-- 2. Verificar se image_buffer existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'image_buffer')
        THEN '✅ Tabela image_buffer EXISTE'
        ELSE '❌ Tabela image_buffer NÃO EXISTE'
    END as status_image_buffer;

-- 3. Verificar se event_devices tem access_code
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_devices' AND column_name = 'access_code'
        )
        THEN '✅ Coluna access_code EXISTE em event_devices'
        ELSE '❌ Coluna access_code NÃO EXISTE em event_devices'
    END as status_access_code;

-- 4. Verificar funções RPC
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('save_device_detection', 'get_device_info_by_qr', 'process_device_detection', 'process_pending_detections')
        THEN '✅'
        ELSE '⚠️'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('save_device_detection', 'get_device_info_by_qr', 'process_device_detection', 'process_pending_detections')
ORDER BY routine_name;

-- 5. Verificar view device_qr_info
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_name = 'device_qr_info'
        )
        THEN '✅ View device_qr_info EXISTE'
        ELSE '❌ View device_qr_info NÃO EXISTE'
    END as status_view;

-- 6. Resumo de todas as tabelas relacionadas
SELECT 
    'Tabelas da App Nativa' as categoria,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('device_detections', 'image_buffer', 'detections', 'event_devices', 'devices', 'events')
ORDER BY table_name;

