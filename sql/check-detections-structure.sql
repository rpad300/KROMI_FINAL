-- Script para verificar estrutura da tabela detections
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela detections
SELECT 'ESTRUTURA DETECTIONS:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'detections'
ORDER BY ordinal_position;

-- 2. Verificar alguns registros reais
SELECT 'REGISTROS DETECTIONS:' as info;
SELECT * FROM detections LIMIT 3;

-- 3. Verificar estrutura da tabela classifications
SELECT 'ESTRUTURA CLASSIFICATIONS:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'classifications'
ORDER BY ordinal_position;

-- 4. Verificar se a view event_classifications existe
SELECT 'VIEW EVENT_CLASSIFICATIONS:' as info;
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'event_classifications'
ORDER BY ordinal_position;
