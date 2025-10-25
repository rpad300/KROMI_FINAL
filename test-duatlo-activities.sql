-- =====================================================
-- VisionKrono - Teste Duatlo e Atividades
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. VERIFICAR SE DUATLO EXISTE
SELECT * FROM event_modalities WHERE name = 'Duatlo';

-- 2. ADICIONAR DUATLO SE NÃO EXISTIR
INSERT INTO event_modalities (name, description, icon, has_lap_counter) VALUES
('Duatlo', 'Corrida + Ciclismo', '🏃🚴', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    has_lap_counter = EXCLUDED.has_lap_counter;

-- 3. VERIFICAR ATIVIDADES DO DUATLO
SELECT 
    ma.*,
    em.name as modality_name
FROM modality_activities ma
JOIN event_modalities em ON ma.modality_id = em.id
WHERE em.name = 'Duatlo'
ORDER BY ma.activity_order;

-- 4. ADICIONAR ATIVIDADES DO DUATLO SE NÃO EXISTIREM
INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Corrida',
    1,
    '🏃',
    '#10b981'
FROM event_modalities em 
WHERE em.name = 'Duatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

INSERT INTO modality_activities (modality_id, activity_name, activity_order, activity_icon, activity_color)
SELECT 
    em.id,
    'Ciclismo',
    2,
    '🚴',
    '#3b82f6'
FROM event_modalities em 
WHERE em.name = 'Duatlo'
ON CONFLICT (modality_id, activity_order) DO NOTHING;

-- 5. VERIFICAR TODAS AS MODALIDADES E SUAS ATIVIDADES
SELECT 
    em.name as modality,
    em.description,
    em.icon,
    ma.activity_name,
    ma.activity_order,
    ma.activity_icon,
    ma.activity_color,
    ma.is_active
FROM event_modalities em
LEFT JOIN modality_activities ma ON em.id = ma.modality_id
WHERE em.name IN ('Duatlo', 'Triatlo')
ORDER BY em.name, ma.activity_order;

-- 6. VERIFICAR CHECKPOINTS ESPECÍFICOS
SELECT * FROM checkpoint_types 
WHERE code IN ('swimming_finish', 'cycling_finish', 'running_finish')
ORDER BY sort_order;
