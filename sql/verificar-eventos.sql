-- Verificar eventos na base de dados
-- Este script verifica se existem eventos e se há problemas de acesso

-- Verificar se a tabela events existe
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'events';

-- Verificar estrutura da tabela events
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- Verificar se existem eventos
SELECT 
    COUNT(*) as total_eventos,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as eventos_ativos,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as eventos_completos,
    COUNT(CASE WHEN status = 'paused' THEN 1 END) as eventos_pausados
FROM events;

-- Verificar eventos recentes
SELECT 
    id,
    name,
    status,
    created_at,
    updated_at
FROM events 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar permissões na tabela events
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'events';

-- Verificar se RLS está ativo na tabela events
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity THEN '🔴 ATIVO' 
        ELSE '✅ DESATIVADO' 
    END as "Status"
FROM pg_tables 
WHERE tablename = 'events';


