-- ============================================================================
-- KROMI - Análise direta do problema UUID (retorna resultados)
-- ============================================================================

-- 1. Verificar estrutura das colunas
SELECT 
    'ESTRUTURA' as tipo_query,
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name IN ('device_detections', 'event_devices')
    AND column_name IN ('device_id', 'event_id')
ORDER BY table_name, column_name;

-- 2. Buscar um registro falhado e seu event_device correspondente
WITH failed_record AS (
    SELECT id, access_code, device_id, event_id,
           pg_typeof(device_id) as device_id_type_atual,
           pg_typeof(event_id) as event_id_type_atual
    FROM device_detections
    WHERE status = 'failed'
    LIMIT 1
),
device_info AS (
    SELECT fr.id as detection_id,
           fr.access_code,
           ed.device_id,
           ed.event_id,
           pg_typeof(ed.device_id) as device_id_type_source,
           pg_typeof(ed.event_id) as event_id_type_source,
           ed.device_id::TEXT as device_id_as_text,
           ed.event_id::TEXT as event_id_as_text
    FROM failed_record fr
    JOIN event_devices ed ON ed.access_code = fr.access_code
)
SELECT 
    'DADOS' as tipo_query,
    detection_id,
    access_code,
    device_id,
    device_id_type_source,
    device_id_as_text,
    event_id,
    event_id_type_source,
    event_id_as_text
FROM device_info;

-- 3. Tentar fazer o UPDATE que está a falhar (simulação)
-- Mostrar exatamente qual é a query que está a falhar
SELECT 
    'QUERY_FALHA' as tipo_query,
    format('UPDATE device_detections SET device_id = %L::UUID, event_id = %L::UUID WHERE id = %L',
           ed.device_id,
           ed.event_id,
           dd.id
    ) as update_query_que_falha
FROM device_detections dd
JOIN event_devices ed ON ed.access_code = dd.access_code
WHERE dd.status = 'failed'
LIMIT 1;

