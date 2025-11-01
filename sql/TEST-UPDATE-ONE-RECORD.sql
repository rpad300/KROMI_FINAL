-- ============================================================================
-- KROMI - Teste UPDATE direto de um registro
-- ============================================================================
-- Vamos tentar fazer o UPDATE manualmente e capturar o erro exato
-- ============================================================================

DO $$
DECLARE
    v_test_id UUID;
    v_access_code VARCHAR(6);
    v_device_id_from_ed UUID;
    v_event_id_from_ed UUID;
BEGIN
    -- Buscar um registro falhado
    SELECT id, access_code INTO v_test_id, v_access_code
    FROM device_detections
    WHERE status = 'failed'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Nenhum registro falhado encontrado';
        RETURN;
    END IF;
    
    RAISE NOTICE '=== TESTE DE UPDATE MANUAL ===';
    RAISE NOTICE 'ID do registro: %', v_test_id;
    RAISE NOTICE 'Access Code: %', v_access_code;
    RAISE NOTICE '';
    
    -- Buscar device_id e event_id de event_devices
    SELECT device_id, event_id INTO v_device_id_from_ed, v_event_id_from_ed
    FROM event_devices
    WHERE access_code = v_access_code
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Nenhum event_device encontrado para access_code: %', v_access_code;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Device ID de event_devices: %', v_device_id_from_ed;
    RAISE NOTICE 'Tipo: %', pg_typeof(v_device_id_from_ed);
    RAISE NOTICE 'Event ID de event_devices: %', v_event_id_from_ed;
    RAISE NOTICE 'Tipo: %', pg_typeof(v_event_id_from_ed);
    RAISE NOTICE '';
    
    -- Tentar fazer o UPDATE com subquery
    RAISE NOTICE 'Tentando UPDATE com subquery...';
    BEGIN
        UPDATE device_detections
        SET device_id = (
            SELECT device_id 
            FROM event_devices 
            WHERE access_code = v_access_code 
            LIMIT 1
        )
        WHERE id = v_test_id;
        
        RAISE NOTICE '✅ UPDATE de device_id com subquery funcionou!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERRO no UPDATE com subquery: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    RAISE NOTICE '';
    
    -- Tentar fazer o UPDATE com variável
    RAISE NOTICE 'Tentando UPDATE com variável UUID...';
    BEGIN
        UPDATE device_detections
        SET device_id = v_device_id_from_ed
        WHERE id = v_test_id;
        
        RAISE NOTICE '✅ UPDATE de device_id com variável funcionou!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERRO no UPDATE com variável: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    RAISE NOTICE '';
    
    -- Tentar fazer o UPDATE com variável + CAST
    RAISE NOTICE 'Tentando UPDATE com variável + CAST ::UUID...';
    BEGIN
        UPDATE device_detections
        SET device_id = v_device_id_from_ed::UUID
        WHERE id = v_test_id;
        
        RAISE NOTICE '✅ UPDATE de device_id com variável + CAST funcionou!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERRO no UPDATE com variável + CAST: %', SQLERRM;
            RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FIM DO TESTE ===';
    
    -- Rollback para não alterar dados
    RAISE EXCEPTION 'Rollback intencional - teste completo';
    
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM LIKE '%Rollback intencional%' THEN
            RAISE NOTICE '';
            RAISE NOTICE '✅ Teste completo - dados não foram alterados (rollback)';
        ELSE
            RAISE NOTICE '';
            RAISE NOTICE '❌ ERRO INESPERADO: %', SQLERRM;
        END IF;
END $$;

