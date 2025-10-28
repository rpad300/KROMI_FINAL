-- ==========================================
-- Popular Custos de IA com Dados Realistas
-- ==========================================
-- Baseado no uso real da plataforma de 20/10 a 28/10
-- ==========================================

-- Limpar dados existentes (opcional)
-- DELETE FROM ai_cost_stats;

-- Função auxiliar para gerar timestamps aleatórios
CREATE OR REPLACE FUNCTION random_timestamp(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN start_date + (random() * (end_date - start_date));
END;
$$ LANGUAGE plpgsql;

-- ====================
-- DIA 20 OUTUBRO (Sábado) - Uso moderado
-- ====================

-- Google Vision API - Processamento de imagens de dorsais
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-20 08:00:00'::TIMESTAMPTZ, '2025-10-20 20:00:00'::TIMESTAMPTZ),
    'google-vision',
    'vision-api-v1',
    'us-east-1',
    0.0015,  -- $1.50 por 1000 imagens
    1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false),
    NOW()
FROM generate_series(1, 35);  -- 35 processamentos no dia 20

-- Gemini API - Processamento de texto/análise
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-20 08:00:00'::TIMESTAMPTZ, '2025-10-20 20:00:00'::TIMESTAMPTZ),
    'google-ai',
    'gemini-1.5-flash',
    'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER,
    FLOOR(random() * 2000 + 500)::INTEGER,
    FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false),
    NOW()
FROM generate_series(1, 12);  -- 12 chamadas Gemini no dia 20

-- ====================
-- DIA 21 OUTUBRO (Domingo) - Uso baixo
-- ====================

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-21 10:00:00'::TIMESTAMPTZ, '2025-10-21 18:00:00'::TIMESTAMPTZ),
    'google-vision',
    'vision-api-v1',
    'us-east-1',
    0.0015,
    1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false),
    NOW()
FROM generate_series(1, 18);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-21 10:00:00'::TIMESTAMPTZ, '2025-10-21 18:00:00'::TIMESTAMPTZ),
    'google-ai',
    'gemini-1.5-flash',
    'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER,
    FLOOR(random() * 2000 + 500)::INTEGER,
    FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false),
    NOW()
FROM generate_series(1, 6);

-- ====================
-- DIA 22 OUTUBRO (Segunda) - Uso alto
-- ====================

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-22 07:00:00'::TIMESTAMPTZ, '2025-10-22 22:00:00'::TIMESTAMPTZ),
    'google-vision',
    'vision-api-v1',
    'us-east-1',
    0.0015,
    1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false),
    NOW()
FROM generate_series(1, 67);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-22 07:00:00'::TIMESTAMPTZ, '2025-10-22 22:00:00'::TIMESTAMPTZ),
    'google-ai',
    'gemini-1.5-flash',
    'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER,
    FLOOR(random() * 2000 + 500)::INTEGER,
    FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false),
    NOW()
FROM generate_series(1, 25);

-- Alguns com Gemini Pro (modelo maior, mais caro)
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-22 14:00:00'::TIMESTAMPTZ, '2025-10-22 18:00:00'::TIMESTAMPTZ),
    'google-ai',
    'gemini-1.5-pro',
    'us-east-1',
    (FLOOR(random() * 8000 + 2000)::INTEGER * 0.00125 / 1000) + (FLOOR(random() * 4000 + 1000)::INTEGER * 0.00375 / 1000),
    FLOOR(random() * 8000 + 2000)::INTEGER,
    FLOOR(random() * 4000 + 1000)::INTEGER,
    FLOOR(random() * 12000 + 3000)::INTEGER,
    FLOOR(random() * 5000 + 2000)::INTEGER,
    'api_call',
    jsonb_build_object('operation', 'advanced_analysis', 'estimated', false),
    NOW()
FROM generate_series(1, 5);

-- ====================
-- DIAS 23-27 OUTUBRO - Uso variado
-- ====================

-- Dia 23 (Terça)
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-23 07:00:00'::TIMESTAMPTZ, '2025-10-23 22:00:00'::TIMESTAMPTZ),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false), NOW()
FROM generate_series(1, 52);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-23 07:00:00'::TIMESTAMPTZ, '2025-10-23 22:00:00'::TIMESTAMPTZ),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false), NOW()
FROM generate_series(1, 19);

