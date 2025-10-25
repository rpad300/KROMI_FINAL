-- Script para verificar se detection_id foi associado
-- Execute este script no Supabase SQL Editor

-- 1. Verificar classificações com detection_id
SELECT 'CLASSIFICAÇÕES COM DETECTION_ID:' as info;
SELECT 
    dorsal_number,
    device_order,
    detection_id,
    CASE 
        WHEN detection_id IS NOT NULL THEN '✅ Com foto'
        ELSE '❌ Sem foto'
    END as status_foto
FROM classifications 
WHERE event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY dorsal_number;

-- 2. Verificar se as detecções têm proof_image
SELECT 'DETECÇÕES COM PROOF_IMAGE:' as info;
SELECT 
    d.number as dorsal_number,
    d.id as detection_id,
    CASE 
        WHEN d.proof_image IS NOT NULL AND d.proof_image != '' THEN '✅ Tem foto'
        ELSE '❌ Sem foto'
    END as status_imagem
FROM detections d
WHERE d.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY d.number;

-- 3. Testar consulta que a página usa
SELECT 'TESTE DA PÁGINA:' as info;
SELECT 
    c.dorsal_number,
    c.device_order,
    c.checkpoint_time,
    c.total_time,
    c.detection_id,
    CASE 
        WHEN c.detection_id IS NOT NULL AND d.proof_image IS NOT NULL THEN '✅ Funcionará'
        ELSE '❌ Não funcionará'
    END as status_botao_foto
FROM classifications c
LEFT JOIN detections d ON c.detection_id = d.id
WHERE c.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575'
ORDER BY c.dorsal_number;
