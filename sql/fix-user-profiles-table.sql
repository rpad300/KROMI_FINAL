-- ==========================================
-- CORREÇÃO: Adicionar coluna "role" à tabela user_profiles
-- ==========================================
-- 
-- Script para corrigir a estrutura da tabela user_profiles
-- e adicionar as colunas necessárias para o sistema de gestão
-- 
-- Data: 2025-10-25
-- ==========================================

-- 1. Verificar se a tabela user_profiles existe e sua estrutura atual
DO $$ 
BEGIN
    -- Verificar se a coluna 'role' já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'role'
    ) THEN
        -- Adicionar coluna 'role' se não existir
        ALTER TABLE user_profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user'));
        RAISE NOTICE 'Coluna "role" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "role" já existe na tabela user_profiles';
    END IF;
END $$;

-- 2. Adicionar outras colunas necessárias
DO $$ 
BEGIN
    -- Adicionar coluna 'status' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
        RAISE NOTICE 'Coluna "status" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "status" já existe na tabela user_profiles';
    END IF;
END $$;

-- 3. Adicionar coluna 'name' se não existir (pode ser 'full_name' ou 'name')
DO $$ 
BEGIN
    -- Verificar se existe 'name' ou 'full_name'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'name'
    ) THEN
        -- Se existe 'full_name', renomear para 'name'
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'full_name'
        ) THEN
            ALTER TABLE user_profiles RENAME COLUMN full_name TO name;
            RAISE NOTICE 'Coluna "full_name" renomeada para "name"';
        ELSE
            -- Se não existe nenhuma, criar 'name'
            ALTER TABLE user_profiles ADD COLUMN name TEXT;
            RAISE NOTICE 'Coluna "name" adicionada à tabela user_profiles';
        END IF;
    ELSE
        RAISE NOTICE 'Coluna "name" já existe na tabela user_profiles';
    END IF;
END $$;

-- 4. Adicionar coluna 'organization' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'organization'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN organization TEXT;
        RAISE NOTICE 'Coluna "organization" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "organization" já existe na tabela user_profiles';
    END IF;
END $$;

-- 5. Adicionar coluna 'avatar_url' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Coluna "avatar_url" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "avatar_url" já existe na tabela user_profiles';
    END IF;
END $$;

-- 6. Adicionar coluna 'preferences' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'preferences'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN preferences JSONB DEFAULT '{}';
        RAISE NOTICE 'Coluna "preferences" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "preferences" já existe na tabela user_profiles';
    END IF;
END $$;

-- 7. Adicionar coluna 'last_login' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Coluna "last_login" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "last_login" já existe na tabela user_profiles';
    END IF;
END $$;

-- 8. Adicionar coluna 'login_count' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'login_count'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN login_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna "login_count" adicionada à tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna "login_count" já existe na tabela user_profiles';
    END IF;
END $$;

-- 9. Migrar dados de profile_type para role se necessário
DO $$ 
BEGIN
    -- Verificar se existe profile_type e role
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'profile_type'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'role'
    ) THEN
        -- Migrar dados de profile_type para role
        UPDATE user_profiles 
        SET role = CASE 
            WHEN profile_type = 'admin' THEN 'admin'
            WHEN profile_type = 'event_manager' THEN 'moderator'
            WHEN profile_type = 'participant' THEN 'user'
            ELSE 'user'
        END
        WHERE role IS NULL OR role = 'user';
        
        RAISE NOTICE 'Dados migrados de profile_type para role';
    END IF;
END $$;

-- 10. Criar índices necessários
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login);

-- 11. Atualizar RLS policies se necessário
DO $$ 
BEGIN
    -- Verificar se as políticas existem e criar se necessário
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Política RLS "Users can view their own profile" criada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Política RLS "Users can update their own profile" criada';
    END IF;
    
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
        RAISE NOTICE 'Política RLS "Admins can view all profiles" criada';
    END IF;
    
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
        RAISE NOTICE 'Política RLS "Admins can manage all profiles" criada';
    END IF;
END $$;

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

-- 14. Criar função para log de auditoria
CREATE OR REPLACE FUNCTION log_user_action(
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
    VALUES (
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Criar tabela audit_logs se não existir
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Ativar RLS na tabela audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 17. Criar políticas para audit_logs
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 18. Criar tabela role_definitions se não existir
CREATE TABLE IF NOT EXISTS role_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Inserir roles padrão
INSERT INTO role_definitions (role_name, display_name, description, permissions, is_system_role) VALUES
('admin', 'Administrador', 'Acesso completo ao sistema', '["*"]', true),
('moderator', 'Moderador', 'Gestão de eventos e participantes', '["read_users", "update_users", "read_events", "update_events", "read_participants", "update_participants"]', true),
('user', 'Utilizador', 'Acesso básico ao sistema', '["read_own_profile", "update_own_profile", "read_events", "read_participants"]', true)
ON CONFLICT (role_name) DO NOTHING;

-- 20. Ativar RLS na tabela role_definitions
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

-- 21. Criar políticas para role_definitions
DROP POLICY IF EXISTS "Everyone can view role definitions" ON role_definitions;
CREATE POLICY "Everyone can view role definitions" ON role_definitions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage role definitions" ON role_definitions;
CREATE POLICY "Admins can manage role definitions" ON role_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 22. Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON role_definitions TO authenticated;

-- ==========================================
-- CORREÇÃO CONCLUÍDA
-- ==========================================

-- ✅ Coluna "role" adicionada à tabela user_profiles
-- ✅ Todas as colunas necessárias criadas
-- ✅ Dados migrados de profile_type para role
-- ✅ Índices criados para performance
-- ✅ Políticas RLS configuradas
-- ✅ Funções utilitárias criadas
-- ✅ Tabelas auxiliares criadas
-- ✅ Permissões concedidas

SELECT 'Correção da tabela user_profiles concluída com sucesso!' as status;


