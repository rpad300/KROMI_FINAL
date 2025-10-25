-- =====================================================
-- Fix RLS Policies - VisionKrono
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE (para debug)
ALTER TABLE event_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;

-- OU

-- 2. RECRIAR POLÍTICAS PERMITINDO TUDO (para desenvolvimento)
DROP POLICY IF EXISTS "Allow all operations on event_devices" ON event_devices;
CREATE POLICY "Allow all operations on event_devices" 
ON event_devices 
FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on devices" ON devices;
CREATE POLICY "Allow all operations on devices" 
ON devices 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. VERIFICAR POLÍTICAS ATIVAS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('event_devices', 'devices')
ORDER BY tablename, policyname;

-- 4. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('event_devices', 'devices', 'events', 'classifications', 'detections');

-- =====================================================
-- TESTE: Verificar se consegue ver os dados
-- =====================================================

-- Ver todos os devices
SELECT * FROM devices ORDER BY created_at DESC LIMIT 10;

-- Ver todas as associações
SELECT * FROM event_devices ORDER BY assigned_at DESC LIMIT 10;

-- Ver associações de um evento específico
SELECT 
    ed.*,
    d.device_name,
    d.device_type,
    e.name as event_name
FROM event_devices ed
LEFT JOIN devices d ON ed.device_id = d.id
LEFT JOIN events e ON ed.event_id = e.id
WHERE ed.event_id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- =====================================================
-- Se os dados aparecem no SQL mas não na interface,
-- o problema É o RLS. Execute as políticas acima.
-- =====================================================

