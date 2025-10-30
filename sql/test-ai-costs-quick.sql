-- Script rápido para testar AI Cost Stats
-- Insere dados dos últimos 7 dias

-- Limpar dados antigos (opcional)
-- TRUNCATE TABLE ai_cost_stats;

-- Inserir dados de teste dos últimos 7 dias
INSERT INTO ai_cost_stats (timestamp, service, model, region, cost_amount, tokens_input, tokens_output, tokens_total, request_duration_ms, cost_type, metadata)
VALUES 
    -- Hoje
    (NOW() - INTERVAL '2 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 850, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '4 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 920, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '6 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0008, 3500, 1200, 4700, 1850, 'api_call', '{"operation": "text_generation"}'),
    (NOW() - INTERVAL '8 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 780, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '10 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0006, 2800, 900, 3700, 1420, 'api_call', '{"operation": "text_generation"}'),
    
    -- Ontem
    (NOW() - INTERVAL '1 day', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 890, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '1 day' - INTERVAL '2 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 950, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '1 day' - INTERVAL '4 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0009, 4200, 1500, 5700, 2100, 'api_call', '{"operation": "text_generation"}'),
    (NOW() - INTERVAL '1 day' - INTERVAL '6 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 820, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '1 day' - INTERVAL '10 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0007, 3200, 1100, 4300, 1650, 'api_call', '{"operation": "text_generation"}'),
    
    -- Há 2 dias
    (NOW() - INTERVAL '2 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 870, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '2 days' - INTERVAL '3 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 910, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '2 days' - INTERVAL '5 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0010, 4800, 1800, 6600, 2350, 'api_call', '{"operation": "text_generation"}'),
    (NOW() - INTERVAL '2 days' - INTERVAL '8 hours', 'google-ai', 'gemini-1.5-pro', 'us-east-1', 0.0125, 6500, 2500, 9000, 3200, 'api_call', '{"operation": "advanced_analysis"}'),
    
    -- Há 3 dias
    (NOW() - INTERVAL '3 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 840, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '3 days' - INTERVAL '4 hours', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 930, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '3 days' - INTERVAL '7 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0008, 3800, 1300, 5100, 1900, 'api_call', '{"operation": "text_generation"}'),
    
    -- Há 4 dias
    (NOW() - INTERVAL '4 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 860, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '4 days' - INTERVAL '5 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0009, 4100, 1400, 5500, 2050, 'api_call', '{"operation": "text_generation"}'),
    
    -- Há 5 dias
    (NOW() - INTERVAL '5 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 880, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '5 days' - INTERVAL '3 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0007, 3300, 1000, 4300, 1550, 'api_call', '{"operation": "text_generation"}'),
    
    -- Há 6 dias
    (NOW() - INTERVAL '6 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 900, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '6 days' - INTERVAL '6 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0011, 5200, 2000, 7200, 2450, 'api_call', '{"operation": "text_generation"}'),
    
    -- Há 7 dias
    (NOW() - INTERVAL '7 days', 'google-vision', 'vision-api-v1', 'us-east-1', 0.0015, 1, 0, 1, 890, 'api_call', '{"operation": "text_detection"}'),
    (NOW() - INTERVAL '7 days' - INTERVAL '4 hours', 'google-ai', 'gemini-1.5-flash', 'us-east-1', 0.0008, 3600, 1250, 4850, 1780, 'api_call', '{"operation": "text_generation"}');

-- Verificar inserção
SELECT 
    'Dados de teste inseridos!' as status,
    COUNT(*) as total_records,
    ROUND(SUM(cost_amount)::NUMERIC, 4) as total_cost_usd,
    MIN(timestamp)::DATE as oldest,
    MAX(timestamp)::DATE as newest
FROM ai_cost_stats
WHERE timestamp >= NOW() - INTERVAL '7 days';

-- Ver por dia
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as requests,
    ROUND(SUM(cost_amount)::NUMERIC, 4) as cost
FROM ai_cost_stats
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp) DESC;

