-- Verificar se o evento existe na tabela events
-- ID: a6301479-56c8-4269-a42d-aa8a7650a575

-- 1. Verificar se o evento existe
SELECT 
    id,
    name,
    event_date,
    status,
    created_at
FROM events
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

-- 2. Se não existir, criar o evento
INSERT INTO events (id, name, event_date, status, created_by, settings)
VALUES (
    'a6301479-56c8-4269-a42d-aa8a7650a575',
    'Teste1',
    '2025-01-30',
    'active',
    'admin',
    '{}'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar novamente
SELECT 
    id,
    name,
    event_date,
    status
FROM events
WHERE id = 'a6301479-56c8-4269-a42d-aa8a7650a575';

