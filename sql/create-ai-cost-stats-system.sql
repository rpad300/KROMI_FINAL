-- ==========================================
-- Sistema de Estatísticas de Custos de IA
-- ==========================================
-- Centraliza visualização de custos reais de IA
-- ==========================================

-- Tabela para armazenar custos de IA sincronizados do cloud provider
CREATE TABLE IF NOT EXISTS ai_cost_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    service VARCHAR(100) NOT NULL,  -- ex: 'openai', 'anthropic', 'google-ai'
    model VARCHAR(100),  -- ex: 'gpt-4', 'claude-3-sonnet'
    region VARCHAR(50),  -- ex: 'us-east-1', 'eu-west-1'
    environment VARCHAR(50) DEFAULT 'production',  -- 'production', 'staging', 'development'
    cost_amount DECIMAL(10, 6) NOT NULL,  -- custo em USD
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Contexto do pedido
    request_id VARCHAR(255),  -- ID do pedido na aplicação
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    
    -- Métricas de uso
    tokens_input INTEGER,
    tokens_output INTEGER,
    tokens_total INTEGER,
    request_duration_ms INTEGER,
    
    -- Metadata adicional
    cost_type VARCHAR(50) DEFAULT 'api_call',  -- 'api_call', 'storage', 'transfer'
    metadata JSONB,  -- informação adicional flexível
    
    -- Sincronização
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_source VARCHAR(100),  -- fonte da sincronização
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_timestamp ON ai_cost_stats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_service ON ai_cost_stats(service);
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_model ON ai_cost_stats(model);
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_event_id ON ai_cost_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_synced_at ON ai_cost_stats(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_stats_cost_type ON ai_cost_stats(cost_type);

-- Tabela para controlar sincronizações
CREATE TABLE IF NOT EXISTS ai_cost_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_started_at TIMESTAMPTZ NOT NULL,
    sync_completed_at TIMESTAMPTZ,
    sync_status VARCHAR(50) NOT NULL,  -- 'running', 'completed', 'failed'
    sync_source VARCHAR(100),
    records_synced INTEGER DEFAULT 0,
    total_cost_synced DECIMAL(12, 6),
    error_message TEXT,
    triggered_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_sync_log_started ON ai_cost_sync_log(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_sync_log_status ON ai_cost_sync_log(sync_status);

-- View para agregações comuns
CREATE OR REPLACE VIEW ai_cost_stats_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    service,
    model,
    region,
    event_id,
    COUNT(*) as request_count,
    SUM(cost_amount) as total_cost,
    SUM(tokens_input) as total_tokens_input,
    SUM(tokens_output) as total_tokens_output,
    SUM(tokens_total) as total_tokens_total,
    AVG(request_duration_ms) as avg_duration_ms
FROM ai_cost_stats
GROUP BY DATE_TRUNC('hour', timestamp), service, model, region, event_id;

-- View para custos por evento
CREATE OR REPLACE VIEW ai_cost_by_event AS
SELECT 
    e.id as event_id,
    e.name as event_name,
    e.event_date,
    COUNT(acs.id) as request_count,
    SUM(acs.cost_amount) as total_cost,
    MIN(acs.timestamp) as first_request,
    MAX(acs.timestamp) as last_request,
    SUM(acs.tokens_total) as total_tokens
FROM events e
LEFT JOIN ai_cost_stats acs ON acs.event_id = e.id
GROUP BY e.id, e.name, e.event_date;

-- Função para obter custos do período
CREATE OR REPLACE FUNCTION get_ai_costs_period(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    filter_service VARCHAR DEFAULT NULL,
    filter_model VARCHAR DEFAULT NULL,
    filter_event_id UUID DEFAULT NULL,
    filter_region VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    cost_timestamp TIMESTAMPTZ,
    service VARCHAR,
    model VARCHAR,
    region VARCHAR,
    event_id UUID,
    cost_amount DECIMAL,
    tokens_total INTEGER,
    request_id VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        acs.timestamp,
        acs.service,
        acs.model,
        acs.region,
        acs.event_id,
        acs.cost_amount,
        acs.tokens_total,
        acs.request_id
    FROM ai_cost_stats acs
    WHERE 
        acs.timestamp >= start_date
        AND acs.timestamp <= end_date
        AND (filter_service IS NULL OR acs.service = filter_service)
        AND (filter_model IS NULL OR acs.model = filter_model)
        AND (filter_event_id IS NULL OR acs.event_id = filter_event_id)
        AND (filter_region IS NULL OR acs.region = filter_region)
    ORDER BY acs.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter agregações por dimensão
CREATE OR REPLACE FUNCTION get_ai_costs_aggregated(
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    group_by_dimension VARCHAR  -- 'service', 'model', 'region', 'event', 'hour', 'day'
)
RETURNS TABLE (
    dimension_value TEXT,
    request_count BIGINT,
    total_cost DECIMAL,
    total_tokens BIGINT
) AS $$
BEGIN
    IF group_by_dimension = 'service' THEN
        RETURN QUERY
        SELECT 
            acs.service::TEXT,
            COUNT(*)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY acs.service
        ORDER BY SUM(acs.cost_amount) DESC;
    
    ELSIF group_by_dimension = 'model' THEN
        RETURN QUERY
        SELECT 
            acs.model::TEXT,
            COUNT(*)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY acs.model
        ORDER BY SUM(acs.cost_amount) DESC;
    
    ELSIF group_by_dimension = 'region' THEN
        RETURN QUERY
        SELECT 
            acs.region::TEXT,
            COUNT(*)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY acs.region
        ORDER BY SUM(acs.cost_amount) DESC;
    
    ELSIF group_by_dimension = 'event' THEN
        RETURN QUERY
        SELECT 
            e.name::TEXT,
            COUNT(acs.id)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        LEFT JOIN events e ON e.id = acs.event_id
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY e.name
        ORDER BY SUM(acs.cost_amount) DESC;
    
    ELSIF group_by_dimension = 'hour' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE_TRUNC('hour', acs.timestamp), 'YYYY-MM-DD HH24:00')::TEXT,
            COUNT(*)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY DATE_TRUNC('hour', acs.timestamp)
        ORDER BY DATE_TRUNC('hour', acs.timestamp);
    
    ELSIF group_by_dimension = 'day' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE_TRUNC('day', acs.timestamp), 'YYYY-MM-DD')::TEXT,
            COUNT(*)::BIGINT,
            SUM(acs.cost_amount)::DECIMAL,
            SUM(acs.tokens_total)::BIGINT
        FROM ai_cost_stats acs
        WHERE acs.timestamp >= start_date AND acs.timestamp <= end_date
        GROUP BY DATE_TRUNC('day', acs.timestamp)
        ORDER BY DATE_TRUNC('day', acs.timestamp);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para obter indicadores de topo
CREATE OR REPLACE FUNCTION get_ai_cost_indicators()
RETURNS TABLE (
    total_period DECIMAL,
    last_24h DECIMAL,
    last_72h DECIMAL,
    current_month DECIMAL,
    last_sync TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COALESCE(SUM(cost_amount), 0) FROM ai_cost_stats) as total_period,
        (SELECT COALESCE(SUM(cost_amount), 0) FROM ai_cost_stats WHERE timestamp >= NOW() - INTERVAL '24 hours') as last_24h,
        (SELECT COALESCE(SUM(cost_amount), 0) FROM ai_cost_stats WHERE timestamp >= NOW() - INTERVAL '72 hours') as last_72h,
        (SELECT COALESCE(SUM(cost_amount), 0) FROM ai_cost_stats WHERE timestamp >= DATE_TRUNC('month', NOW())) as current_month,
        (SELECT MAX(synced_at) FROM ai_cost_stats) as last_sync;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE ai_cost_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas administradores têm acesso
CREATE POLICY ai_cost_stats_admin_policy ON ai_cost_stats
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

CREATE POLICY ai_cost_sync_log_admin_policy ON ai_cost_sync_log
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Grants
GRANT SELECT, INSERT, UPDATE ON ai_cost_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_cost_sync_log TO authenticated;
GRANT SELECT ON ai_cost_stats_summary TO authenticated;
GRANT SELECT ON ai_cost_by_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_costs_period TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_costs_aggregated TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_cost_indicators TO authenticated;

-- Comentários
COMMENT ON TABLE ai_cost_stats IS 'Armazena custos reais de IA sincronizados do cloud provider';
COMMENT ON TABLE ai_cost_sync_log IS 'Log de sincronizações de custos de IA';
COMMENT ON VIEW ai_cost_stats_summary IS 'Agregações horárias de custos de IA';
COMMENT ON VIEW ai_cost_by_event IS 'Custos de IA agregados por evento';
COMMENT ON FUNCTION get_ai_costs_period IS 'Obtém custos de IA de um período com filtros opcionais';
COMMENT ON FUNCTION get_ai_costs_aggregated IS 'Obtém custos de IA agregados por dimensão';
COMMENT ON FUNCTION get_ai_cost_indicators IS 'Obtém indicadores principais de custos de IA';

-- Verificação
SELECT 
    '✅ Sistema de AI Cost Stats criado!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('ai_cost_stats', 'ai_cost_sync_log')) as tables_created,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_name IN ('ai_cost_stats_summary', 'ai_cost_by_event')) as views_created;

