-- Reset completo do evento para teste end-to-end

-- 1. Apagar todas as classificações
DELETE FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Apagar todas as detecções
DELETE FROM detections 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 3. Apagar buffer de imagens
DELETE FROM image_buffer 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 4. Resetar sessões de dispositivos
DELETE FROM device_sessions 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 5. Resetar contadores
UPDATE event_devices 
SET active_sessions = 0 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 6. Verificar que está tudo limpo
SELECT 
    (SELECT COUNT(*) FROM classifications WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as classifications,
    (SELECT COUNT(*) FROM detections WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as detections,
    (SELECT COUNT(*) FROM image_buffer WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as images,
    (SELECT COUNT(*) FROM device_sessions WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575') as sessions;

-- 7. Verificar que trigger está ativo
SELECT 
    trigger_name,
    event_manipulation,
    CASE tgenabled
        WHEN 'O' THEN '✅ Habilitado'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status
FROM pg_trigger t
JOIN information_schema.triggers i ON t.tgname = i.trigger_name
WHERE i.event_object_table = 'classifications'
AND t.tgname = 'trg_calculate_classification_times';


