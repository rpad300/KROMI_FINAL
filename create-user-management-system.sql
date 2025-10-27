-- ==========================================
-- USER MANAGEMENT SYSTEM - Database Schema
-- ==========================================
-- 
-- Schema completo para gestão de utilizadores
-- Inclui: perfis, roles, permissões, auditoria
-- 
-- Versão: 1.0
-- Data: 2025-10-25
-- ==========================================

-- ==========================================
-- 1. USER PROFILES TABLE
-- ==========================================

-- Criar tabela de perfis de utilizadores (se não existir)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    organization TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0
);

-- ==========================================
-- 2. USER PERMISSIONS TABLE
-- ==========================================

-- Criar tabela de permissões específicas
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    resource TEXT,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission, resource)
);

-- ==========================================
-- 3. AUDIT LOG TABLE
-- ==========================================

-- Criar tabela de logs de auditoria
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

-- ==========================================
-- 4. USER SESSIONS TABLE
-- ==========================================

-- Criar tabela de sessões de utilizadores
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 5. ROLE DEFINITIONS TABLE
-- ==========================================

-- Criar tabela de definições de roles
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

-- ==========================================
-- 6. INDEXES
-- ==========================================

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- ==========================================
-- 7. TRIGGERS
-- ==========================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger às tabelas relevantes
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_definitions_updated_at ON role_definitions;
CREATE TRIGGER update_role_definitions_updated_at
    BEFORE UPDATE ON role_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 8. RLS POLICIES
-- ==========================================

-- Ativar RLS nas tabelas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;
CREATE POLICY "Admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;
CREATE POLICY "Admins can manage all permissions" ON user_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para audit_logs
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

-- Políticas para user_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para role_definitions
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

-- ==========================================
-- 9. FUNCTIONS
-- ==========================================

-- Função para criar perfil automaticamente quando utilizador se regista
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, email, name, role, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Função para log de auditoria
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

-- Função para atualizar último login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        last_login = NOW(),
        login_count = login_count + 1
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 10. INITIAL DATA
-- ==========================================

-- Inserir roles padrão
INSERT INTO role_definitions (role_name, display_name, description, permissions, is_system_role) VALUES
('admin', 'Administrador', 'Acesso completo ao sistema', '["*"]', true),
('moderator', 'Moderador', 'Gestão de eventos e participantes', '["read_users", "update_users", "read_events", "update_events", "read_participants", "update_participants"]', true),
('user', 'Utilizador', 'Acesso básico ao sistema', '["read_own_profile", "update_own_profile", "read_events", "read_participants"]', true)
ON CONFLICT (role_name) DO NOTHING;

-- ==========================================
-- 11. VIEWS
-- ==========================================

-- View para utilizadores com informações completas
CREATE OR REPLACE VIEW user_details AS
SELECT 
    up.id,
    up.user_id,
    up.name,
    up.email,
    up.phone,
    up.organization,
    up.role,
    up.status,
    up.avatar_url,
    up.created_at,
    up.updated_at,
    up.last_login,
    up.login_count,
    rd.display_name as role_display_name,
    rd.description as role_description,
    CASE 
        WHEN up.last_login IS NULL THEN 'Nunca'
        WHEN up.last_login > NOW() - INTERVAL '1 day' THEN 'Hoje'
        WHEN up.last_login > NOW() - INTERVAL '2 days' THEN 'Ontem'
        ELSE to_char(up.last_login, 'DD/MM/YYYY')
    END as last_login_formatted
FROM user_profiles up
LEFT JOIN role_definitions rd ON up.role = rd.role_name;

-- ==========================================
-- 12. GRANTS
-- ==========================================

-- Conceder permissões necessárias
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_permissions TO authenticated;
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON role_definitions TO authenticated;
GRANT SELECT ON user_details TO authenticated;

-- ==========================================
-- COMPLETED
-- ==========================================

-- Sistema de gestão de utilizadores criado com sucesso!
-- Inclui:
-- ✅ Tabelas de perfis, permissões, auditoria e sessões
-- ✅ Índices para performance
-- ✅ Triggers automáticos
-- ✅ Políticas RLS de segurança
-- ✅ Funções utilitárias
-- ✅ Dados iniciais
-- ✅ Views para consultas
-- ✅ Permissões adequadas


