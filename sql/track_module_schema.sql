-- ============================================================================
-- VISIONKRONO - MÓDULO GPS TRACKING
-- ============================================================================
-- Módulo de cronometragem GPS em tempo real por atleta
-- Usa QR individual, sem alterar tabelas existentes (eventos, participants)
-- Namespace: track_*
-- ============================================================================

-- ============================================================================
-- 1. TRACK_ROUTES - Rotas e GPX por evento
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Identificação e descrição
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- GPX e metadados
    gpx_url TEXT,
    distance_km DECIMAL(10, 3),
    elev_gain_m DECIMAL(10, 2),
    elev_loss_m DECIMAL(10, 2),
    
    -- Visualização no mapa
    map_center_lat DECIMAL(10, 7),
    map_center_lng DECIMAL(11, 7),
    map_zoom INTEGER DEFAULT 13,
    
    -- Configurações de validação
    max_speed_kmh DECIMAL(5, 2) DEFAULT 50.0, -- Limite anti-fraude
    max_accuracy_m DECIMAL(6, 2) DEFAULT 50.0, -- Precisão GPS máxima aceita
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT track_routes_distance_positive CHECK (distance_km IS NULL OR distance_km > 0),
    CONSTRAINT track_routes_elev_valid CHECK (elev_gain_m IS NULL OR elev_gain_m >= 0),
    CONSTRAINT track_routes_lat_valid CHECK (map_center_lat IS NULL OR (map_center_lat >= -90 AND map_center_lat <= 90)),
    CONSTRAINT track_routes_lng_valid CHECK (map_center_lng IS NULL OR (map_center_lng >= -180 AND map_center_lng <= 180))
);

-- Índices
CREATE INDEX idx_track_routes_event ON track_routes(event_id);
CREATE INDEX idx_track_routes_active ON track_routes(event_id, is_active) WHERE is_active = true;

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION track_routes_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_routes_update_timestamp_trigger
    BEFORE UPDATE ON track_routes
    FOR EACH ROW
    EXECUTE FUNCTION track_routes_update_timestamp();

-- ============================================================================
-- 2. TRACK_PARTICIPANT_QR - QR exclusivo por participante/evento
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_participant_qr (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- QR Code (token seguro único)
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    
    -- Timestamps
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    
    -- Metadados
    notes TEXT,
    issued_by UUID,
    revoked_by UUID,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_qr_event ON track_participant_qr(event_id);
CREATE INDEX idx_track_qr_participant ON track_participant_qr(participant_id);
CREATE INDEX idx_track_qr_code ON track_participant_qr(qr_code) WHERE status = 'active';
CREATE INDEX idx_track_qr_active ON track_participant_qr(event_id, participant_id, status) WHERE status = 'active';

-- Constraint: apenas 1 QR ativo por participante/evento
CREATE UNIQUE INDEX idx_track_qr_unique_active 
    ON track_participant_qr(event_id, participant_id) 
    WHERE status = 'active';

-- ============================================================================
-- 3. TRACK_ACTIVITIES - Sessão de cronometragem GPS
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES track_routes(id) ON DELETE RESTRICT,
    
    -- Estado da atividade
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'armed', 'running', 'paused', 'finished', 'discarded')),
    
    -- Timestamps
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_time_sec INTEGER, -- Tempo total em segundos (excluindo pausas)
    paused_time_sec INTEGER DEFAULT 0, -- Tempo total pausado
    
    -- Métricas calculadas
    total_distance_m DECIMAL(12, 2),
    avg_speed_kmh DECIMAL(6, 3),
    max_speed_kmh DECIMAL(6, 3),
    avg_pace_min_km DECIMAL(6, 3), -- minutos por km
    elev_gain_m DECIMAL(10, 2),
    elev_loss_m DECIMAL(10, 2),
    
    -- Qualidade do tracking
    total_points INTEGER DEFAULT 0,
    valid_points INTEGER DEFAULT 0,
    avg_accuracy_m DECIMAL(6, 2),
    
    -- Origem
    source VARCHAR(50) DEFAULT 'mobile_app' CHECK (source IN ('mobile_app', 'manual_import', 'backoffice')),
    
    -- Polyline simplificada para visualização (JSON array de [lat, lng])
    summary_points JSONB,
    
    -- Metadados adicionais
    device_info JSONB, -- Info do dispositivo que fez o tracking
    metadata JSONB, -- Campos extras flexíveis
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    finished_by UUID,
    
    -- Constraints
    CONSTRAINT track_activities_time_valid CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time),
    CONSTRAINT track_activities_distance_positive CHECK (total_distance_m IS NULL OR total_distance_m >= 0),
    CONSTRAINT track_activities_points_valid CHECK (valid_points <= total_points)
);

