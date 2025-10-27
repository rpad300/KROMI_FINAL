-- ==========================================
-- SCRIPT PARA APLICAR CORREÇÃO ESSENCIAL
-- ==========================================
-- 
-- Execute este script no Supabase SQL Editor
-- para corrigir a estrutura da tabela user_profiles
-- 
-- Data: 2025-10-25
-- ==========================================

-- 1. Adicionar coluna 'role' se não existir
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user'));

-- 2. Adicionar coluna 'status' se não existir
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- 3. Adicionar coluna 'name' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'name'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'full_name'
        ) THEN
            ALTER TABLE user_profiles RENAME COLUMN full_name TO name;
        ELSE
            ALTER TABLE user_profiles ADD COLUMN name TEXT;
        END IF;
    END IF;
END $$;

-- 4. Adicionar coluna 'organization' se não existir
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization TEXT;

-- 5. Adicionar coluna 'last_login' se não existir
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 6. Adicionar coluna 'login_count' se não existir
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- 7. Migrar dados de profile_type para role se necessário
UPDATE user_profiles 
SET role = CASE 
    WHEN profile_type = 'admin' THEN 'admin'
    WHEN profile_type = 'event_manager' THEN 'moderator'
    WHEN profile_type = 'participant' THEN 'user'
    ELSE 'user'
END
WHERE role IS NULL OR role = 'user';

-- 8. Criar índices básicos
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- 9. Ativar RLS se não estiver ativo
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas básicas se não existirem
DO $$ 
BEGIN
    -- Política para utilizadores verem o próprio perfil
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Política para utilizadores atualizarem o próprio perfil
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Política para admins verem todos os perfis
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON user_profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
    
    -- Política para admins gerirem todos os perfis
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Admins can manage all profiles'
    ) THEN
        CREATE POLICY "Admins can manage all profiles" ON user_profiles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 11. Conceder permissões
GRANT ALL ON user_profiles TO authenticated;

-- 12. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Aplicar trigger se não existir
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

SELECT 'Correção essencial aplicada com sucesso! Sistema pronto para funcionar.' as status;
