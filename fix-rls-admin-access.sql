-- ==========================================
-- FIX: Garantir que ADMIN pode ver TODOS os eventos
-- ==========================================
-- 
-- Problema: RLS está bloqueando acesso mesmo para admin
-- Solução: Criar policy que permite admin ver tudo
-- 
-- Data: 2025-10-26
-- ==========================================

-- 1. Verificar RLS está ativo
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'events';

-- 2. Ver políticas atuais
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'events';

-- 3. REMOVER políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS "admin_all_events" ON events;
DROP POLICY IF EXISTS "moderator_own_events" ON events;
DROP POLICY IF EXISTS "event_manager_own_events" ON events;
DROP POLICY IF EXISTS "admin_full_access" ON events;

-- 4. CRIAR política para ADMIN ver TUDO (SELECT)
CREATE POLICY "admin_all_events_select" 
ON events
FOR SELECT
TO authenticated
USING (
    -- Verificar se user tem role admin
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
    OR
    -- OU se não tem perfil mas é admin no metadata (fallback)
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 5. CRIAR política para MODERATOR/EVENT_MANAGER ver seus eventos (SELECT)
CREATE POLICY "moderator_own_events_select" 
ON events
FOR SELECT
TO authenticated
USING (
    -- Apenas seus eventos (organizer_id)
    organizer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('moderator', 'event_manager')
    )
);

-- 6. CRIAR política para ADMIN inserir eventos (INSERT)
CREATE POLICY "admin_insert_events" 
ON events
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- 7. CRIAR política para MODERATOR/EVENT_MANAGER inserir eventos (INSERT)
CREATE POLICY "moderator_insert_events" 
ON events
FOR INSERT
TO authenticated
WITH CHECK (
    -- Pode criar eventos onde ele é o organizador
    organizer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('moderator', 'event_manager')
    )
);

-- 8. CRIAR política para ADMIN atualizar eventos (UPDATE)
CREATE POLICY "admin_update_events" 
ON events
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- 9. CRIAR política para MODERATOR/EVENT_MANAGER atualizar seus eventos (UPDATE)
CREATE POLICY "moderator_update_own_events" 
ON events
FOR UPDATE
TO authenticated
USING (
    organizer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role IN ('moderator', 'event_manager')
    )
);

-- 10. CRIAR política para ADMIN deletar eventos (DELETE)
CREATE POLICY "admin_delete_events" 
ON events
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
);

-- 11. GARANTIR que RLS está ATIVO
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 12. VERIFICAR políticas criadas
SELECT 
    policyname,
    cmd,
    roles,
    CASE 
        WHEN policyname LIKE '%admin%' THEN '👑 Admin'
        WHEN policyname LIKE '%moderator%' THEN '🔐 Moderator'
        ELSE '❓ Outro'
    END as "Tipo"
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY cmd, policyname;

-- 13. TESTAR acesso
-- Execute isto como o user admin (rdias300@gmail.com)
SELECT 
    id,
    name,
    organizer_id,
    is_active,
    created_at
FROM events
ORDER BY created_at DESC;

-- Deve retornar TODOS os eventos (incluindo teste1)

-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================
-- 
-- ✅ Com SERVICE ROLE KEY no servidor:
--    - RLS é BYPASSED automaticamente
--    - Não precisa de políticas
--    - Mais seguro para operações administrativas
-- 
-- ⚠️ Com ANON KEY no servidor:
--    - RLS está ATIVO
--    - Precisa de políticas corretas
--    - Menos recomendado para APIs server-side
-- 
-- 🔐 Recomendação:
--    - Usar SERVICE_ROLE_KEY no servidor (events-routes.js)
--    - Usar ANON_KEY no cliente (browser)
--    - Implementar escopo/filtros no código do servidor
-- 
-- ==========================================

-- 14. OPCIONAL: Desativar RLS temporariamente para DEBUG
-- ⚠️ APENAS PARA DEBUG! NUNCA EM PRODUÇÃO!
-- ALTER TABLE events DISABLE ROW LEVEL SECURITY;
-- 
-- Após confirmar que funciona sem RLS, reativar:
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- E ajustar as policies acima

