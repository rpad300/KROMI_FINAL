-- ============================================================================
-- RLS Policies para VisionKrono (VERSÃO SIMPLIFICADA)
-- ============================================================================
-- Execute este script no Supabase SQL Editor
-- VERSÃO SEM organizer_id (não existe na tabela user_profiles)
-- ============================================================================

-- 1. Adicionar constraint único em event_configurations (se ainda não existir)
-- ============================================================================
DO $$ 
BEGIN
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

-- 2. Habilitar RLS nas tabelas (se ainda não estiver)
-- ============================================================================
ALTER TABLE event_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas (se existirem)
-- ============================================================================
DROP POLICY IF EXISTS "read_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "insert_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "update_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "delete_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "read_events" ON events;
DROP POLICY IF EXISTS "insert_events" ON events;
DROP POLICY IF EXISTS "update_events" ON events;
DROP POLICY IF EXISTS "delete_events" ON events;

-- ============================================================================
-- POLICIES PARA: event_configurations (SIMPLIFICADO)
-- ============================================================================

-- Permitir leitura para todos os utilizadores autenticados
CREATE POLICY "read_event_configurations"
ON event_configurations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Permitir inserção para admins e event_managers
CREATE POLICY "insert_event_configurations"
ON event_configurations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Permitir atualização para admins e event_managers
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

-- Permitir exclusão apenas para admins
CREATE POLICY "delete_event_configurations"
ON event_configurations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- ============================================================================
-- POLICIES PARA: events (SIMPLIFICADO)
-- ============================================================================

-- Permitir leitura para todos os utilizadores autenticados
CREATE POLICY "read_events"
ON events FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Permitir criação para admins e event_managers
CREATE POLICY "insert_events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
    )
);

-- Permitir atualização para admins e event_managers
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

-- Permitir exclusão apenas para admins
CREATE POLICY "delete_events"
ON events FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);

-- ============================================================================
-- Verificação final
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS Policies configuradas com sucesso!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Resumo:';
    RAISE NOTICE '  - event_configurations: 4 policies (read, insert, update, delete)';
    RAISE NOTICE '  - events: 4 policies (read, insert, update, delete)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Regras de acesso (SIMPLIFICADO):';
    RAISE NOTICE '  - Leitura: todos os utilizadores autenticados';
    RAISE NOTICE '  - Escrita (insert/update): admin e event_manager';
    RAISE NOTICE '  - Exclusão: apenas admin';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Nota:';
    RAISE NOTICE '  - Sem controlo por organizador (organizer_id não existe)';
    RAISE NOTICE '  - Se precisar de multi-tenancy, adicione a coluna organizer_id';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- OPCIONAL: Verificar estrutura da tabela user_profiles
-- ============================================================================
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable,
--     column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_profiles'
-- ORDER BY ordinal_position;

-- ============================================================================
-- OPCIONAL: Ver policies criadas
-- ============================================================================
-- Descomente para ver as policies criadas
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename IN ('event_configurations', 'events')
-- ORDER BY tablename, policyname;

