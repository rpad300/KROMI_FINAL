-- Desativar RLS na tabela audit_logs
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Remover políticas
DROP POLICY IF EXISTS "Users can view their own activities" ON audit_logs;
DROP POLICY IF EXISTS "Users can create their own activities" ON audit_logs;

-- Verificar
SELECT 
    tablename,
    rowsecurity as rls_ativo
FROM pg_tables 
WHERE tablename = 'audit_logs';

SELECT 'RLS desativado em audit_logs! Auditoria funcionará corretamente.' as mensagem;

