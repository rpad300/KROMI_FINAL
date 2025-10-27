-- ============================================================================
-- Limpeza de Policies Antigas - VisionKrono
-- ============================================================================
-- Remove policies genéricas/permissivas que estão a sobrepor as específicas
-- Execute ANTES do setup-rls-policies-simplified.sql
-- ============================================================================

-- 1. Remover policies genéricas/antigas de event_configurations
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on event_configurations" ON event_configurations;
DROP POLICY IF EXISTS "event_configurations_policy" ON event_configurations;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON event_configurations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON event_configurations;
DROP POLICY IF EXISTS "Enable read access for all users" ON event_configurations;

-- 2. Remover policies genéricas/antigas de events
-- ============================================================================
DROP POLICY IF EXISTS "Allow all operations on events" ON events;
DROP POLICY IF EXISTS "events_policy" ON events;
DROP POLICY IF EXISTS "Enable all for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON events;
DROP POLICY IF EXISTS "Enable read access for all users" ON events;

-- 3. Verificação
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧹 Policies antigas removidas!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Policies restantes:';
END $$;

SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('event_configurations', 'events')
ORDER BY tablename, policyname;

-- ============================================================================
-- PRÓXIMO PASSO:
-- Execute agora o setup-rls-policies-simplified.sql
-- ============================================================================

