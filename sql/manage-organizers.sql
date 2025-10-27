-- ============================================================================
-- Gestão de Organizadores - VisionKrono
-- ============================================================================
-- Scripts práticos para criar e gerir organizadores
-- ============================================================================

-- ============================================================================
-- CRIAR ORGANIZADORES
-- ============================================================================

-- Exemplo 1: Criar organizador básico
-- ----------------------------------------------------------------------------
INSERT INTO organizers (name, email, phone)
VALUES (
    'Clube Desportivo ABC',
    'contato@clubabc.com',
    '+351 912 345 678'
)
RETURNING id, name;

-- Exemplo 2: Criar organizador completo
-- ----------------------------------------------------------------------------
INSERT INTO organizers (
    name, 
    email, 
    phone, 
    address,
    website,
    logo_url,
    is_active
)
VALUES (
    'Associação Atlética XYZ',
    'info@xyz.pt',
    '+351 918 765 432',
    'Rua do Desporto, 123, Lisboa',
    'https://www.xyz.pt',
    'https://cdn.xyz.pt/logo.png',
    true
)
RETURNING id, name;

-- Exemplo 3: Criar múltiplos organizadores de uma vez
-- ----------------------------------------------------------------------------
INSERT INTO organizers (name, email, is_active)
VALUES 
    ('Maratonas Portugal', 'contato@maratonas.pt', true),
    ('Trail Running Club', 'info@trailclub.pt', true),
    ('Ultra Runners PT', 'hello@ultrarunners.pt', true)
RETURNING id, name;

-- ============================================================================
-- ATRIBUIR UTILIZADORES A ORGANIZADORES
-- ============================================================================

-- Ver utilizadores sem organizador
-- ----------------------------------------------------------------------------
SELECT 
    id,
    email,
    role,
    profile_type,
    organizer_id
FROM user_profiles
WHERE organizer_id IS NULL
ORDER BY email;

-- Atribuir utilizador específico a organizador
-- ----------------------------------------------------------------------------
-- Substitua <USER_EMAIL> e <ORGANIZER_ID>
UPDATE user_profiles 
SET organizer_id = '<ORGANIZER_ID>'
WHERE email = '<USER_EMAIL>'
RETURNING email, organizer_id;

-- Atribuir múltiplos utilizadores ao mesmo organizador
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
UPDATE user_profiles 
SET organizer_id = '<ORGANIZER_ID>'
WHERE email IN (
    'gestor1@exemplo.com',
    'gestor2@exemplo.com',
    'user3@exemplo.com'
)
RETURNING email, organizer_id;

-- ============================================================================
-- ATRIBUIR EVENTOS A ORGANIZADORES
-- ============================================================================

-- Ver eventos sem organizador
-- ----------------------------------------------------------------------------
SELECT 
    id,
    name,
    event_date,
    organizer_id
FROM events
WHERE organizer_id IS NULL
ORDER BY created_at DESC;

-- Atribuir evento específico a organizador
-- ----------------------------------------------------------------------------
-- Substitua <EVENT_ID> e <ORGANIZER_ID>
UPDATE events 
SET organizer_id = '<ORGANIZER_ID>'
WHERE id = '<EVENT_ID>'
RETURNING id, name, organizer_id;

-- Atribuir todos os eventos sem organizador a um organizador padrão
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
UPDATE events 
SET organizer_id = '<ORGANIZER_ID>'
WHERE organizer_id IS NULL
RETURNING id, name;

-- ============================================================================
-- CONSULTAS ÚTEIS
-- ============================================================================

-- Ver todos os organizadores com estatísticas
-- ----------------------------------------------------------------------------
SELECT 
    o.id,
    o.name,
    o.email,
    o.is_active,
    COUNT(DISTINCT up.id) as total_utilizadores,
    COUNT(DISTINCT e.id) as total_eventos,
    o.created_at
FROM organizers o
LEFT JOIN user_profiles up ON up.organizer_id = o.id
LEFT JOIN events e ON e.organizer_id = o.id
GROUP BY o.id, o.name, o.email, o.is_active, o.created_at
ORDER BY o.name;

-- Ver utilizadores por organizador
-- ----------------------------------------------------------------------------
SELECT 
    o.name as organizador,
    up.email,
    up.role,
    up.profile_type,
    up.is_active
FROM organizers o
LEFT JOIN user_profiles up ON up.organizer_id = o.id
ORDER BY o.name, up.email;

-- Ver eventos por organizador
-- ----------------------------------------------------------------------------
SELECT 
    o.name as organizador,
    e.name as evento,
    e.event_date,
    e.status,
    e.created_at
