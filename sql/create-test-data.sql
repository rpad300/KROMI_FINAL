-- ============================================================================
-- VISIONKRONO GPS TRACKING - Criar Dados de Teste
-- ============================================================================

DO $$
DECLARE
    v_event_id UUID;
    v_route_id UUID;
    v_participant_id UUID;
    v_qr_result JSON;
BEGIN
    -- Pegar primeiro evento ativo ou criar um
    SELECT id INTO v_event_id
    FROM events
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_event_id IS NULL THEN
        -- Criar evento de teste
        INSERT INTO events (
            name,
            description,
            event_type,
            event_date,
            location,
            is_active
        ) VALUES (
            'Teste GPS Tracking ' || to_char(NOW(), 'DD/MM/YYYY'),
            'Evento de teste para GPS Tracking',
            'running',
            NOW() + INTERVAL '7 days',
            'Lisboa, Portugal',
            true
        ) RETURNING id INTO v_event_id;
        
        RAISE NOTICE '✅ Evento criado: %', v_event_id;
    ELSE
        RAISE NOTICE '✅ Usando evento existente: %', v_event_id;
    END IF;
    
    -- Criar rota de teste
    INSERT INTO track_routes (
        event_id,
        name,
        description,
        distance_km,
        max_speed_kmh,
        max_accuracy_m,
        map_center_lat,
        map_center_lng,
        is_active
    ) VALUES (
        v_event_id,
        '5K Teste GPS',
        'Percurso de teste de 5km',
        5.0,
        30.0,
        50.0,
        38.7223,  -- Lisboa
        -9.1393,
        true
    ) RETURNING id INTO v_route_id;
    
    RAISE NOTICE '✅ Rota criada: % - 5K Teste GPS', v_route_id;
    
    -- Pegar primeiro participante do evento ou criar
    SELECT id INTO v_participant_id
    FROM participants
    WHERE event_id = v_event_id
    LIMIT 1;
    
    IF v_participant_id IS NULL THEN
        -- Criar participante de teste
        INSERT INTO participants (
            event_id,
            full_name,
            email,
            dorsal_number,
            category,
            registration_status
        ) VALUES (
            v_event_id,
            'Atleta Teste GPS',
            'teste.gps@visionkrono.com',
            999,
            'M30',
            'paid'
        ) RETURNING id INTO v_participant_id;
        
        RAISE NOTICE '✅ Participante criado: %', v_participant_id;
    ELSE
        RAISE NOTICE '✅ Usando participante existente: %', v_participant_id;
    END IF;
    
    -- Emitir QR para o participante
    v_qr_result := track_issue_qr(
        p_event_id := v_event_id,
        p_participant_id := v_participant_id,
        p_notes := 'QR de teste gerado automaticamente'
    );
    
    RAISE NOTICE '✅ QR emitido: %', v_qr_result->>'qr_code';
    
    -- Resumo final
    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE 'DADOS DE TESTE CRIADOS COM SUCESSO!';
    RAISE NOTICE '══════════════════════════════════════';
    RAISE NOTICE 'Evento ID: %', v_event_id;
    RAISE NOTICE 'Rota ID: %', v_route_id;
    RAISE NOTICE 'Participante ID: %', v_participant_id;
    RAISE NOTICE 'QR Code: %', v_qr_result->>'qr_code';
    RAISE NOTICE '';
    RAISE NOTICE 'Testar agora:';
    RAISE NOTICE '1. Abrir: event-gps-tracking.html?event_id=%', v_event_id;
    RAISE NOTICE '2. Clicar em "QR Codes" para ver o QR';
    RAISE NOTICE '3. Clicar em "Rotas" para ver a rota criada';
    RAISE NOTICE '══════════════════════════════════════';
    
END $$;

-- Ver resultado
SELECT * FROM v_track_route_stats;
SELECT * FROM v_track_active_qrs;

