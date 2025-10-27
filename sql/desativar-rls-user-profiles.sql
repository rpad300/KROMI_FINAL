-- ==========================================
-- DESATIVAR RLS em user_profiles
-- ==========================================
-- 
-- Resolve: infinite recursion detected in policy
-- 
-- Execute no Supabase SQL Editor
-- ==========================================

-- 1. Desativar RLS na tabela user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas RLS existentes
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

-- 3. Verificar que RLS está desativado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 4. Verificar que não há políticas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 5. Testar query simples
SELECT COUNT(*) as total_profiles FROM user_profiles;

SELECT 
    id,
    user_id,
    name,
    email,
    role,
    status,
    created_at
FROM user_profiles
LIMIT 5;

-- ==========================================
-- RESULTADO ESPERADO:
-- - rowsecurity = false (RLS desativado)
-- - 0 políticas na tabela
-- - Query retorna dados sem erro
-- ==========================================

SELECT 'RLS desativado com sucesso! Tabela user_profiles acessível.' as mensagem;



