-- Verificar estrutura completa do evento e configurações

-- 1. Ver colunas da tabela events
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- 2. Ver colunas da tabela event_devices
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'event_devices'
ORDER BY ordinal_position;

-- 3. Ver tipos de checkpoints disponíveis
SELECT 
    code,
    name,
    is_start,
    is_finish,
    is_intermediate
FROM checkpoint_types
ORDER BY sort_order;

-- 4. Ver configuração do evento atual
SELECT 
    event_type,
    distance_km,
    has_categories,
    has_lap_counter,
    event_started_at
FROM events
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 5. Ver dispositivos/checkpoints do evento
SELECT 
    device_id,
    checkpoint_name,
    checkpoint_order,
    checkpoint_type
FROM event_devices
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY checkpoint_order;


