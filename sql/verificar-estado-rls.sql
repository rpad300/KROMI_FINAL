-- Verificar estado atual do RLS
-- Este script verifica se o RLS está ativo ou desativado

-- Verificar estado do RLS na tabela user_profiles
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity THEN '🔴 ATIVO' 
        ELSE '✅ DESATIVADO' 
    END as "Status"
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Verificar estado do RLS em todas as tabelas de autenticação
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS Ativo",
    CASE 
        WHEN rowsecurity THEN '🔴 ATIVO' 
        ELSE '✅ DESATIVADO' 
    END as "Status"
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs', 'events', 'event_participants')
ORDER BY tablename;

-- Verificar se existem políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_sessions', 'activity_logs', 'events', 'event_participants')
ORDER BY tablename, policyname;

-- Verificar se o utilizador admin tem perfil
SELECT 
    up.user_id,
    up.profile_type,
    up.created_at,
    au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'Rdias300@gmail.com';


