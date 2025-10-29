-- Ver TODOS os triggers na tabela classifications

-- 1. Triggers ativos e desabilitados
SELECT 
    tgname as trigger_name,
    proname as function_name,
    CASE tgenabled
        WHEN 'O' THEN '✅ Habilitado'
        WHEN 'D' THEN '❌ Desabilitado'
        WHEN 'A' THEN '🔄 Sempre'
        WHEN 'R' THEN '📋 Replica'
    END as status,
    CASE 
        WHEN tgtype & 2 = 2 THEN 'BEFORE'
        WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE 
        WHEN tgtype & 4 = 4 THEN 'INSERT'
        WHEN tgtype & 8 = 8 THEN 'DELETE'
        WHEN tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'MULTIPLE'
    END as operation,
    CASE 
        WHEN tgtype & 1 = 1 THEN 'ROW'
        ELSE 'STATEMENT'
    END as level
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal
ORDER BY tgname;

-- 2. Ver código de TODAS as funções trigger
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%classification%'
AND n.nspname = 'public'
AND prokind = 'f'
ORDER BY p.proname;

-- 3. Ver ordem de execução dos triggers
SELECT 
    tgname,
    proname,
    CASE 
        WHEN tgtype & 2 = 2 THEN 1  -- BEFORE
        WHEN tgtype & 64 = 64 THEN 2  -- INSTEAD OF
        ELSE 3  -- AFTER
    END as execution_order
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'classifications'::regclass
AND NOT tgisinternal
AND tgenabled = 'O'
ORDER BY execution_order, tgname;


