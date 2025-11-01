-- ============================================================================
-- KROMI - Teste completo de um registro falhado
-- ============================================================================
-- Análise detalhada para determinar se o problema é nosso ou dos dados recebidos
-- ============================================================================

-- PARTE 1: BUSCAR UM REGISTRO FALHADO E VALIDAR DADOS RECEBIDOS
-- ============================================================================
SELECT 
    '=== PARTE 1: DADOS DO REGISTRO FALHADO ===' as secao,
    id,
    access_code,
    session_id,
    dorsal_number,
    LENGTH(image_data) as image_data_length,
    LENGTH(display_image) as display_image_length,
    latitude,
    longitude,
    accuracy,
    captured_at,
    status,
    processing_error,
    created_at,
    -- Validações
    CASE 
        WHEN access_code IS NULL THEN '❌ access_code é NULL'
        WHEN LENGTH(access_code) != 6 THEN '⚠️ access_code tem comprimento errado: ' || LENGTH(access_code)
        ELSE '✅ access_code OK'
    END as validacao_access_code,
    CASE 
        WHEN session_id IS NULL THEN '❌ session_id é NULL'
        ELSE '✅ session_id OK'
    END as validacao_session_id,
    CASE 
        WHEN image_data IS NULL THEN '❌ image_data é NULL'
        WHEN LENGTH(image_data) < 100 THEN '⚠️ image_data muito pequena'
        ELSE '✅ image_data OK'
    END as validacao_image_data,
    CASE 
        WHEN latitude IS NULL THEN '❌ latitude é NULL'
        WHEN latitude < -90 OR latitude > 90 THEN '❌ latitude inválida: ' || latitude
        ELSE '✅ latitude OK'
    END as validacao_latitude,
    CASE 
        WHEN longitude IS NULL THEN '❌ longitude é NULL'
        WHEN longitude < -180 OR longitude > 180 THEN '❌ longitude inválida: ' || longitude
        ELSE '✅ longitude OK'
    END as validacao_longitude,
    CASE 
        WHEN captured_at IS NULL THEN '❌ captured_at é NULL'
        ELSE '✅ captured_at OK'
    END as validacao_captured_at
FROM device_detections
WHERE status = 'failed'
LIMIT 1;

-- PARTE 2: VERIFICAR SE O ACCESS_CODE EXISTE EM EVENT_DEVICES
-- ============================================================================
SELECT 
    '=== PARTE 2: VERIFICAR EVENT_DEVICES ===' as secao,
    ed.access_code,
    ed.device_id,
    pg_typeof(ed.device_id) as device_id_type,
    ed.event_id,
    pg_typeof(ed.event_id) as event_id_type,
    ed.checkpoint_name,
    ed.checkpoint_type,
    ed.checkpoint_order,
    e.id as event_id_verificacao,
    e.name as event_name,
    e.status as event_status,
    d.id as device_id_verificacao,
    -- Validações
    CASE 
        WHEN ed.device_id IS NULL THEN '❌ device_id é NULL em event_devices'
        ELSE '✅ device_id existe'
    END as validacao_device_id,
    CASE 
        WHEN ed.event_id IS NULL THEN '❌ event_id é NULL em event_devices'
        ELSE '✅ event_id existe'
    END as validacao_event_id,
    CASE 
        WHEN e.status != 'active' THEN '⚠️ Evento não está ativo: ' || e.status
        ELSE '✅ Evento ativo'
    END as validacao_evento_ativo
FROM device_detections dd
JOIN event_devices ed ON ed.access_code = dd.access_code
JOIN events e ON e.id = ed.event_id
JOIN devices d ON d.id = ed.device_id
WHERE dd.status = 'failed'
LIMIT 1;

-- PARTE 3: TESTAR CONVERSÃO UUID MANUALMENTE
-- ============================================================================
SELECT 
    '=== PARTE 3: TESTE DE CONVERSÃO UUID ===' as secao,
    ed.device_id as device_id_original,
    ed.device_id::UUID as device_id_cast_uuid,
    ed.device_id::TEXT as device_id_cast_text,
    ed.event_id as event_id_original,
    ed.event_id::UUID as event_id_cast_uuid,
    ed.event_id::TEXT as event_id_cast_text,
    -- Testar se consegue fazer CAST de volta
    (ed.device_id::TEXT)::UUID as device_id_text_to_uuid,
    (ed.event_id::TEXT)::UUID as event_id_text_to_uuid
FROM device_detections dd
JOIN event_devices ed ON ed.access_code = dd.access_code
WHERE dd.status = 'failed'
LIMIT 1;

-- PARTE 4: SIMULAR O UPDATE QUE ESTÁ A FALHAR
-- ============================================================================
-- Mostrar exatamente qual seria o UPDATE
SELECT 
    '=== PARTE 4: QUERY DO UPDATE ===' as secao,
    dd.id as detection_id,
    dd.access_code,
    format('
UPDATE device_detections
SET event_id = (SELECT event_id FROM event_devices WHERE access_code = %L LIMIT 1),
    device_id = (SELECT device_id FROM event_devices WHERE access_code = %L LIMIT 1)
WHERE id = %L;',
        dd.access_code,
        dd.access_code,
        dd.id
    ) as update_query
FROM device_detections dd
WHERE dd.status = 'failed'
LIMIT 1;

-- PARTE 5: VERIFICAR TIPO DAS COLUNAS NA TABELA
-- ============================================================================
SELECT 
    '=== PARTE 5: ESTRUTURA DAS TABELAS ===' as secao,
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('device_detections', 'event_devices')
    AND column_name IN ('device_id', 'event_id')
ORDER BY table_name, column_name;

