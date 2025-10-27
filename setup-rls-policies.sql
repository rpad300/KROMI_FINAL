-- ============================================================================
-- RLS Policies para VisionKrono
-- ============================================================================
-- Execute este script no Supabase SQL Editor
-- Adapta as policies para usar a tabela real: user_profiles
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

-- NOTA: A tabela 'calibrations' será criada quando necessário
-- ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas (se existirem)
-- ============================================================================
DROP POLICY IF EXISTS "read_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "upsert_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "update_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "delete_event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "read_events" ON events;
DROP POLICY IF EXISTS "manage_own_events" ON events;
-- DROP POLICY IF EXISTS "read_calibrations" ON calibrations;
-- DROP POLICY IF EXISTS "manage_calibrations" ON calibrations;

-- ============================================================================
-- POLICIES PARA: event_configurations
-- ============================================================================

-- Permitir leitura para utilizadores autenticados que pertencem ao evento
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

-- Permitir inserção para admins e event_managers do organizador correto
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

-- Permitir atualização para admins e event_managers do organizador correto
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
-- POLICIES PARA: events
-- ============================================================================

-- Permitir leitura: Admin vê tudo, outros veem apenas seus eventos
CREATE POLICY "read_events"
ON events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND (
                up.role = 'admin' 
                OR up.organizer_id = events.organizer_id
            )
    )
);

-- Permitir criação apenas para admins e event_managers
CREATE POLICY "insert_events"
ON events FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                up.role = 'admin' 
                OR up.organizer_id = events.organizer_id
            )
    )
);

-- Permitir atualização: Admin todos, event_manager apenas seus eventos
CREATE POLICY "update_events"
ON events FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                up.role = 'admin' 
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
                up.role = 'admin' 
                OR up.organizer_id = events.organizer_id
            )
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
-- POLICIES PARA: calibrations (COMENTADO - tabela não existe ainda)
-- ============================================================================
-- NOTA: Descomente estas policies quando criar a tabela 'calibrations'
-- As calibrações estão sendo guardadas em 'event_configurations' com config_type='calibration_complete'

/*
-- Permitir leitura para utilizadores que pertencem ao evento
CREATE POLICY "read_calibrations"
ON calibrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = calibrations.event_id
        WHERE up.user_id = auth.uid()
            AND (
                COALESCE(up.role, up.profile_type) = 'admin' 
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Permitir inserção para admins e event_managers
CREATE POLICY "insert_calibrations"
ON calibrations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = calibrations.event_id
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin' 
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Permitir atualização para admins e event_managers
CREATE POLICY "update_calibrations"
ON calibrations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN events e ON e.id = calibrations.event_id
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
        JOIN events e ON e.id = calibrations.event_id
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) IN ('admin', 'event_manager')
            AND (
                COALESCE(up.role, up.profile_type) = 'admin' 
                OR up.organizer_id = e.organizer_id
            )
    )
);

-- Permitir exclusão apenas para admins
CREATE POLICY "delete_calibrations"
ON calibrations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = auth.uid()
            AND COALESCE(up.role, up.profile_type) = 'admin'
    )
);
*/

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
    RAISE NOTICE '  - calibrations: NÃO CRIADAS (tabela não existe)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Nota:';
    RAISE NOTICE '  - Calibrações estão guardadas em event_configurations';
    RAISE NOTICE '  - config_type: calibration_complete, ai_config, number_area, dorsal_nomenclature';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Regras de acesso:';
    RAISE NOTICE '  - Admin: acesso total a tudo';
    RAISE NOTICE '  - Event Manager: apenas eventos do seu organizador';
    RAISE NOTICE '  - Outros roles: leitura apenas';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- OPCIONAL: Verificar estrutura da tabela user_profiles
-- ============================================================================
-- Descomente para ver as colunas da tabela user_profiles
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'user_profiles'
-- ORDER BY ordinal_position;

