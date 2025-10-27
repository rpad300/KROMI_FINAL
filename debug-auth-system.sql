-- DEBUG: Verificar Estado do Sistema de Autenticação
-- Execute este script para verificar se tudo está correto

-- 1. Verificar se utilizador existe
SELECT 
    'Utilizador:' as tipo,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- 2. Verificar se perfil existe
SELECT 
    'Perfil:' as tipo,
    user_id,
    email,
    profile_type,
    is_active,
    created_at
FROM user_profiles 
WHERE email = 'Rdias300@gmail.com';

-- 3. Verificar se RLS está desabilitado
SELECT 
    'RLS Status:' as tipo,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs')
ORDER BY tablename;

-- 4. Verificar políticas existentes
SELECT 
    'Políticas:' as tipo,
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs')
ORDER BY tablename;

-- 5. Testar inserção em user_sessions (se possível)
-- INSERT INTO user_sessions (user_id, session_token, expires_at, created_at) 
-- SELECT u.id, 'test-token', now() + interval '48 hours', now()
-- FROM auth.users u WHERE u.email = 'Rdias300@gmail.com'
-- ON CONFLICT DO NOTHING;

-- 6. Verificar sessões existentes
SELECT 
    'Sessões:' as tipo,
    COUNT(*) as total_sessoes
FROM user_sessions;

-- 7. Mensagem de status
SELECT 'Sistema verificado - verifique os resultados acima' as status;


