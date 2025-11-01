-- ============================================================================
-- KROMI - Debug completo do problema UUID
-- ============================================================================
-- Análise passo a passo do que acontece na função
-- ============================================================================

-- PASSO 1: Buscar um registro pendente qualquer
DO $$
DECLARE
    v_test_record RECORD;
    v_device_info RECORD;
    v_event_id_var UUID;
    v_device_id_var UUID;
BEGIN
    RAISE NOTICE '=== PASSO 1: Buscar registro pendente ===';
    
    SELECT * INTO v_test_record
    FROM device_detections
    WHERE status = 'failed'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'ID do registro: %', v_test_record.id;
        RAISE NOTICE 'Access Code: %', v_test_record.access_code;
        RAISE NOTICE 'Tipo do device_id atual: %', pg_typeof(v_test_record.device_id);
        
        RAISE NOTICE '';
        RAISE NOTICE '=== PASSO 2: Buscar dados de event_devices ===';
        
        SELECT ed.event_id, ed.device_id, pg_typeof(ed.event_id) as event_id_type, pg_typeof(ed.device_id) as device_id_type
        INTO v_device_info
        FROM event_devices ed
        WHERE ed.access_code = v_test_record.access_code
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Event ID: %', v_device_info.event_id;
            RAISE NOTICE 'Tipo de event_id em event_devices: %', v_device_info.event_id_type;
            RAISE NOTICE 'Device ID: %', v_device_info.device_id;
            RAISE NOTICE 'Tipo de device_id em event_devices: %', v_device_info.device_id_type;
            
            RAISE NOTICE '';
            RAISE NOTICE '=== PASSO 3: Testar conversão para variáveis UUID ===';
            
            -- Testar SELECT INTO com CAST
            SELECT ed.event_id::UUID, ed.device_id::UUID
            INTO v_event_id_var, v_device_id_var
            FROM event_devices ed
            WHERE ed.access_code = v_test_record.access_code
            LIMIT 1;
            
            RAISE NOTICE 'v_event_id_var: %', v_event_id_var;
            RAISE NOTICE 'Tipo de v_event_id_var: %', pg_typeof(v_event_id_var);
            RAISE NOTICE 'v_device_id_var: %', v_device_id_var;
            RAISE NOTICE 'Tipo de v_device_id_var: %', pg_typeof(v_device_id_var);
            
            RAISE NOTICE '';
            RAISE NOTICE '=== PASSO 4: Testar UPDATE direto ===';
            
            -- Testar UPDATE com valores literais
            BEGIN
                UPDATE device_detections
                SET device_id = v_device_id_var::UUID,
                    event_id = v_event_id_var::UUID
                WHERE id = v_test_record.id;
                
                RAISE NOTICE '✅ UPDATE com variáveis UUID funcionou!';
                
                -- Rollback para não alterar dados
                RAISE EXCEPTION 'Rollback intencional para não alterar dados';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLERRM LIKE '%Rollback intencional%' THEN
                        RAISE NOTICE 'Rollback executado (não alterou dados)';
                    ELSE
                        RAISE NOTICE '❌ ERRO no UPDATE: %', SQLERRM;
                    END IF;
            END;
            
        ELSE
            RAISE NOTICE 'Nenhum event_device encontrado para access_code: %', v_test_record.access_code;
        END IF;
    ELSE
        RAISE NOTICE 'Nenhum registro pendente encontrado';
    END IF;
END $$;

-- ============================================================================
-- Verificar a estrutura exata das colunas
-- ============================================================================
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('device_detections', 'event_devices')
    AND column_name IN ('device_id', 'event_id')
ORDER BY table_name, column_name;