FROM organizers o
LEFT JOIN events e ON e.organizer_id = o.id
ORDER BY o.name, e.event_date DESC;

-- Ver tudo de um organizador específico
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID> ou <ORGANIZER_NAME>
DO $$
DECLARE
    org_id UUID;
    org_name TEXT;
    total_users INTEGER;
    total_events INTEGER;
BEGIN
    -- Obter info do organizador (por nome)
    SELECT id, name INTO org_id, org_name
    FROM organizers 
    WHERE name ILIKE '%ABC%'  -- Altere aqui o filtro
    LIMIT 1;
    
    IF org_id IS NULL THEN
        RAISE NOTICE 'Organizador não encontrado';
        RETURN;
    END IF;
    
    -- Contar utilizadores e eventos
    SELECT COUNT(*) INTO total_users FROM user_profiles WHERE organizer_id = org_id;
    SELECT COUNT(*) INTO total_events FROM events WHERE organizer_id = org_id;
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Organizador: %', org_name;
    RAISE NOTICE 'ID: %', org_id;
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Total de utilizadores: %', total_users;
    RAISE NOTICE 'Total de eventos: %', total_events;
    RAISE NOTICE '═══════════════════════════════════════';
END $$;

-- ============================================================================
-- TRANSFERIR DADOS ENTRE ORGANIZADORES
-- ============================================================================

-- Transferir utilizadores do Organizador A para Organizador B
-- ----------------------------------------------------------------------------
-- Substitua <ORIGEM_ID> e <DESTINO_ID>
UPDATE user_profiles 
SET organizer_id = '<DESTINO_ID>'
WHERE organizer_id = '<ORIGEM_ID>'
RETURNING email;

-- Transferir eventos do Organizador A para Organizador B
-- ----------------------------------------------------------------------------
-- Substitua <ORIGEM_ID> e <DESTINO_ID>
UPDATE events 
SET organizer_id = '<DESTINO_ID>'
WHERE organizer_id = '<ORIGEM_ID>'
RETURNING name;

-- ============================================================================
-- EDITAR ORGANIZADORES
-- ============================================================================

-- Atualizar informações do organizador
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
UPDATE organizers 
SET 
    name = 'Novo Nome do Organizador',
    email = 'novo@email.com',
    phone = '+351 999 999 999',
    website = 'https://www.novosite.com',
    updated_at = NOW()
WHERE id = '<ORGANIZER_ID>'
RETURNING *;

-- Desativar organizador (soft delete)
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
UPDATE organizers 
SET is_active = false, updated_at = NOW()
WHERE id = '<ORGANIZER_ID>'
RETURNING name, is_active;

-- Reativar organizador
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
UPDATE organizers 
SET is_active = true, updated_at = NOW()
WHERE id = '<ORGANIZER_ID>'
RETURNING name, is_active;

-- ============================================================================
-- APAGAR ORGANIZADOR (COM CUIDADO!)
-- ============================================================================

-- ANTES de apagar, verificar se tem dados associados
-- ----------------------------------------------------------------------------
-- Substitua <ORGANIZER_ID>
SELECT 
    'Utilizadores' as tipo,
    COUNT(*) as total
FROM user_profiles 
WHERE organizer_id = '<ORGANIZER_ID>'
UNION ALL
SELECT 
    'Eventos',
    COUNT(*)
FROM events 
WHERE organizer_id = '<ORGANIZER_ID>';

-- SE não tiver dados associados, pode apagar:
-- ----------------------------------------------------------------------------
-- ⚠️ CUIDADO: Isto é PERMANENTE!
-- DELETE FROM organizers WHERE id = '<ORGANIZER_ID>';

-- Se tiver dados, PRIMEIRO transfira-os para outro organizador (ver acima)
-- DEPOIS pode apagar o organizador vazio

-- ============================================================================
-- HELPERS
-- ============================================================================

-- Obter ID de organizador por nome (útil para copiar/colar)
-- ----------------------------------------------------------------------------
SELECT id, name 
FROM organizers 
WHERE name ILIKE '%ABC%'  -- Altere o filtro
LIMIT 5;

-- Obter ID de utilizador por email
-- ----------------------------------------------------------------------------
SELECT id, email, role, profile_type
FROM user_profiles 
WHERE email ILIKE '%exemplo%'  -- Altere o filtro
LIMIT 5;

-- Ver todos os IDs importantes (para copiar)
-- ----------------------------------------------------------------------------
SELECT 
    'Organizador' as tipo,
    name as nome,
    id::TEXT as uuid
FROM organizers
UNION ALL
SELECT 
    'Utilizador',
    email,
    id::TEXT
FROM user_profiles
ORDER BY tipo, nome
LIMIT 20;

