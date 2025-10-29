-- Listar ABSOLUTAMENTE TODOS os triggers do banco

SELECT 
    t.tgrelid::regclass::text as table_name,
    t.tgname as trigger_name,
    p.proname as function_name,
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
    CASE tgenabled
        WHEN 'O' THEN '✅ Ativo'
        WHEN 'D' THEN '❌ Desabilitado'
    END as status,
    pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE NOT tgisinternal
AND tgrelid::regclass::text NOT LIKE 'pg_%'  -- Excluir tabelas sistema
AND tgrelid::regclass::text NOT LIKE 'sql_%'
ORDER BY 
    t.tgrelid::regclass::text,
    CASE 
        WHEN tgtype & 2 = 2 THEN 1  -- BEFORE
        ELSE 2  -- AFTER
    END,
    t.tgname;

