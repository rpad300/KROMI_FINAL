-- Verificar Perfil do Administrador
-- Execute este script para verificar se o perfil foi criado

-- 1. Verificar utilizador
SELECT 
    'Utilizador:' as tipo,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'Rdias300@gmail.com';

-- 2. Verificar perfil
SELECT 
    'Perfil:' as tipo,
    user_id,
    email,
    profile_type,
    is_active,
    created_at
FROM user_profiles 
WHERE email = 'Rdias300@gmail.com';

-- 3. Verificar se existe ligação
SELECT 
    'Ligação:' as tipo,
    u.id as user_id,
    u.email,
    p.profile_type,
    p.is_active,
    CASE 
        WHEN p.user_id IS NOT NULL THEN 'Perfil existe'
        ELSE 'Perfil não existe'
    END as status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';

-- 4. Se não existir perfil, criar
INSERT INTO user_profiles (
    user_id,
    email,
    profile_type,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    u.id,
    'Rdias300@gmail.com',
    'admin',
    true,
    now(),
    now()
FROM auth.users u 
WHERE u.email = 'Rdias300@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
);

-- 5. Verificar resultado final
SELECT 
    'Resultado final:' as status,
    u.id,
    u.email,
    p.profile_type,
    p.is_active,
    'Perfil OK' as status_perfil
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.email = 'Rdias300@gmail.com';


