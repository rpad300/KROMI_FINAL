-- Script para descobrir a estrutura real da tabela detections
-- Execute este script no Supabase SQL Editor

-- 1. Verificar TODAS as colunas da tabela detections
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'detections'
ORDER BY ordinal_position;

-- 2. Verificar alguns registros reais da tabela detections
SELECT * FROM detections LIMIT 3;

-- 3. Verificar se existe alguma coluna com timestamp
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'detections' 
AND (data_type LIKE '%timestamp%' OR data_type LIKE '%date%' OR column_name LIKE '%time%' OR column_name LIKE '%at%');

-- 4. Verificar estrutura da tabela classifications
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'classifications'
ORDER BY ordinal_position;

-- 5. Verificar estrutura da tabela events
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events'
ORDER BY ordinal_position;
