-- Desabilitar triggers migrados para JavaScript
-- (mantém emails e updated_at)

-- 1. Desabilitar triggers de classificações (migrado para classification-logic.js)
ALTER TABLE classifications DISABLE TRIGGER trg_calculate_classification_times;

-- 2. Desabilitar triggers de detecções (migrado para classification-logic.js)
ALTER TABLE detections DISABLE TRIGGER trg_process_activity_detection;
ALTER TABLE detections DISABLE TRIGGER trg_process_lap_detection;

-- 3. Verificar quais ficaram ativos
SELECT 
    t.tgrelid::regclass::text as table_name,
    t.tgname as trigger_name,
    CASE tgenabled
        WHEN 'O' THEN '✅ Ativo'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status
FROM pg_trigger t
WHERE NOT tgisinternal
AND t.tgrelid::regclass::text IN ('classifications', 'detections', 'participants')
ORDER BY t.tgrelid::regclass::text, t.tgname;

-- 4. Resumo
SELECT 
    '✅ Triggers mantidos (SQL):' as info;

SELECT 
    t.tgrelid::regclass::text as table_name,
    t.tgname as trigger_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT tgisinternal
AND tgenabled = 'O'
AND t.tgrelid::regclass::text NOT LIKE '%storage%'
AND t.tgrelid::regclass::text NOT LIKE '%realtime%'
ORDER BY t.tgrelid::regclass::text;

