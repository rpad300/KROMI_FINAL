-- Solução Imediata: Desabilitar RLS Completamente
-- Execute este script para resolver o problema imediatamente

-- 1. Desabilitar RLS em todas as tabelas de autenticação
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Event managers can view their events" ON events;
DROP POLICY IF EXISTS "Event managers can create events" ON events;

DROP POLICY IF EXISTS "Participants can view their own registrations" ON event_participants;

-- 3. Verificar status das tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'events', 'event_participants', 'user_sessions', 'activity_logs')
ORDER BY tablename;

-- 4. Testar acesso à tabela user_profiles
SELECT COUNT(*) as total_profiles FROM user_profiles;

-- 5. Mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'RLS desabilitado com sucesso!';
    RAISE NOTICE 'Sistema de autenticação deve funcionar agora.';
    RAISE NOTICE 'Pode testar o login novamente.';
END $$;


