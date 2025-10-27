-- ============================================================================
-- Adicionar Multi-Tenancy (Controlo por Organizador) - VisionKrono
-- ============================================================================
-- Este script adiciona controlo por organizador permitindo:
-- - Múltiplos organizadores na plataforma
-- - Cada organizador vê apenas os seus eventos
-- - Admins continuam a ver tudo
-- ============================================================================

-- PASSO 1: Criar tabela de organizadores
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '📋 Criando tabela de organizadores...';
END $$;

CREATE TABLE IF NOT EXISTS organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organizers_is_active ON organizers(is_active);
CREATE INDEX IF NOT EXISTS idx_organizers_created_by ON organizers(created_by);

-- RLS para organizers
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler organizadores ativos
CREATE POLICY "read_organizers"
ON organizers FOR SELECT
USING (is_active = true OR auth.uid() IS NOT NULL);

-- Policy: Apenas admins podem criar organizadores
CREATE POLICY "insert_organizers"
ON organizers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- Policy: Admins podem editar todos, event_managers podem editar o seu
CREATE POLICY "update_organizers"
ON organizers FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR (
                    COALESCE(up.role, up.profile_type) = 'event_manager'
                    AND up.organization = organizers.name
                )
            )
    )
);

-- PASSO 2: Adicionar coluna organizer_id em user_profiles
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '👤 Adicionando organizer_id em user_profiles...';
    
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'organizer_id'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN organizer_id UUID REFERENCES organizers(id);
        
        CREATE INDEX idx_user_profiles_organizer_id ON user_profiles(organizer_id);
        
        RAISE NOTICE '✅ Coluna organizer_id adicionada em user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna organizer_id já existe em user_profiles';
    END IF;
END $$;

-- PASSO 3: Adicionar coluna organizer_id em events
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🏃 Adicionando organizer_id em events...';
    
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'organizer_id'
    ) THEN
        ALTER TABLE events 
        ADD COLUMN organizer_id UUID REFERENCES organizers(id);
        
        CREATE INDEX idx_events_organizer_id ON events(organizer_id);
        
        RAISE NOTICE '✅ Coluna organizer_id adicionada em events';
    ELSE
        RAISE NOTICE 'ℹ️ Coluna organizer_id já existe em events';
    END IF;
END $$;

-- PASSO 4: Criar organizador padrão para dados existentes
-- ============================================================================
DO $$ 
DECLARE
    default_org_id UUID;
BEGIN
    RAISE NOTICE '🏢 Criando organizador padrão...';
    
    -- Inserir organizador padrão (se não existir)
    INSERT INTO organizers (name, email, is_active)
    VALUES ('Organizador Padrão', 'admin@visionkrono.com', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO default_org_id;
    
    -- Se já existia, obter o ID
    IF default_org_id IS NULL THEN
        SELECT id INTO default_org_id 
        FROM organizers 
        WHERE name = 'Organizador Padrão' 
        LIMIT 1;
    END IF;
    
    RAISE NOTICE '✅ Organizador padrão ID: %', default_org_id;
    
    -- Atualizar user_profiles sem organizer_id
    UPDATE user_profiles 
    SET organizer_id = default_org_id
    WHERE organizer_id IS NULL;
    
    -- Atualizar events sem organizer_id
    UPDATE events 
    SET organizer_id = default_org_id
    WHERE organizer_id IS NULL;
    
    RAISE NOTICE '✅ Dados existentes migrados para organizador padrão';
END $$;

-- PASSO 5: Atualizar policies de event_configurations com controlo por organizador
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🔒 Atualizando policies de event_configurations...';
END $$;

-- Remover policies antigas
DROP POLICY IF EXISTS "read_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "insert_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "update_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "delete_event_configurations" ON event_configurations;

-- Leitura: Admin vê tudo, outros veem apenas do seu organizador
CREATE POLICY "read_event_configurations"
ON event_configurations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = event_configurations.event_id
        WHERE up.user_id = auth.uid()
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Inserção: Admin em qualquer organizador, event_manager apenas no seu
CREATE POLICY "insert_event_configurations"
ON event_configurations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = event_configurations.event_id
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Atualização: Admin em qualquer organizador, event_manager apenas no seu
CREATE POLICY "update_event_configurations"
ON event_configurations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = event_configurations.event_id
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = e.organizer_id
            )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = event_configurations.event_id
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Exclusão: Apenas admin
CREATE POLICY "delete_event_configurations"
ON event_configurations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- PASSO 6: Atualizar policies de events com controlo por organizador
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🔒 Atualizando policies de events...';
END $$;

-- Remover policies antigas
DROP POLICY IF EXISTS "read_events" ON events;
DROP POLICY IF EXISTS "insert_events" ON events;
DROP POLICY IF EXISTS "update_events" ON events;
DROP POLICY IF EXISTS "delete_events" ON events;

-- Leitura: Admin vê tudo, outros veem apenas do seu organizador
CREATE POLICY "read_events"
ON events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = events.organizer_id
            )
    )
);

-- Inserção: Admin em qualquer organizador, event_manager apenas no seu
CREATE POLICY "insert_events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = events.organizer_id
            )
    )
);

-- Atualização: Admin em qualquer organizador, event_manager apenas no seu
CREATE POLICY "update_events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = events.organizer_id
            )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin'
                OR up.organizer_id = events.organizer_id
            )
    )
);

-- Exclusão: Apenas admin
CREATE POLICY "delete_events"
ON events FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- PASSO 7: Verificação Final
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Multi-tenancy implementado com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Estrutura criada:';
    RAISE NOTICE '  - Tabela organizers: CRIADA';
    RAISE NOTICE '  - user_profiles.organizer_id: ADICIONADA';
    RAISE NOTICE '  - events.organizer_id: ADICIONADA';
    RAISE NOTICE '  - Policies: ATUALIZADAS com controlo por organizador';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Novas regras de acesso:';
    RAISE NOTICE '  - Admin: vê TODOS os eventos de TODOS os organizadores';
    RAISE NOTICE '  - Event Manager: vê apenas eventos do SEU organizador';
    RAISE NOTICE '  - User: vê apenas eventos do SEU organizador';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Próximos passos:';
    RAISE NOTICE '  1. Criar organizadores adicionais (se necessário)';
    RAISE NOTICE '  2. Atribuir utilizadores aos organizadores';
    RAISE NOTICE '  3. Atribuir eventos aos organizadores';
    RAISE NOTICE '';
END $$;

-- Ver estrutura criada
SELECT 
    'organizers' as tabela,
    COUNT(*) as total_registos
FROM organizers
UNION ALL
SELECT 
    'user_profiles com organizer_id',
    COUNT(*) 
FROM user_profiles 
WHERE organizer_id IS NOT NULL
UNION ALL
SELECT 
    'events com organizer_id',
    COUNT(*) 
FROM events 
WHERE organizer_id IS NOT NULL;

-- Ver policies atualizadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('event_configurations', 'events', 'organizers')
ORDER BY tablename, policyname;

