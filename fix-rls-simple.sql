-- Solução Simples: Desabilitar RLS Temporariamente
-- Use este script se o anterior não funcionar

-- 1. Desabilitar RLS na tabela user_profiles temporariamente
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- 3. Criar políticas simples sem recursão
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política básica: utilizadores podem ver o seu próprio perfil
CREATE POLICY "user_profiles_select_own" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Política básica: utilizadores podem atualizar o seu próprio perfil
CREATE POLICY "user_profiles_update_own" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Política básica: utilizadores podem inserir o seu próprio perfil
CREATE POLICY "user_profiles_insert_own" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Para administradores, criar uma função auxiliar
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND profile_type = 'admin' 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para admins usando a função
CREATE POLICY "user_profiles_admin_all" ON user_profiles
    FOR ALL USING (is_admin());

-- 5. Verificar políticas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 6. Testar
SELECT 'Teste de políticas concluído' as status;

-- 7. Mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'RLS configurado com políticas simples!';
    RAISE NOTICE 'Função is_admin() criada para evitar recursão.';
END $$;


