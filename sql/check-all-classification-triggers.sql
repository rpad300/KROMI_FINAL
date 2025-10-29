-- Verificar todos os triggers na tabela classifications

-- 1. Listar todos os triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'classifications'
ORDER BY trigger_name;

-- 2. Ver a definição completa das funções dos triggers
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%classification%'
AND routine_type = 'FUNCTION';

-- 3. Listar triggers ativos no PostgreSQL
SELECT 
    tgname as trigger_name,
    proname as function_name,
    tgrelid::regclass as table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal;

