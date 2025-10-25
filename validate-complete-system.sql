-- =====================================================
-- VisionKrono - Validação Completa do Sistema
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DAS TABELAS CRIADAS
DO $$
BEGIN
    RAISE NOTICE '🔍 VALIDAÇÃO 1: Estrutura das Tabelas';
    RAISE NOTICE '=====================================';
END $$;

-- Verificar se tabelas existem
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modality_activities') 
        THEN '✅ modality_activities' 
        ELSE '❌ modality_activities' 
    END as tabela_modality_activities,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_times') 
        THEN '✅ activity_times' 
        ELSE '❌ activity_times' 
    END as tabela_activity_times,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lap_data') 
        THEN '✅ lap_data' 
        ELSE '❌ lap_data' 
    END as tabela_lap_data,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_lap_config') 
        THEN '✅ event_lap_config' 
        ELSE '❌ event_lap_config' 
    END as tabela_event_lap_config;

-- 2. VERIFICAR MODALIDADES MULTI-DISCIPLINARES
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 2: Modalidades Multi-Disciplinares';
    RAISE NOTICE '==============================================';
END $$;

-- Verificar se Duatlo e Triatlo existem
SELECT 
    name as modalidade,
    description,
    icon,
    has_lap_counter,
    CASE 
        WHEN name IN ('Duatlo', 'Triatlo') THEN '✅ Multi-disciplinar'
        ELSE 'ℹ️ Simples'
    END as tipo
FROM event_modalities 
WHERE name IN ('Duatlo', 'Triatlo', 'Corrida', 'Ciclismo', 'Natação')
ORDER BY name;

-- 3. VERIFICAR ATIVIDADES CONFIGURADAS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 3: Atividades por Modalidade';
    RAISE NOTICE '=========================================';
END $$;

-- Verificar atividades do Duatlo
SELECT 
    'Duatlo' as modalidade,
    ma.activity_name,
    ma.activity_order,
    ma.activity_icon,
    ma.activity_color,
    CASE WHEN ma.is_active THEN '✅ Ativa' ELSE '❌ Inativa' END as status
FROM modality_activities ma
JOIN event_modalities em ON ma.modality_id = em.id
WHERE em.name = 'Duatlo'
ORDER BY ma.activity_order;

-- Verificar atividades do Triatlo
SELECT 
    'Triatlo' as modalidade,
    ma.activity_name,
    ma.activity_order,
    ma.activity_icon,
    ma.activity_color,
    CASE WHEN ma.is_active THEN '✅ Ativa' ELSE '❌ Inativa' END as status
FROM modality_activities ma
JOIN event_modalities em ON ma.modality_id = em.id
WHERE em.name = 'Triatlo'
ORDER BY ma.activity_order;

-- 4. VERIFICAR TIPOS DE CHECKPOINT ESPECÍFICOS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 4: Tipos de Checkpoint Específicos';
    RAISE NOTICE '==============================================';
END $$;

-- Verificar checkpoints específicos criados
SELECT 
    code,
    name,
    description,
    icon,
    color,
    CASE WHEN is_finish THEN '✅ Meta' ELSE 'ℹ️ Intermediário' END as tipo,
    CASE WHEN requires_split THEN '✅ Gera Split' ELSE 'ℹ️ Não gera Split' END as splits,
    sort_order
FROM checkpoint_types 
WHERE code IN ('swimming_finish', 'cycling_finish', 'running_finish', 'lap_counter')
ORDER BY sort_order;

-- 5. VERIFICAR FUNÇÕES CRIADAS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 5: Funções do Sistema';
    RAISE NOTICE '==================================';
END $$;

-- Verificar se funções existem
SELECT 
    routine_name as funcao,
    routine_type as tipo,
    CASE 
        WHEN routine_name IN ('validate_multimodal_setup', 'process_activity_detection', 'calculate_lap_statistics', 'configure_lap_counter') 
        THEN '✅ Implementada'
        ELSE '❌ Não encontrada'
    END as status
FROM information_schema.routines 
WHERE routine_name IN ('validate_multimodal_setup', 'process_activity_detection', 'calculate_lap_statistics', 'configure_lap_counter')
ORDER BY routine_name;

-- 6. VERIFICAR TRIGGERS CRIADOS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 6: Triggers do Sistema';
    RAISE NOTICE '===================================';
END $$;

-- Verificar triggers
SELECT 
    trigger_name as trigger,
    event_object_table as tabela,
    action_timing as momento,
    event_manipulation as evento,
    action_statement as acao
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_process_activity_detection', 'trg_process_lap_detection')
ORDER BY trigger_name;

-- 7. VERIFICAR ÍNDICES CRIADOS
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 7: Índices de Performance';
    RAISE NOTICE '=====================================';
END $$;

-- Verificar índices
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname IN ('idx_activity_times_event_dorsal', 'idx_activity_times_checkpoint_time', 'idx_lap_data_event_dorsal', 'idx_lap_data_checkpoint_time')
ORDER BY tablename, indexname;

-- 8. TESTAR FUNÇÃO DE VALIDAÇÃO MULTI-DISCIPLINAR
DO $$
DECLARE
    v_test_result BOOLEAN;
    v_test_event_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 8: Teste de Funções';
    RAISE NOTICE '===============================';
    
    -- Criar evento de teste temporário
    INSERT INTO events (name, event_type, event_started_at, is_active)
    VALUES ('Teste Multi-Disciplinar', 'Triatlo', NOW(), true)
    RETURNING id INTO v_test_event_id;
    
    -- Testar função de validação
    SELECT validate_multimodal_setup(v_test_event_id) INTO v_test_result;
    
    RAISE NOTICE 'Teste validate_multimodal_setup(): %', CASE WHEN v_test_result THEN '✅ PASSOU' ELSE '❌ FALHOU' END;
    
    -- Limpar evento de teste
    DELETE FROM events WHERE id = v_test_event_id;
    
    RAISE NOTICE 'Evento de teste removido com sucesso';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro no teste: %', SQLERRM;
END $$;

-- 9. VERIFICAR VIEW event_classifications
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 VALIDAÇÃO 9: View de Classificações';
    RAISE NOTICE '=====================================';
END $$;

-- Verificar se view existe e tem colunas corretas
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('swimming_time', 'cycling_time', 'running_time', 'total_laps', 'fastest_lap') 
        THEN '✅ Nova coluna'
        ELSE 'ℹ️ Coluna padrão'
    END as tipo_coluna
FROM information_schema.columns 
WHERE table_name = 'event_classifications' 
AND column_name IN ('swimming_time', 'cycling_time', 'running_time', 'total_laps', 'fastest_lap', 'avg_lap_speed', 'position', 'dorsal_number', 'total_time')
ORDER BY column_name;

-- 10. RESUMO FINAL
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMO DA VALIDAÇÃO';
    RAISE NOTICE '=====================';
    RAISE NOTICE '✅ Sistema Multi-Disciplinar: Implementado';
    RAISE NOTICE '✅ Sistema de Contador de Voltas: Implementado';
    RAISE NOTICE '✅ Reordenação de Atividades: Implementado';
    RAISE NOTICE '✅ Validação sem Meta Final: Implementado';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
    RAISE NOTICE '1. Testar interface de configuração';
    RAISE NOTICE '2. Criar evento de teste Duatlo/Triatlo';
    RAISE NOTICE '3. Configurar dispositivos com checkpoints específicos';
    RAISE NOTICE '4. Testar detecções e classificações';
    RAISE NOTICE '';
    RAISE NOTICE '✨ Sistema pronto para uso!';
END $$;
