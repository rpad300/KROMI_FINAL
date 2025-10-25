-- Script ultra-simples para verificar e criar classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se as tabelas existem
SELECT 'TABELAS EXISTENTES:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('events', 'detections', 'classifications')
ORDER BY table_name;

-- 2. Verificar eventos
SELECT 'EVENTOS:' as info;
SELECT id, name FROM events LIMIT 5;

-- 3. Verificar detecções (apenas colunas básicas)
SELECT 'DETECÇÕES:' as info;
SELECT id, event_id, number FROM detections LIMIT 5;

-- 4. Verificar classificações
SELECT 'CLASSIFICAÇÕES:' as info;
SELECT id, event_id, dorsal_number FROM classifications LIMIT 5;

-- 5. Se tudo estiver OK, criar uma classificação de teste
INSERT INTO classifications (event_id, dorsal_number, device_order, checkpoint_time)
SELECT 
    e.id as event_id,
    999 as dorsal_number,  -- Número de teste
    1 as device_order,
    NOW() as checkpoint_time
FROM events e
WHERE e.name ILIKE '%teste1%' OR e.name ILIKE '%test%'
LIMIT 1;

-- 6. Verificar se foi criada
SELECT 'CLASSIFICAÇÃO DE TESTE CRIADA:' as info;
SELECT id, event_id, dorsal_number, checkpoint_time FROM classifications 
WHERE dorsal_number = 999;
