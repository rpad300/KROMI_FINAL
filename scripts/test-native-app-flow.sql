-- ============================================================================
-- KROMI - Teste Completo do Fluxo da App Nativa
-- ============================================================================
-- Execute este SQL para testar todo o fluxo de funcionamento
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar Dispositivo de Teste
-- ============================================================================

-- Criar evento de teste (se não existir)
INSERT INTO events (id, name, event_date, status, event_type)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'Evento Teste App Nativa',
    CURRENT_DATE,
    'active',
    'running'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    status = 'active';

-- Criar dispositivo de teste
SELECT create_device_for_event(
    p_event_id := '00000000-0000-0000-0000-000000000001'::UUID,
    p_device_name := 'Teste Android App',
    p_device_type := 'mobile',
    p_checkpoint_name := 'Meta Principal Teste',
    p_checkpoint_type := 'finish',
    p_checkpoint_order := 1,
    p_device_pin := '123456',
    p_max_sessions := 1
);

-- Verificar QR code gerado
SELECT 
    access_code,
    checkpoint_name,
    checkpoint_type,
    checkpoint_order,
    device_pin
FROM device_qr_info
WHERE device_name = 'Teste Android App';

-- ============================================================================
-- PASSO 2: Testar Login (get_device_info_by_qr)
-- ============================================================================

-- Substituir 'ABC123' pelo access_code retornado acima
SELECT * FROM get_device_info_by_qr('ABC123');

-- ============================================================================
-- PASSO 3: Testar Envio de Dados (save_device_detection)
-- ============================================================================

-- Teste 1: Enviar COM dorsal (deve ir direto para detections)
SELECT save_device_detection(
    p_access_code := 'ABC123',  -- Substituir pelo access_code real
    p_session_id := 'session-test-1',
    p_dorsal_number := 42,      -- Dorsal lido pela app
    p_image_data := 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',  -- Base64 mínimo válido
    p_display_image := 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    p_image_metadata := '{"width": 1920, "height": 1080, "device_type": "android"}'::JSONB,
    p_latitude := 40.7128,
    p_longitude := -74.0060,
    p_accuracy := 10.5,
    p_captured_at := NOW()
);

-- Teste 2: Enviar SEM dorsal (deve ir para buffer)
SELECT save_device_detection(
    p_access_code := 'ABC123',  -- Substituir pelo access_code real
    p_session_id := 'session-test-2',
    p_dorsal_number := NULL,    -- App não conseguiu ler
    p_image_data := 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    p_display_image := NULL,
    p_image_metadata := '{"width": 1920, "height": 1080, "device_type": "android"}'::JSONB,
    p_latitude := 40.7128,
    p_longitude := -74.0060,
    p_accuracy := 10.5,
    p_captured_at := NOW()
);

-- ============================================================================
-- PASSO 4: Verificar Registros Criados
-- ============================================================================

SELECT 
    id,
    access_code,
    session_id,
    dorsal_number,
    status,
    created_at
FROM device_detections
WHERE session_id LIKE 'session-test-%'
ORDER BY created_at DESC;

-- ============================================================================
-- PASSO 5: Processar Registros (simular serviço backend)
-- ============================================================================

-- Processar lote
SELECT process_pending_detections(10);

-- ============================================================================
-- PASSO 6: Verificar Resultados
-- ============================================================================

-- Verificar se foram processados
SELECT 
    id,
    status,
    dorsal_number,
    detection_id,  -- Se tem dorsal, deve ter detection_id
    buffer_id,     -- Se não tem dorsal, deve ter buffer_id
    processed_at
FROM device_detections
WHERE session_id LIKE 'session-test-%'
ORDER BY created_at DESC;

-- Verificar se detecção foi criada (teste 1 - com dorsal)
SELECT 
    id,
    number,
    event_id,
    device_order,
    timestamp
FROM detections
WHERE session_id = 'session-test-1'
ORDER BY timestamp DESC
LIMIT 1;

-- Verificar se imagem foi para buffer (teste 2 - sem dorsal)
SELECT 
    id,
    event_id,
    device_id,
    status
FROM image_buffer
WHERE session_id = 'session-test-2'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- LIMPEZA (Opcional - remover dados de teste)
-- ============================================================================

-- Descomente para limpar:
/*
DELETE FROM device_detections WHERE session_id LIKE 'session-test-%';
DELETE FROM detections WHERE session_id = 'session-test-1';
DELETE FROM image_buffer WHERE session_id = 'session-test-2';
DELETE FROM event_devices WHERE device_id IN (
    SELECT id FROM devices WHERE device_name = 'Teste Android App'
);
DELETE FROM devices WHERE device_name = 'Teste Android App';
*/

-- ============================================================================
-- RESUMO
-- ============================================================================
-- Se tudo funcionou:
-- ✅ Dispositivo criado com QR code
-- ✅ Login funciona (get_device_info_by_qr)
-- ✅ Envio funciona (save_device_detection)
-- ✅ Processamento funciona (process_pending_detections)
-- ✅ Com dorsal → detections criada
-- ✅ Sem dorsal → imagem no buffer
-- ============================================================================

