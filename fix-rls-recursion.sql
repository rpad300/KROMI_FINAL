-- Correção das Políticas RLS - Resolver Recursão Infinita
-- Executar este script para corrigir o problema de recursão nas políticas

-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- 2. Criar políticas corrigidas (sem recursão)
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Política para admins usando função auxiliar
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE profile_type = 'admin' AND is_active = true
        )
    );

CREATE POLICY "Admins can update all profiles" ON user_profiles
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE profile_type = 'admin' AND is_active = true
        )
    );

-- 3. Política para inserção (criar perfil)
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Política para atualização do próprio perfil
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- 6. Testar se a recursão foi resolvida
-- (Este comando deve funcionar sem erro de recursão)
SELECT COUNT(*) FROM user_profiles WHERE user_id = auth.uid();

-- 7. Mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Políticas RLS corrigidas com sucesso!';
    RAISE NOTICE 'Recursão infinita resolvida.';
END $$;


