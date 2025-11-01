-- ============================================================================
-- VISIONKRONO - INSTALAÇÃO COMPLETA DO MÓDULO GPS TRACKING
-- ============================================================================
-- Execute este ficheiro ÚNICO para instalar todo o módulo
-- Ordem: Schema → RLS → Functions → (opcional) Seeds
-- ============================================================================

\echo '=========================================='
\echo 'VisionKrono - Módulo GPS Tracking'
\echo 'Instalação Completa'
\echo '=========================================='
\echo ''

\echo '1/4 Criando schema (tabelas, índices, constraints)...'
\i sql/track_module_schema.sql
\echo '✓ Schema criado'
\echo ''

\echo '2/4 Configurando RLS (Row Level Security)...'
\i sql/track_module_rls.sql
\echo '✓ RLS configurado'
\echo ''

\echo '3/4 Criando funções e RPCs...'
\i sql/track_module_functions.sql
\echo '✓ Funções criadas'
\echo ''

\echo '4/7 ⭐ Criando tabelas para App Móvel (Inbox Pattern)...'
\i sql/track_module_mobile_inbox.sql
\echo '✓ Tabelas Inbox criadas'
\echo ''

\echo '5/7 ⭐ Criando processador da Inbox...'
\i sql/track_module_inbox_processor.sql
\echo '✓ Processador criado'
\echo ''

\echo '6/7 Migrando QRs existentes (se houver)...'
SELECT track_migrate_existing_qrs();
\echo '✓ Migração executada'
\echo ''

\echo '7/7 Carregando seeds de demonstração...'
\echo 'AVISO: Isto criará dados de teste. Pular se estiver em produção!'
\echo 'Para pular, pressione Ctrl+C agora. Caso contrário, aguarde 5 segundos...'
SELECT pg_sleep(5);
\i sql/track_module_seeds.sql
\echo '✓ Seeds carregados'
\echo ''

\echo '=========================================='
\echo 'INSTALAÇÃO COMPLETA CONCLUÍDA!'
\echo '=========================================='
\echo 'Módulo Base + Inbox Pattern instalados!'
\echo ''

-- Verificação final
\echo 'Verificação:'
SELECT 
    'Tabelas criadas' as check_type,
    COUNT(*)::text || ' tabelas' as result
FROM pg_tables 
WHERE tablename LIKE 'track_%'

UNION ALL

SELECT 
    'Views criadas',
    COUNT(*)::text || ' views'
FROM pg_views
WHERE viewname LIKE 'v_track_%'

UNION ALL

SELECT 
    'Funções criadas',
    COUNT(*)::text || ' funções'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE 'track_%'

UNION ALL

SELECT 
    'Rotas demo',
    COUNT(*)::text || ' rotas'
FROM track_routes

UNION ALL

SELECT 
    'QRs demo',
    COUNT(*)::text || ' QRs'
FROM track_participant_qr

UNION ALL

SELECT 
    'Atividades demo',
    COUNT(*)::text || ' atividades'
FROM track_activities

UNION ALL

SELECT 
    'Pontos GPS demo',
    COUNT(*)::text || ' pontos'
FROM track_gps_live;

\echo ''
\echo 'Próximos passos:'
\echo '1. Configure as UIs com suas credenciais Supabase'
\echo '2. Consulte GPS_TRACKING_MODULE_README.md'
\echo '3. Execute testes (docs/GPS_TRACKING_TESTS.md)'
\echo ''
\echo 'Boa sorte! 🚀'

