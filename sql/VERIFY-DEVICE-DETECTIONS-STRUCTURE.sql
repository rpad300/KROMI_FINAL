-- ============================================================================
-- KROMI - Verificar estrutura da tabela device_detections
-- ============================================================================
-- Este script verifica o tipo real das colunas na base de dados
-- ============================================================================

-- Verificar tipo das colunas
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'device_detections'
    AND column_name IN ('device_id', 'event_id')
ORDER BY column_name;

-- Verificar se a função process_device_detection existe
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'process_device_detection';

-- Verificar estrutura da tabela event_devices (para comparação)
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'event_devices'
    AND column_name IN ('device_id', 'event_id')
ORDER BY column_name;

-- Verificar dados de exemplo de event_devices
SELECT 
    access_code,
    device_id,
    pg_typeof(device_id) as device_id_type,
    event_id,
    pg_typeof(event_id) as event_id_type
FROM event_devices
WHERE access_code = '9HLH97'
LIMIT 1;

