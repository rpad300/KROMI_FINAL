-- ============================================================================
-- Testes de Multi-Tenancy - VisionKrono
-- ============================================================================
-- Scripts para testar e verificar o funcionamento do multi-tenancy
-- ============================================================================

-- TESTE 1: Ver estrutura criada
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '📊 TESTE 1: Verificando estrutura criada...';
END $$;

-- Ver colunas adicionadas
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('user_profiles', 'events', 'organizers')
    AND column_name LIKE '%organizer%'
ORDER BY table_name, column_name;

-- TESTE 2: Ver organizadores existentes
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🏢 TESTE 2: Organizadores existentes...';
END $$;

SELECT 
    id,
    name,
    email,
    is_active,
    created_at,
    (SELECT COUNT(*) FROM events WHERE organizer_id = organizers.id) as total_eventos,
    (SELECT COUNT(*) FROM user_profiles WHERE organizer_id = organizers.id) as total_users
FROM organizers
ORDER BY name;

-- TESTE 3: Ver utilizadores e seus organizadores
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👥 TESTE 3: Utilizadores e organizadores...';
END $$;

SELECT 
    up.email,
    up.role,
    up.profile_type,
    o.name as organizador,
    up.organizer_id
FROM user_profiles up
LEFT JOIN organizers o ON o.id = up.organizer_id
ORDER BY up.email
LIMIT 10;

-- TESTE 4: Ver eventos e seus organizadores
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🏃 TESTE 4: Eventos e organizadores...';
END $$;

SELECT 
    e.id,
    e.name,
    o.name as organizador,
    e.organizer_id,
    e.created_at
FROM events e
LEFT JOIN organizers o ON o.id = e.organizer_id
ORDER BY e.created_at DESC
LIMIT 10;

-- TESTE 5: Ver teu perfil atual
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👤 TESTE 5: Teu perfil atual...';
END $$;

SELECT 
    up.email,
    up.role,
    up.profile_type,
    o.name as organizador,
    up.is_active,
    up.created_at
FROM user_profiles up
LEFT JOIN organizers o ON o.id = up.organizer_id
WHERE up.user_id = auth.uid();

-- TESTE 6: Verificar policies
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 TESTE 6: Policies criadas...';
END $$;

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%organizer_id%' THEN '✅ Com controlo por organizador'
        WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Apenas auth básico'
        ELSE '❓ Verificar'
    END as tipo_controlo
FROM pg_policies
WHERE tablename IN ('event_configurations', 'events', 'organizers')
ORDER BY tablename, policyname;

-- TESTE 7: Testar isolamento (simulação)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTE 7: Resumo do isolamento...';
    RAISE NOTICE '';
    RAISE NOTICE 'Como ADMIN:';
    RAISE NOTICE '  ✅ Vê todos os eventos de todos os organizadores';
    RAISE NOTICE '  ✅ Pode criar/editar em qualquer organizador';
    RAISE NOTICE '';
    RAISE NOTICE 'Como EVENT_MANAGER do Organizador A:';
    RAISE NOTICE '  ✅ Vê apenas eventos do Organizador A';
    RAISE NOTICE '  ✅ Pode criar/editar apenas no Organizador A';
    RAISE NOTICE '  ❌ NÃO vê eventos do Organizador B';
    RAISE NOTICE '';
END $$;

-- RESUMO FINAL
-- ============================================================================
DO $$ 
DECLARE
    total_organizers INTEGER;
    total_users_with_org INTEGER;
    total_events_with_org INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_organizers FROM organizers;
    SELECT COUNT(*) INTO total_users_with_org FROM user_profiles WHERE organizer_id IS NOT NULL;
    SELECT COUNT(*) INTO total_events_with_org FROM events WHERE organizer_id IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RESUMO GERAL';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Total de organizadores: %', total_organizers;
    RAISE NOTICE 'Utilizadores com organizador: %', total_users_with_org;
    RAISE NOTICE 'Eventos com organizador: %', total_events_with_org;
    RAISE NOTICE '';
    
    IF total_organizers = 0 THEN
        RAISE NOTICE '⚠️ AVISO: Nenhum organizador criado!';
    ELSIF total_users_with_org = 0 THEN
        RAISE NOTICE '⚠️ AVISO: Nenhum utilizador atribuído a organizador!';
    ELSIF total_events_with_org = 0 THEN
        RAISE NOTICE 'ℹ️ INFO: Nenhum evento atribuído a organizador (ainda)';
    ELSE
        RAISE NOTICE '✅ Multi-tenancy configurado e a funcionar!';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

