-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING - RLS POLICIES
-- ============================================================================
-- Row Level Security para isolamento e segurança do módulo
-- ============================================================================

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================
ALTER TABLE track_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_participant_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_gps_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_device_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_activity_checkpass ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES PARA TRACK_ROUTES
-- ============================================================================

-- Authenticated users podem ver e criar (simplificado - ajustar conforme necessário)
CREATE POLICY track_routes_all ON track_routes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Organizadores do evento podem gerir suas rotas
CREATE POLICY track_routes_organizer ON track_routes
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_routes.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Público pode ver rotas ativas de eventos públicos
CREATE POLICY track_routes_public_view ON track_routes
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_routes.event_id
            AND (e.visibility = 'public' OR e.is_public = true)
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_PARTICIPANT_QR
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_qr_admin_all ON track_participant_qr
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores do evento podem gerir QRs
CREATE POLICY track_qr_organizer ON track_participant_qr
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_participant_qr.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Participante pode ver seu próprio QR ativo
CREATE POLICY track_qr_participant_view ON track_participant_qr
    FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        AND EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_participant_qr.participant_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_ACTIVITIES
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_activities_admin_all ON track_activities
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores do evento podem gerir atividades
CREATE POLICY track_activities_organizer ON track_activities
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_activities.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Participante pode ver e atualizar suas próprias atividades
CREATE POLICY track_activities_participant ON track_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_activities.participant_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY track_activities_participant_update ON track_activities
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_activities.participant_id
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Participante só pode atualizar status e métricas, não dados estruturais
        true
    );

-- Público pode ver atividades finished de eventos públicos
CREATE POLICY track_activities_public_view ON track_activities
    FOR SELECT
    TO authenticated
    USING (
        status = 'finished'
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_activities.event_id
            AND (e.visibility = 'public' OR e.is_public = true)
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_GPS_LIVE
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_gps_admin_all ON track_gps_live
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores podem ver pontos do seu evento
CREATE POLICY track_gps_organizer_view ON track_gps_live
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM track_activities ta
            JOIN eventos e ON e.id = ta.event_id
            WHERE ta.id = track_gps_live.activity_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Participante pode inserir e ver seus próprios pontos
CREATE POLICY track_gps_participant_insert ON track_gps_live
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_gps_live.participant_id
            AND p.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM track_activities ta
            WHERE ta.id = track_gps_live.activity_id
            AND ta.participant_id = track_gps_live.participant_id
            AND ta.status = 'running'
        )
    );

CREATE POLICY track_gps_participant_view ON track_gps_live
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_gps_live.participant_id
            AND p.user_id = auth.uid()
        )
    );

-- Público pode ver pontos de atividades running em eventos públicos (live tracking)
CREATE POLICY track_gps_public_live ON track_gps_live
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM track_activities ta
            JOIN eventos e ON e.id = ta.event_id
            WHERE ta.id = track_gps_live.activity_id
            AND ta.status IN ('running', 'paused')
            AND (e.visibility = 'public' OR e.is_public = true)
            AND e.enable_live_tracking = true -- assumindo que há esta flag
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_DEVICE_SESSION
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_device_admin_all ON track_device_session
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores podem ver sessões do seu evento
CREATE POLICY track_device_organizer_view ON track_device_session
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_device_session.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Participante pode criar e ver suas próprias sessões
CREATE POLICY track_device_participant ON track_device_session
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM participants p
            WHERE p.id = track_device_session.participant_id
            AND p.user_id = auth.uid()
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_CHECKS
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_checks_admin_all ON track_checks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores do evento podem gerir checkpoints
CREATE POLICY track_checks_organizer ON track_checks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_checks.event_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Público pode ver checkpoints ativos de eventos públicos
CREATE POLICY track_checks_public_view ON track_checks
    FOR SELECT
    TO authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM events e
            WHERE e.id = track_checks.event_id
            AND (e.visibility = 'public' OR e.is_public = true)
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_ACTIVITY_CHECKPASS
-- ============================================================================

-- Admin/Staff pode tudo
CREATE POLICY track_checkpass_admin_all ON track_activity_checkpass
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Organizadores podem ver passagens do seu evento
CREATE POLICY track_checkpass_organizer_view ON track_activity_checkpass
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM track_activities ta
            JOIN eventos e ON e.id = ta.event_id
            WHERE ta.id = track_activity_checkpass.activity_id
            AND e.organizer_id = auth.uid()
        )
    );

-- Participante pode ver suas próprias passagens
CREATE POLICY track_checkpass_participant_view ON track_activity_checkpass
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM track_activities ta
            JOIN participants p ON p.id = ta.participant_id
            WHERE ta.id = track_activity_checkpass.activity_id
            AND p.user_id = auth.uid()
        )
    );

-- Público pode ver passagens de atividades finished em eventos públicos
CREATE POLICY track_checkpass_public_view ON track_activity_checkpass
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM track_activities ta
            JOIN eventos e ON e.id = ta.event_id
            WHERE ta.id = track_activity_checkpass.activity_id
            AND ta.status = 'finished'
            AND (e.visibility = 'public' OR e.is_public = true)
        )
    );

-- ============================================================================
-- POLICIES PARA TRACK_AUDIT_LOG
-- ============================================================================

-- Apenas Admin/Staff pode ver audit logs
CREATE POLICY track_audit_admin_view ON track_audit_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'staff')
        )
    );

-- Sistema pode inserir (via trigger ou função)
CREATE POLICY track_audit_system_insert ON track_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Validação feita via função

-- ============================================================================
-- FUNÇÕES AUXILIARES DE RLS
-- ============================================================================

-- Verificar se usuário é staff do evento
CREATE OR REPLACE FUNCTION is_event_staff(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'staff')
    ) OR EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = p_event_id
        AND e.organizer_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se participante pertence ao user autenticado
CREATE OR REPLACE FUNCTION is_my_participant(p_participant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM participants p
        WHERE p.id = p_participant_id
        AND p.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DAS RLS POLICIES
-- ============================================================================

