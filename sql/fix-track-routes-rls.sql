-- Corrigir RLS para permitir INSERT em track_routes

-- Remover policy antiga
DROP POLICY IF EXISTS track_routes_authenticated ON track_routes;
DROP POLICY IF EXISTS track_routes_all ON track_routes;
DROP POLICY IF EXISTS track_routes_organizer ON track_routes;
DROP POLICY IF EXISTS track_routes_public_view ON track_routes;

-- Policy completa para authenticated users
CREATE POLICY track_routes_authenticated_full ON track_routes
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verificar
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'track_routes';

