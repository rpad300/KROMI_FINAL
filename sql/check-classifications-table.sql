-- Verificar se classifications é uma tabela ou view

-- 1. Verificar tipo
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'classifications';

-- 2. Se for VIEW, ver a definição
SELECT 
    viewname,
    definition
FROM pg_views
WHERE viewname = 'classifications';

-- 3. Listar colunas da tabela/view
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'classifications'
ORDER BY ordinal_position;

-- 4. Verificar se há INSTEAD OF triggers (triggers em VIEWs)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'classifications';

-- 5. Mostrar estrutura real da tabela
SELECT 
    'ESTRUTURA DA TABELA BASE:' as info;
    
\d classifications;


