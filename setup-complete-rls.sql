-- ============================================================================
-- Setup Completo de RLS Policies - VisionKrono
-- ============================================================================
-- Este script faz TUDO de uma vez:
-- 1. Remove policies antigas
-- 2. Cria constraint único
-- 3. Cria policies novas específicas
-- ============================================================================

-- PASSO 1: Limpar policies antigas
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🧹 Removendo policies antigas...';
END $$;

DROP POLICY IF EXISTS "Allow all operations on event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "event_configurations_policy" ON event_configurations;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON event_configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON event_configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON event_configurations;
DROP POLICY IF EXISTS "read_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "insert_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "update_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "delete_event_configurations" ON event_configurations;

DROP POLICY IF EXISTS "Allow all operations on events" ON events;
DROP POLICY IF EXISTS "events_policy" ON events;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
DROP POLICY IF EXISTS "read_events" ON events;
DROP POLICY IF EXISTS "insert_events" ON events;
DROP POLICY IF EXISTS "update_events" ON events;
DROP POLICY IF EXISTS "delete_events" ON events;

-- PASSO 2: Adicionar constraint único
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🔧 Verificando constraint...';
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uniq_event_config'
    ) THEN
        ALTER TABLE event_configurations 
        ADD CONSTRAINT uniq_event_config UNIQUE (event_id, config_type);
        
        RAISE NOTICE '✅ Constraint uniq_event_config criada';
    ELSE
        RAISE NOTICE 'ℹ️ Constraint uniq_event_config já existe';
    END IF;
END $$;

-- PASSO 3: Habilitar RLS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '🔒 Habilitando RLS...';
END $$;

ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar policies para event_configurations
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '📝 Criando policies para event_configurations...';
END $$;

-- Leitura: todos autenticados
CREATE POLICY "read_event_configurations"
ON event_configurations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Inserção: admin e event_manager
CREATE POLICY "insert_event_configurations"
ON event_configurations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Atualização: admin e event_manager
CREATE POLICY "update_event_configurations"
ON event_configurations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Exclusão: apenas admin
CREATE POLICY "delete_event_configurations"
ON event_configurations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- PASSO 5: Criar policies para events
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '📝 Criando policies para events...';
END $$;

-- Leitura: todos autenticados
CREATE POLICY "read_events"
ON events FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Inserção: admin e event_manager
CREATE POLICY "insert_events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Atualização: admin e event_manager
CREATE POLICY "update_events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Exclusão: apenas admin
CREATE POLICY "delete_events"
ON events FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- PASSO 6: Verificação Final
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Setup completo de RLS concluído com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Resumo:';
    RAISE NOTICE '  - Policies antigas: REMOVIDAS';
    RAISE NOTICE '  - Constraint único: CRIADA';
    RAISE NOTICE '  - RLS: HABILITADO';
    RAISE NOTICE '  - event_configurations: 4 policies (read, insert, update, delete)';
    RAISE NOTICE '  - events: 4 policies (read, insert, update, delete)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Regras de acesso:';
    RAISE NOTICE '  - Leitura: todos os utilizadores autenticados';
    RAISE NOTICE '  - Escrita (insert/update): admin e event_manager';
    RAISE NOTICE '  - Exclusão: apenas admin';
    RAISE NOTICE '';
END $$;

-- Ver policies criadas
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('event_configurations', 'events')
ORDER BY tablename, policyname;

