-- DESABILITAR RLS APENAS (SEM TESTES DE INSERÇÃO)
-- Execute este script para resolver os erros 403/42501

-- 1. Desabilitar RLS em todas as tabelas
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all" ON user_profiles;

-- Remover políticas de user_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;

-- Remover políticas de activity_logs
DROP POLICY IF EXISTS "Users can view their own activities" ON activity_logs;
DROP POLICY IF EXISTS "Users can create their own activities" ON activity_logs;

-- Remover políticas de events
DROP POLICY IF EXISTS "Event managers can view their events" ON events;
DROP POLICY IF EXISTS "Event managers can create events" ON events;

-- Remover políticas de event_participants
DROP POLICY IF EXISTS "Participants can view their own registrations" ON event_participants;

-- 3. Verificar status das tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs', 'events', 'event_participants')
ORDER BY tablename;

-- 4. Mensagem de sucesso
SELECT 'RLS desabilitado em todas as tabelas! Sistema deve funcionar completamente.' as status;


