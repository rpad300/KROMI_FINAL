-- Desabilitar RLS temporariamente para track_routes (permitir desenvolvimento)

-- Remover TODAS as policies
DROP POLICY IF EXISTS track_routes_authenticated_full ON track_routes;
DROP POLICY IF EXISTS track_routes_authenticated ON track_routes;
DROP POLICY IF EXISTS track_routes_all ON track_routes;
DROP POLICY IF EXISTS track_routes_organizer ON track_routes;
DROP POLICY IF EXISTS track_routes_public_view ON track_routes;

-- DESABILITAR RLS
ALTER TABLE track_routes DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'track_routes';

-- Deve mostrar: rls_enabled = false

