-- Desabilitar RLS em TODAS as tabelas track_* para facilitar desenvolvimento

ALTER TABLE track_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_participant_qr DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_participant_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_gps_live DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_device_session DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_activity_checkpass DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_inbox_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_ingest_errors DISABLE ROW LEVEL SECURITY;
ALTER TABLE track_audit_log DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE 'track_%'
ORDER BY tablename;

-- Nota: Para produção, reativar com: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- e configurar policies adequadas

