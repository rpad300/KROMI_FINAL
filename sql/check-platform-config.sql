-- Script para verificar e criar as tabelas de configuração da plataforma
-- Execute este script no Supabase SQL Editor

-- Verificar se as tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('platform_configurations', 'event_processor_settings', 'global_processor_settings') 
        THEN '✅ Existe' 
        ELSE '❌ Não existe' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('platform_configurations', 'event_processor_settings', 'global_processor_settings');

-- Verificar se as funções RPC existem
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('set_event_processor_setting', 'get_event_processor_setting', 'set_platform_config', 'get_platform_config') 
        THEN '✅ Existe' 
        ELSE '❌ Não existe' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('set_event_processor_setting', 'get_event_processor_setting', 'set_platform_config', 'get_platform_config');

-- Verificar dados existentes na tabela event_processor_settings
SELECT 
    COUNT(*) as total_configuracoes,
    COUNT(CASE WHEN processor_type = 'inherited' THEN 1 END) as herdadas,
    COUNT(CASE WHEN processor_type != 'inherited' THEN 1 END) as especificas
FROM event_processor_settings;

-- Listar configurações existentes
SELECT 
    e.name as evento,
    eps.processor_type,
    eps.processor_speed,
    eps.processor_confidence,
    eps.is_forced,
    eps.created_at
FROM event_processor_settings eps
LEFT JOIN events e ON e.id = eps.event_id
ORDER BY eps.created_at DESC;


