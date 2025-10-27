-- Script para remover dorsal 999 de teste
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações atuais
SELECT 'CLASSIFICAÇÕES ANTES:' as info;
SELECT 
    dorsal_number,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Remover dorsal 999 (classificação de teste)
DELETE FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575' 
AND dorsal_number = 999;

-- 3. Verificar resultado final
SELECT 'CLASSIFICAÇÕES APÓS LIMPEZA:' as info;
SELECT 
    dorsal_number,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;
