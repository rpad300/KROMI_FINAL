-- Script para verificar estrutura das tabelas e corrigir classificações
-- Execute este script no Supabase SQL Editor

-- 1. Verificar estrutura da tabela detections
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'detections'
ORDER BY ordinal_position;

-- 2. Verificar estrutura da tabela classifications
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'classifications'
ORDER BY ordinal_position;

-- 3. Verificar estrutura da tabela events
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events'
ORDER BY ordinal_position;

-- 4. Verificar dados existentes na tabela detections
SELECT 
    id,
    event_id,
    number,  -- Esta é provavelmente a coluna correta
    detected_at,
    detection_method,
    timestamp
FROM detections 
LIMIT 5;

-- 5. Verificar eventos existentes
SELECT 
    id, 
    name, 
    event_started_at, 
    is_active,
    status
FROM events 
ORDER BY created_at DESC
LIMIT 5;
