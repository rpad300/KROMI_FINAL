-- Listar TODOS os triggers, funções e views relacionados a classificações

-- 1. TRIGGERS em classifications
SELECT 
    'TRIGGERS EM CLASSIFICATIONS:' as info;

SELECT 
    tgname as trigger_name,
    proname as function_name,
    pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal
ORDER BY tgname;

-- 2. VIEW event_classifications (ver cálculos)
SELECT 
    'VIEW EVENT_CLASSIFICATIONS:' as info;

SELECT definition
FROM pg_views
WHERE viewname = 'event_classifications';

-- 3. Funções relacionadas a classificações
SELECT 
    'FUNÇÕES DE CLASSIFICAÇÕES:' as info;

SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (
    p.proname LIKE '%classification%' OR
    p.proname LIKE '%total_time%' OR
    p.proname LIKE '%split%' OR
    p.proname LIKE '%ranking%'
)
AND n.nspname = 'public'
AND prokind = 'f'
ORDER BY p.proname;

-- 4. Triggers em detections (se houver)
SELECT 
    'TRIGGERS EM DETECTIONS:' as info;

SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'detections'::regclass
AND NOT tgisinternal
ORDER BY tgname;