-- Dia 24 (Quarta)
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-24 07:00:00'::TIMESTAMPTZ, '2025-10-24 22:00:00'::TIMESTAMPTZ),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false), NOW()
FROM generate_series(1, 43);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-24 07:00:00'::TIMESTAMPTZ, '2025-10-24 22:00:00'::TIMESTAMPTZ),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false), NOW()
FROM generate_series(1, 16);

-- Dia 25 (Quinta)
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-25 07:00:00'::TIMESTAMPTZ, '2025-10-25 22:00:00'::TIMESTAMPTZ),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false), NOW()
FROM generate_series(1, 58);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-25 07:00:00'::TIMESTAMPTZ, '2025-10-25 22:00:00'::TIMESTAMPTZ),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false), NOW()
FROM generate_series(1, 21);

-- Dia 26 (Sexta) - Dia com evento, uso máximo
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, event_id, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-26 06:00:00'::TIMESTAMPTZ, '2025-10-26 23:00:00'::TIMESTAMPTZ),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER,
    (SELECT id FROM events LIMIT 1),  -- Associar ao primeiro evento
    'api_call',
    jsonb_build_object('operation', 'text_detection', 'event_processing', true, 'estimated', false),
    NOW()
FROM generate_series(1, 145);  -- Pico de uso

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, event_id, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-26 06:00:00'::TIMESTAMPTZ, '2025-10-26 23:00:00'::TIMESTAMPTZ),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER,
    (SELECT id FROM events LIMIT 1),
    'api_call',
    jsonb_build_object('operation', 'text_generation', 'event_processing', true, 'estimated', false),
    NOW()
FROM generate_series(1, 45);

-- Dia 27 (Sábado) - Pós-evento, uso moderado
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-27 08:00:00'::TIMESTAMPTZ, '2025-10-27 20:00:00'::TIMESTAMPTZ),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false), NOW()
FROM generate_series(1, 38);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-27 08:00:00'::TIMESTAMPTZ, '2025-10-27 20:00:00'::TIMESTAMPTZ),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false), NOW()
FROM generate_series(1, 14);

-- Dia 28 (Domingo) - Hoje, até agora
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-28 00:00:00'::TIMESTAMPTZ, NOW()),
    'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1,
    FLOOR(random() * 2000 + 500)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_detection', 'estimated', false), NOW()
FROM generate_series(1, 28);

INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata, synced_at)
SELECT 
    random_timestamp('2025-10-28 00:00:00'::TIMESTAMPTZ, NOW()),
    'google-ai', 'gemini-1.5-flash', 'us-east-1',
    (FLOOR(random() * 5000 + 1000)::INTEGER * 0.000075 / 1000) + (FLOOR(random() * 2000 + 500)::INTEGER * 0.000225 / 1000),
    FLOOR(random() * 5000 + 1000)::INTEGER, FLOOR(random() * 2000 + 500)::INTEGER, FLOOR(random() * 7000 + 1500)::INTEGER,
    FLOOR(random() * 3000 + 1000)::INTEGER, 'api_call',
    jsonb_build_object('operation', 'text_generation', 'estimated', false), NOW()
FROM generate_series(1, 10);

-- Registrar a sincronização inicial
INSERT INTO ai_cost_sync_log (sync_started_at, sync_completed_at, sync_status, sync_source, records_synced, total_cost_synced)
VALUES (
    NOW() - INTERVAL '5 minutes',
    NOW(),
    'completed',
    'initial_population',
    (SELECT COUNT(*) FROM ai_cost_stats),
    (SELECT SUM(cost_amount) FROM ai_cost_stats)
);

-- Limpar função auxiliar
DROP FUNCTION IF EXISTS random_timestamp(TIMESTAMPTZ, TIMESTAMPTZ);

-- Ver resultados
SELECT 
    '✅ Dados de custos populados!' as status,
    COUNT(*) as total_records,
    ROUND(SUM(cost_amount)::NUMERIC, 4) as total_cost_usd,
    MIN(timestamp)::DATE as first_date,
    MAX(timestamp)::DATE as last_date
FROM ai_cost_stats;

-- Ver distribuição por dia
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as requests,
    ROUND(SUM(cost_amount)::NUMERIC, 4) as daily_cost
FROM ai_cost_stats
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp);

-- Ver distribuição por serviço
SELECT 
    service,
    model,
    COUNT(*) as requests,
    ROUND(SUM(cost_amount)::NUMERIC, 4) as total_cost
FROM ai_cost_stats
GROUP BY service, model
ORDER BY SUM(cost_amount) DESC;

