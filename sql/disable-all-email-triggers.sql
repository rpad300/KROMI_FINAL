-- Desabilitar temporariamente TODOS os triggers de email
-- Para permitir que o sistema funcione enquanto depuramos

-- 1. Verificar todos os triggers ativos
SELECT 
    'TRIGGERS ATIVOS:' as info;

SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT tgisinternal
AND tgname LIKE '%email%'
ORDER BY tgrelid::regclass::text, tgname;

-- 2. Desabilitar triggers de email
ALTER TABLE classifications DISABLE TRIGGER IF EXISTS trigger_classification_notification_email;
ALTER TABLE detections DISABLE TRIGGER IF EXISTS trigger_detection_notification_email;
ALTER TABLE participants DISABLE TRIGGER IF EXISTS trigger_registration_notification_email;

-- Ou desabilitar TODOS os triggers user-defined
ALTER TABLE classifications DISABLE TRIGGER USER;

-- 3. Verificar se foram desabilitados
SELECT 
    'TRIGGERS APÓS DESABILITAR:' as info;

SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as is_enabled,
    CASE 
        WHEN tgenabled = 'O' THEN 'Habilitado'
        WHEN tgenabled = 'D' THEN 'Desabilitado'
        WHEN tgenabled = 'R' THEN 'Replica only'
        WHEN tgenabled = 'A' THEN 'Always'
        ELSE 'Unknown'
    END as status
FROM pg_trigger
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal;

-- 4. Para reabilitar depois (quando corrigirmos):
-- ALTER TABLE classifications ENABLE TRIGGER trigger_classification_notification_email;
-- ALTER TABLE classifications ENABLE TRIGGER USER;


