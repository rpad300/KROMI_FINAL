-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - RLS POLICIES (SIMPLIFICADO)
-- ============================================================================
-- Versão simplificada que funciona com auth.uid() básico do Supabase
-- Refinar conforme necessário baseado no sistema de roles existente
-- ============================================================================

-- Habilitar RLS
ALTER TABLE track_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_participant_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_gps_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_device_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_activity_checkpass ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_participant_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_inbox_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE track_device_registry ENABLE ROW LEVEL SECURITY; -- Usando track_device_session
ALTER TABLE track_ingest_errors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES SIMPLES - AUTHENTICATED USERS
-- ============================================================================

-- Rotas: qualquer autenticado pode ver e gerir
CREATE POLICY track_routes_authenticated ON track_routes
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- QR codes: qualquer autenticado pode ver e gerir
CREATE POLICY track_qr_authenticated ON track_participant_qr
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Atividades: qualquer autenticado pode ver e gerir
CREATE POLICY track_activities_authenticated ON track_activities
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- GPS Live: qualquer autenticado pode inserir e ver
CREATE POLICY track_gps_authenticated ON track_gps_live
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Device sessions: qualquer autenticado
CREATE POLICY track_device_session_authenticated ON track_device_session
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Checkpoints: qualquer autenticado
CREATE POLICY track_checks_authenticated ON track_checks
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Checkpoint pass: qualquer autenticado
CREATE POLICY track_checkpass_authenticated ON track_activity_checkpass
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- Audit log: apenas leitura
CREATE POLICY track_audit_authenticated ON track_audit_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY track_audit_insert ON track_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ⭐ INBOX: Participant Access (App lê)
CREATE POLICY track_access_read ON track_participant_access
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY track_access_write ON track_participant_access
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- ⭐ INBOX: Messages (App escreve)
CREATE POLICY track_inbox_insert ON track_inbox_messages
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Backend pode ler e atualizar
CREATE POLICY track_inbox_backend ON track_inbox_messages
    FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- ⭐ Device Session (já criada no schema base, RLS lá)
-- CREATE POLICY track_session_authenticated ON track_device_session...

-- ⭐ Ingest Errors - apenas leitura
CREATE POLICY track_errors_read ON track_ingest_errors
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY track_errors_insert ON track_ingest_errors
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================================================
-- FUNÇÕES AUXILIARES (SIMPLIFICADAS)
-- ============================================================================

-- Verificar se usuário é staff do evento (sempre true por enquanto)
CREATE OR REPLACE FUNCTION is_event_staff(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se participante pertence ao user autenticado (sempre true por enquanto)
CREATE OR REPLACE FUNCTION is_my_participant(p_participant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DAS RLS POLICIES SIMPLIFICADAS
-- ============================================================================

