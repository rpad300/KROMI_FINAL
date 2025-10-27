-- Sistema de Autenticação e Gestão de Utilizadores - CORREÇÃO
-- Adicionar colunas necessárias às tabelas existentes

-- 1. Verificar se a tabela events existe e adicionar coluna manager_id se necessário
DO $$ 
BEGIN
    -- Verificar se a coluna manager_id já existe na tabela events
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'manager_id'
    ) THEN
        -- Adicionar coluna manager_id à tabela events existente
        ALTER TABLE events ADD COLUMN manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna manager_id adicionada à tabela events';
    ELSE
        RAISE NOTICE 'Coluna manager_id já existe na tabela events';
    END IF;
END $$;

-- 2. Criar tabela de perfis de utilizador (se não existir)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    profile_type TEXT NOT NULL CHECK (profile_type IN ('admin', 'event_manager', 'participant')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id),
    UNIQUE(email)
);

-- 3. Criar tabela de participantes em eventos (se não existir)
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_confirmed BOOLEAN DEFAULT false,
    UNIQUE(event_id, participant_id),
    UNIQUE(event_id, email)
);

-- 4. Criar tabela de sessões de utilizador (se não existir)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 5. Criar tabela de logs de atividade (se não existir)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Criar índices para performance (se não existirem)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_type ON user_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_events_manager_id ON events(manager_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_participant_id ON event_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 7. Criar função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Criar triggers para updated_at (se não existirem)
DO $$ 
BEGIN
    -- Trigger para user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_profiles_updated_at 
            BEFORE UPDATE ON user_profiles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Trigger para events (se a coluna updated_at existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'updated_at'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at'
        ) THEN
            CREATE TRIGGER update_events_updated_at 
                BEFORE UPDATE ON events 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;

-- 9. Criar função para verificar permissões (se não existir)
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_required_profile TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_profile TEXT;
BEGIN
    SELECT profile_type INTO user_profile
    FROM user_profiles
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Admin tem acesso a tudo
    IF user_profile = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Verificar se o perfil corresponde ao requerido
    RETURN user_profile = p_required_profile;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar função para obter perfil do utilizador (se não existir)
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS TABLE(
    profile_type TEXT,
    full_name TEXT,
    email TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.profile_type,
        up.full_name,
        up.email,
        up.is_active
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Criar função para limpar sessões expiradas (se não existir)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Configurar RLS (Row Level Security) - apenas se não estiver já configurado
DO $$ 
BEGIN
    -- RLS para user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'user_profiles' AND relrowsecurity = true
    ) THEN
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    -- RLS para events
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'events' AND relrowsecurity = true
    ) THEN
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    END IF;

    -- RLS para event_participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'event_participants' AND relrowsecurity = true
    ) THEN
        ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
    END IF;

    -- RLS para user_sessions
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'user_sessions' AND relrowsecurity = true
    ) THEN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
    END IF;

    -- RLS para activity_logs
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'activity_logs' AND relrowsecurity = true
    ) THEN
        ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 13. Criar políticas RLS (apenas se não existirem)
DO $$ 
BEGIN
    -- Políticas para user_profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Admins can view all profiles'
    ) THEN
        CREATE POLICY "Admins can view all profiles" ON user_profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND profile_type = 'admin' AND is_active = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Admins can update all profiles'
    ) THEN
        CREATE POLICY "Admins can update all profiles" ON user_profiles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND profile_type = 'admin' AND is_active = true
                )
            );
    END IF;

    -- Políticas para events
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Event managers can view their events'
    ) THEN
        CREATE POLICY "Event managers can view their events" ON events
            FOR SELECT USING (
                manager_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND profile_type = 'admin' AND is_active = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Event managers can create events'
    ) THEN
        CREATE POLICY "Event managers can create events" ON events
            FOR INSERT WITH CHECK (
                manager_id = auth.uid() AND
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND profile_type IN ('admin', 'event_manager') AND is_active = true
                )
            );
    END IF;

    -- Políticas para event_participants
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'event_participants' AND policyname = 'Participants can view their own registrations'
    ) THEN
        CREATE POLICY "Participants can view their own registrations" ON event_participants
            FOR SELECT USING (
                participant_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM events e
                    WHERE e.id = event_id AND e.manager_id = auth.uid()
                ) OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE user_id = auth.uid() AND profile_type = 'admin' AND is_active = true
                )
            );
    END IF;
END $$;

-- 14. Criar utilizador administrador inicial (apenas se não existir)
DO $$ 
BEGIN
    -- Verificar se o utilizador administrador já existe
    IF NOT EXISTS (
        SELECT 1 FROM auth.users WHERE email = 'Rdias300@gmail.com'
    ) THEN
        -- Inserir utilizador administrador
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'Rdias300@gmail.com',
            crypt('1234876509', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
        
        RAISE NOTICE 'Utilizador administrador criado: Rdias300@gmail.com';
    ELSE
        RAISE NOTICE 'Utilizador administrador já existe: Rdias300@gmail.com';
    END IF;
END $$;

-- 15. Criar perfil do administrador inicial (apenas se não existir)
DO $$ 
BEGIN
    -- Verificar se o perfil já existe
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles WHERE email = 'Rdias300@gmail.com'
    ) THEN
        -- Criar perfil do administrador
        INSERT INTO user_profiles (
            user_id,
            email,
            full_name,
            profile_type,
            is_active
        ) 
        SELECT 
            u.id,
            'Rdias300@gmail.com',
            'Administrador',
            'admin',
            true
        FROM auth.users u
        WHERE u.email = 'Rdias300@gmail.com';
        
        RAISE NOTICE 'Perfil de administrador criado para Rdias300@gmail.com';
    ELSE
        RAISE NOTICE 'Perfil de administrador já existe para Rdias300@gmail.com';
    END IF;
END $$;

-- 16. Criar função para registar atividade (se não existir)
CREATE OR REPLACE FUNCTION log_user_activity(
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 17. Comentários para documentação
COMMENT ON TABLE user_profiles IS 'Perfis de utilizadores com diferentes níveis de acesso';
COMMENT ON TABLE event_participants IS 'Participantes registados em eventos';
COMMENT ON TABLE user_sessions IS 'Sessões ativas dos utilizadores';
COMMENT ON TABLE activity_logs IS 'Log de atividades dos utilizadores';

COMMENT ON COLUMN user_profiles.profile_type IS 'admin, event_manager, participant';
COMMENT ON COLUMN events.manager_id IS 'ID do gestor do evento';
COMMENT ON COLUMN event_participants.participant_id IS 'ID do utilizador participante';

-- 18. Mensagem de sucesso
DO $$ 
BEGIN
    RAISE NOTICE 'Sistema de autenticação configurado com sucesso!';
    RAISE NOTICE 'Utilizador administrador: Rdias300@gmail.com / 1234876509';
    RAISE NOTICE 'Pode agora usar o sistema de login na aplicação.';
END $$;