-- Índices
CREATE INDEX idx_track_activities_event ON track_activities(event_id);
CREATE INDEX idx_track_activities_participant ON track_activities(participant_id);
CREATE INDEX idx_track_activities_route ON track_activities(route_id);
CREATE INDEX idx_track_activities_status ON track_activities(status);
CREATE INDEX idx_track_activities_event_route_status ON track_activities(event_id, route_id, status);

-- Índice para rankings (por rota, apenas finished)
CREATE INDEX idx_track_activities_rankings 
    ON track_activities(route_id, total_time_sec) 
    WHERE status = 'finished' AND total_time_sec IS NOT NULL;

-- Constraint: apenas 1 atividade ativa (armed, running, paused) por participante/evento
CREATE UNIQUE INDEX idx_track_activities_unique_active 
    ON track_activities(event_id, participant_id) 
    WHERE status IN ('armed', 'running', 'paused');

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION track_activities_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_activities_update_timestamp_trigger
    BEFORE UPDATE ON track_activities
    FOR EACH ROW
    EXECUTE FUNCTION track_activities_update_timestamp();

-- ============================================================================
-- 4. TRACK_GPS_LIVE - Pontos GPS em tempo real
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_gps_live (
    id BIGSERIAL PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES track_activities(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    
    -- Coordenadas
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(11, 7) NOT NULL,
    alt_m DECIMAL(8, 2), -- Altitude em metros
    
    -- Velocidade e precisão
    speed_kmh DECIMAL(6, 3), -- Velocidade em km/h
    accuracy_m DECIMAL(6, 2), -- Precisão GPS em metros
    bearing DECIMAL(5, 2), -- Direção (0-360 graus)
    
    -- Timestamps
    device_ts TIMESTAMPTZ NOT NULL, -- Timestamp do dispositivo
    server_ts TIMESTAMPTZ DEFAULT NOW(), -- Timestamp de inserção no servidor
    
    -- Batch tracking
    batch_id UUID, -- Identificador do lote enviado
    seq INTEGER, -- Sequência dentro do batch
    
    -- Flags de validação
    is_valid BOOLEAN DEFAULT true,
    validation_flags JSONB, -- Flags de validação/filtros aplicados
    
    -- Constraints
    CONSTRAINT track_gps_lat_valid CHECK (lat >= -90 AND lat <= 90),
    CONSTRAINT track_gps_lng_valid CHECK (lng >= -180 AND lng <= 180),
    CONSTRAINT track_gps_speed_positive CHECK (speed_kmh IS NULL OR speed_kmh >= 0),
    CONSTRAINT track_gps_accuracy_positive CHECK (accuracy_m IS NULL OR accuracy_m > 0)
);

-- Índices
CREATE INDEX idx_track_gps_activity ON track_gps_live(activity_id, device_ts DESC);
CREATE INDEX idx_track_gps_participant ON track_gps_live(participant_id);
CREATE INDEX idx_track_gps_batch ON track_gps_live(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_track_gps_device_ts ON track_gps_live(device_ts);
CREATE INDEX idx_track_gps_server_ts ON track_gps_live(server_ts);

-- Índice para live tracking (últimos pontos válidos por atividade)
CREATE INDEX idx_track_gps_live_tracking 
    ON track_gps_live(activity_id, device_ts DESC) 
    WHERE is_valid = true;

-- Índice geoespacial (se necessário para queries de proximidade)
-- Requer extensão PostGIS
-- CREATE INDEX idx_track_gps_geom ON track_gps_live USING GIST (ST_MakePoint(lng, lat));

-- ============================================================================
-- 5. TRACK_DEVICE_SESSION - Sessões de dispositivos (segurança)
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_device_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Identificação do dispositivo
    device_id VARCHAR(255) NOT NULL, -- UUID ou hash do device
    device_type VARCHAR(50), -- android, ios, web
    app_version VARCHAR(50),
    
    -- Sessão
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Estatísticas
    total_batches INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_device_event ON track_device_session(event_id);
CREATE INDEX idx_track_device_participant ON track_device_session(participant_id);
CREATE INDEX idx_track_device_active ON track_device_session(participant_id, is_active) WHERE is_active = true;
CREATE INDEX idx_track_device_id ON track_device_session(device_id);

-- ============================================================================
-- 6. TRACK_CHECKS - Checkpoints virtuais/físicos
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES track_routes(id) ON DELETE CASCADE,
    
    -- Identificação
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Localização
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(11, 7) NOT NULL,
    radius_m DECIMAL(6, 2) DEFAULT 50.0, -- Raio de detecção em metros
    
    -- Ordem no percurso
    order_index INTEGER NOT NULL,
    distance_from_start_km DECIMAL(10, 3), -- Distância desde início
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT track_checks_lat_valid CHECK (lat >= -90 AND lat <= 90),
    CONSTRAINT track_checks_lng_valid CHECK (lng >= -180 AND lng <= 180),
    CONSTRAINT track_checks_radius_positive CHECK (radius_m > 0),
    CONSTRAINT track_checks_order_positive CHECK (order_index >= 0)
);

-- Índices
CREATE INDEX idx_track_checks_event ON track_checks(event_id);
CREATE INDEX idx_track_checks_route ON track_checks(route_id);
CREATE INDEX idx_track_checks_route_order ON track_checks(route_id, order_index);

-- Unique: ordem por rota
CREATE UNIQUE INDEX idx_track_checks_route_order_unique 
    ON track_checks(route_id, order_index);

-- ============================================================================
-- 7. TRACK_ACTIVITY_CHECKPASS - Passagens em checkpoints
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_activity_checkpass (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES track_activities(id) ON DELETE CASCADE,
    check_id UUID NOT NULL REFERENCES track_checks(id) ON DELETE CASCADE,
    
    -- Tempo de passagem
    pass_time TIMESTAMPTZ NOT NULL,
    
    -- Métricas no momento da passagem
    distance_m DECIMAL(12, 2), -- Distância acumulada até aqui
    elapsed_sec INTEGER, -- Tempo desde início
    split_sec INTEGER, -- Tempo desde checkpoint anterior
    
    -- Ponto GPS mais próximo
    gps_point_id BIGINT REFERENCES track_gps_live(id),
    distance_to_check_m DECIMAL(6, 2), -- Distância real até checkpoint
    
    -- Detecção
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detection_method VARCHAR(50) DEFAULT 'auto', -- auto, manual, corrected
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_checkpass_activity ON track_activity_checkpass(activity_id);
CREATE INDEX idx_track_checkpass_check ON track_activity_checkpass(check_id);
CREATE INDEX idx_track_checkpass_pass_time ON track_activity_checkpass(pass_time);

-- Unique: 1 passagem por checkpoint por atividade
CREATE UNIQUE INDEX idx_track_checkpass_unique 
    ON track_activity_checkpass(activity_id, check_id);

-- ============================================================================
-- 8. TRACK_AUDIT_LOG - Log de auditoria para operações críticas
-- ============================================================================
CREATE TABLE IF NOT EXISTS track_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES track_activities(id) ON DELETE SET NULL,
    
    -- Ação
    action VARCHAR(100) NOT NULL, -- qr_issued, qr_revoked, activity_armed, activity_started, etc.
    actor_id UUID, -- Quem executou
    
    -- Contexto
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_track_audit_event ON track_audit_log(event_id);
CREATE INDEX idx_track_audit_participant ON track_audit_log(participant_id);
CREATE INDEX idx_track_audit_activity ON track_audit_log(activity_id);
CREATE INDEX idx_track_audit_action ON track_audit_log(action);
CREATE INDEX idx_track_audit_created ON track_audit_log(created_at DESC);

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON TABLE track_routes IS 'Rotas GPS e GPX por evento';
COMMENT ON TABLE track_participant_qr IS 'QR codes exclusivos para cronometragem por participante';
COMMENT ON TABLE track_activities IS 'Sessões de tracking GPS por participante';
COMMENT ON TABLE track_gps_live IS 'Pontos GPS em tempo real';
COMMENT ON TABLE track_device_session IS 'Sessões de dispositivos para rate limiting e auditoria';
COMMENT ON TABLE track_checks IS 'Checkpoints virtuais/físicos no percurso';
COMMENT ON TABLE track_activity_checkpass IS 'Registos de passagens em checkpoints';
COMMENT ON TABLE track_audit_log IS 'Log de auditoria de operações críticas';

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================

