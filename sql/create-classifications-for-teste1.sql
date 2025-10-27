-- Script para verificar e criar classificações para o evento teste1
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o evento teste1 existe e está ativo
SELECT 
    id, 
    name, 
    event_started_at, 
    is_active,
    status
FROM events 
WHERE name ILIKE '%teste1%' OR name ILIKE '%test%'
ORDER BY created_at DESC;

-- 2. Verificar detecções do evento
SELECT 
    d.id,
    d.event_id,
    d.number as dorsal_number,
    d.detected_at,
    d.detection_method,
    e.name as event_name
FROM detections d
JOIN events e ON d.event_id = e.id
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
ORDER BY d.detected_at DESC
LIMIT 10;

-- 3. Verificar se já existem classificações
SELECT 
    c.id,
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.total_time,
    c.is_penalty
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
ORDER BY c.checkpoint_time DESC;

-- 4. Criar classificações baseadas nas detecções (se não existirem)
-- Primeiro, vamos verificar se o evento está iniciado
DO $$
DECLARE
    event_record RECORD;
    detection_record RECORD;
    classification_exists BOOLEAN;
BEGIN
    -- Buscar o evento teste1
    SELECT * INTO event_record 
    FROM events 
    WHERE name ILIKE '%teste1%' OR name ILIKE '%test%'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF event_record.id IS NOT NULL THEN
        RAISE NOTICE 'Evento encontrado: % (%)', event_record.name, event_record.id;
        
        -- Se o evento não estiver iniciado, iniciar agora
        IF event_record.event_started_at IS NULL THEN
            UPDATE events 
            SET event_started_at = NOW(), 
                is_active = true,
                status = 'active'
            WHERE id = event_record.id;
            RAISE NOTICE 'Evento iniciado automaticamente';
        END IF;
        
        -- Criar classificações para cada detecção
        FOR detection_record IN 
            SELECT DISTINCT ON (number) 
                number as dorsal_number, 
                detected_at,
                id as detection_id
            FROM detections 
            WHERE event_id = event_record.id
            ORDER BY number, detected_at ASC
        LOOP
            -- Verificar se já existe classificação para este dorsal
            SELECT EXISTS(
                SELECT 1 FROM classifications 
                WHERE event_id = event_record.id 
                AND dorsal_number = detection_record.dorsal_number
            ) INTO classification_exists;
            
            IF NOT classification_exists THEN
                INSERT INTO classifications (
                    event_id,
                    dorsal_number,
                    device_order,
                    checkpoint_time,
                    detection_id
                ) VALUES (
                    event_record.id,
                    detection_record.dorsal_number,
                    1, -- Primeiro checkpoint
                    detection_record.detected_at,
                    detection_record.detection_id
                );
                
                RAISE NOTICE 'Classificação criada para dorsal %', detection_record.dorsal_number;
            END IF;
        END LOOP;
        
        -- Atualizar classificações
        PERFORM update_classifications(event_record.id);
        RAISE NOTICE 'Classificações atualizadas';
        
    ELSE
        RAISE NOTICE 'Nenhum evento teste1 encontrado';
    END IF;
END $$;

-- 5. Verificar resultado final
SELECT 
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.total_time,
    c.is_penalty,
    ROW_NUMBER() OVER (ORDER BY c.total_time ASC NULLS LAST) as position
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
ORDER BY c.total_time ASC NULLS LAST;
