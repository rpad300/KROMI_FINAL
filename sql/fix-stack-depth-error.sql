-- Script para corrigir o erro de stack depth limit exceeded
-- Execute este script no Supabase SQL Editor

-- 1. Remover o trigger problemático
DROP TRIGGER IF EXISTS tr_update_classifications ON classifications;

-- 2. Remover a função do trigger
DROP FUNCTION IF EXISTS trigger_update_classifications();

-- 3. Simplificar a função update_classifications para evitar recursão
CREATE OR REPLACE FUNCTION update_classifications(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Atualizar tempo total para todos os dorsais (sem trigger recursivo)
    UPDATE classifications 
    SET total_time = calculate_total_time(event_id, dorsal_number),
        updated_at = NOW()
    WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar a view para usar a função simplificada
CREATE OR REPLACE VIEW event_classifications AS
SELECT 
    c.event_id,
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.split_time,
    c.total_time,
    c.is_penalty,
    c.penalty_reason,
    ROW_NUMBER() OVER (
        PARTITION BY c.event_id 
        ORDER BY 
            CASE WHEN c.is_penalty THEN 1 ELSE 0 END,
            c.total_time ASC NULLS LAST
    ) as position,
    e.event_started_at,
    e.name as event_name
FROM classifications c
JOIN events e ON c.event_id = e.id
WHERE e.is_active = true OR e.event_ended_at IS NOT NULL
ORDER BY c.event_id, position;

-- 5. Verificar se as tabelas existem
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('events', 'classifications', 'detections')
ORDER BY table_name, ordinal_position;
