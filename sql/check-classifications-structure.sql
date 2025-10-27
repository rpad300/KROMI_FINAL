-- Script para verificar estrutura da tabela classifications
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela classifications
SELECT 'ESTRUTURA DA TABELA CLASSIFICATIONS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'classifications' 
ORDER BY ordinal_position;

-- 2. Verificar dados atuais na tabela classifications
SELECT 'DADOS ATUAIS NA TABELA CLASSIFICATIONS:' as info;
SELECT * FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 3. Verificar se existe coluna detection_id
SELECT 'VERIFICAÇÃO DE COLUNAS:' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'classifications' 
            AND column_name = 'detection_id'
        ) THEN '✅ Coluna detection_id existe'
        ELSE '❌ Coluna detection_id NÃO existe'
    END as status_detection_id;

-- 4. Verificar estrutura da tabela detections
SELECT 'ESTRUTURA DA TABELA DETECTIONS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'detections' 
ORDER BY ordinal_position;
