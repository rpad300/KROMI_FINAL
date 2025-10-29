-- Calcular tempos de todas as classificações sem total_time
-- Execute este SQL sempre que necessário

UPDATE classifications
SET 
    total_time = checkpoint_time - (
        SELECT event_started_at 
        FROM events 
        WHERE id = classifications.event_id
    ),
    split_time = checkpoint_time - (
        SELECT event_started_at 
        FROM events 
        WHERE id = classifications.event_id
    )
WHERE total_time IS NULL
AND EXISTS (
    SELECT 1 FROM event_devices ed
    JOIN checkpoint_types ct ON ed.checkpoint_type = ct.code
    WHERE ed.event_id = classifications.event_id
    AND ed.checkpoint_order = classifications.device_order
    AND ct.is_finish = true
);

-- Ver quantas foram atualizadas
SELECT 
    COUNT(*) FILTER (WHERE total_time IS NOT NULL) as com_tempo,
    COUNT(*) FILTER (WHERE total_time IS NULL) as sem_tempo
FROM classifications;

